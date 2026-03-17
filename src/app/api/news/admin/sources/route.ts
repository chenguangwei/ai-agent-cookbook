import { NextRequest, NextResponse } from 'next/server';
import { getAllRssSources, addRssSource, updateRssSource, deleteRssSource, getRssSourceById } from '@/lib/db/news';
import { randomUUID } from 'crypto';

// Detect language from source name or URL
function detectLanguage(name: string, url: string): 'en' | 'zh' | 'ja' {
  const lowerName = name.toLowerCase();
  const lowerUrl = url.toLowerCase();

  // Check if name contains Chinese characters
  const chineseRegex = /[\u4e00-\u9fff]/;
  if (chineseRegex.test(name)) return 'zh';

  // Check if URL contains Chinese domain or path
  if (chineseRegex.test(url)) return 'zh';

  // Check if name contains Japanese characters
  const japaneseRegex = /[\u3040-\u309f\u30a0-\u30ff]/;
  if (japaneseRegex.test(name)) return 'ja';

  // Check for common Chinese source name patterns
  const chineseNames = [
    '量子位', '机器之心', '腾讯', '爱范儿', '极客公园', '虎嗅', '36氪',
    '钛媒体', '品玩', '硅星人', '脑极羊', '将门创投',
    'infoq', 'segmentfault', 'cocoachina', 'oschina', 'cnblogs',
    'juejin', 'zhihu', 'weibo', 'tencent', 'aliyun', 'baidu'
  ];
  if (chineseNames.some(n => lowerName.includes(n.toLowerCase()))) return 'zh';

  // Check URL for Chinese platforms
  const chineseUrls = ['wechat', 'qq.com', 'baidu.com', 'aliyun.com', 'tencent.com',
    'zhihu.com', 'juejin.cn', 'segmentfault.com', 'cocoachina.com', 'oschina.net', 'qbitai.com', 'ifanr.com'];
  if (chineseUrls.some(u => lowerUrl.includes(u))) return 'zh';

  // Check for common Japanese source patterns
  const japaneseNames = ['技術', 'テクノロジー', ' Tech', 'Gihyo', 'Postd'];
  if (japaneseNames.some(n => name.includes(n))) return 'ja';

  // Default to English
  return 'en';
}

// GET - Return all sources
import { supabase } from '@/lib/supabase';

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
      ...source,
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

// POST - Add a new source
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, url, category, language = 'en', enabled = true } = body;

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

    // Validate language
    const validLanguages = ['en', 'zh', 'ja'];
    if (!validLanguages.includes(language)) {
      return NextResponse.json(
        { error: `Language must be one of: ${validLanguages.join(', ')}` },
        { status: 400 }
      );
    }

    const newSource = addRssSource({
      id: randomUUID(),
      name,
      url,
      category,
      language,
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

    const updated = await updateRssSource(id, updates);

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

    const deleted = await deleteRssSource(id);

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
