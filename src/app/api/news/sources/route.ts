import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAllRssSources } from '@/lib/db/news';

// GET - Return all sources (public, no auth required)
export async function GET() {
  try {
    const sources = await getAllRssSources();

    // Fetch article counts per source
    const { data: countData, error: countError } = await supabase
      .from('news_items')
      .select('source_id');

    const countsBySource: Record<string, number> = {};
    if (!countError && countData) {
      countData.forEach(item => {
        countsBySource[item.source_id] = (countsBySource[item.source_id] || 0) + 1;
      });
    }

    // Attach counts
    const sourcesWithCounts = sources.map(source => ({
      id: source.id,
      name: source.name,
      category: source.category,
      language: source.language,
      articleCount: countsBySource[source.id] || 0
    }));

    return NextResponse.json({ sources: sourcesWithCounts });
  } catch (error) {
    console.error('Error fetching RSS sources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch RSS sources' },
      { status: 500 }
    );
  }
}
