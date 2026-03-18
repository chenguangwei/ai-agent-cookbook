import Parser, { Item } from 'rss-parser';

export interface ParsedFeedItem {
  title: string;
  link: string;
  content?: string;
  contentSnippet?: string;
  summary?: string;
  pubDate?: string;
  isoDate?: string;
  creator?: string;
  author?: string;
  imageUrl?: string;
  videoThumbnail?: string;
}

export interface ParsedFeed {
  title: string;
  link: string;
  items: ParsedFeedItem[];
}

export interface OmplOutline {
  text: string;
  title?: string;
  xmlUrl: string;
  type?: string;
}

// Extend Item type to include custom fields
interface ExtendedItem extends Item {
  'media:content'?: unknown;
  'media:thumbnail'?: unknown;
  'dc:creator'?: string;
  author?: string;
}

/**
 * Extract image URL from various RSS feed sources
 */
function extractImageUrl(item: ExtendedItem): string | undefined {
  // Try enclosure - direct image link
  if (item.enclosure?.url && item.enclosure.type?.startsWith('image/')) {
    return item.enclosure.url;
  }

  // Try mediaContent (custom field) - could be video or image
  const mediaContent = item['media:content'] as { $?: { url?: string; type?: string } } | undefined;
  if (mediaContent?.$?.url) {
    // If it's an image type, use it
    if (mediaContent.$?.type?.startsWith('image/')) {
      return mediaContent.$.url;
    }
    // For videos, try to get thumbnail from media:thumbnail instead
  }

  // Try mediaThumbnail (custom field)
  const mediaThumbnail = item['media:thumbnail'] as { $?: { url?: string } } | undefined;
  if (mediaThumbnail?.$?.url) {
    return mediaThumbnail.$.url;
  }

  // Combine all content fields to search
  const content = item.content || item.contentSnippet || item.summary || '';

  // Try og:image meta tag (most reliable for modern feeds)
  const ogMatch = content.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (ogMatch) {
    return ogMatch[1];
  }

  // Try alternate og:image format
  const ogMatch2 = content.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (ogMatch2) {
    return ogMatch2[1];
  }

  // Try to extract from content img tag - find first valid image
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let imgMatch;
  while ((imgMatch = imgRegex.exec(content)) !== null) {
    const src = imgMatch[1];
    // Skip data URIs, tracking pixels, and invalid URLs
    if (src && !src.startsWith('data:') && !src.includes('pixel') && !src.includes('tracking')) {
      return src;
    }
  }

  // Try twitter:image as fallback
  const twitterMatch = content.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
  if (twitterMatch) {
    return twitterMatch[1];
  }

  // Try to find image in links/anchors
  const linkImgMatch = content.match(/<a[^>]+><img[^>]+src=["']([^"']+)["'][^>]*><\/a>/i);
  if (linkImgMatch) {
    return linkImgMatch[1];
  }

  return undefined;
}

/**
 * Extract video thumbnail URL from RSS item
 */
function extractVideoThumbnail(item: ExtendedItem): string | undefined {
  const content = item.content || item.contentSnippet || '';

  // Try media:thumbnail for videos
  const mediaThumbnail = item['media:thumbnail'] as { $?: { url?: string } } | undefined;
  if (mediaThumbnail?.$?.url) {
    return mediaThumbnail.$.url;
  }

  // Try to find YouTube thumbnail from content
  const youtubeMatch = content.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (youtubeMatch) {
    const videoId = youtubeMatch[1];
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  }

  // Try to find video player iframe and extract thumbnail
  const vimeoMatch = content.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    // For Vimeo, we'd need an API call - skip for now
  }

  return undefined;
}

/**
 * Parse RSS 2.0 and Atom feeds
 * Try HTTPS first, then fall back to HTTP if SSL fails
 * Reduced timeout to 5s for faster failure
 */
