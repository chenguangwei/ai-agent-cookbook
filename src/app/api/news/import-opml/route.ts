import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { parseOpml, OmplOutline } from '@/lib/rss-parser';
import { addRssSource, getAllRssSources } from '@/lib/db/news';
import { v4 as uuidv4 } from 'uuid';

// Default RSS sources from BestBlogs Articles category
const DEFAULT_SOURCES: Array<{
  name: string;
  url: string;
  category: 'Articles' | 'Podcasts' | 'Twitters' | 'Videos';
  language: 'en' | 'zh' | 'ja';
}> = [
  { name: 'OpenAI Blog', url: 'https://openai.com/news/rss.xml', category: 'Articles', language: 'en' },
  { name: 'Hugging Face Blog', url: 'https://huggingface.co/blog/feed.xml', category: 'Articles', language: 'en' },
  { name: 'Google DeepMind Blog', url: 'https://deepmind.com/blog/feed/basic/', category: 'Articles', language: 'en' },
  { name: 'LangChain Blog', url: 'https://blog.langchain.dev/rss/', category: 'Articles', language: 'en' },
  { name: 'Microsoft Azure Blog', url: 'https://azure.microsoft.com/en-us/blog/feed/', category: 'Articles', language: 'en' },
  { name: 'AWS Machine Learning Blog', url: 'https://aws.amazon.com/blogs/amazon-ai/feed/', category: 'Articles', language: 'en' },
  { name: '量子位', url: 'https://www.qbitai.com/feed', category: 'Articles', language: 'zh' },
  { name: '机器之心', url: 'https://wechat2rss.bestblogs.dev/feed/8d97af31b0de9e48da74558af128a4673d78c9a3.xml', category: 'Articles', language: 'zh' },
  { name: '腾讯技术工程', url: 'https://wechat2rss.bestblogs.dev/feed/1e0ac39f8952b2e7f0807313cf2633d25078a171.xml', category: 'Articles', language: 'zh' },
  { name: '爱范儿', url: 'http://www.ifanr.com/feed', category: 'Articles', language: 'zh' },
];

