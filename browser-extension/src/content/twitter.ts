/**
 * Twitter/X content extraction for the browser extension.
 *
 * Strategy (matching baoyu-danger-x-to-markdown reference skill):
 *   1. PRIMARY: Call X's GraphQL API directly using the user's existing session.
 *      This gives clean structured data (full_text, media URLs, thread structure).
 *   2. FALLBACK: DOM scraping when the API call fails (e.g. logged-out users).
 */

import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import type { ExtractedPageData } from '../shared/types';

import {
    fetchXThread,
    fetchXArticle,
} from './x-api';
import {
    buildFrontMatter,
    formatThreadResult,
    formatArticleMarkdown,
} from './x-format';

// ============================================================
// Language detection
// ============================================================

function detectLanguage(text: string): string {
    // Count CJK characters (Chinese/Japanese/Korean)
    const cjkMatches = text.match(/[\u3400-\u9FFF\uF900-\uFAFF\u3000-\u303F]/g);
    const cjkCount = cjkMatches ? cjkMatches.length : 0;
    const totalChars = text.replace(/\s/g, '').length;
    if (totalChars > 0 && cjkCount / totalChars > 0.1) return 'zh';
    return 'en';
}

// ============================================================
// Async Preparation (Click "Show more" on page — used before DOM fallback)
// ============================================================

export async function prepareTwitterPage(): Promise<void> {
    const main = document.querySelector('[role="main"]') || document.body;

    const findExpandButtons = () => {
        const showMoreButtons = Array.from(main.querySelectorAll('[role="button"]')).filter((b) => {
            const text = b.textContent?.trim().toLowerCase() || '';
            return text === 'show more' || text === 'read more';
        });
        const showMoreLinks = Array.from(
            main.querySelectorAll('[data-testid="tweet-text-show-more-link"]')
        );
        return [...showMoreButtons, ...showMoreLinks];
    };

    const allButtons = findExpandButtons();
    if (allButtons.length > 0) {
        allButtons.forEach((b) => (b as HTMLElement).click());
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const moreButtons = findExpandButtons();
        if (moreButtons.length > 0) {
            moreButtons.forEach((b) => (b as HTMLElement).click());
            await new Promise((resolve) => setTimeout(resolve, 1500));
        }
    }
}

// ============================================================
// API-based extraction (PRIMARY path)
// ============================================================

async function extractViaAPI(url: string): Promise<ExtractedPageData | null> {
    const hostname = new URL(url).hostname;
    if (!hostname.includes('x.com') && !hostname.includes('twitter.com')) return null;

    const ogTitle =
        document
            .querySelector('meta[property="og:title"]')
            ?.getAttribute('content') ||
        document.title;
    const ogImage =
        document
            .querySelector('meta[property="og:image"]')
            ?.getAttribute('content') || '';

    // ---- Article URL: /article/<id> ----
    const articleIdMatch = url.match(/\/(?:i\/)?article\/(\d+)/);
    if (articleIdMatch) {
        const articleId = articleIdMatch[1];
        try {
            const article = await fetchXArticle(articleId);
            const title =
                (typeof article.title === 'string' ? article.title.trim() : '') ||
                ogTitle ||
                'X Article';

            const { markdown: body, coverUrl } = await formatArticleMarkdown(article, true);

            const images: string[] = [];
            if (coverUrl) images.push(coverUrl);
            if (ogImage && !images.includes(ogImage)) images.push(ogImage);
            const imgMatches = body.matchAll(/!\[.*?\]\((.*?)\)/g);
            for (const m of imgMatches) {
                if (m[1] && !images.includes(m[1])) images.push(m[1]);
            }

            const frontMatter = buildFrontMatter({
                url,
                title: title || null,
                coverImage: images[0] || null,
            });

            const markdown = `${frontMatter}\n\n${body}`.replace(/\n{3,}/g, '\n\n').trimEnd();

            return {
                url,
                title,
                description: title,
                content: markdown,
                rawHtml: '',
                images,
                author: '',
                publishedDate: '',
                codeBlocks: [],
                language: detectLanguage(title + ' ' + body),
                siteName: 'X (Twitter)',
            };
        } catch (err) {
            console.warn('[x-api] Article fetch failed, falling back to DOM', err);
            return null;
        }
    }

    // ---- Tweet / Thread URL: /status/<id> ----
    const tweetIdMatch = url.match(/\/status\/(\d+)/);
    if (!tweetIdMatch) return null;
    const tweetId = tweetIdMatch[1];

    try {
        const thread = await fetchXThread(tweetId);
        const result = await formatThreadResult(thread, url);

        const allImages = [...result.images];
        if (ogImage && !allImages.includes(ogImage)) allImages.push(ogImage);

        return {
            url,
            title: result.title,
            description: result.description,
            content: result.body,
            rawHtml: '',
            images: allImages,
            author: result.authorName,
            publishedDate: result.publishedDate,
            codeBlocks: [],
            language: detectLanguage(result.title + ' ' + result.body),
            siteName: 'X (Twitter)',
        };
    } catch (err) {
        console.warn('[x-api] Tweet fetch failed, falling back to DOM', err);
        return null;
    }
}

