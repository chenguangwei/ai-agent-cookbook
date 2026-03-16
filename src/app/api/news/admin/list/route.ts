import { NextRequest, NextResponse } from 'next/server';
import { getAllNewsItems, getAllRssSources, getNewsCounts } from '@/lib/db/news';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const category = searchParams.get('category') || undefined;
    const language = searchParams.get('language') || undefined;
    const sourceId = searchParams.get('sourceId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get all sources first
    const sources = await getAllRssSources();
    const sourceMap = new Map(sources.map(s => [s.id, s]));

    // Get all news items (optionally filtered by status)
    let items = await getAllNewsItems(status);

    // Filter by category if provided
    if (category) {
      items = items.filter(item => {
        const source = sourceMap.get(item.source_id);
        return source?.category === category;
      });
    }

    // Filter by language if provided
    if (language) {
      items = items.filter(item => item.language === language);
    }

    // Filter by source if provided
    if (sourceId) {
      items = items.filter(item => item.source_id === sourceId);
    }

    // Get counts
    const counts = await getNewsCounts();

    // Calculate category stats
    const categoryStats: Record<string, number> = {};
    items.forEach(item => {
      const source = sourceMap.get(item.source_id);
      if (source) {
        const cat = source.category;
        categoryStats[cat] = (categoryStats[cat] || 0) + 1;
      }
    });

    // Apply pagination
    const total = items.length;
    const paginatedItems = items.slice(offset, offset + limit);

    return NextResponse.json({
      items: paginatedItems,
      total,
      counts,
      sources,
      categoryStats
    });
  } catch (error) {
    console.error('Error fetching news items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news items' },
      { status: 500 }
    );
  }
}
