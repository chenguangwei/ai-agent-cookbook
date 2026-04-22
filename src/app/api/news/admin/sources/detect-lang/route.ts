import { NextResponse } from 'next/server';
import { getAllRssSources, updateRssSource } from '@/lib/db/news';

// Detect language from source name or URL
function detectLanguage(name: string, url: string): 'en' | 'zh' | 'ja' | 'ko' {
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

  // Check if name contains Korean characters
  const koreanRegex = /[\uac00-\ud7af]/;
  if (koreanRegex.test(name) || koreanRegex.test(url)) return 'ko';

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

// POST - Detect and update language for all sources
export async function POST() {
  try {
    const sources = await getAllRssSources();
    let updated = 0;

    for (const source of sources) {
      const detectedLang = detectLanguage(source.name, source.url);
      if (detectedLang !== source.language) {
        updateRssSource(source.id, { language: detectedLang });
        updated++;
      }
    }

    return NextResponse.json({
      message: `Language detection completed`,
      updated,
      total: sources.length
    });
  } catch (error) {
    console.error('Error detecting languages:', error);
    return NextResponse.json(
      { error: 'Failed to detect languages' },
      { status: 500 }
    );
  }
}