// ============================================================
// DOM-based extraction helpers (FALLBACK path)
// ============================================================

function getHighResImage(imgUrl: string): string {
    if (!imgUrl) return '';
    try {
        const u = new URL(imgUrl);
        if (u.searchParams.has('name')) u.searchParams.set('name', 'large');
        return u.href;
    } catch {
        return imgUrl;
    }
}

function createTwitterTurndown(keepImages = false): TurndownService {
    const service = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
        emDelimiter: '*',
    });
    service.use(gfm);

    service.addRule('removeNoise', {
        filter: (node) => {
            const el = node as HTMLElement;
            if (['Show more', 'Translate post', 'Subscribe'].some((t) => el.textContent === t))
                return true;
            return false;
        },
        replacement: () => '',
    });

    if (!keepImages) {
        service.addRule('suppressImages', {
            filter: 'img',
            replacement: () => '',
        });
    } else {
        service.addRule('upgradeImages', {
            filter: 'img',
            replacement: (_content, node) => {
                const el = node as HTMLImageElement;
                const src = el.getAttribute('src');
                if (!src) return '';
                if (
                    src.includes('profile_images') ||
                    src.includes('avatar') ||
                    src.includes('emoji')
                )
                    return '';
                return `![Image](${getHighResImage(src)})`;
            },
        });
    }

    return service;
}

interface DomTweetData {
    authorName: string;
    authorHandle: string;
    time: string;
    text: string;
    images: string[];
    videos: string[];
    quoted?: DomTweetData;
    isMain: boolean;
    tweetUrl?: string;
}

function extractDomTweetText(element: Element, service: TurndownService): string {
    let container =
        element.querySelector('[data-testid="tweetText"]') ||
        element.querySelector('div[lang]');

    if (!container) {
        const divs = Array.from(element.querySelectorAll('div[dir="auto"]')).sort(
            (a, b) => (b.textContent?.length || 0) - (a.textContent?.length || 0)
        );
        const candidate = divs.find((d) => !d.closest('[data-testid="User-Name"]'));
        if (candidate) container = candidate;
    }
    if (!container) return '';

    const clone = container.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('[role="button"]').forEach((b) => b.remove());
    return service.turndown(clone.innerHTML).trim();
}

function extractDomMedia(element: Element): { images: string[]; videos: string[] } {
    const images: string[] = [];
    const videos: string[] = [];
    const quotesLink = element.querySelector('a[href*="/quotes"]');

    element.querySelectorAll('[data-testid="tweetPhoto"] img').forEach((img) => {
        const src = img.getAttribute('src');
        if (src) images.push(getHighResImage(src));
    });

    const videoComp = element.querySelector('[data-testid="videoPlayer"]');
    if (videoComp) {
        const vid = videoComp.querySelector('video');
        if (vid?.poster) {
            videos.push(getHighResImage(vid.poster));
        } else {
            const posterImg = videoComp.querySelector('img');
            if (posterImg?.src) videos.push(getHighResImage(posterImg.src));
        }
    }

    element.querySelectorAll('[data-testid^="card.layout"] img').forEach((img) => {
        const src = img.getAttribute('src');
        if (src && !images.includes(getHighResImage(src))) images.push(getHighResImage(src));
    });

    element.querySelectorAll('img').forEach((img) => {
        if (
            quotesLink &&
            quotesLink.compareDocumentPosition(img) & Node.DOCUMENT_POSITION_FOLLOWING
        )
            return;
        const src = img.getAttribute('src');
        if (
            src &&
            src.includes('media') &&
            !src.includes('profile_images') &&
            !src.includes('emoji')
        ) {
            const hr = getHighResImage(src);
            if (!images.includes(hr)) images.push(hr);
        }
    });

    return { images, videos };
}

