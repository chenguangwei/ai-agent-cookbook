import { NextRequest, NextResponse } from 'next/server';
import { updateNewsLanguage } from '@/lib/db/news';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, language } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'IDs array is required' },
        { status: 400 }
      );
    }

    if (!language || !['en', 'zh', 'ja', 'ko'].includes(language)) {
      return NextResponse.json(
        { error: 'Valid language is required (en, zh, ja, or ko)' },
        { status: 400 }
      );
    }

    const results: Array<{ id: string; success: boolean; item?: any; error?: string }> = [];

    for (const id of ids) {
      try {
        const item = await updateNewsLanguage(id, language);
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
        failed: failCount,
        language
      }
    });
  } catch (error: any) {
    console.error('Error updating news language:', error);
    return NextResponse.json(
      { error: 'Failed to update news language' },
      { status: 500 }
    );
  }
}
