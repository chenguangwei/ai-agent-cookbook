import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    console.log(`[RSS Proxy] Fetching: ${url}`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/xml, application/rss+xml, text/xml, */*',
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    const b = await response.text();

    return new NextResponse(b, {
      headers: {
        'Content-Type': contentType || 'application/xml',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800',
      },
    });
  } catch (error: any) {
    console.error(`[RSS Proxy] Error fetching ${url}:`, error.message);
    return NextResponse.json(
      { error: `Failed to fetch RSS: ${error.message}` },
      { status: 500 }
    );
  }
}
