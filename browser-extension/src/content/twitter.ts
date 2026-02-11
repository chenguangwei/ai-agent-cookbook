
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import type { ExtractedPageData } from '../shared/types';

// ============================================================
// Types & Interfaces
// ============================================================

interface TweetData {
    id: string;
    authorName: string;
    authorHandle: string;
    time: string;
    text: string; // Markdown
    images: string[];
    videos: string[]; // Poster or URL
    quoted?: TweetData;
    isMain: boolean;
}

// ============================================================
// Async Preparation (Click "Show more")
// ============================================================

export async function prepareTwitterPage(): Promise<void> {
    const main = document.querySelector('[role="main"]') || document.body;

    // Collect all expandable elements (buttons only, never <a> links which navigate away)
    const findExpandButtons = () => {
        // 1. Standard "Show more" text buttons
        const showMoreButtons = Array.from(main.querySelectorAll('[role="button"]'))
            .filter(b => {
                const text = b.textContent?.trim().toLowerCase() || '';
                return text === 'show more' || text === 'read more';
            });

        // 2. Specific "Show more" link for long tweets / Note Tweets
        const showMoreLinks = Array.from(
            main.querySelectorAll('[data-testid="tweet-text-show-more-link"]')
        );

        return [...showMoreButtons, ...showMoreLinks];
    };

    const allButtons = findExpandButtons();
    if (allButtons.length > 0) {
        allButtons.forEach(b => (b as HTMLElement).click());
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Retry: new "Show more" buttons may appear after first expansion
        const moreButtons = findExpandButtons();
        if (moreButtons.length > 0) {
            moreButtons.forEach(b => (b as HTMLElement).click());
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
    }
}

// ============================================================
// Specialized Turndown for Twitter
// ============================================================

function createTwitterTurndown(keepImages = false): TurndownService {
    const service = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
        emDelimiter: '*',
    });
    service.use(gfm);

    // Filter out pure UI noise
    service.addRule('removeNoise', {
        filter: (node) => {
            const el = node as HTMLElement;
            if (['Show more', 'Translate post', 'Subscribe'].some(t => el.textContent === t)) return true;
            return false;
        },
        replacement: () => '',
    });

    if (!keepImages) {
        // Remove images from Text extraction (we rely on extractMedia for high-res in standard tweets)
        service.addRule('suppressImages', {
            filter: 'img',
            replacement: () => '', // Drop inline images to avoid duplication/low-res
        });
    } else {
        // Keep images but upgrade resolution if possible
        service.addRule('upgradeImages', {
            filter: 'img',
            replacement: (_content, node) => {
                const el = node as HTMLImageElement;
                const src = el.getAttribute('src');
                if (!src) return '';
                const highRes = getHighResImage(src);
                return `![Image](${highRes})`;
            }
        });
    }

    return service;
}

// ============================================================
// DOM Helpers
// ============================================================

function getHighResImage(imgUrl: string): string {
    if (!imgUrl) return '';
    try {
        const url = new URL(imgUrl);
        if (url.searchParams.has('name')) {
            url.searchParams.set('name', 'large');
        }
        return url.href;
    } catch {
        return imgUrl;
    }
}

// ============================================================
// Extraction Logic
// ============================================================

function extractTweetText(element: Element, service: TurndownService): string {
    // 1. Try standard tweet text container
    let textContainer = element.querySelector('[data-testid="tweetText"]');

    // 2. Fallback check for Note Tweets (sometimes distinct container)
    if (!textContainer) {
        // Often mixed with images in a div[lang]
        textContainer = element.querySelector('div[lang]');
    }

    // 3. Fallback: Note Tweet / Article Preview (often mixed media)
    // Look for the largest text block that isn't the user handle
    if (!textContainer) {
        const divs = Array.from(element.querySelectorAll('div[dir="auto"]'));
        // Sort by text length
        divs.sort((a, b) => (b.textContent?.length || 0) - (a.textContent?.length || 0));
        // Pick first one that isn't inside User-Name
        const candidate = divs.find(d => !d.closest('[data-testid="User-Name"]'));
        if (candidate) textContainer = candidate;
    }

    if (!textContainer) return '';

    const clone = textContainer.cloneNode(true) as HTMLElement;

    // Clean UI buttons
    clone.querySelectorAll('[role="button"]').forEach(b => b.remove());

    return service.turndown(clone.innerHTML).trim();
}