export async function parseRssFeed(url: string): Promise<ParsedFeed> {
  const isServer = typeof window === 'undefined';
  console.log(`[RSS Parser] Parsing ${url} (Environment: ${isServer ? 'Server' : 'Browser'})`);

  const parser = new Parser({
    customFields: {
      item: [
        'media:content',
        'media:thumbnail',
        'media:content',
        'dc:creator',
      ],
      feed: ['atom:link'],
    },
    timeout: 5000,
    headers: {
      // Use application/xml instead of application/rss+xml
      // Some servers (like api.xgo.ing) return 406 for rss+xml
      'Accept': 'application/xml, application/rss+xml, text/xml, */*',
    },
  });

  // Try HTTP first for better compatibility, then HTTPS
  const urls = url.startsWith('https://')
    ? [url, url.replace('https://', 'http://')]
    : [url];

  let lastError;
  for (const tryUrl of urls) {
    try {
      const feed = await parser.parseURL(tryUrl);
      const items: ParsedFeedItem[] = feed.items.map((item: ExtendedItem) => ({
        title: item.title || 'Untitled',
        link: item.link || '',
        content: item.content,
        contentSnippet: item.contentSnippet,
        summary: item.summary,
        pubDate: item.pubDate,
        isoDate: item.isoDate,
        creator: item['dc:creator'] || item.creator,
        author: item.author,
        imageUrl: extractImageUrl(item),
        videoThumbnail: extractVideoThumbnail(item),
      }));

      return {
        title: feed.title || 'Untitled Feed',
        link: feed.link || url,
        items,
      };
    } catch (err: any) {
      lastError = err;
      console.error(`[RSS Parser] Failed to fetch ${tryUrl}:`, err.message);
      // Skip to next URL if this one failed
      continue;
    }
  }

  // If both direct and fallbacks fail, try our internal proxy if on server
  if (isServer) {
    console.log(`[RSS Parser] Direct fetch failed for ${url}. Trying internal proxy...`);
    try {
      return await parseRssFeedViaInternalProxy(url);
    } catch (proxyErr: any) {
      console.error(`[RSS Parser] Internal proxy also failed:`, proxyErr.message);
    }
  }

  throw lastError || new Error('Failed to parse feed');
}

/**
 * Alternative: fetch RSS using our internal proxy API
 * This can bypass CORS and SSL issues when called from the client
 */
export async function parseRssFeedViaInternalProxy(url: string): Promise<ParsedFeed> {
  try {
    const proxyUrl = `/api/news/proxy?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Internal proxy failed: ${response.status}`);
    }

    const xml = await response.text();
    const parser = new Parser({
      customFields: {
        item: [
          'media:content',
          'media:thumbnail',
          'dc:creator',
        ],
      }
    });
    
    const feed = await parser.parseString(xml);
    const items: ParsedFeedItem[] = feed.items.map((item: ExtendedItem) => ({
      title: item.title || 'Untitled',
      link: item.link || '',
      content: item.content,
      contentSnippet: item.contentSnippet,
      summary: item.summary,
      pubDate: item.pubDate,
      isoDate: item.isoDate,
      creator: item['dc:creator'] || item.creator,
      author: item.author,
      imageUrl: extractImageUrl(item),
      videoThumbnail: extractVideoThumbnail(item),
    }));

    return {
      title: feed.title || 'Untitled Feed',
      link: feed.link || url,
      items,
    };
  } catch (err: any) {
    console.error(`[RSS Parser] Internal proxy error for ${url}:`, err.message);
    throw err;
  }
}

/**
 * Alternative: fetch RSS using multiple proxy services
 * This can bypass CORS and SSL issues
 */
