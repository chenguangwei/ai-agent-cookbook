import type { ExtractedPageData } from '../shared/types';
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { extractTwitter, prepareTwitterPage } from './twitter';

// ============================================================
// Hybrid extraction: DOM whitelist/blacklist (primary) + Readability (fallback & metadata)
// Turndown + GFM for HTML → Markdown conversion
// ============================================================

function getMeta(name: string): string {
  const el =
    document.querySelector(`meta[property="${name}"]`) ||
    document.querySelector(`meta[name="${name}"]`);
  return el?.getAttribute('content') ?? '';
}

function extractTitle(): string {
  return (
    getMeta('og:title') ||
    document.querySelector('h1')?.textContent?.trim() ||
    document.title ||
    ''
  );
}

function extractDescription(): string {
  return (
    getMeta('og:description') ||
    getMeta('description') ||
    getMeta('twitter:description') ||
    ''
  );
}

function extractAuthor(): string {
  return (
    getMeta('author') ||
    getMeta('article:author') ||
    document.querySelector('[rel="author"]')?.textContent?.trim() ||
    ''
  );
}

function extractPublishedDate(): string {
  return (
    getMeta('article:published_time') ||
    getMeta('datePublished') ||
    document.querySelector('time')?.getAttribute('datetime') ||
    ''
  );
}

function extractSiteName(): string {
  return getMeta('og:site_name') || new URL(window.location.href).hostname;
}

function extractLanguage(): string {
  return document.documentElement.lang || 'en';
}

function extractImages(doc: Document = document): string[] {
  const images: string[] = [];
  const ogImage = getMeta('og:image');
  if (ogImage) images.push(ogImage);

  const article = doc.querySelector('article, main, [role="main"], .post-content, .content');
  if (article) {
    article.querySelectorAll('img').forEach((img) => {
      const src = img.src || img.getAttribute('data-src') || '';
      if (src && !images.includes(src) && !src.includes('avatar') && !src.includes('icon')) {
        images.push(src);
      }
    });
  }
  return images.slice(0, 10);
}

function extractCodeBlocks(doc: Document = document): string[] {
  const blocks: string[] = [];
  doc.querySelectorAll('pre code, pre.highlight, .code-block').forEach((el) => {
    const text = el.textContent?.trim();
    if (text && text.length > 10) {
      blocks.push(text);
    }
  });
  return blocks.slice(0, 20);
}

// ============================================================
// Site-specific cleaning (remove platform UI noise before extraction)
// ============================================================

function applySiteSpecificCleaning(doc: Document, url: string): void {
  let hostname = '';
  try {
    hostname = new URL(url).hostname;
  } catch {
    return;
  }

  // Twitter / X
  if (hostname.includes('x.com') || hostname.includes('twitter.com')) {
    const twitterNoiseSelectors = [
      '[data-testid="User-Name"]',
      '[data-testid="like"]',
      '[data-testid="retweet"]',
      '[data-testid="reply"]',
      '[data-testid="bookmark"]',
      '[data-testid="share"]',
      '[role="group"]',
      'a[href*="/analytics"]',
      '[data-testid="app-bar-back"]',
      '[data-testid="TopNavBar"]',
    ];
    twitterNoiseSelectors.forEach((sel) => {
      doc.querySelectorAll(sel).forEach((el) => el.remove());
    });

    // Remove standalone profile-image links (anchor wrapping only a profile img)
    doc.querySelectorAll('a > img').forEach((img) => {
      const src = img.getAttribute('src') || '';
      if (src.includes('profile_images') || src.includes('avatar')) {
        const parent = img.closest('a');
        if (parent && !parent.textContent?.trim()) {
          parent.remove();
        }
      }
    });
  }

  // Medium
  if (hostname.includes('medium.com')) {
    doc.querySelectorAll('[data-testid="headerSocialProof"], .metabar, .js-postShareWidget').forEach((el) => el.remove());
  }

  // Generic: remove fixed/sticky elements (likely toolbars, banners)
  doc.querySelectorAll('[style*="position: fixed"], [style*="position: sticky"]').forEach((el) => el.remove());
}

// ============================================================
// Smart DOM extraction (structure-preserving, replaces Readability as primary)
// ============================================================

