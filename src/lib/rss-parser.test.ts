import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch
global.fetch = vi.fn();

describe('RSS Parser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseRssFeedViaProxy', () => {
    it('should fetch RSS via rss2json proxy successfully', async () => {
      const { parseRssFeedViaProxy } = await import('@/lib/rss-parser');

      const mockProxyResponse = {
        status: 'ok',
        feed: {
          title: 'Proxy Feed',
          link: 'https://example.com',
        },
        items: [
          {
            title: 'Proxy Article',
            link: 'https://example.com/article',
            content: '<p>Content</p>',
            description: 'Description',
            pubDate: '2024-01-01',
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockProxyResponse),
      });

      const result = await parseRssFeedViaProxy('https://example.com/feed.xml');

      expect(result).toBeDefined();
      expect(result.title).toBe('Proxy Feed');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('Proxy Article');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fexample.com%2Ffeed.xml'
      );
    });

    it('should throw error when proxy returns error status', async () => {
      const { parseRssFeedViaProxy } = await import('@/lib/rss-parser');

      const mockProxyResponse = {
        status: 'error',
        message: 'Feed not found',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockProxyResponse),
      });

      await expect(parseRssFeedViaProxy('https://example.com/feed.xml')).rejects.toThrow('Feed not found');
    });

    it('should throw error when proxy request fails with network error', async () => {
      const { parseRssFeedViaProxy } = await import('@/lib/rss-parser');

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(parseRssFeedViaProxy('https://example.com/feed.xml')).rejects.toThrow();
    });

    it('should throw error when proxy returns non-ok status', async () => {
      const { parseRssFeedViaProxy } = await import('@/lib/rss-parser');

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(parseRssFeedViaProxy('https://example.com/feed.xml')).rejects.toThrow('Proxy failed: 500');
    });

    it('should handle proxy response without thumbnail', async () => {
      const { parseRssFeedViaProxy } = await import('@/lib/rss-parser');

      const mockProxyResponse = {
        status: 'ok',
        feed: {
          title: 'Test Feed',
          link: 'https://example.com',
        },
        items: [
          {
            title: 'Test Article',
            link: 'https://example.com/article',
            thumbnail: 'https://example.com/thumb.jpg',
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockProxyResponse),
      });

      const result = await parseRssFeedViaProxy('https://example.com/feed.xml');

      expect(result).toBeDefined();
      expect(result.items[0].imageUrl).toBe('https://example.com/thumb.jpg');
    });
  });

  describe('parseOpml', () => {
    it('should parse OPML and extract RSS subscriptions', async () => {
      const { parseOpml } = await import('@/lib/rss-parser');

      const opmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <body>
    <outline text="Tech News" title="Tech News">
      <outline type="rss" text="TechCrunch" title="TechCrunch" xmlUrl="https://techcrunch.com/feed/" htmlUrl="https://techcrunch.com/"/>
    </outline>
    <outline type="rss" text="Hacker News" title="Hacker News" xmlUrl="https://news.ycombinator.com/rss" htmlUrl="https://news.ycombinator.com/"/>
  </body>
</opml>`;

      const result = parseOpml(opmlContent);

      expect(result).toHaveLength(2);
      expect(result[0].text).toBe('TechCrunch');
      expect(result[0].xmlUrl).toBe('https://techcrunch.com/feed/');
      expect(result[1].text).toBe('Hacker News');
      expect(result[1].xmlUrl).toBe('https://news.ycombinator.com/rss');
    });

    it('should return empty array for invalid OPML', async () => {
      const { parseOpml } = await import('@/lib/rss-parser');

      const invalidContent = '<html><body>Not OPML</body></html>';

      const result = parseOpml(invalidContent);

      expect(result).toHaveLength(0);
    });
  });
});
