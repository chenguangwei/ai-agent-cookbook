import { NextRequest, NextResponse } from 'next/server';
import { toggleFeatured } from '@/lib/db/news';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    const item = await toggleFeatured(id);

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    const message = item.is_featured
      ? 'Item has been featured'
      : 'Item has been unfeatured';

    return NextResponse.json({
      item,
      message
    });
  } catch (error: any) {
    console.error('Error toggling featured status:', error);
    return NextResponse.json(
      { error: 'Failed to toggle featured status' },
      { status: 500 }
    );
  }
}