function extractMainElement(doc: Document): Element | null {
  const clone = doc.cloneNode(true) as Document;

  // 1. Remove noise elements (blacklist)
  const removeSelectors = [
    'script', 'style', 'noscript', 'iframe', 'svg',
    'nav', 'header', 'footer', 'aside', 'button',
    '.ad', '.ads', '.advertisement', '.social-share', '.comments', '.comment-list',
    '.sidebar', '.menu', '.navigation', '.cookie-banner', '.popup', '.modal',
    '[role="navigation"]', '[role="banner"]', '[role="complementary"]', '[role="button"]',
    '#sidebar', '#comments',
  ];
  removeSelectors.forEach((sel) => {
    clone.querySelectorAll(sel).forEach((el) => el.remove());
  });

  // 2. Smart content selection (whitelist, priority order)
  const contentSelectors = [
    'article',
    '[role="main"]',
    '.post-content', '.article-content', '.entry-content',
    '#content', '#main',
    '.markdown-body',
    '.post-body',
    'main',
  ];

  for (const selector of contentSelectors) {
    const element = clone.querySelector(selector);
    if (element && (element.textContent?.trim().length || 0) > 200) {
      return element;
    }
  }

  // Return null to signal fallback to Readability
  return null;
}

// ============================================================
// Main extraction logic
// ============================================================

// ============================================================
// DOM pre-processing: normalize code/pre containers before Turndown
// ============================================================

/**
 * Convert <br> tags to actual newline text nodes inside an element.
 * This ensures textContent (used by Turndown) preserves line breaks.
 */
function brToNewlines(container: Element): void {
  container.querySelectorAll('br').forEach((br) => {
    br.replaceWith('\n');
  });
}

/**
 * Pre-process DOM to normalize code blocks and preserve line breaks.
 * Must run BEFORE Turndown conversion.
 */
function preprocessDOM(doc: Document): void {
  // 1. Inside <pre> and <code> elements, convert <br> to \n
  doc.querySelectorAll('pre, code').forEach((el) => {
    brToNewlines(el);
  });

  // 2. Detect non-standard code containers and normalize to <pre><code>
  //    Common patterns: class contains 'code', 'highlight', 'syntax', 'snippet'
  //    Or inline style has white-space: pre
  const codeContainerSelectors = [
    'div[class*="code"]',
    'div[class*="highlight"]',
    'div[class*="syntax"]',
    'div[class*="snippet"]',
    'div[data-language]',
    'div[data-code]',
    'span[class*="code-block"]',
  ];

  codeContainerSelectors.forEach((sel) => {
    doc.querySelectorAll(sel).forEach((el) => {
      // Skip if already contains <pre> (already handled)
      if (el.querySelector('pre')) return;
      // Skip if it's too short to be a code block
      if ((el.textContent?.trim().length || 0) < 10) return;

      // Convert <br> to \n first
      brToNewlines(el);

      // Try to detect language
      const lang =
        el.getAttribute('data-language') ||
        el.className.match(/language-(\w+)/)?.[1] ||
        '';

      // Replace element with <pre><code>
      const pre = doc.createElement('pre');
      const code = doc.createElement('code');
      if (lang) code.className = `language-${lang}`;
      code.textContent = el.textContent || '';
      pre.appendChild(code);
      el.replaceWith(pre);
    });
  });

  // 3. Handle elements with inline style white-space: pre/pre-wrap
  //    that aren't already <pre> tags
  doc.querySelectorAll('[style]').forEach((el) => {
    const style = el.getAttribute('style') || '';
    if (
      (style.includes('white-space') &&
        (style.includes('pre-wrap') || style.includes('pre;') || style.includes('pre '))) &&
      el.tagName !== 'PRE' &&
      !el.closest('pre')
    ) {
      brToNewlines(el);

      // If content looks like code (has indentation or braces)
      const text = el.textContent || '';
      const looksLikeCode =
        text.includes('{') ||
        text.includes('function') ||
        text.includes('const ') ||
        text.includes('//') ||
        /^\s{2,}/m.test(text);

      if (looksLikeCode) {
        const pre = doc.createElement('pre');
        const code = doc.createElement('code');
        code.textContent = text;
        pre.appendChild(code);
        el.replaceWith(pre);
      }
    }
  });

  // 4. Global: Inside any block-level element that has <br>,
  //    ensure the <br> produces a real newline for Turndown
  //    (already handled by the lineBreaks Turndown rule,
  //     but this handles edge cases in cloned DOM where
  //     textContent is extracted directly)
}