function extractDomTweet(
    article: HTMLElement,
    service: TurndownService
): DomTweetData | null {
    const user = article.querySelector('[data-testid="User-Name"]');
    const authorName = (user?.querySelector('span')?.textContent || 'Unknown').trim();
    const authorHandle = (user?.textContent?.match(/@[\w_]+/)?.[0] || '').trim();
    const timeEl = article.querySelector('time');
    const time = timeEl?.getAttribute('datetime') || timeEl?.textContent || '';
    const tweetUrl = timeEl?.closest('a')?.href || undefined;
    const text = extractDomTweetText(article, service);
    const { images, videos } = extractDomMedia(article);

    let quoted: DomTweetData | undefined;
    const quoteContainer = Array.from(article.querySelectorAll('[role="link"]')).find(
        (el) => el.querySelector('[data-testid="tweetText"]') && el !== article
    );
    if (quoteContainer) {
        const qUser = quoteContainer.querySelector('[data-testid="User-Name"]');
        const qName = (qUser?.querySelector('span')?.textContent || '').trim();
        const qHandle = (qUser?.textContent?.match(/@[\w_]+/)?.[0] || '').trim();
        const qTimeEl = quoteContainer.querySelector('time');
        quoted = {
            authorName: qName,
            authorHandle: qHandle || '@unknown',
            time: '',
            text: extractDomTweetText(quoteContainer, service),
            images: extractDomMedia(quoteContainer).images,
            videos: extractDomMedia(quoteContainer).videos,
            isMain: false,
            tweetUrl: qTimeEl?.closest('a')?.href || undefined,
        };
    }

    return {
        authorName,
        authorHandle,
        time,
        text,
        images,
        videos,
        quoted,
        isMain: false,
        tweetUrl,
    };
}

function stripTrailingTcoUrl(text: string): string {
    return text.replace(/\s*https?:\/\/t\.co\/\S+$/g, '').trim();
}

function extractDomTweetHeading(text: string, maxLen = 80): { heading: string; body: string } {
    if (!text) return { heading: '', body: '' };
    const paragraphs = text.split(/\n\n+/);
    const firstParagraph = (paragraphs[0] ?? '').trim();
    if (!firstParagraph) return { heading: '', body: text };
    if (firstParagraph.length <= maxLen) {
        const remaining = paragraphs.slice(1).join('\n\n').trim();
        return { heading: firstParagraph, body: remaining };
    }
    const lines = firstParagraph.split('\n');
    const firstLine = lines[0].trim();
    if (firstLine.length <= maxLen) {
        const restLines = lines.slice(1).join('\n').trim();
        const remaining = [restLines, ...paragraphs.slice(1)].filter(Boolean).join('\n\n');
        return { heading: firstLine, body: remaining };
    }
    const truncated = firstParagraph.slice(0, maxLen);
    const lastSpace = truncated.lastIndexOf(' ');
    const heading = (lastSpace > maxLen * 0.6 ? truncated.slice(0, lastSpace) : truncated) + '…';
    return { heading, body: text };
}

