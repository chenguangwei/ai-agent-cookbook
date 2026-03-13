import { NextResponse } from 'next/server';
import { getNewsCounts, getAllRssSources, getAllNewsItems } from '@/lib/db/news';

export async function GET() {
  try {
    // Get overall counts
    const counts = getNewsCounts();

    // Get all sources
    const sources = getAllRssSources();
    const sourcesCount = sources.length;

    // Get category stats from sources
    const categoryStats: Record<string, { total: number; enabled: number }> = {};
    sources.forEach(source => {
      const cat = source.category;
      if (!categoryStats[cat]) {
        categoryStats[cat] = { total: 0, enabled: 0 };
      }
      categoryStats[cat].total++;
      if (source.enabled) {
        categoryStats[cat].enabled++;
      }
    });

    // Get recent items (last 10)
    const allItems = getAllNewsItems();
    const recentItems = allItems.slice(0, 10);

    // Get pending items by source
    const pendingItems = allItems.filter(item => item.status === 'pending');
    const pendingBySource: Record<string, number> = {};
    pendingItems.forEach(item => {
      const sourceName = item.source_name || item.source_id;
      pendingBySource[sourceName] = (pendingBySource[sourceName] || 0) + 1;
    });

    return NextResponse.json({
      counts,
      sourcesCount,
      categoryStats,
      recentItems,
      pendingBySource
    });
  } catch (error) {
    console.error('Error fetching news stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news stats' },
      { status: 500 }
    );
  }
}
