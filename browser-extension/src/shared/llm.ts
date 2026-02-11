import type {
  LLMSettings,
  AIAction,
  ContentType,
  ExtractedPageData,
  TutorialCategory,
  NewsCategory,
  Difficulty,
} from './types';
import { getSettings } from './storage';

// ============================================================
// Constants for content length management
// ============================================================

const MAX_CHARS = 50000; // ~12.5k tokens, safe for most models

// ============================================================
// MDX Component Rules for LLM
// ============================================================

const MDX_COMPONENT_RULES = `
You have access to the following React components. Use them when the content's semantic meaning matches:

1. <Callout type="info|warning|danger|success">Content</Callout>
   - Use this when the original text is a blockquote (>), a note, a warning, or a tip.
   - Infer the 'type' based on the text content (e.g. "Warning:" -> danger, "Note:" -> info).

2. <CodeGroup> ... </CodeGroup>
   - Use this to wrap multiple consecutive code blocks that are related (e.g. same code in different languages, or file + terminal output).

3. <Steps> ... </Steps>
   - Use this for numbered lists that represent a tutorial procedure.

4. <Image src="..." alt="..." caption="..." />
   - Replace standard markdown images with this component if there is a caption or specific layout need.

IMPORTANT constraints:
- DO NOT import these components. Assume they are globally available.
- Ensure all JSX tags are strictly closed.
- Escape curly braces '{' and '}' in normal text as '\\{' and '\\}'.
`;

const SYSTEM_PROMPT_MDX = `You are an expert technical editor and MDX developer.
Task: Convert the provided raw Markdown into high-quality, component-rich MDX for a Next.js application.

Process:
1. Clean: Remove ads, navigation, and irrelevant headers.
2. Structure: Ensure the title hierarchy starts at H2 (##), assuming the page title is H1.
3. Componentize: Apply the Component Rules below to enhance the content.

${MDX_COMPONENT_RULES}

Return ONLY the MDX content. No intro, no outro.`;

// ============================================================
// LLM Client — calls OpenAI-compatible chat completions API
// ============================================================

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionResponse {
  choices: { message: { content: string } }[];
}

async function getLLMSettings(): Promise<LLMSettings> {
  const settings = await getSettings();
  return settings.llm;
}

async function callLLM(messages: ChatMessage[], llm?: LLMSettings): Promise<string> {
  const config = llm || (await getLLMSettings());
  if (!config.enabled || !config.apiKey) {
    throw new Error('LLM not configured. Go to Settings to set up your API key.');
  }

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.3,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`LLM API error (${response.status}): ${err}`);
  }

  const data: ChatCompletionResponse = await response.json();
  return data.choices[0]?.message?.content?.trim() || '';
}

// ============================================================
// AI Actions
// ============================================================

const SYSTEM_PROMPT_CLEAN = `You are a content editor for an AI Agent tutorial website. Your task is to clean and format web-extracted content into clean MDX (Markdown with JSX support).

Rules:
- Output ONLY the cleaned markdown body content (no frontmatter, no \`\`\`mdx fences)
- Preserve all code blocks with correct language tags
- Remove navigation text, ads, cookie notices, "share this", "related articles" etc.
- Fix broken formatting: collapse excess blank lines, fix list indentation
- Keep the content structure: headings, paragraphs, code blocks, lists, tables, images, links
- Preserve technical accuracy — do NOT change code, commands, or technical terms
- Remove duplicate headings (e.g., if the title repeats as h1)
- Keep image markdown as-is: ![alt](url)
- For Chinese/Japanese content, keep the original language`;

const SYSTEM_PROMPT_METADATA = `You are a metadata extractor for an AI Agent tutorial website.
Given content from a web page, extract structured metadata.

Respond with ONLY a valid JSON object, no markdown fences, no explanation:

{
  "title": "cleaned title",
  "description": "2-3 sentence description",
  "category": "one of: Frameworks, LLM Models, Agentic Workflows, Real-world Cases, RAG, Prompting",
  "newsCategory": "one of: Tech, Research, Industry (only if this looks like news)",
  "tags": ["tag1", "tag2", "...up to 6 relevant tags"],
  "techStack": ["technology1", "technology2"],
  "difficulty": "one of: Beginner, Intermediate, Advanced",
  "duration": "estimated reading time like '10 min read'"
}

Rules:
- category: Choose the BEST matching category based on content
- tags: Extract specific technologies, concepts, frameworks mentioned
- techStack: Only actual software/frameworks/libraries used (e.g., LangChain, Python, OpenAI)
- difficulty: Judge by code complexity, prerequisites, depth of explanation
- description: Concise, informative, no marketing fluff`;