function formatDomTweetSection(tweet: DomTweetData, index: number): string {
    const rawText = stripTrailingTcoUrl(tweet.text);
    const { heading, body } = extractDomTweetHeading(rawText);

    const parts: string[] = [`## ${heading || String(index)}`];
    if (tweet.tweetUrl) parts.push(tweet.tweetUrl);
    parts.push('');

    if (body) { parts.push(body); parts.push(''); }

    if (tweet.images.length > 0) {
        tweet.images.forEach((img) => {
            if (!rawText.includes(img)) parts.push(`![Image](${img})`);
        });
        parts.push('');
    }
    if (tweet.videos.length > 0) {
        tweet.videos.forEach((vid) => parts.push(`![Video](${vid})`));
        parts.push('');
    }
    if (tweet.quoted) {
        const q = tweet.quoted;
        const qAuthor = q.authorName && q.authorHandle
            ? `${q.authorName} (${q.authorHandle})`
            : q.authorHandle || q.authorName || 'Unknown';
        parts.push(`> **${qAuthor}**`);
        if (q.tweetUrl) parts.push(`> ${q.tweetUrl}`);
        const qText = stripTrailingTcoUrl(q.text);
        if (qText) {
            parts.push('>');
            qText.split('\n').forEach((l) => parts.push(`> ${l}`));
        }
        parts.push('');
    }

    return parts.join('\n').replace(/\n{3,}/g, '\n\n');
}

function extractDomArticle(doc: Document, url: string): ExtractedPageData | null {
    const ogTitle =
        doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || doc.title;
    const ogImage =
        doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';

    // Prefer the dedicated article body over the full main column to avoid
    // capturing tweet replies that appear below the article.
    const articleBody =
        doc.querySelector('[data-testid="article-body"]') as HTMLElement | null ??
        doc.querySelector('[data-testid="article-content"]') as HTMLElement | null ??
        doc.querySelector('article[role="article"]') as HTMLElement | null;

    if (!articleBody) return null; // Don't fall back to whole page — API path should handle this

    const service = createTwitterTurndown(true);
    const titleEl =
        doc.querySelector('[data-testid="article-title"]') ||
        articleBody.querySelector('h1') ||
        doc.querySelector('h1');
    const title = titleEl?.textContent?.trim() || ogTitle || 'X Article';

    const clone = articleBody.cloneNode(true) as HTMLElement;
    ['[role="button"]', '[data-testid="TopNavBar"]', '[data-testid="sidebarColumn"]',
        '[data-testid="User-Name"]', '[role="group"]', 'a[href*="/analytics"]', 'nav',
        '[data-testid="Tweet-User-Avatar"]']
        .forEach((sel) => clone.querySelectorAll(sel).forEach((el) => el.remove()));

    const md = service.turndown(clone.innerHTML).replace(/\n{3,}/g, '\n\n').trim();

    const images: string[] = [];
    if (ogImage) images.push(ogImage);
    for (const m of md.matchAll(/!\[.*?\]\((.*?)\)/g)) {
        if (m[1] && !images.includes(m[1])) images.push(m[1]);
    }

    const frontMatter = buildFrontMatter({ url, title: title || null, coverImage: images[0] || null });

    return {
        url,
        title,
        description: title,
        content: `${frontMatter}\n\n${md}`.replace(/\n{3,}/g, '\n\n').trimEnd(),
        rawHtml: articleBody.innerHTML,
        images,
        author: '',
        publishedDate: '',
        codeBlocks: [],
        language: detectLanguage(title + ' ' + md),
        siteName: 'X (Twitter)',
    };
}

