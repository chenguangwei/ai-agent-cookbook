import { NextRequest, NextResponse } from 'next/server';
import { getAllDocs } from '@/lib/tina';

export async function GET(request: NextRequest) {
  try {
    const locale = request.nextUrl.searchParams.get('locale') || undefined;
    const docs = await getAllDocs(locale);
    return NextResponse.json(docs);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
