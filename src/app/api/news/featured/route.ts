import { NextRequest, NextResponse } from 'next/server';
import { getFeaturedNews } from '@/lib/db/news';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const language = searchParams.get('language') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');

    // Only return is_featured=true news items
    const items = await getFeaturedNews(limit, language);

    return NextResponse.json({
      items,
      total: items.length,
      limit,
    });
  } catch (error) {
    console.error('Error fetching featured news:', error);
    return NextResponse.json(
      { error: 'Failed to fetch featured news' },
      { status: 500 }
    );
  }
}
