import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import {
  getTranslateConfig,
  buildTranslationPrompt,
  contentTypeLabels,
  contentTypeFormats,
  type ContentType,
} from '@/lib/translate.config';

const CONTENT_DIR = path.join(process.cwd(), 'content');

const CONTENT_TYPE_DIRS: Record<ContentType, string> = {
  tutorials: 'tutorials',
  docs: 'docs',
  news: 'news',
  labs: 'labs',
  showcase: 'showcase',
  tools: 'tools',
};

interface ContentItem {
  slug: string;
  title: string;
  sourceLocale: string;
  contentType: ContentType;
  locales: Record<string, boolean>;
}

/**
 * Extract title from file content
 */
function extractTitle(content: string, format: 'mdx' | 'json', slug: string): string {
  if (format === 'json') {
    try {
      const json = JSON.parse(content);
      return json.title || slug;
    } catch {
      return slug;
    }
  }
  const titleMatch = content.match(/^title:\s*['"](.+?)['"]/m);
  return titleMatch ? titleMatch[1] : slug;
}

/**
 * Scan a content type directory for locale status
 */
async function scanContentType(
  contentType: ContentType,
  locales: string[]
): Promise<ContentItem[]> {
  const dir = path.join(CONTENT_DIR, CONTENT_TYPE_DIRS[contentType]);
  const format = contentTypeFormats[contentType];
  const ext = format === 'json' ? '.json' : '.mdx';
  const result: Record<string, Record<string, boolean>> = {};

  for (const locale of locales) {
    const localeDir = path.join(dir, locale);
    try {
      const files = await fs.readdir(localeDir);
      for (const file of files) {
        if (!file.endsWith(ext)) continue;
        const slug = file.replace(ext, '');
        if (!result[slug]) {
          result[slug] = {};
        }
        result[slug][locale] = true;
      }
    } catch {
      // Directory may not exist
    }
  }

  const items: ContentItem[] = [];

  for (const [slug, localeMap] of Object.entries(result)) {
    let title = slug;
    let sourceLocale = '';
    for (const locale of locales) {
      if (localeMap[locale]) {
        try {
          const filePath = path.join(dir, locale, `${slug}${ext}`);
          const content = await fs.readFile(filePath, 'utf-8');
          title = extractTitle(content, format, slug);
          sourceLocale = locale;
          break;
        } catch {
          // skip
        }
      }
    }

    items.push({
      slug,
      title,
      sourceLocale,
      contentType,
      locales: Object.fromEntries(locales.map((l) => [l, !!localeMap[l]])),
    });
  }

  return items;
}

/**
 * GET /api/translate
 * Returns translation status for all content types
 * Query params: ?type=tutorials,docs (optional filter)
 */
export async function GET(request: NextRequest) {
  try {
    const config = getTranslateConfig();
    const locales = config.supportedLocales;

    // Parse optional type filter
    const typeParam = request.nextUrl.searchParams.get('type');
    const types: ContentType[] = typeParam
      ? (typeParam.split(',') as ContentType[]).filter((t) => t in contentTypeLabels)
      : (Object.keys(contentTypeLabels) as ContentType[]);

    const allItems: ContentItem[] = [];
    for (const type of types) {
      const items = await scanContentType(type, locales);
      allItems.push(...items);
    }

    return NextResponse.json({
      items: allItems,
      supportedLocales: locales,
      localeNames: config.localeNames,
      contentTypes: contentTypeLabels,
      configured: !!config.apiKey,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to scan content' },
      { status: 500 }
    );
  }
}

// Max chars per chunk before splitting (~4000 tokens for typical English/Chinese mix)
const CHUNK_CHAR_LIMIT = 8000;

/**
 * Call the translation API for a single piece of content.
 * Returns { content, truncated } where truncated=true means the output was cut off.
 */
async function callTranslateAPI(
  config: ReturnType<typeof getTranslateConfig>,
  systemPrompt: string,
  userContent: string
): Promise<{ content: string | null; truncated: boolean }> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  const content = choice?.message?.content ?? null;
  const truncated = choice?.finish_reason === 'length';
  return { content, truncated };
}

/**
 * Split MDX content into translatable chunks by top-level headings.
 * Keeps frontmatter with the first chunk. Splits on ## or # headings.
 */
function splitMdxIntoChunks(content: string): string[] {
  // Extract frontmatter
  const frontmatterMatch = content.match(/^---\n[\s\S]*?\n---\n/);
  const frontmatter = frontmatterMatch ? frontmatterMatch[0] : '';
  const body = frontmatter ? content.slice(frontmatter.length) : content;

  // Split body by H1 or H2 headings (keep heading with its section)
  const sectionRegex = /(?=^#{1,2} )/m;
  const sections = body.split(sectionRegex).filter(Boolean);

  if (sections.length === 0) return [content];

  const chunks: string[] = [];
  let currentChunk = frontmatter + (sections[0] ?? '');

  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    if ((currentChunk + '\n\n' + section).length > CHUNK_CHAR_LIMIT) {
      // If the section itself is too large, split it by H3
      if (section.length > CHUNK_CHAR_LIMIT) {
        chunks.push(currentChunk.trim());
        const subSections = section.split(/(?=^### )/m).filter(Boolean);
        let subChunk = '';
        for (const sub of subSections) {
          if ((subChunk + sub).length > CHUNK_CHAR_LIMIT && subChunk) {
            chunks.push(subChunk.trim());
            subChunk = sub;
          } else {
            subChunk += (subChunk ? '\n\n' : '') + sub;
          }
        }
        currentChunk = subChunk;
      } else {
        chunks.push(currentChunk.trim());
        currentChunk = section;
      }
    } else {
      currentChunk += '\n\n' + section;
    }
  }

  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  return chunks.length > 0 ? chunks : [content];
}

/**
 * POST /api/translate
 * Translate content from one locale to another
 * Body: { slug, sourceLocale, targetLocale, contentType }
 *   or: { items: [{ slug, sourceLocale, targetLocale, contentType }, ...] } for batch
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const config = getTranslateConfig();

    if (!config.apiKey) {
      return NextResponse.json(
        { error: 'Translation API key not configured. Set TRANSLATE_API_KEY in .env.local' },
        { status: 500 }
      );
    }

    // Support single or batch translation
    const items: Array<{
      slug: string;
      sourceLocale: string;
      targetLocale: string;
      contentType: ContentType;
    }> = body.items || [body];

    const results: Array<{ slug: string; contentType: string; success: boolean; message: string }> = [];

    for (const item of items) {
      const { slug, sourceLocale, targetLocale, contentType = 'tutorials' } = item;

      if (!slug || !sourceLocale || !targetLocale) {
        results.push({ slug: slug || '?', contentType, success: false, message: 'Missing required fields' });
        continue;
      }

      if (!config.supportedLocales.includes(targetLocale)) {
        results.push({ slug, contentType, success: false, message: `Unsupported locale: ${targetLocale}` });
        continue;
      }

      const format = contentTypeFormats[contentType] || 'mdx';
      const ext = format === 'json' ? '.json' : '.mdx';
      const dir = path.join(CONTENT_DIR, CONTENT_TYPE_DIRS[contentType] || contentType);

      // Read source file
      const sourcePath = path.join(dir, sourceLocale, `${slug}${ext}`);
      let sourceContent: string;
      try {
        sourceContent = await fs.readFile(sourcePath, 'utf-8');
      } catch {
        results.push({ slug, contentType, success: false, message: `Source not found: ${sourceLocale}/${slug}${ext}` });
        continue;
      }

      // Call OpenAI-compatible API
      const targetLangName = config.localeNames[targetLocale] || targetLocale;
      const systemPrompt = buildTranslationPrompt(targetLocale, targetLangName, format);

      try {
        let translatedContent: string;

        if (format === 'mdx' && sourceContent.length > CHUNK_CHAR_LIMIT) {
          // Split large MDX into chunks and translate each part
          const chunks = splitMdxIntoChunks(sourceContent);
          const translatedChunks: string[] = [];

          for (let i = 0; i < chunks.length; i++) {
            const chunkPrompt = i === 0
              ? systemPrompt
              : `${systemPrompt}\n\nNote: This is a continuation chunk of a larger document. Translate directly without adding any preamble.`;

            const result = await callTranslateAPI(config, chunkPrompt, chunks[i]);
            if (!result.content) {
              results.push({ slug, contentType, success: false, message: `No translation returned for chunk ${i + 1}/${chunks.length}` });
              break;
            }
            if (result.truncated) {
              results.push({ slug, contentType, success: false, message: `Translation truncated at chunk ${i + 1}/${chunks.length}. Content may be too long even after chunking.` });
              break;
            }
            translatedChunks.push(result.content);
          }

          if (translatedChunks.length !== chunks.length) continue;
          translatedContent = translatedChunks.join('\n\n');
        } else {
          const result = await callTranslateAPI(config, systemPrompt, sourceContent);
          if (!result.content) {
            results.push({ slug, contentType, success: false, message: 'No translation returned' });
            continue;
          }
          if (result.truncated) {
            results.push({ slug, contentType, success: false, message: 'Translation was truncated by the model (output limit exceeded). Try using a model with higher output token limits.' });
            continue;
          }
          translatedContent = result.content;
        }

        // Clean up: remove code fences if the model wrapped it
        if (format === 'json') {
          translatedContent = translatedContent
            .replace(/^```(?:json)?\n/i, '')
            .replace(/\n```$/i, '')
            .trim();
        } else {
          translatedContent = translatedContent
            .replace(/^```(?:mdx|markdown|md)?\n/i, '')
            .replace(/\n```$/i, '')
            .trim();
        }

        // Ensure target directory exists
        const targetDir = path.join(dir, targetLocale);
        await fs.mkdir(targetDir, { recursive: true });

        // Write translated file
        const targetPath = path.join(targetDir, `${slug}${ext}`);
        await fs.writeFile(targetPath, translatedContent, 'utf-8');

        results.push({
          slug,
          contentType,
          success: true,
          message: `Translated to ${targetLocale}`,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        results.push({ slug, contentType, success: false, message: msg });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    return NextResponse.json({
      success: successCount > 0,
      message: `Translated ${successCount}/${results.length} items`,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Translation failed: ${message}` },
      { status: 500 }
    );
  }
}
