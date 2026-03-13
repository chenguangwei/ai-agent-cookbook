import { NextRequest, NextResponse } from 'next/server';
import { getAllNewsItems, getAllRssSources, getNewsCounts } from '@/lib/db/news';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const category = searchParams.get('category') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get all news items (optionally filtered by status)
    let items = getAllNewsItems(status);

    // Filter by category if provided
    if (category) {
      const sources = getAllRssSources();
      const sourceMap = new Map(sources.map(s => [s.id, s]));
      items = items.filter(item => {
        const source = sourceMap.get(item.source_id);
        return source?.category === category;
      });
    }

    // Get counts
    const counts = getNewsCounts();

    // Get all sources
    const sources = getAllRssSources();

    // Calculate category stats
    const categoryStats: Record<string, number> = {};
    const sourceMap = new Map(sources.map(s => [s.id, s]));
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
