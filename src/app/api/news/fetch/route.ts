import { NextResponse } from 'next/server';
import { parseRssFeed, parseRssFeedViaProxy } from '@/lib/rss-parser';
import { addNewsItem, getAllRssSources, getRssSourceById } from '@/lib/db/news';
import { v4 as uuidv4 } from 'uuid';

const MAX_ITEMS_PER_SOURCE = 20;

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
      const feed = await parseRssFeed(sourceUrl);
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

      const feed = await parseRssFeed(source.url);
      let addedCount = 0;

      for (const item of feed.items.slice(0, MAX_ITEMS_PER_SOURCE)) {
        if (!item.link) continue;

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
        };

        const result = await addNewsItem(newsItem);
        if (result) {
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
          };

          const result = await addNewsItem(newsItem);
          if (result) {
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

    // Process in batches
    for (let i = 0; i < sources.length; i += CONCURRENCY) {
      const batch = sources.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.all(batch.map(processSource));
      results.push(...batchResults);
      totalAdded += batchResults.reduce((sum, r) => sum + r.addedCount, 0);
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