const SYSTEM_PROMPT_SUMMARY = `You are a content summarizer for an AI Agent tutorial website.
Given the title and content of a web page, write a concise description/summary.

Rules:
- 2-3 sentences maximum
- Focus on what the reader will learn or gain
- Be specific about technologies and techniques mentioned
- Write in the same language as the input content
- No marketing language, be factual and direct

Respond with ONLY the summary text, nothing else.`;

/**
 * Clean and format extracted content as proper MDX (Component-aware)
 */
export async function aiToMdx(
  rawContent: string,
  title: string
): Promise<string> {
  // Handle long content with truncation
  let contentToProcess = rawContent;
  if (rawContent.length > MAX_CHARS) {
    console.warn(`Content too long (${rawContent.length} chars), truncating to ${MAX_CHARS} chars`);
    contentToProcess = rawContent.slice(0, MAX_CHARS) + '\n\n(Content truncated due to length limit)';
  }

  return callLLM([
    { role: 'system', content: SYSTEM_PROMPT_MDX },
    {
      role: 'user',
      content: `Page Title: "${title}"\n\nContent to convert:\n${contentToProcess}`,
    },
  ]);
}

/**
 * Clean content (backward compatible alias)
 */
export async function aiCleanContent(
  rawContent: string,
  title: string
): Promise<string> {
  return aiToMdx(rawContent, title);
}

/**
 * Extract metadata (category, tags, techStack, difficulty) using LLM
 */
export async function aiExtractMetadata(
  title: string,
  content: string,
  contentType: ContentType
): Promise<{
  title: string;
  description: string;
  category: TutorialCategory;
  newsCategory: NewsCategory;
  tags: string[];
  techStack: string[];
  difficulty: Difficulty;
  duration: string;
}> {
  const result = await callLLM([
    { role: 'system', content: SYSTEM_PROMPT_METADATA },
    {
      role: 'user',
      content: `Content type: ${contentType}\nTitle: "${title}"\n\nContent:\n${content.slice(0, 6000)}`,
    },
  ]);

  try {
    // Strip possible markdown code fences
    const cleaned = result.replace(/^```(?:json)?\n?/gm, '').replace(/\n?```$/gm, '');
    return JSON.parse(cleaned);
  } catch {
    throw new Error('Failed to parse LLM metadata response: ' + result.slice(0, 200));
  }
}

/**
 * Generate a description/summary
 */
export async function aiGenerateSummary(
  title: string,
  content: string
): Promise<string> {
  return callLLM([
    { role: 'system', content: SYSTEM_PROMPT_SUMMARY },
    {
      role: 'user',
      content: `Title: "${title}"\n\nContent:\n${content.slice(0, 6000)}`,
    },
  ]);
}

/**
 * Full AI processing pipeline: clean content + extract metadata + generate summary
 */
export async function aiFullProcess(
  extracted: ExtractedPageData,
  contentType: ContentType
): Promise<{
  content: string;
  metadata: {
    title: string;
    description: string;
    category: TutorialCategory;
    newsCategory: NewsCategory;
    tags: string[];
    techStack: string[];
    difficulty: Difficulty;
    duration: string;
  };
}> {
  // Run clean + metadata extraction in parallel
  const [cleanedContent, metadata] = await Promise.all([
    aiCleanContent(extracted.content || extracted.rawHtml, extracted.title),
    aiExtractMetadata(extracted.title, extracted.content, contentType),
  ]);

  return { content: cleanedContent, metadata };
}

/**
 * Check if LLM is configured and available
 */
export async function isLLMAvailable(): Promise<boolean> {
  const config = await getLLMSettings();
  return config.enabled && !!config.apiKey;
}
