import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { parseOpml, OmplOutline } from '@/lib/rss-parser';
import { addRssSource, getAllRssSources } from '@/lib/db/news';
import { v4 as uuidv4 } from 'uuid';

// Default RSS sources - comprehensive list for all categories
const DEFAULT_SOURCES: Array<{
  name: string;
  url: string;
  category: 'Articles' | 'Podcasts' | 'Twitters' | 'Videos';
  language: 'en' | 'zh' | 'ja';
}> = [
  // Articles - English
  { name: 'OpenAI Blog', url: 'https://openai.com/news/rss.xml', category: 'Articles', language: 'en' },
  { name: 'Hugging Face Blog', url: 'https://huggingface.co/blog/feed.xml', category: 'Articles', language: 'en' },
  { name: 'Google DeepMind Blog', url: 'https://deepmind.com/blog/feed/basic/', category: 'Articles', language: 'en' },
  { name: 'LangChain Blog', url: 'https://blog.langchain.dev/rss/', category: 'Articles', language: 'en' },
  { name: 'Microsoft Azure Blog', url: 'https://azure.microsoft.com/en-us/blog/feed/', category: 'Articles', language: 'en' },
  { name: 'AWS Machine Learning Blog', url: 'https://aws.amazon.com/blogs/amazon-ai/feed/', category: 'Articles', language: 'en' },
  { name: 'Anthropic Blog', url: 'https://www.anthropic.com/rss/blog.xml', category: 'Articles', language: 'en' },
  { name: 'Meta Engineering', url: 'https://engineering.fb.com/feed/', category: 'Articles', language: 'en' },
  { name: 'Google Cloud Blog', url: 'https://cloudblog.withgoogle.com/rss/', category: 'Articles', language: 'en' },
  { name: 'Elastic Blog', url: 'https://www.elastic.co/blog/feed', category: 'Articles', language: 'en' },
  { name: 'NVIDIA Blog', url: 'https://blogs.nvidia.com/feed/', category: 'Articles', language: 'en' },
  { name: 'Stability AI Blog', url: 'https://stability.ai/blog/rss.xml', category: 'Articles', language: 'en' },
  { name: 'Midjourney Blog', url: 'https://www.midjourney.com/blog/rss', category: 'Articles', language: 'en' },
  { name: 'Runwayml Blog', url: 'https://runwayml.com/feed/', category: 'Articles', language: 'en' },
  { name: 'Cohere Blog', url: 'https://cohere.com/blog/rss.xml', category: 'Articles', language: 'en' },
  { name: 'AI21 Labs Blog', url: 'https://www.ai21.com/blog/rss', category: 'Articles', language: 'en' },
  { name: 'Mistral AI Blog', url: 'https://mistral.ai/news/rss.xml', category: 'Articles', language: 'en' },
  { name: 'Character AI Blog', url: 'https://character.ai/blog/rss', category: 'Articles', language: 'en' },
  { name: 'Perplexity Blog', url: 'https://www.perplexity.com/blog/rss.xml', category: 'Articles', language: 'en' },
  { name: 'xAI Blog', url: 'https://x.ai/blog/rss', category: 'Articles', language: 'en' },
  // Articles - Chinese
  { name: '量子位', url: 'https://www.qbitai.com/feed', category: 'Articles', language: 'zh' },
  { name: '机器之心', url: 'https://wechat2rss.bestblogs.dev/feed/8d97af31b0de9e48da74558af128a4673d78c9a3.xml', category: 'Articles', language: 'zh' },
  { name: '腾讯技术工程', url: 'https://wechat2rss.bestblogs.dev/feed/1e0ac39f8952b2e7f0807313cf2633d25078a171.xml', category: 'Articles', language: 'zh' },
  { name: '爱范儿', url: 'http://www.ifanr.com/feed', category: 'Articles', language: 'zh' },
  { name: '36氪', url: 'https://wechat2rss.bestblogs.dev/feed/36kr.json', category: 'Articles', language: 'zh' },
  { name: '虎嗅', url: 'https://wechat2rss.bestblogs.dev/feed/huxiu.json', category: 'Articles', language: 'zh' },
  { name: '极客公园', url: 'https://wechat2rss.bestblogs.dev/feed/geekpark.json', category: 'Articles', language: 'zh' },
  { name: '钛媒体', url: 'https://wechat2rss.bestblogs.dev/feed/tmtpost.json', category: 'Articles', language: 'zh' },
  { name: '人人都是产品经理', url: 'https://wechat2rss.bestblogs.dev/feed/2d790e38f8af54c5af77fa5fed687a7c66d34c22.xml', category: 'Articles', language: 'zh' },
  { name: 'InfoQ', url: 'https://www.infoq.com.cn/feed/', category: 'Articles', language: 'zh' },
  // Articles - Japanese
  { name: 'キガジェンヌ', url: 'https://gigazine.net/news/rss_atom.xml', category: 'Articles', language: 'ja' },
  { name: 'TechCrunch Japan', url: 'https://jp.techcrunch.com/feed/', category: 'Articles', language: 'ja' },
  // Podcasts
  { name: 'Lex Fridman Podcast', url: 'https://lexfridman.com/feed/', category: 'Podcasts', language: 'en' },
  { name: 'The TWIML AI Podcast', url: 'https://twimlai.com/feed/podcast/', category: 'Podcasts', language: 'en' },
  { name: 'AI Podcast', url: 'https://podcast.ai/feed.rss', category: 'Podcasts', language: 'en' },
  { name: 'The Gradient Podcast', url: 'https://thegradientpodcast.com/feed/', category: 'Podcasts', language: 'en' },
  { name: 'Talking Machines', url: 'https://podcast.londonai.org/feed.xml', category: 'Podcasts', language: 'en' },
  { name: 'Data Skeptic', url: 'https://dataskeptic.com/blog.rss', category: 'Podcasts', language: 'en' },
  { name: 'Practical AI', url: 'https://changelog.com/practicalai/feed', category: 'Podcasts', language: 'en' },
  { name: 'AI Today Podcast', url: 'https://podcast.aitoday.io/feed.xml', category: 'Podcasts', language: 'en' },
  { name: 'NVIDIA Podcast', url: 'https://blogs.nvidia.com/category/podcast/feed/', category: 'Podcasts', language: 'en' },
  { name: 'Google AI Podcast', url: 'https://podcasts.google.com/feed/aHR0cHM6Ly9hbmRyb2lkLmNvbS9mZWVkL2Fzc2lzdGFudC9wdWJsaWMvcG9kY2FzdHMvYWlfbW9iaWxlLXBvZGNhc3Q', category: 'Podcasts', language: 'en' },
  // Twitters (X)
  { name: 'OpenAI', url: 'https://nitter.net/OpenAI/rss', category: 'Twitters', language: 'en' },
  { name: 'Anthropic', url: 'https://nitter.net/AnthropicAI/rss', category: 'Twitters', language: 'en' },
  { name: 'Hugging Face', url: 'https://nitter.net/huggingface/rss', category: 'Twitters', language: 'en' },
  { name: 'Google DeepMind', url: 'https://nitter.net/GoogleDeepMind/rss', category: 'Twitters', language: 'en' },
  { name: 'Meta AI', url: 'https://nitter.net/MetaAI/rss', category: 'Twitters', language: 'en' },
  { name: 'NVIDIA', url: 'https://nitter.net/NVIDIA/rss', category: 'Twitters', language: 'en' },
  { name: 'Andrew Ng', url: 'https://nitter.net/AndrewYNg/rss', category: 'Twitters', language: 'en' },
  { name: 'Demis Hassabis', url: 'https://nitter.net/demishassabis/rss', category: 'Twitters', language: 'en' },
  { name: 'Sam Altman', url: 'https://nitter.net/sama/rss', category: 'Twitters', language: 'en' },
  { name: 'Dario Amodei', url: 'https://nitter.net/DarioAmodei/rss', category: 'Twitters', language: 'en' },
  { name: 'Ilya Sutskever', url: 'https://nitter.net/ilyasut/rss', category: 'Twitters', language: 'en' },
  { name: 'Andrej Karpathy', url: 'https://nitter.net/karpathy/rss', category: 'Twitters', language: 'en' },
  { name: 'Yann LeCun', url: 'https://nitter.net/ylecun/rss', category: 'Twitters', language: 'en' },
  { name: 'Jeff Dean', url: 'https://nitter.net/JeffDean/rss', category: 'Twitters', language: 'en' },
  { name: 'Geoffrey Hinton', url: 'https://nitter.net/geoffreyhinton/rss', category: 'Twitters', language: 'en' },
  // Videos
  { name: 'Two Minute Papers', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC2u16_lBj9mtp2k3DQLxxNQ', category: 'Videos', language: 'en' },
  { name: 'Lex Fridman', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCs5cX2_2_oS_QQfrQltRdlA', category: 'Videos', language: 'en' },
  { name: '3Blue1Brown', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCYO_jab_esuFRV4b17AJtAw', category: 'Videos', language: 'en' },
  { name: 'CodeEmporium', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCLx053rXJ-xzViqlC7U0p6A', category: 'Videos', language: 'en' },
  { name: 'AssemblyAI', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCi5M_J-8oyDcUt3jE-jB8cQ', category: 'Videos', language: 'en' },
  { name: 'Hugging Face', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=wc1IxjS5T6G_OqGvUiT4EGw', category: 'Videos', language: 'en' },
  { name: 'NVIDIA AI', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCB_2XIdMqcYjHN-aZyenwow', category: 'Videos', language: 'en' },
  { name: 'Google DeepMind', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC8R_bFU6MxmXg2H5TbD1lew', category: 'Videos', language: 'en' },
  { name: 'Microsoft Research', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCtB14rri5Y3G9C3E2y5Q65A', category: 'Videos', language: 'en' },
  { name: 'Stanford Online', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCEB1n1u_VncP7eqaP6HTyKg', category: 'Videos', language: 'en' },
  { name: 'MIT OpenCourseWare', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC1M01oDNMnyYjNc4i5aF-_Q', category: 'Videos', language: 'en' },
  { name: 'DeepLearning.AI', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCcJJc0UUy82u2pfF0V8U2LA', category: 'Videos', language: 'en' },
  { name: 'AI Explained', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCvKQ0L-UaFjpYpe7aR8V0qA', category: 'Videos', language: 'en' },
  { name: 'AI Jason', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC7L7G4cTfcbW9-QvRv9JLw', category: 'Videos', language: 'en' },
  { name: 'Prompt Engineering', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCj-X6C-JjKjK1hS2m1U-8MQ', category: 'Videos', language: 'en' },
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

    // Explicitly convert to boolean to handle "true" string or undefined
    const isImportDefault = Boolean(importDefault);

    console.log('[import-opml] Request:', { opmlPath, category, importDefault: isImportDefault });

    // If importDefault is true, use default sources - MUST return early
    if (isImportDefault) {
      console.log('[import-opml] Using DEFAULT_SOURCES, category:', category);
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
          let existingSources;
          try {
            existingSources = await getAllRssSources();
            console.log('[import-opml] Got existing sources:', existingSources.length);
          } catch (dbErr: any) {
            console.error('[import-opml] Error getting existing sources:', dbErr);
            results.push({
              name: source.name,
              url: source.url,
              status: 'error',
              message: 'Database error: ' + dbErr.message,
            });
            skipped++;
            continue;
          }
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

          let newSource;
          try {
            newSource = await addRssSource({
              id: uuidv4(),
              name: source.name,
              url: source.url,
              category: source.category,
              language: source.language,
              enabled: true,
            });
            console.log('[import-opml] Added source:', source.name, newSource ? 'success' : 'failed');
          } catch (addErr: any) {
            console.error('[import-opml] Error adding source:', addErr);
            results.push({
              name: source.name,
              url: source.url,
              status: 'error',
              message: 'Failed to add: ' + addErr.message,
            });
            skipped++;
            continue;
          }

          if (newSource) {
            results.push({
              name: newSource.name,
              url: newSource.url,
              status: 'imported',
            });
            imported++;
          } else {
            results.push({
              name: source.name,
              url: source.url,
              status: 'error',
              message: 'Failed to add source',
            });
            skipped++;
          }
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
        const existingSources = await getAllRssSources();
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

            const newSource = await addRssSource({
              id: uuidv4(),
              name: sourceName,
              url: sourceUrl,
              category: category || 'Articles',
              language: detectLanguage(sourceName, sourceUrl),
              enabled: true,
            });

            if (newSource) {
              results.push({
                name: newSource.name,
                url: newSource.url,
                status: 'imported',
              });
              imported++;
            } else {
              results.push({
                name: sourceName,
                url: sourceUrl,
                status: 'error',
                message: 'Failed to add source',
              });
              skipped++;
            }
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