function createTurndownService(): TurndownService {
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
  });

  // Use GFM plugin (tables, task lists, strikethrough)
  turndownService.use(gfm);

  // Custom rule: Handle div-based code blocks (common in some sites)
  turndownService.addRule('highlightedCode', {
    filter: function (node) {
      const el = node as HTMLElement;
      return (
        el.nodeName === 'DIV' &&
        (el.classList.contains('highlight') || el.classList.contains('code-snippet'))
      );
    },
    replacement: function (_content, node) {
      const el = node as HTMLElement;
      // Try to extract language
      const language = el.getAttribute('data-language') || '';
      return '\n\n```' + language + '\n' + el.textContent?.trim() + '\n```\n\n';
    },
  });

  // Custom rule: Ensure absolute image URLs
  turndownService.addRule('absoluteImages', {
    filter: 'img',
    replacement: function (_content, node) {
      const el = node as HTMLImageElement;
      const src = el.getAttribute('src');
      if (!src) return '';

      // Convert relative path to absolute
      try {
        const absoluteSrc = new URL(src, window.location.href).href;
        const alt = el.getAttribute('alt') || '';
        return `![${alt}](${absoluteSrc})`;
      } catch {
        return '';
      }
    },
  });

  // Preserve code language in normal pre > code blocks
  turndownService.addRule('codeLanguage', {
    filter: (node) => {
      return node.nodeName === 'PRE' && node.querySelector('code') !== null;
    },
    replacement: function (_content, node) {
      const preNode = node as HTMLPreElement;
      const codeNode = preNode.querySelector('code');
      let lang = '';

      // Try to detect language from class names
      if (codeNode) {
        const classList = Array.from(codeNode.classList);
        for (const cls of classList) {
          const match = cls.match(/^(?:language-|lang-)?(\w+)$/);
          if (match && !['hljs', 'code', 'highlight', 'codehilite'].includes(match[1])) {
            lang = match[1];
            break;
          }
        }
      }

      const code = codeNode?.textContent?.trim() || '';
      return `\n\`\`\`${lang}\n${code}\n\`\`\`\n`;
    },
  });

  // Custom rule: Convert callout/note/warning divs to blockquotes
  turndownService.addRule('callouts', {
    filter: function (node) {
      if (node.nodeName !== 'DIV') return false;
      const el = node as HTMLElement;
      return (
        el.classList.contains('callout') ||
        el.classList.contains('note') ||
        el.classList.contains('warning') ||
        el.classList.contains('tip') ||
        el.classList.contains('info')
      );
    },
    replacement: function (content) {
      return '\n> ' + content.trim().replace(/\n/g, '\n> ') + '\n\n';
    },
  });

  // Custom rule: Ensure absolute link URLs
  turndownService.addRule('absoluteLinks', {
    filter: function (node) {
      return node.nodeName === 'A' && !!(node as HTMLAnchorElement).getAttribute('href');
    },
    replacement: function (content, node) {
      const el = node as HTMLAnchorElement;
      const href = el.getAttribute('href');
      if (!href || !content.trim()) return content;

      try {
        const absoluteHref = new URL(href, window.location.href).href;
        const title = el.getAttribute('title');
        return title
          ? `[${content}](${absoluteHref} "${title}")`
          : `[${content}](${absoluteHref})`;
      } catch {
        return content;
      }
    },
  });

  // Filter empty links: <a> tags wrapping only images or whitespace (UI decoration)
  turndownService.addRule('emptyLinks', {
    filter: function (node) {
      if (node.nodeName !== 'A') return false;
      const el = node as HTMLAnchorElement;
      const text = el.textContent?.trim() || '';
      // No text at all — either empty or image-only
      if (!text) return true;
      // Only whitespace/newlines with an image inside
      if (!text && el.querySelector('img')) return true;
      return false;
    },
    replacement: function (_content, node) {
      const el = node as HTMLElement;
      const img = el.querySelector('img');
      if (img) {
        const src = img.getAttribute('src') || '';
        const alt = img.getAttribute('alt') || '';
        // Keep content images, discard profile/avatar images
        if (alt && !src.includes('avatar') && !src.includes('profile_images')) {
          try {
            const absoluteSrc = new URL(src, window.location.href).href;
            return `![${alt}](${absoluteSrc})`;
          } catch {
            return `![${alt}](${src})`;
          }
        }
      }
      return ''; // Discard UI-noise links
    },
  });

  // Ensure <br> tags produce real line breaks (not just trailing spaces)
  turndownService.addRule('lineBreaks', {
    filter: 'br',
    replacement: function () {
      return '\n';
    },
  });

  return turndownService;
}

