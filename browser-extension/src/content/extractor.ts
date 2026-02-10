import type { ExtractedPageData } from '../shared/types';

// ============================================================
// Page content extraction with HTML → Markdown conversion
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

function extractImages(): string[] {
  const images: string[] = [];
  const ogImage = getMeta('og:image');
  if (ogImage) images.push(ogImage);

  const article = document.querySelector('article, main, [role="main"], .post-content, .content');
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

function extractCodeBlocks(): string[] {
  const blocks: string[] = [];
  document.querySelectorAll('pre code, pre.highlight, .code-block').forEach((el) => {
    const text = el.textContent?.trim();
    if (text && text.length > 10) {
      blocks.push(text);
    }
  });
  return blocks.slice(0, 20);
}

// ============================================================
// HTML → Markdown converter (inline, no external deps)
// ============================================================

function htmlToMarkdown(element: HTMLElement): string {
  const lines: string[] = [];
  processNode(element, lines, 0);
  // Clean up excessive blank lines
  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function processNode(node: Node, lines: string[], depth: number): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    // Collapse whitespace within inline text
    const collapsed = text.replace(/\s+/g, ' ');
    if (collapsed.trim()) {
      lines.push(collapsed);
    }
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  // Skip unwanted elements
  if (['nav', 'header', 'footer', 'aside', 'script', 'style', 'noscript',
       'svg', 'iframe', 'form', 'button'].includes(tag)) return;
  if (el.classList.contains('sidebar') || el.classList.contains('toc') ||
      el.classList.contains('comments') || el.classList.contains('advertisement') ||
      el.getAttribute('role') === 'navigation') return;

  switch (tag) {
    case 'h1':
      lines.push('\n# ' + getInlineText(el));
      lines.push('');
      break;
    case 'h2':
      lines.push('\n## ' + getInlineText(el));
      lines.push('');
      break;
    case 'h3':
      lines.push('\n### ' + getInlineText(el));
      lines.push('');
      break;
    case 'h4':
      lines.push('\n#### ' + getInlineText(el));
      lines.push('');
      break;
    case 'h5':
      lines.push('\n##### ' + getInlineText(el));
      lines.push('');
      break;
    case 'h6':
      lines.push('\n###### ' + getInlineText(el));
      lines.push('');
      break;

    case 'p':
      lines.push('');
      lines.push(getInlineMarkdown(el));
      lines.push('');
      break;

    case 'pre': {
      const codeEl = el.querySelector('code');
      const lang = detectCodeLanguage(el);
      const code = (codeEl || el).textContent?.trim() || '';
      if (code) {
        lines.push('');
        lines.push('```' + lang);
        lines.push(code);
        lines.push('```');
        lines.push('');
      }
      break;
    }

    case 'code': {
      // Inline code (not inside pre)
      if (el.parentElement?.tagName.toLowerCase() !== 'pre') {
        lines.push('`' + (el.textContent?.trim() || '') + '`');
      }
      break;
    }

    case 'blockquote':
      lines.push('');
      const bqText = getInlineMarkdown(el);
      bqText.split('\n').forEach((line) => {
        lines.push('> ' + line);
      });
      lines.push('');
      break;

    case 'ul':
    case 'ol': {
      lines.push('');
      let idx = 0;
      el.querySelectorAll(':scope > li').forEach((li) => {
        idx++;
        const prefix = tag === 'ol' ? `${idx}. ` : '- ';
        const indent = '  '.repeat(depth);
        const liText = getInlineMarkdown(li as HTMLElement);
        lines.push(indent + prefix + liText);
      });
      lines.push('');
      break;
    }

    case 'img': {
      const src = el.getAttribute('src') || el.getAttribute('data-src') || '';
      const alt = el.getAttribute('alt') || '';
      if (src) {
        lines.push(`![${alt}](${src})`);
      }
      break;
    }

    case 'a': {
      const href = el.getAttribute('href') || '';
      const text = getInlineText(el);
      if (href && text) {
        lines.push(`[${text}](${href})`);
      } else {
        lines.push(text);
      }
      break;
    }

    case 'table': {
      lines.push('');
      const rows = el.querySelectorAll('tr');
      rows.forEach((tr, rowIdx) => {
        const cells = tr.querySelectorAll('th, td');
        const cellTexts = Array.from(cells).map((c) => (c.textContent?.trim() || '').replace(/\|/g, '\\|'));
        lines.push('| ' + cellTexts.join(' | ') + ' |');
        if (rowIdx === 0) {
          lines.push('| ' + cellTexts.map(() => '---').join(' | ') + ' |');
        }
      });
      lines.push('');
      break;
    }

    case 'hr':
      lines.push('');
      lines.push('---');
      lines.push('');
      break;

    case 'br':
      lines.push('');
      break;

    case 'strong':
    case 'b':
      lines.push('**' + getInlineText(el) + '**');
      break;

    case 'em':
    case 'i':
      lines.push('*' + getInlineText(el) + '*');
      break;

    case 'del':
    case 's':
      lines.push('~~' + getInlineText(el) + '~~');
      break;

    default:
      // Recursively process children for div, section, article, span, etc.
      el.childNodes.forEach((child) => processNode(child, lines, depth));
      break;
  }
}

function getInlineText(el: HTMLElement): string {
  return (el.textContent || '').replace(/\s+/g, ' ').trim();
}

function getInlineMarkdown(el: HTMLElement): string {
  const parts: string[] = [];
  el.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      parts.push((child.textContent || '').replace(/\s+/g, ' '));
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const childEl = child as HTMLElement;
      const tag = childEl.tagName.toLowerCase();
      switch (tag) {
        case 'strong':
        case 'b':
          parts.push('**' + getInlineText(childEl) + '**');
          break;
        case 'em':
        case 'i':
          parts.push('*' + getInlineText(childEl) + '*');
          break;
        case 'code':
          parts.push('`' + (childEl.textContent?.trim() || '') + '`');
          break;
        case 'a': {
          const href = childEl.getAttribute('href') || '';
          const text = getInlineText(childEl);
          parts.push(href ? `[${text}](${href})` : text);
          break;
        }
        case 'img': {
          const src = childEl.getAttribute('src') || '';
          const alt = childEl.getAttribute('alt') || '';
          if (src) parts.push(`![${alt}](${src})`);
          break;
        }
        case 'br':
          parts.push('\n');
          break;
        case 'del':
        case 's':
          parts.push('~~' + getInlineText(childEl) + '~~');
          break;
        default:
          parts.push(getInlineText(childEl));
          break;
      }
    }
  });
  return parts.join('').trim();
}

