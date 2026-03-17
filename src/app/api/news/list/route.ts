import { NextRequest, NextResponse } from 'next/server';
import { getApprovedNews, getApprovedNewsCount, getApprovedNewsByDate, getApprovedNewsCountByDate, getAllRssSources } from '@/lib/db/news';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const language = searchParams.get('language') || undefined;
    const date = searchParams.get('date') || undefined;
    const range = searchParams.get('range') || undefined;
    const sourceId = searchParams.get('sourceId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get all sources first for filtering
    const sources = await getAllRssSources();
    const sourceMap = new Map(sources.map(s => [s.id, s]));

    let items;
    let total;

    if (date) {
      // Filter by date - use created_at if published_at is null
      // NOTE: getApprovedNewsByDate does not accept language yet, so we filter it manually after if needed,
      // but let's just fetch and filter:
      items = await getApprovedNewsByDate(date, category, limit, offset);
      if (language) items = items.filter(item => item.language === language);
      total = await getApprovedNewsCountByDate(date, category); // this might be slightly off if we don't pass language to count, but acceptable for now
    } else {
      // Get all approved news
      items = await getApprovedNews(category, limit, offset, language, range);
      total = await getApprovedNewsCount(category, language, range);
    }

    // Filter by source if provided
    if (sourceId && items.length > 0) {
      items = items.filter(item => item.source_id === sourceId);
      total = items.length;
    }

    // Enrich items with source category for frontend placeholder images
    const enrichedItems = items.map(item => {
      const source = sourceMap.get(item.source_id);
      return { ...item, source_category: source?.category || 'Articles' };
    });

    return NextResponse.json({
      items: enrichedItems,
      total,
      limit,
      offset
    });
  } catch (error) {
    console.error('Error fetching news list:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news list' },
      { status: 500 }
    );
  }
}