function extractDomThread(doc: Document, url: string): ExtractedPageData | null {
    const ogTitle =
        doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || doc.title;
    const ogImage =
        doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
    const mainColumn = doc.querySelector('[role="main"]') || doc.body;
    const service = createTwitterTurndown(false);

    // Collect all tweet articles but stop before the "Replies" section.
    // X separates the thread from replies with a Timeline: Conversation region or
    // a cell with aria-label containing "replies" / "Replies".
    const repliesSection =
        mainColumn.querySelector('[aria-label*="eplies"]') ||
        mainColumn.querySelector('[data-testid="inline-or-promoted-tweets"]') ||
        (() => {
            // Look for a <div> or <section> whose aria-label signals the reply timeline
            for (const el of Array.from(mainColumn.querySelectorAll('[aria-label]'))) {
                const label = (el as HTMLElement).getAttribute('aria-label') ?? '';
                if (/^Timeline:/.test(label) && /[Cc]onversation|[Rr]epl/.test(label)) {
                    // Only use as boundary if it's NOT the outermost timeline wrapper
                    if (el !== mainColumn) return el;
                }
            }
            return null;
        })();

    const allTweetEls = Array.from(mainColumn.querySelectorAll('[data-testid="tweet"]'));

    // Filter to only tweets that appear before the replies section in the DOM
    const threadOnlyEls = repliesSection
        ? allTweetEls.filter((el) => {
            return !(
                repliesSection.contains(el) ||
                (repliesSection.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
            );
        })
        : allTweetEls;

    const tweets = threadOnlyEls.length > 0 ? threadOnlyEls : allTweetEls;
    if (!tweets.length) return null;

    const currentTweetId = url.match(/\/status\/(\d+)/)?.[1];
    const threadData: DomTweetData[] = [];

    tweets.forEach((el) => {
        const tweetDom = el as HTMLElement;
        const selfLink = Array.from(tweetDom.querySelectorAll('a')).find((a) =>
            a.href.includes('/status/')
        );
        const tweetId = selfLink?.href.match(/\/status\/(\d+)/)?.[1];
        const isMain = currentTweetId ? tweetId === currentTweetId : false;
        const tData = extractDomTweet(tweetDom, service);
        if (tData) {
            tData.isMain = isMain;
            threadData.push(tData);
        }
    });

    if (!threadData.length) return null;
    if (!threadData.some((t) => t.isMain)) threadData[0].isMain = true;

    const mainIdx = threadData.findIndex((t) => t.isMain);
    const mainTweet = threadData[mainIdx] || threadData[0];
    const authorHandle = mainTweet.authorHandle;

    const threadTweets: DomTweetData[] = [mainTweet];
    for (let i = mainIdx + 1; i < threadData.length; i++) {
        if (threadData[i].authorHandle === authorHandle) {
            threadTweets.push(threadData[i]);
        } else break;
    }

    const allImages: string[] = [...mainTweet.images];
    if (ogImage && !allImages.includes(ogImage)) allImages.push(ogImage);

    const authorStr =
        mainTweet.authorName && mainTweet.authorHandle
            ? `${mainTweet.authorName} (${mainTweet.authorHandle})`
            : mainTweet.authorName || mainTweet.authorHandle || '';

    const frontMatter = buildFrontMatter({
        url,
        author: authorStr,
        tweetCount: threadTweets.length,
        coverImage: allImages[0] || null,
    });

    const sections = threadTweets.map((t, i) => formatDomTweetSection(t, i + 1)).join('\n');
    const markdown = [frontMatter, '', sections].join('\n').replace(/\n{3,}/g, '\n\n').trim();

    return {
        url,
        title: ogTitle || 'X Post',
        description: stripTrailingTcoUrl(mainTweet.text),
        content: markdown,
        rawHtml: doc.documentElement.innerHTML,
        images: allImages,
        author: mainTweet.authorName,
        publishedDate: mainTweet.time,
        codeBlocks: [],
        language: detectLanguage(ogTitle + ' ' + sections),
        siteName: 'X (Twitter)',
    };
}

// ============================================================
// Main export: API-first, DOM fallback
// ============================================================

export async function extractTwitter(doc: Document, url: string): Promise<ExtractedPageData | null> {
    const hostname = new URL(url).hostname;
    if (!hostname.includes('twitter.com') && !hostname.includes('x.com')) return null;

    // 1. Try X GraphQL API (primary — gives clean structured data)
    try {
        const apiResult = await extractViaAPI(url);
        if (apiResult) return apiResult;
    } catch (err) {
        console.warn('[x-api] API extraction failed, using DOM fallback', err);
    }

    // 2. DOM fallback
    const isArticleUrl = url.includes('/article/');
    const articleBody = doc.querySelector('[data-testid="article-body"]');

    if (isArticleUrl || articleBody) {
        return extractDomArticle(doc, url);
    }
    return extractDomThread(doc, url);
}
