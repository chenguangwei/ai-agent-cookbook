import { NextRequest, NextResponse } from 'next/server';
import { updateNewsStatus, getNewsItemById } from '@/lib/db/news';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, isFeatured } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'IDs array is required' },
        { status: 400 }
      );
    }

    const results: Array<{ id: string; success: boolean; item?: any; error?: string }> = [];

    for (const id of ids) {
      try {
        const item = updateNewsStatus(id, 'approved', isFeatured);
        if (item) {
          results.push({ id, success: true, item });
        } else {
          results.push({ id, success: false, error: 'Item not found' });
        }
      } catch (error: any) {
        results.push({ id, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      results,
      summary: {
        total: ids.length,
        success: successCount,
        failed: failCount
      }
    });
  } catch (error: any) {
    console.error('Error approving news items:', error);
    return NextResponse.json(
      { error: 'Failed to approve news items' },
      { status: 500 }
    );
  }
}