export async function parseRssFeedViaProxy(url: string): Promise<ParsedFeed> {
  // Try multiple proxy services
  const proxies = [
    // rss2json (main proxy) - with timeout handling
    async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      try {
        const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl, { signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) throw new Error(`Proxy failed: ${response.status}`);

        const data = await response.json();
        if (data.status !== 'ok') throw new Error(data.message || 'Failed to parse via proxy');

        return data;
      } catch (err: any) {
        clearTimeout(timeout);
        if (err.name === 'AbortError') throw new Error('Proxy timeout');
        throw err;
      }
    },
    // RSS Hub (for Chinese sites and YouTube) - 使用自建 RSSHub
    async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      // 用户自建的 RSSHub
      const RSSHUB_BASE = process.env.RSSHUB_URL || 'https://rss.agent-cookbook.com';
      const RSSHUB_KEY = process.env.RSSHUB_ACCESS_KEY || '';

      try {
        let rsshubUrl: string;
        if (url.includes('youtube.com/feeds')) {
          // Extract channel ID from YouTube feed URL
          const match = url.match(/channel_id=([^&]+)/);
          if (match) {
            rsshubUrl = `${RSSHUB_BASE}/youtube/channel/${match[1]}`;
          } else {
            throw new Error('Invalid YouTube URL');
          }
        } else {
          // Use rsshub to wrap the original URL
          rsshubUrl = `${RSSHUB_BASE}/rss/${encodeURIComponent(url)}`;
        }

        // 添加 access_key 参数
        if (RSSHUB_KEY) {
          rsshubUrl += rsshubUrl.includes('?') ? '&' : '?';
          rsshubUrl += `access_key=${RSSHUB_KEY}`;
        }

        const response = await fetch(rsshubUrl, { signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) throw new Error(`RSSHub failed: ${response.status}`);

        // Parse RSS from RSSHub response
        const xml = await response.text();
        const parser = new Parser();
        const feed = await parser.parseString(xml);

        // Convert to rss2json format
        return {
          feed: {
            title: feed.title,
            link: feed.link,
          },
          items: feed.items.map((item: any) => ({
            title: item.title,
            link: item.link,
            description: item.contentSnippet || item.summary,
            content: item.content,
            author: item.creator || item.author,
            pubDate: item.pubDate,
            thumbnail: item.imageUrl,
          })),
        };
      } catch (err: any) {
        clearTimeout(timeout);
        if (err.name === 'AbortError') throw new Error('RSSHub timeout');
        throw err;
      }
    },
  ];

  let lastError: Error | null = null;

  for (const proxyFn of proxies) {
    try {
      const data = await proxyFn();

      const items: ParsedFeedItem[] = (data.items || []).map((item: any) => ({
        title: item.title || 'Untitled',
        link: item.link || '',
        content: item.content,
        contentSnippet: item.description,
        summary: item.description,
        pubDate: item.pubDate,
        isoDate: item.pubDate,
        creator: item.author,
        author: item.author,
        imageUrl: item.thumbnail || item.enclosure?.link,
        videoThumbnail: undefined,
      }));

      return {
        title: data.feed?.title || 'Untitled Feed',
        link: data.feed?.link || url,
        items,
      };
    } catch (err: any) {
      lastError = err;
      // Try next proxy
      continue;
    }
  }

  throw lastError || new Error('All proxies failed');
}

/**
 * Parse OPML XML to extract RSS subscriptions
 */
export function parseOpml(opmlContent: string): OmplOutline[] {
  const outlines: OmplOutline[] = [];

  // Match outline elements using regex
  const outlineRegex = /<outline[^>]*>/gi;
  let match;

  while ((match = outlineRegex.exec(opmlContent)) !== null) {
    const outlineStr = match[0];

    // Extract attributes
    const textMatch = outlineStr.match(/text=["']([^"']*)["']/i);
    const titleMatch = outlineStr.match(/title=["']([^"']*)["']/i);
    const xmlUrlMatch = outlineStr.match(/xmlUrl=["']([^"']*)["']/i);
    const typeMatch = outlineStr.match(/type=["']([^"']*)["']/i);

    // Only include if it has an xmlUrl (actual feed subscription)
    if (xmlUrlMatch) {
      outlines.push({
        text: textMatch ? textMatch[1] : '',
        title: titleMatch ? titleMatch[1] : undefined,
        xmlUrl: xmlUrlMatch[1],
        type: typeMatch ? typeMatch[1] : undefined,
      });
    }
  }

  return outlines;
}
