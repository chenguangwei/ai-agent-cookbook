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
    timeout: 5000, // Reduced from 10s to 5s
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
      // Skip to next URL if this one failed
      continue;
    }
  }

  throw lastError || new Error('Failed to parse feed');
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
