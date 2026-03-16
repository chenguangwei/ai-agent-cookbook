import { NextRequest, NextResponse } from 'next/server';
import { updateNewsStatus } from '@/lib/db/news';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'IDs array is required' },
        { status: 400 }
      );
    }

    const results: Array<{ id: string; success: boolean; item?: any; error?: string }> = [];

    for (const id of ids) {
      try {
        const item = await updateNewsStatus(id, 'rejected');
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
    console.error('Error rejecting news items:', error);
    return NextResponse.json(
      { error: 'Failed to reject news items' },
      { status: 500 }
    );
  }
}
