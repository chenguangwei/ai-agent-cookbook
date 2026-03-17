import { NextRequest, NextResponse } from 'next/server';
import { getApprovedNewsDates } from '@/lib/db/news';

export async function GET(request: NextRequest) {
  try {
    const dates = await getApprovedNewsDates(90);

    return NextResponse.json({
      dates
    });
  } catch (error) {
    console.error('Error fetching news dates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news dates' },
      { status: 500 }
    );
  }
}
