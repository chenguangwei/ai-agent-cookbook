import { NextResponse } from 'next/server';
import { parseRssFeed, parseRssFeedViaProxy } from '@/lib/rss-parser';
import { addNewsItem, updateNewsStatus, getAllRssSources, getRssSourceById } from '@/lib/db/news';
import { v4 as uuidv4 } from 'uuid';
import { getTranslateConfig } from '@/lib/translate.config';
import * as cheerio from 'cheerio';

const MAX_ITEMS_PER_SOURCE = 20;

const AI_TAG_CATEGORIES = [
  '软件编程', '人工智能', '产品设计', '商业科技',
  '个人成长', '媒体资讯', '投资财经', '生活文化',
];

/**
 * Use DeepSeek (or any OpenAI-compatible model) to classify an article.
 * Returns one of AI_TAG_CATEGORIES or '媒体资讯' as default.
 */
async function classifyArticleWithAI(title: string, summary: string): Promise<string> {
  try {
    const config = getTranslateConfig();
    if (!config.apiKey) return '媒体资讯';

    const prompt = `你是一个内容分类器。请根据文章标题和摘要，从下列类别中选择最合适的一个输出（只输出类别名称，不要任何解释）：
${AI_TAG_CATEGORIES.join('、')}

标题：${title}
摘要：${(summary || '').substring(0, 500)}`;

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 20,
      }),
    });

    if (!response.ok) return '媒体资讯';

    const data = await response.json();
    const result = (data.choices?.[0]?.message?.content || '').trim();

    // Validate: must be one of the allowed tags
    const matched = AI_TAG_CATEGORIES.find(tag => result.includes(tag));
    return matched || '媒体资讯';
  } catch (e) {
    console.error('[AI Tag] Classification failed:', e);
    return '媒体资讯';
  }
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Fetch RSS feeds from sources
 * POST body: { sourceId?, sourceUrl? }
 * - sourceId: fetch specific source by ID
 * - sourceUrl: fetch and return (temporary, don't save)
 * - neither: fetch all enabled sources
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sourceId, sourceUrl } = body;

    // If sourceUrl provided, fetch and return without saving
    if (sourceUrl) {
      console.log(`[RSS Fetch] Direct fetch requested for URL: ${sourceUrl}`);
      let feed;
      try {
        feed = await parseRssFeed(sourceUrl);
      } catch (err: any) {
        console.log(`[RSS Fetch] Direct fetch failed for ${sourceUrl}, trying external proxy...`);
        feed = await parseRssFeedViaProxy(sourceUrl);
      }
      return NextResponse.json({
        message: 'Feed fetched successfully',
        feedTitle: feed.title,
        feedLink: feed.link,
        items: feed.items.slice(0, MAX_ITEMS_PER_SOURCE).map(item => ({
          title: item.title,
          link: item.link,
          summary: item.summary || item.contentSnippet,
          content: item.content,
          pubDate: item.pubDate,
          isoDate: item.isoDate,
          creator: item.creator,
          author: item.author,
          imageUrl: item.imageUrl,
        })),
        count: Math.min(feed.items.length, MAX_ITEMS_PER_SOURCE),
      });
    }

    // If sourceId provided, fetch that specific source
    if (sourceId) {
      const source = await getRssSourceById(sourceId);
      if (!source) {
        return NextResponse.json(
          { error: 'Source not found' },
          { status: 404 }
        );
      }

      if (!source.enabled) {
        return NextResponse.json(
          { error: 'Source is disabled' },
          { status: 400 }
        );
      }
      console.log(`[RSS Fetch] Fetching single source: ${source.name} (${source.url})`);
      let feed;
      try {
        feed = await parseRssFeed(source.url);
      } catch (err: any) {
        console.log(`[RSS Fetch] Direct fetch failed for ${source.name}, trying external proxy...`);
        feed = await parseRssFeedViaProxy(source.url);
      }
      let addedCount = 0;

      for (const item of feed.items.slice(0, MAX_ITEMS_PER_SOURCE)) {
        if (!item.link) continue;

        // Calculate metrics
        const contentStr = item.content || item.summary || item.contentSnippet || '';
        let cleanText = contentStr;
        let imgCount = 0;
        let codeCount = 0;

        try {
          if (contentStr.includes('<')) {
            const $ = cheerio.load(contentStr);
            cleanText = $.root().text();
            imgCount = $('img').length;
            codeCount = $('code, pre').length;
          }
        } catch (e) {
          cleanText = cleanText.replace(/<[^>]*>?/gm, '');
        }

        // Remove extra whitespace and count words (Chinese/English mixed heuristic)
        cleanText = cleanText.replace(/\s+/g, ' ').trim();
        // Fallback word count if empty: guess from summary length
        const wordCount = cleanText.length > 0 ? cleanText.length : (item.summary?.length || 0) * 2;
        const readTime = Math.max(1, Math.ceil(wordCount / 250));

        // Quality Score Heuristic (0-100)
        // Base 60, +points for length (up to 20), +points for images (up to 10), +points for code (up to 10)
        let qualityScore = 60;
        qualityScore += Math.min(20, Math.floor(wordCount / 100)); // 1 point per 100 words
        qualityScore += Math.min(10, imgCount * 2); // 2 points per image
        qualityScore += Math.min(10, codeCount * 3); // 3 points per code block
        qualityScore = Math.min(98, qualityScore); // Cap at 98 for realism

        const newsItem = {
          id: uuidv4(),
          source_id: source.id,
          source_name: source.name,
          title: item.title,
          summary: item.summary || item.contentSnippet,
          content: item.content,
          url: item.link,
          image_url: item.imageUrl,
          author: item.author || item.creator,
          published_at: item.isoDate || item.pubDate,
          language: source.language,
          word_count: wordCount,
          read_time_minutes: readTime,
          quality_score: qualityScore,
          ai_tag: await classifyArticleWithAI(item.title || '', item.summary || item.contentSnippet || ''),
        };

        const result = await addNewsItem(newsItem);
        if (result) {
          // Auto-approve the news item
          await updateNewsStatus(result.id, 'approved');
          addedCount++;
        }
      }

      return NextResponse.json({
        message: 'Feed fetched successfully',
        sourceId: source.id,
        sourceName: source.name,
        feedTitle: feed.title,
        count: feed.items.length,
        addedCount,
      });
    }

    // Fetch all enabled sources
    const allSources = await getAllRssSources();
    const sources = allSources.filter(s => s.enabled);

    if (sources.length === 0) {
      return NextResponse.json({
        message: 'No enabled sources found',
        results: [],
        totalAdded: 0,
      });
    }

    const results: Array<{
      sourceId: string;
      sourceName: string;
      feedTitle: string;
      count: number;
      addedCount: number;
      error?: string;
    }> = [];
    let totalAdded = 0;

    // Process sources with concurrency (10 at a time)
    const CONCURRENCY = 10;

    async function processSource(source: typeof sources[0]) {
      try {
        console.log(`[RSS] Processing source: ${source.name} (${source.url})`);
        let feed;
        try {
          feed = await parseRssFeed(source.url);
        } catch (directError: any) {
          // If direct fetch fails, try via proxy
          console.log(`[RSS] Trying proxy for ${source.name}...`);
          feed = await parseRssFeedViaProxy(source.url);
        }
        let addedCount = 0;

        for (const item of feed.items.slice(0, MAX_ITEMS_PER_SOURCE)) {
          if (!item.link) continue;

          // Calculate metrics
          const contentStr = item.content || item.summary || item.contentSnippet || '';
          let cleanText = contentStr;
          let imgCount = 0;
          let codeCount = 0;

          try {
            if (contentStr.includes('<')) {
              const $ = cheerio.load(contentStr);
              cleanText = $.root().text();
              imgCount = $('img').length;
              codeCount = $('code, pre').length;
            }
          } catch (e) {
            cleanText = cleanText.replace(/<[^>]*>?/gm, '');
          }

          // Remove extra whitespace and count words (Chinese/English mixed heuristic)
          cleanText = cleanText.replace(/\s+/g, ' ').trim();
          const wordCount = cleanText.length > 0 ? cleanText.length : (item.summary?.length || 0) * 2;
          const readTime = Math.max(1, Math.ceil(wordCount / 250));

          // Quality Score Heuristic (0-100)
          let qualityScore = 60;
          qualityScore += Math.min(20, Math.floor(wordCount / 100)); // 1 point per 100 words
          qualityScore += Math.min(10, imgCount * 2); // 2 points per image
          qualityScore += Math.min(10, codeCount * 3); // 3 points per code block
          qualityScore = Math.min(98, qualityScore); // Cap at 98 for realism

          const newsItem = {
            id: uuidv4(),
            source_id: source.id,
            source_name: source.name,
            title: item.title,
            summary: item.summary || item.contentSnippet,
            content: item.content,
            url: item.link,
            image_url: item.imageUrl,
            author: item.author || item.creator,
            published_at: item.isoDate || item.pubDate,
            language: source.language,
            word_count: wordCount,
            read_time_minutes: readTime,
            quality_score: qualityScore,
            ai_tag: await classifyArticleWithAI(item.title || '', item.summary || item.contentSnippet || ''),
          };

          const result = await addNewsItem(newsItem);
          if (result) {
            // Auto-approve the news item
            await updateNewsStatus(result.id, 'approved');
            addedCount++;
          }
        }

        return {
          sourceId: source.id,
          sourceName: source.name,
          feedTitle: feed.title,
          count: feed.items.length,
          addedCount,
        };
      } catch (err: any) {
        // Log detailed error for debugging
        console.error(`[RSS] Failed to fetch ${source.name} (${source.url}):`, err.message);
        return {
          sourceId: source.id,
          sourceName: source.name,
          feedTitle: '',
          count: 0,
          addedCount: 0,
          error: err.message || 'Failed to fetch feed',
          url: source.url,
        };
      }
    }

    // Process sequentially to avoid worker crashes or timeouts in serverless
    for (const source of sources) {
      const result = await processSource(source);
      results.push(result);
      totalAdded += result.addedCount;
    }

    return NextResponse.json({
      message: 'All feeds fetched',
      results,
      totalAdded,
      sourcesCount: sources.length,
    });
  } catch (err: any) {
    console.error('Failed to fetch RSS feeds:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch RSS feeds' },
      { status: 500 }
    );
  }
}
