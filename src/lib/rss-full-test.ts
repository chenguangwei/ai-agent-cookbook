/**
 * Full RSS Source Test
 * Tests all major RSS sources without database
 */

import { parseRssFeed, parseRssFeedViaProxy } from './rss-parser';

// Comprehensive list of RSS sources from the database
const ALL_SOURCES = [
  // English Tech
  { name: 'OpenAI', url: 'https://openai.com/news/rss.xml', lang: 'en' },
  { name: 'Hugging Face', url: 'https://huggingface.co/blog/feed.xml', lang: 'en' },
  { name: 'LangChain', url: 'https://blog.langchain.dev/rss/', lang: 'en' },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', lang: 'en' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', lang: 'en' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', lang: 'en' },
  { name: 'Wired', url: 'https://www.wired.com/feed/rss', lang: 'en' },
  { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/', lang: 'en' },
  { name: 'VentureBeat', url: 'https://venturebeat.com/feed/', lang: 'en' },
  { name: 'AWS ML Blog', url: 'https://aws.amazon.com/blogs/amazon-ai/feed/', lang: 'en' },
  { name: 'Google Cloud', url: 'https://cloudblog.withgoogle.com/rss/', lang: 'en' },
  { name: 'Microsoft Azure', url: 'https://azure.microsoft.com/en-us/blog/feed/', lang: 'en' },
  { name: 'Cloudflare', url: 'https://blog.cloudflare.com/rss', lang: 'en' },
  { name: 'Elastic', url: 'https://www.elastic.co/blog/feed', lang: 'en' },
  { name: 'MongoDB', url: 'https://www.mongodb.com/blog/rss', lang: 'en' },
  { name: 'DeepMind', url: 'https://deepmind.com/blog/feed/basic/', lang: 'en' },
  { name: 'Meta Engineering', url: 'https://engineering.fb.com/feed/', lang: 'en' },
  { name: 'Next.js', url: 'https://nextjs.org/feed.xml', lang: 'en' },
  { name: 'Vercel', url: 'https://vercel.com/atom', lang: 'en' },
  { name: 'Smashing Magazine', url: 'https://www.smashingmagazine.com/feed/', lang: 'en' },
  { name: 'InfoQ', url: 'https://www.infoq.com/rss/rss.action', lang: 'en' },
  { name: 'Hacker News', url: 'https://hnrss.org/frontpage', lang: 'en' },
  { name: 'Reddit r/MachineLearning', url: 'https://www.reddit.com/r/MachineLearning/.rss', lang: 'en' },
  { name: 'Last Week in AI', url: 'https://lastweekin.ai/feed/', lang: 'en' },
  { name: 'ByteByteGo', url: 'https://blog.bytebytego.com/feed', lang: 'en' },
  { name: 'Martin Fowler', url: 'https://martinfowler.com/feed.atom', lang: 'en' },
  { name: 'DHH', url: 'https://world.hey.com/dhh/feed.atom', lang: 'en' },

  // Chinese
  { name: '量子位', url: 'https://www.qbitai.com/feed', lang: 'zh' },
  { name: '机器之心', url: 'https://www.jiqizhixin.com/feed', lang: 'zh' },
  { name: '虎嗅', url: 'https://www.huxiu.com/rss', lang: 'zh' },
  { name: '36氪', url: 'https://www.36kr.com/feed/', lang: 'zh' },
  { name: '爱范儿', url: 'https://www.ifanr.com/feed', lang: 'zh' },
  { name: '极客公园', url: 'https://www.geekpark.net/feed', lang: 'zh' },
  { name: '钛媒体', url: 'https://www.tmtpost.com/feed', lang: 'zh' },
  { name: '人人都是产品经理', url: 'https://www.woshipm.com/feed', lang: 'zh' },
  { name: '掘金', url: 'https://juejin.cn/feed', lang: 'zh' },
  { name: '腾讯技术', url: 'https://www.tencent.com/zh-cn/blog/feed.xml', lang: 'zh' },
  { name: '阿里云', url: 'https://developer.aliyun.com/group/techfeed', lang: 'zh' },

  // WeChat via RSS (common)
  { name: 'WeChat - 量子位', url: 'https://wechat2rss.bestblogs.dev/feed/821c3f66-b350-4774-be0e-e271a86033f0.xml', lang: 'zh' },
  { name: 'WeChat - 机器之心', url: 'https://wechat2rss.bestblogs.dev/feed/4efe7ec6970afd4a050d6f10b9e8131a9d5e6816.xml', lang: 'zh' },
  { name: 'WeChat - 虎嗅', url: 'https://wechat2rss.bestblogs.dev/feed/3e2714d06aa36142e8ed6b3f4e5cf9090a069dd2.xml', lang: 'zh' },
];

async function testSource(source: typeof ALL_SOURCES[0]) {
  try {
    const feed = await parseRssFeed(source.url);
    return { success: true, method: 'direct', items: feed.items.length, error: null };
  } catch (directError: any) {
    try {
      const feed = await parseRssFeedViaProxy(source.url);
      return { success: true, method: 'proxy', items: feed.items.length, error: null };
    } catch (proxyError: any) {
      return { success: false, method: 'both', items: 0, error: proxyError.message };
    }
  }
}

async function runFullTest() {
  console.log(`Testing ${ALL_SOURCES.length} RSS sources...\n`);

  const results = [];
  let successDirect = 0;
  let successProxy = 0;
  let failed = 0;

  for (let i = 0; i < ALL_SOURCES.length; i++) {
    const source = ALL_SOURCES[i];
    process.stdout.write(`[${i + 1}/${ALL_SOURCES.length}] ${source.name.substring(0, 25)}... `);

    const result = await testSource(source);

    if (result.success) {
      if (result.method === 'direct') {
        successDirect++;
        console.log(`✅ (direct, ${result.items} items)`);
      } else {
        successProxy++;
        console.log(`✅ (proxy, ${result.items} items)`);
      }
    } else {
      failed++;
      console.log(`❌ (${result.error?.substring(0, 40)})`);
    }

    results.push({ name: source.name, lang: source.lang, ...result });
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total tested: ${ALL_SOURCES.length}`);
  console.log(`Direct success: ${successDirect} (${Math.round(successDirect/ALL_SOURCES.length*100)}%)`);
  console.log(`Proxy success: ${successProxy} (${Math.round(successProxy/ALL_SOURCES.length*100)}%)`);
  console.log(`Failed: ${failed} (${Math.round(failed/ALL_SOURCES.length*100)}%)`);

  // Analyze by language
  console.log('\n' + '='.repeat(60));
  console.log('BY LANGUAGE');
  console.log('='.repeat(60));

  for (const lang of ['en', 'zh']) {
    const langResults = results.filter(r => r.lang === lang);
    const langSuccess = langResults.filter(r => r.success).length;
    const langDirect = langResults.filter(r => r.success && r.method === 'direct').length;
    const langProxy = langResults.filter(r => r.success && r.method === 'proxy').length;

    console.log(`\n${lang.toUpperCase()} (${langResults.length} sources):`);
    console.log(`  Direct: ${langDirect}, Proxy: ${langProxy}, Failed: ${langResults.length - langSuccess}`);
  }

  // Error analysis
  console.log('\n' + '='.repeat(60));
  console.log('ERRORS');
  console.log('='.repeat(60));

  const errors = results.filter(r => !r.success).map(r => r.error);
  const errorTypes: Record<string, number> = {};
  errors.forEach(e => {
    const type = e?.substring(0, 50) || 'Unknown';
    errorTypes[type] = (errorTypes[type] || 0) + 1;
  });

  Object.entries(errorTypes).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

  return results;
}

runFullTest().catch(console.error);