function detectCodeLanguage(preEl: HTMLElement): string {
  const codeEl = preEl.querySelector('code');
  if (codeEl) {
    // Check class names like "language-python", "lang-js", "hljs python"
    const classes = Array.from(codeEl.classList);
    for (const cls of classes) {
      const match = cls.match(/^(?:language-|lang-|hljs\s+)?(\w+)$/);
      if (match && !['hljs', 'code', 'highlight', 'codehilite'].includes(match[1])) {
        return match[1];
      }
    }
  }
  // Check data-language attribute
  const dataLang =
    preEl.getAttribute('data-language') ||
    preEl.getAttribute('data-lang') ||
    codeEl?.getAttribute('data-language') ||
    '';
  if (dataLang) return dataLang;

  return '';
}

// ============================================================
// Main extraction with Markdown output
// ============================================================

function findArticleElement(): HTMLElement | null {
  const selectors = [
    'article',
    '[role="main"] .content',
    'main .post-content',
    '.article-body',
    '.markdown-body',
    '.prose',
    '.entry-content',
    '.post-body',
    'main',
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector) as HTMLElement;
    if (el && (el.textContent?.trim().length || 0) > 100) {
      return el;
    }
  }
  return document.body;
}

function extractContentAsMarkdown(): string {
  const article = findArticleElement();
  if (!article) return '';

  const clone = article.cloneNode(true) as HTMLElement;
  // Remove noisy elements
  clone.querySelectorAll(
    'nav, .sidebar, .toc, .comments, .share-buttons, .related-posts, ' +
    '.newsletter, .cookie-banner, .ad, .advertisement, [role="navigation"], ' +
    '.breadcrumb, .pagination'
  ).forEach((n) => n.remove());

  return htmlToMarkdown(clone);
}

function extractRawContent(): string {
  const article = findArticleElement();
  if (!article) return '';
  const clone = article.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('nav, .sidebar, .toc, .comments, aside').forEach((n) => n.remove());
  return clone.innerHTML;
}

function extractPageData(): ExtractedPageData {
  return {
    url: window.location.href,
    title: extractTitle(),
    description: extractDescription(),
    content: extractContentAsMarkdown(),
    rawHtml: extractRawContent(),
    codeBlocks: extractCodeBlocks(),
    images: extractImages(),
    author: extractAuthor(),
    publishedDate: extractPublishedDate(),
    language: extractLanguage(),
    siteName: extractSiteName(),
  };
}

// ============================================================
// Listen for messages from popup/background
// ============================================================

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'EXTRACT_PAGE') {
    const data = extractPageData();
    sendResponse({ type: 'EXTRACT_RESULT', payload: data });
  }
  return true;
});
