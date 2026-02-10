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
    supportedLocales: ['en', 'zh', 'ja'],
    localeNames: {
      en: 'English',
      zh: 'Chinese (Simplified)',
      ja: 'Japanese',
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

  return `You are a professional technical translator. Translate the following Markdown/MDX content into ${targetLangName}.

Rules:
1. Preserve ALL Markdown formatting (headings, code blocks, links, images, lists, etc.)
2. Do NOT translate code inside code blocks (\`\`\` blocks and inline \`code\`)
3. Do NOT translate URLs, file paths, or technical identifiers
4. Keep frontmatter field names (title, description, tags, etc.) as-is, only translate their values
5. Translate naturally - not word-by-word. Use appropriate technical terminology for ${targetLangName}
6. Keep the same frontmatter structure but update locale to "${targetLocale}"
7. For the slug field, keep it the same as the original (do not translate slugs)
8. Return ONLY the translated content, no explanations`;
}
