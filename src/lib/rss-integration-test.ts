/**
 * RSS Source Integration Tests
 * Tests actual RSS feed fetching to diagnose issues
 */

import { parseRssFeed, parseRssFeedViaProxy } from './rss-parser';

// Sample RSS sources to test
const TEST_SOURCES = [
  { name: 'Hugging Face', url: 'https://huggingface.co/blog/feed.xml', expectedLang: 'en' },
  { name: 'OpenAI', url: 'https://openai.com/news/rss.xml', expectedLang: 'en' },
  { name: '量子位', url: 'https://www.qbitai.com/feed', expectedLang: 'zh' },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', expectedLang: 'en' },
  { name: 'YouTube', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC2t5bjwNC1VoD4cphK-gJ8g', expectedLang: 'en' },
  { name: 'AWS ML Blog', url: 'https://aws.amazon.com/blogs/amazon-ai/feed/', expectedLang: 'en' },
  { name: 'LangChain', url: 'https://blog.langchain.dev/rss/', expectedLang: 'en' },
  { name: 'Google Cloud', url: 'https://cloudblog.withgoogle.com/rss/', expectedLang: 'en' },
  { name: 'Cloudflare', url: 'https://blog.cloudflare.com/rss', expectedLang: 'en' },
  { name: 'InfoQ', url: 'https://www.infoq.com/rss/rss.action', expectedLang: 'en' },
];

async function testSource(source: typeof TEST_SOURCES[0]) {
  console.log(`\n🧪 Testing: ${source.name} (${source.url})`);

  try {
    // Try direct fetch first
    const feed = await parseRssFeed(source.url);
    console.log(`  ✅ Direct fetch SUCCESS`);
    console.log(`     Title: ${feed.title}`);
    console.log(`     Items: ${feed.items.length}`);
    if (feed.items.length > 0) {
      console.log(`     First item: ${feed.items[0].title?.substring(0, 50)}...`);
    }
    return { success: true, method: 'direct', items: feed.items.length };
  } catch (directError: any) {
    console.log(`  ❌ Direct fetch FAILED: ${directError.message?.substring(0, 100)}`);

    // Try proxy fallback
    try {
      console.log(`  🔄 Trying proxy...`);
      const feed = await parseRssFeedViaProxy(source.url);
      console.log(`  ✅ Proxy fetch SUCCESS`);
      console.log(`     Title: ${feed.title}`);
      console.log(`     Items: ${feed.items.length}`);
      return { success: true, method: 'proxy', items: feed.items.length };
    } catch (proxyError: any) {
      console.log(`  ❌ Proxy fetch FAILED: ${proxyError.message?.substring(0, 100)}`);
      return { success: false, error: proxyError.message, method: 'both' };
    }
  }
}

async function runIntegrationTests() {
  console.log('='.repeat(60));
  console.log('RSS Source Integration Tests');
  console.log('='.repeat(60));

  const results = [];

  for (const source of TEST_SOURCES) {
    const result = await testSource(source);
    results.push({ name: source.name, ...result });
  }

  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  console.log(`Total: ${results.length}`);
  console.log(`Success: ${successCount} (${Math.round(successCount/results.length*100)}%)`);
  console.log(`Failed: ${failCount} (${Math.round(failCount/results.length*100)}%)`);

  console.log('\nFailed sources:');
  results.filter(r => !r.success).forEach(r => {
    console.log(`  - ${r.name}: ${r.error?.substring(0, 50)}`);
  });

  return results;
}

// Export for testing
export { runIntegrationTests, TEST_SOURCES };

// Run if called directly
runIntegrationTests();
