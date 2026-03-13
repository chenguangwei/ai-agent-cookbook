import { NextRequest, NextResponse } from 'next/server';
import { getAllRssSources, addRssSource, updateRssSource, deleteRssSource, getRssSourceById } from '@/lib/db/news';
import { randomUUID } from 'crypto';

// GET - Return all sources
export async function GET() {
  try {
    const sources = getAllRssSources();
    return NextResponse.json({ sources });
  } catch (error) {
    console.error('Error fetching RSS sources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch RSS sources' },
      { status: 500 }
    );
  }
}

// POST - Add a new source
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, url, category, enabled = true } = body;

    if (!name || !url || !category) {
      return NextResponse.json(
        { error: 'Name, URL, and category are required' },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories = ['Articles', 'Podcasts', 'Twitters', 'Videos'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Category must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      );
    }

    const newSource = addRssSource({
      id: randomUUID(),
      name,
      url,
      category,
      enabled
    });

    return NextResponse.json({
      message: 'Source added successfully',
      source: newSource
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error adding RSS source:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return NextResponse.json(
        { error: 'A source with this URL already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to add RSS source' },
      { status: 500 }
    );
  }
}

// PUT - Update an existing source
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    // Validate category if provided
    if (updates.category) {
      const validCategories = ['Articles', 'Podcasts', 'Twitters', 'Videos'];
      if (!validCategories.includes(updates.category)) {
        return NextResponse.json(
          { error: `Category must be one of: ${validCategories.join(', ')}` },
          { status: 400 }
        );
      }
    }

    const updated = updateRssSource(id, updates);

    if (!updated) {
      return NextResponse.json(
        { error: 'Source not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Source updated successfully',
      source: updated
    });
  } catch (error: any) {
    console.error('Error updating RSS source:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return NextResponse.json(
        { error: 'A source with this URL already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update RSS source' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a source
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

    const deleted = deleteRssSource(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Source not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Source deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting RSS source:', error);
    return NextResponse.json(
      { error: 'Failed to delete RSS source' },
      { status: 500 }
    );
  }
}