function extractMedia(element: Element): { images: string[]; videos: string[] } {
    const images: string[] = [];
    const videos: string[] = [];

    // Find View quotes link to avoid extracting quoted content
    const quotesLink = element.querySelector('a[href*="/quotes"]');

    // 1. Tweet Photos (High Res)
    element.querySelectorAll('[data-testid="tweetPhoto"] img').forEach((img) => {
        const src = img.getAttribute('src');
        if (src) images.push(getHighResImage(src));
    });

    // 2. Videos / GIFs
    const videoComponent = element.querySelector('[data-testid="videoPlayer"]');
    if (videoComponent) {
        const videoTag = videoComponent.querySelector('video');
        if (videoTag && videoTag.poster) {
            videos.push(getHighResImage(videoTag.poster));
        } else {
            const posterImg = videoComponent.querySelector('img');
            if (posterImg?.src) videos.push(getHighResImage(posterImg.src));
        }
    }

    // 3. Card Media (Link Previews / Mixed Media)
    element.querySelectorAll('[data-testid^="card.layout"] img').forEach(img => {
        const src = img.getAttribute('src');
        if (src && !images.includes(getHighResImage(src))) {
            images.push(getHighResImage(src));
        }
    });

    // 4. Inline Images in Note Tweets (only before View quotes)
    const allImages = element.querySelectorAll('img');
    for (const img of allImages) {
        // Skip if this image is after the View quotes link
        if (quotesLink && quotesLink.compareDocumentPosition(img) & Node.DOCUMENT_POSITION_FOLLOWING) {
            continue;
        }

        const src = img.getAttribute('src');
        if (src && src.includes('media') && !src.includes('profile_images') && !src.includes('emoji')) {
            const highRes = getHighResImage(src);
            if (!images.includes(highRes)) images.push(highRes);
        }
    }

    return { images, videos };
}

// ============================================================
// Note Tweet / Long-form Post Detection & Extraction
// ============================================================

/**
 * Manual DOM walker for Note Tweet content extraction.
 * Converts HTML elements to Markdown with better control than Turndown.
 * Stops at "View quotes" link to avoid quoted content.
 */