// ============================================================
// Markdown post-processing (normalize output format)
// ============================================================

function postProcessMarkdown(md: string): string {
  return md
    // Fix headings: collapse `## \n\n text` into `## text`
    .replace(/^(#{1,6})\s*\n+\s*(.+)/gm, '$1 $2')
    // Collapse 3+ consecutive blank lines to 2
    .replace(/\n{3,}/g, '\n\n')
    // Remove standalone number lines (engagement counts: 132, 3.2K, 1M, etc.)
    .replace(/^\d[\d,.]*[KkMmBb]?\s*$/gm, '')
    // Remove lines that are just whitespace
    .replace(/^\s+$/gm, '')
    // Collapse again after removals
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractPageData(): ExtractedPageData {
  // 1. Clone DOM to avoid side effects
  const docClone = document.cloneNode(true) as Document;

  // 1.5 Twitter/X Specialized Extraction
  const twitterData = extractTwitter(docClone, window.location.href);
  if (twitterData) {
    return twitterData;
  }

  // 2. Fix Lazy Load Images (src is empty, data-src has URL)
  docClone.querySelectorAll('img').forEach((img) => {
    if (img.dataset.src && !img.src) {
      img.src = img.dataset.src;
    }
    if (img.dataset.original && !img.src) {
      img.src = img.dataset.original;
    }
  });

  // 2.5 Apply site-specific cleaning before extraction
  applySiteSpecificCleaning(docClone, window.location.href);

  // 2.6 Pre-process DOM: normalize code containers and line breaks
  preprocessDOM(docClone);

  // 3. Readability — used for metadata enrichment (always attempted)
  let articleTitle = '';
  let articleByline = '';
  let articleExcerpt = '';
  let articleSiteName = '';
  let articlePublishedTime = '';
  let readabilityHtml = '';

  try {
    // Readability mutates the DOM, so give it a separate clone
    const readabilityClone = document.cloneNode(true) as Document;
    const reader = new Readability(readabilityClone);
    const article = reader.parse();
    if (article) {
      articleTitle = article.title || '';
      articleByline = article.byline || '';
      articleExcerpt = article.excerpt || '';
      articleSiteName = article.siteName || '';
      articlePublishedTime = article.publishedTime || '';
      readabilityHtml = article.content || '';
    }
  } catch (err) {
    console.warn('Readability metadata extraction failed', err);
  }

  // 4. PRIMARY: Structure-preserving DOM extraction
  const turndownService = createTurndownService();
  let markdownContent = '';
  let rawHtml = '';

  const mainElement = extractMainElement(docClone);
  if (mainElement) {
    rawHtml = mainElement.innerHTML;
    markdownContent = postProcessMarkdown(turndownService.turndown(rawHtml));
  }

  // 5. FALLBACK: If DOM extraction produced too little content, use Readability
  if (markdownContent.trim().length < 100) {
    if (readabilityHtml) {
      rawHtml = readabilityHtml;
      markdownContent = postProcessMarkdown(turndownService.turndown(readabilityHtml));
    } else {
      // Last resort: use cleaned body
      rawHtml = document.body.innerHTML;
      markdownContent = postProcessMarkdown(turndownService.turndown(rawHtml));
    }
  }

  // 6. Combine: manual extraction content + Readability metadata + meta tag fallbacks
  return {
    url: window.location.href,
    title: articleTitle || extractTitle(),
    description: articleExcerpt || extractDescription(),
    content: markdownContent,
    rawHtml: rawHtml || document.body.innerHTML,
    codeBlocks: extractCodeBlocks(docClone),
    images: extractImages(docClone),
    author: articleByline || extractAuthor(),
    publishedDate: articlePublishedTime || extractPublishedDate(),
    language: extractLanguage(),
    siteName: articleSiteName || extractSiteName(),
  };
}

// ============================================================
// Listen for messages from popup/background
// ============================================================

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'EXTRACT_PAGE') {
    (async () => {
      try {
        // Twitter/X: Click "Show more" if present
        if (window.location.hostname.includes('twitter.com') || window.location.hostname.includes('x.com')) {
          try {
            await prepareTwitterPage();
          } catch (e) {
            console.warn('Twitter preparation failed', e);
          }
        }

        const data = extractPageData();
        sendResponse({ type: 'EXTRACT_RESULT', payload: data });
      } catch (error: any) {
        sendResponse({ type: 'EXTRACT_RESULT', error: error.message });
      }
    })();
    return true; // Keep channel open for async response
  }
});
