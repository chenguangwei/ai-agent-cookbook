import { NextRequest, NextResponse } from 'next/server';
import { deleteNewsItem } from '@/lib/db/news';

// DELETE - Delete a news item by ID
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID query parameter is required' },
        { status: 400 }
      );
    }

    const deleted = deleteNewsItem(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'News item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'News item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting news item:', error);
    return NextResponse.json(
      { error: 'Failed to delete news item' },
      { status: 500 }
    );
  }
}