function htmlToMarkdown(node: Node): string {
    let stopAtQuotes = false;

    function processNode(node: Node): string {
        if (stopAtQuotes) return '';

        if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent || '';
        }

        if (node.nodeType !== Node.ELEMENT_NODE) return '';

        const el = node as Element;
        const tagName = el.tagName.toLowerCase();

        // Check if this is a "View quotes" link - STOP here
        if (tagName === 'a' && el.getAttribute('href')?.includes('/quotes')) {
            stopAtQuotes = true;
            return '';
        }

        // Skip UI noise elements
        const skipTags = ['script', 'style', 'nav', 'header', 'footer', 'aside', 'noscript'];
        if (skipTags.includes(tagName)) return '';

        // Skip data-testid noise
        const skipSelectors = [
            '[data-testid="User-Name"]',
            '[data-testid="caret"]',
            '[data-testid="like"]',
            '[data-testid="retweet"]',
            '[data-testid="reply"]',
            '[data-testid="bookmark"]',
            '[data-testid="share"]',
            '[role="group"]',
            '[role="button"]',
            'a[href*="/analytics"]',
            '[data-testid="tweet-text-show-more-link"]',
        ];
        for (const sel of skipSelectors) {
            if (el.matches(sel)) return '';
        }

        // Skip hidden elements
        const style = el.getAttribute('style') || '';
        if (style.includes('display: none') || style.includes('display:none')) return '';

        const children = Array.from(node.childNodes).map(n => processNode(n)).join('');

        switch (tagName) {
            case 'h1': return `\n# ${children.trim()}\n\n`;
            case 'h2': return `\n## ${children.trim()}\n\n`;
            case 'h3': return `\n### ${children.trim()}\n\n`;
            case 'h4': return `\n#### ${children.trim()}\n\n`;
            case 'h5': return `\n##### ${children.trim()}\n\n`;
            case 'h6': return `\n###### ${children.trim()}\n\n`;
            case 'p': return `\n${children.trim()}\n\n`;
            case 'br': return '\n';
            case 'hr': return '\n---\n\n';
            case 'strong':
            case 'b': return `**${children}**`;
            case 'em':
            case 'i': return `*${children}*`;
            case 'code': return `\`${children}\``;
            case 'pre': return `\n\`\`\`\n${children}\n\`\`\`\n\n`;
            case 'blockquote': return `\n> ${children.replace(/\n/g, '\n> ')}\n\n`;
            case 'a': {
                const href = el.getAttribute('href');
                if (href && !href.startsWith('javascript:')) {
                    const absoluteHref = href.startsWith('http') ? href : new URL(href, window.location.origin).href;
                    return `[${children}](${absoluteHref})`;
                }
                return children;
            }
            case 'img': {
                const src = el.getAttribute('src');
                if (src) {
                    const highRes = getHighResImage(src);
                    const alt = el.getAttribute('alt') || 'image';
                    return `![${alt}](${highRes})`;
                }
                return '';
            }
            case 'ul': {
                return '\n' + Array.from(el.children)
                    .map(li => `- ${processNode(li).trim()}`)
                    .join('\n') + '\n\n';
            }
            case 'ol': {
                return '\n' + Array.from(el.children)
                    .map((li, i) => `${i + 1}. ${processNode(li).trim()}`)
                    .join('\n') + '\n\n';
            }
            case 'li': return children;
            case 'table': {
                const rows = Array.from(el.querySelectorAll('tr'));
                if (rows.length === 0) return '';
                let result = '\n';
                rows.forEach((row, i) => {
                    const cells = Array.from(row.querySelectorAll('th, td'));
                    const cellTexts = cells.map(cell => cell.textContent?.trim() || '');
                    result += `| ${cellTexts.join(' | ')} |\n`;
                    if (i === 0) {
                        result += `| ${cells.map(() => '---').join(' | ')} |\n`;
                    }
                });
                return result + '\n';
            }
            case 'div':
            case 'span':
            case 'section':
            case 'article':
            case 'main':
                return children;
            default:
                return children;
        }
    }

    return processNode(node);
}

/**
 * Detect and extract Note Tweets where only the title is captured by tweetText.
 */
function tryExtractNoteTweet(
    tweetElement: HTMLElement,
    originalText: string
): { text: string; images: string[] } | null {
    // Clone and check if there's significantly more content
    const checkClone = tweetElement.cloneNode(true) as HTMLElement;

    // Remove UI noise
    checkClone.querySelectorAll('[data-testid="User-Name"], [role="group"], [role="button"], time, a[href*="/analytics"]').forEach(el => el.remove());
    checkClone.querySelectorAll('img').forEach(img => {
        const src = img.getAttribute('src') || '';
        if (src.includes('profile_images') || src.includes('avatar') || src.includes('emoji')) {
            img.remove();
        }
    });

    const fullText = (checkClone.textContent || '').replace(/\s+/g, ' ').trim();

    // If the element doesn't have significantly more text, this is a normal tweet
    if (fullText.length <= originalText.length * 2 || originalText.length > 500) {
        return null;
    }

    // This is likely a Note Tweet — use manual DOM walker for clean extraction
    const extractClone = tweetElement.cloneNode(true) as HTMLElement;

    // Remove UI elements but keep content
    extractClone.querySelectorAll('[data-testid="User-Name"], [data-testid="caret"], [role="group"], a[href*="/analytics"]').forEach(el => el.remove());
    extractClone.querySelectorAll('[role="button"]').forEach(b => b.remove());
    extractClone.querySelectorAll('time').forEach(t => {
        const parent = t.closest('a');
        if (parent) parent.remove();
        else t.remove();
    });
    extractClone.querySelectorAll('img').forEach(img => {
        const src = img.getAttribute('src') || '';
        if (src.includes('profile_images') || src.includes('avatar') || src.includes('emoji')) {
            img.remove();
        }
    });

    const md = htmlToMarkdown(extractClone).trim();

    if (md.length > originalText.length * 1.5) {
        // Extract inline images from markdown
        const imageMatches = md.matchAll(/!\[.*?\]\((.*?)\)/g);
        const images = Array.from(imageMatches).map(m => m[1]);
        return { text: md, images };
    }

    return null;
}

