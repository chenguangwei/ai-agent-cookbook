/**
 * Translation Configuration
 *
 * Supports any OpenAI-compatible API endpoint (OpenAI, Ollama, DeepSeek, etc.)
 *
 * Environment variables:
 *   TRANSLATE_API_KEY     - API key for the translation service
 *   TRANSLATE_BASE_URL    - Base URL (default: https://api.openai.com/v1)
 *   TRANSLATE_MODEL       - Model name (default: gpt-4o)
 */

export interface TranslateConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  supportedLocales: string[];
  localeNames: Record<string, string>;
}

export function getTranslateConfig(): TranslateConfig {
  return {
    apiKey: process.env.TRANSLATE_API_KEY || '',
    baseUrl: process.env.TRANSLATE_BASE_URL || 'https://api.openai.com/v1',
    model: process.env.TRANSLATE_MODEL || 'gpt-4o',
    supportedLocales: ['en', 'zh', 'ja', 'ko'],
    localeNames: {
      en: 'English',
      zh: 'Chinese (Simplified)',
      ja: 'Japanese',
      ko: 'Korean',
    },
  };
}

export type ContentType = 'tutorials' | 'docs' | 'news' | 'labs' | 'showcase' | 'tools';

export const contentTypeLabels: Record<ContentType, string> = {
  tutorials: 'Tutorials',
  docs: 'Documentation',
  news: 'News',
  labs: 'Practice Labs',
  showcase: 'Showcase',
  tools: 'Tools',
};

export const contentTypeFormats: Record<ContentType, 'mdx' | 'json'> = {
  tutorials: 'mdx',
  docs: 'mdx',
  news: 'mdx',
  labs: 'json',
  showcase: 'json',
  tools: 'mdx',
};

/**
 * Build the system prompt for translating content.
 */
export function buildTranslationPrompt(targetLocale: string, targetLangName: string, format: 'mdx' | 'json' = 'mdx'): string {
  if (format === 'json') {
    return `You are a professional technical translator. Translate the following JSON content into ${targetLangName}.

Rules:
1. Only translate the VALUES of string fields, NOT the keys
2. Do NOT translate URLs, file paths, or technical identifiers
3. Update the "locale" field value to "${targetLocale}"
4. Translate naturally - not word-by-word. Use appropriate technical terminology for ${targetLangName}
5. Return ONLY valid JSON, no explanations or markdown fences
6. Preserve the exact same JSON structure`;
  }

  return `You are a professional technical translator AND markdown formatter. Translate the following Markdown/MDX content into ${targetLangName}, while also fixing any formatting issues in the source.

Translation Rules:
1. Preserve ALL Markdown formatting (headings, code blocks, links, images, lists, etc.)
2. Do NOT translate code inside code blocks (\`\`\` blocks and inline \`code\`)
3. Do NOT translate URLs, file paths, or technical identifiers
4. Keep frontmatter field names (title, description, tags, etc.) as-is, only translate their values
5. Translate naturally - not word-by-word. Use appropriate technical terminology for ${targetLangName}
6. Keep the same frontmatter structure but update locale to "${targetLocale}"
7. For the slug field, keep it the same as the original (do not translate slugs)

Formatting Fix Rules (apply while translating):
8. Any code, commands, or technical syntax that is NOT in a code block MUST be wrapped in proper fenced code blocks with the correct language tag (e.g., \`\`\`bash, \`\`\`python, \`\`\`json, \`\`\`yaml, \`\`\`javascript, \`\`\`typescript, \`\`\`shell, etc.)
9. Shell commands (starting with $, npm, pip, git, curl, etc.) must be in \`\`\`bash code blocks
10. JSON objects/arrays must be in \`\`\`json code blocks
11. YAML content must be in \`\`\`yaml code blocks
12. Configuration file content must be in appropriate language code blocks
13. Inline code (short variable names, function names, file paths) should use backtick notation: \`code\`
14. Do NOT use blockquotes (> ) to wrap code — always use fenced code blocks
15. CRITICAL MDX safety: Curly braces {{ }} in regular text paragraphs must be escaped as \{{\}} to prevent JSX parse errors. Do NOT escape braces inside code blocks.
16. CRITICAL MDX safety: Do NOT place \`---\` on its own line outside of frontmatter — wrap it in a \`\`\`yaml code block if showing YAML examples
17. Remove any HTML artifacts, tracking parameters, or malformed markup from the source content
18. Fix inconsistent heading levels (e.g., jumping from # to ###)

Return ONLY the translated and formatted content, no explanations.`;
}