// Detect language from source name or URL
function detectLanguage(name: string, url: string): 'en' | 'zh' | 'ja' {
  const lowerName = name.toLowerCase();
  const lowerUrl = url.toLowerCase();

  // Check if name contains Chinese characters
  const chineseRegex = /[\u4e00-\u9fff]/;
  if (chineseRegex.test(name)) return 'zh';

  // Check if URL contains Chinese domain or path
  if (chineseRegex.test(url)) return 'zh';

  // Check if name contains Japanese characters
  const japaneseRegex = /[\u3040-\u309f\u30a0-\u30ff]/;
  if (japaneseRegex.test(name)) return 'ja';

  // Check for common Chinese source name patterns
  const chineseNames = [
    '量子位', '机器之心', '腾讯', '爱范儿', '极客公园', '虎嗅', '36氪',
    '钛媒体', '品玩', '硅星人', '脑极羊', '将门创投', ' resumes',
    'infoq', 'segmentfault', 'cocoachina', 'oschina', 'cnblogs',
    'juejin', 'zhihu', 'weibo', 'tencent', 'aliyun', 'baidu'
  ];
  if (chineseNames.some(n => lowerName.includes(n.toLowerCase()))) return 'zh';

  // Check URL for Chinese platforms
  const chineseUrls = ['wechat', 'qq.com', 'baidu.com', 'aliyun.com', 'tencent.com',
    'zhihu.com', 'juejin.cn', 'segmentfault.com', 'cocoachina.com', 'oschina.net'];
  if (chineseUrls.some(u => lowerUrl.includes(u))) return 'zh';

  // Check for common Japanese source patterns
  const japaneseNames = ['技術', 'テクノロジー', ' Tech', 'Gihyo', 'Postd'];
  if (japaneseNames.some(n => name.includes(n))) return 'ja';

  // Default to English
  return 'en';
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Import RSS sources from OPML or default sources
 * POST body: { opmlPath?, category?, importDefault? }
 * - importDefault: use default sources (hardcoded)
 * - opmlPath: read and parse OPML file
 *
 * GET: List default sources
 */
export async function GET() {
  return NextResponse.json({
    message: 'Default RSS sources',
    sources: DEFAULT_SOURCES.map(s => ({
      name: s.name,
      url: s.url,
      category: s.category,
      language: s.language,
    })),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { opmlPath, category, importDefault } = body;

    // If importDefault is true, use default sources
    if (importDefault) {
      const categoryFilter = category || 'Articles';
      const sourcesToImport = DEFAULT_SOURCES.filter(s => s.category === categoryFilter);

      if (sourcesToImport.length === 0) {
        return NextResponse.json({
          message: `No sources found for category: ${categoryFilter}`,
          imported: 0,
          skipped: 0,
          results: [],
        });
      }

      let imported = 0;
      let skipped = 0;
      const results: Array<{
        name: string;
        url: string;
        status: 'imported' | 'skipped' | 'error';
        message?: string;
      }> = [];

      for (const source of sourcesToImport) {
        try {
          // Check if source already exists by URL
          const existingSources = getAllRssSources();
          const exists = existingSources.some(s => s.url === source.url);

          if (exists) {
            results.push({
              name: source.name,
              url: source.url,
              status: 'skipped',
              message: 'Already exists',
            });
            skipped++;
            continue;
          }

          const newSource = addRssSource({
            id: uuidv4(),
            name: source.name,
            url: source.url,
            category: source.category,
            language: source.language,
            enabled: true,
          });

          results.push({
            name: newSource.name,
            url: newSource.url,
            status: 'imported',
          });
          imported++;
        } catch (err: any) {
          results.push({
            name: source.name,
            url: source.url,
            status: 'error',
            message: err.message || 'Failed to import',
          });
          skipped++;
        }
      }

      return NextResponse.json({
        message: `Imported default sources (${categoryFilter})`,
        imported,
        skipped,
        results,
      });
    }

    // If opmlPath provided, read and parse OPML file
    if (opmlPath) {
      const fullPath = opmlPath.startsWith('/')
        ? opmlPath
        : `${process.cwd()}/${opmlPath}`;

      try {
        const opmlContent = await fs.readFile(fullPath, 'utf-8');
        const outlines = parseOpml(opmlContent);

        if (outlines.length === 0) {
          return NextResponse.json({
            message: 'No RSS feeds found in OPML file',
            imported: 0,
            skipped: 0,
            results: [],
          });
        }

        let imported = 0;
        let skipped = 0;
        const results: Array<{
          name: string;
          url: string;
          status: 'imported' | 'skipped' | 'error';
          message?: string;
        }> = [];

        // Get existing sources to check for duplicates
        const existingSources = getAllRssSources();
        const existingUrls = new Set(existingSources.map(s => s.url));

        for (const outline of outlines) {
          const sourceName = outline.title || outline.text || 'Unknown';
          const sourceUrl = outline.xmlUrl;

          if (!sourceUrl) continue;

          try {
            if (existingUrls.has(sourceUrl)) {
              results.push({
                name: sourceName,
                url: sourceUrl,
                status: 'skipped',
                message: 'Already exists',
              });
              skipped++;
              continue;
            }

            const newSource = addRssSource({
              id: uuidv4(),
              name: sourceName,
              url: sourceUrl,
              category: category || 'Articles',
              language: detectLanguage(sourceName, sourceUrl),
              enabled: true,
            });

            results.push({
              name: newSource.name,
              url: newSource.url,
              status: 'imported',
            });
            imported++;
            existingUrls.add(sourceUrl); // Add to set to prevent duplicates within same import
          } catch (err: any) {
            results.push({
              name: sourceName,
              url: sourceUrl,
              status: 'error',
              message: err.message || 'Failed to import',
            });
            skipped++;
          }
        }

        return NextResponse.json({
          message: `Imported from OPML: ${fullPath}`,
          imported,
          skipped,
          total: outlines.length,
          results,
        });
      } catch (err: any) {
        if (err.code === 'ENOENT') {
          return NextResponse.json(
            { error: `OPML file not found: ${fullPath}` },
            { status: 404 }
          );
        }
        throw err;
      }
    }

    // If neither importDefault nor opmlPath provided, return error
    return NextResponse.json(
      { error: 'Please provide either importDefault: true or opmlPath' },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('Failed to import OPML:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to import OPML' },
      { status: 500 }
    );
  }
}