function extractTweet(article: HTMLElement, service: TurndownService, isQuoted = false): TweetData | null {
    const user = article.querySelector('[data-testid="User-Name"]');
    const authorName = (user?.querySelector('span')?.textContent || 'Unknown').trim();
    const authorHandle = (user?.textContent?.match(/@[\w_]+/)?.[0] || '').trim();

    const timeEl = article.querySelector('time');
    const time = timeEl?.getAttribute('datetime') || timeEl?.textContent || '';

    // Extract Text (images stripped)
    const text = extractTweetText(article, service);

    // Extract Media (collected separately)
    const { images, videos } = extractMedia(article);

    // Quoted
    let quoted: TweetData | undefined;
    if (!isQuoted) {
        const quoteContainer = Array.from(article.querySelectorAll('[role="link"]')).find(el => {
            return el.querySelector('[data-testid="tweetText"]') && el !== article;
        });
        if (quoteContainer) {
            const qUser = quoteContainer.querySelector('[data-testid="User-Name"]');
            const qName = qUser?.querySelector('span')?.textContent || '';
            const qHandle = qUser?.textContent?.match(/@[\w_]+/)?.[0] || '';
            const qText = extractTweetText(quoteContainer, service);
            const qMedia = extractMedia(quoteContainer);

            quoted = {
                id: 'quoted',
                authorName: qName,
                authorHandle: qHandle || '@unknown',
                time: '',
                text: qText,
                images: qMedia.images,
                videos: qMedia.videos,
                isMain: false
            };
        }
    }

    return {
        id: '',
        authorName,
        authorHandle,
        time,
        text,
        images: [...images],
        videos: [...videos],
        quoted,
        isMain: false
    };
}

// ============================================================
// Markdown Builder
// ============================================================

function formatTweetAsMarkdown(tweet: TweetData): string {
    const parts: string[] = [];

    // Only format the main tweet (not replies/comments in the thread)
    if (tweet.isMain) {
        parts.push(`# ${tweet.authorName} (${tweet.authorHandle})`);
    } else {
        // Skip non-main tweets (replies/comments)
        return '';
    }

    if (tweet.time) parts.push(`_${tweet.time}_`);
    parts.push('');

    if (tweet.text) {
        parts.push(tweet.text);
        parts.push('');
    }

    // Output inline images/videos
    if (tweet.images.length > 0) {
        tweet.images.forEach(img => {
            if (!tweet.text.includes(img)) {
                parts.push(`![Image](${img})`);
            }
        });
        parts.push('');
    }
    if (tweet.videos.length > 0) {
        tweet.videos.forEach(vid => parts.push(`![Video Poster](${vid})`));
        parts.push('');
    }

    // Skip quoted tweets to avoid noise
    // (quoted tweets content is usually not needed for the main article)

    return parts.join('\n');
}

// ============================================================
// Main Public Function
// ============================================================

function getMeta(doc: Document, name: string): string {
    const el = doc.querySelector(`meta[property="${name}"]`) ||
        doc.querySelector(`meta[name="${name}"]`);
    return el?.getAttribute('content') ?? '';
}

export function extractTwitter(doc: Document, url: string): ExtractedPageData | null {
    const hostname = new URL(url).hostname;

    if (!hostname.includes('twitter.com') && !hostname.includes('x.com')) return null;

    // 1. Get proper title from og:title meta tag (most reliable for Note Tweets)
    const ogTitle = getMeta(doc, 'og:title') || doc.title;

    // 1.5 Get og:image for thumbnail
    const ogImage = getMeta(doc, 'og:image');

    // 2. Tweet / Thread Mode Detection
    const mainColumn = doc.querySelector('[role="main"]') || doc.body;

    // Check for Article Body (Long form articles)
    const articleBody = doc.querySelector('[data-testid="article-body"]');
    const isArticleUrl = url.includes('/article/');

    // 3. FORCE Article Mode if Article Body is found OR URL indicates Article
    if (isArticleUrl || articleBody) {
        const service = createTwitterTurndown(true);
        const contentContainer = (articleBody || mainColumn) as HTMLElement;
        const titleEl = doc.querySelector('[data-testid="article-title"]') || contentContainer.querySelector('h1');
        const title = titleEl?.textContent || ogTitle || 'Twitter Article';

        const contentClone = contentContainer.cloneNode(true) as HTMLElement;
        contentClone.querySelectorAll('[role="button"]').forEach(b => b.remove());

        const md = service.turndown(contentClone.innerHTML);

        // Extract images from the markdown
        const imageMatches = md.matchAll(/!\[.*?\]\((.*?)\)/g);
        const images = Array.from(imageMatches).map(m => m[1]);

        // Add og:image as first image if available
        if (ogImage && !images.includes(ogImage)) {
            images.unshift(ogImage);
        }

        return {
            url,
            title,
            description: title,
            content: md,
            rawHtml: contentContainer.innerHTML,
            images: images,
            author: '',
            publishedDate: '',
            codeBlocks: [],
            language: 'en',
            siteName: 'X (Twitter)'
        };
    }

    // 4. Standard Tweet / Thread Mode
    const service = createTwitterTurndown(false); // Strip images from text, handle separately
    const tweets = Array.from(mainColumn.querySelectorAll('[data-testid="tweet"]'));

    if (tweets.length === 0) return null;

    const currentTweetId = url.match(/\/status\/(\d+)/)?.[1];
    const threadData: TweetData[] = [];
    let mainTweetElement: HTMLElement | null = null;

    tweets.forEach((el) => {
        const tweetDom = el as HTMLElement;
        const tweetLinks = Array.from(tweetDom.querySelectorAll('a'));
        const selfLink = tweetLinks.find(a => a.href.includes('/status/'));
        const tweetId = selfLink?.href.match(/\/status\/(\d+)/)?.[1];

        const isMain = currentTweetId ? (tweetId === currentTweetId) : false;
        const tData = extractTweet(tweetDom, service);
        if (tData) {
            tData.isMain = isMain;
            if (isMain) mainTweetElement = tweetDom;
            threadData.push(tData);
        }
    });

    if (threadData.length === 0) return null;

    if (!threadData.some(t => t.isMain)) {
        threadData[0].isMain = true;
        mainTweetElement = tweets[0] as HTMLElement;
    }

    // Note Tweet detection: if main tweet text is short but the DOM has more content,
    // re-extract with full content (including inline images)
    const mainTweet0 = threadData.find(t => t.isMain);
    let originalText = '';
    let originalImages: string[] = [];
    if (mainTweet0 && mainTweetElement) {
        originalText = mainTweet0.text;
        originalImages = [...mainTweet0.images];

        const noteContent = tryExtractNoteTweet(mainTweetElement, mainTweet0.text);
        if (noteContent) {
            mainTweet0.text = noteContent.text;
            // Keep original images for thumbnail, add Note inline images separately
            mainTweet0.images = [...originalImages, ...noteContent.images];
        }
    }

    const mainTweet = threadData.find(t => t.isMain) || threadData[0];

    // Only format the main tweet (skip replies/comments)
    const markdown = formatTweetAsMarkdown(mainTweet);

    // Use og:title for title (proper Note Tweet title)
    const title = ogTitle || (doc.title || 'Twitter Thread');

    // Images: prioritize extracted content images, fallback/append og:image
    const allImages: string[] = [...mainTweet.images];
    if (ogImage && !allImages.includes(ogImage)) {
        allImages.push(ogImage);
    }

    return {
        url,
        title,
        description: mainTweet.text || originalText || '',
        content: markdown,
        rawHtml: doc.documentElement.innerHTML,
        images: allImages,
        author: mainTweet.authorName,
        publishedDate: mainTweet.time,
        codeBlocks: [],
        language: 'en',
        siteName: 'X (Twitter)'
    };
}
