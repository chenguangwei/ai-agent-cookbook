/**
 * Markdown formatters for X (Twitter) content.
 *
 * Ported from baoyu-danger-x-to-markdown reference skill:
 * - thread-markdown.ts → formatThreadTweetsMarkdown, formatQuotedTweetMarkdown
 * - markdown.ts        → formatArticleMarkdown (Draft.js content_state blocks)
 * - tweet-to-markdown.ts → formatFrontMatter
 */

import {
    parseTweetText,
    parsePhotos,
    parseVideos,
    resolveTweetId,
    buildTweetUrl,
    unwrapTweetResult,
    fetchReferencedTweet,
    resolveArticleEntityFromTweet,
    type ThreadResult,
} from './x-api';

// ============================================================
// Utilities
// ============================================================

function escapeMarkdownAlt(text: string): string {
    return text.replace(/[\[\]]/g, '\\$&');
}

export function buildFrontMatter(fields: Record<string, string | number | null | undefined>): string {
    const lines = ['---'];
    for (const [key, value] of Object.entries(fields)) {
        if (value === undefined || value === null || value === '') continue;
        if (typeof value === 'number') {
            lines.push(`${key}: ${value}`);
        } else {
            lines.push(`${key}: ${JSON.stringify(value)}`);
        }
    }
    lines.push('---');
    return lines.join('\n');
}

// ============================================================
// Tweet heading extraction
// ============================================================

function isUrlOnly(s: string): boolean {
    return /^https?:\/\/\S+$/.test(s.trim());
}

function extractTweetHeading(text: string, maxLen = 80): { heading: string; body: string } {
    if (!text) return { heading: '', body: '' };
    const paragraphs = text.split(/\n\n+/);
    const firstParagraph = (paragraphs[0] ?? '').trim();
    if (!firstParagraph) return { heading: '', body: text };

    // If first paragraph fits and is not a bare URL, use it as heading
    if (firstParagraph.length <= maxLen && !isUrlOnly(firstParagraph)) {
        const remaining = paragraphs.slice(1).join('\n\n').trim();
        return { heading: firstParagraph, body: remaining };
    }

    // Try the first line of the first paragraph (skip if it's a bare URL)
    const lines = firstParagraph.split('\n');
    const firstLine = lines[0].trim();
    if (firstLine.length <= maxLen && !isUrlOnly(firstLine)) {
        const restLines = lines.slice(1).join('\n').trim();
        const remaining = [restLines, ...paragraphs.slice(1)].filter(Boolean).join('\n\n');
        return { heading: firstLine, body: remaining };
    }

    // Truncate at word boundary (only if not a URL)
    if (!isUrlOnly(firstParagraph)) {
        const truncated = firstParagraph.slice(0, maxLen);
        const lastSpace = truncated.lastIndexOf(' ');
        const heading = (lastSpace > maxLen * 0.6 ? truncated.slice(0, lastSpace) : truncated) + '…';
        return { heading, body: text };
    }

    // First content is a URL — no heading, use full text as body
    return { heading: '', body: text };
}

// ============================================================
// Quoted tweet formatter (from thread-markdown.ts formatQuotedTweetMarkdown)
// ============================================================

function formatQuotedTweetMarkdown(quoted: any): string[] {
    if (!quoted) return [];
    const quotedUser = quoted?.core?.user_results?.result?.legacy;
    const quotedUsername = quotedUser?.screen_name;
    const quotedName = quotedUser?.name;
    const authorStr =
        quotedUsername && quotedName
            ? `${quotedName} (@${quotedUsername})`
            : quotedUsername
                ? `@${quotedUsername}`
                : quotedName ?? 'Unknown';

    const quotedId = resolveTweetId(quoted);
    const quotedUrl =
        buildTweetUrl(quotedUsername, quotedId) ??
        (quotedId ? `https://x.com/i/web/status/${quotedId}` : 'unavailable');

    const quotedText = parseTweetText(quoted);
    const lines: string[] = [];
    lines.push(`Author: ${authorStr}`);
    lines.push(`URL: ${quotedUrl}`);
    if (quotedText) {
        lines.push('', ...quotedText.split(/\r?\n/));
    } else {
        lines.push('', '(no content)');
    }
    return lines.map((line) => `> ${line}`.trimEnd());
}

// ============================================================
// Single tweet section formatter (from thread-markdown.ts formatTweetMarkdown)
// ============================================================

export type ThreadTweetsMarkdownOptions = {
    username?: string;
    headingLevel?: number;
    startIndex?: number;
    includeTweetUrls?: boolean;
};

function formatTweetMarkdown(
    tweet: any,
    index: number,
    options: ThreadTweetsMarkdownOptions
): string[] {
    const headingLevel = Math.min(Math.max(options.headingLevel ?? 2, 1), 6);
    const headingPrefix = '#'.repeat(headingLevel);
    const tweetId = resolveTweetId(tweet);
    const tweetUrl =
        (options.includeTweetUrls ?? true) ? buildTweetUrl(options.username, tweetId) : null;

    const text = parseTweetText(tweet);
    const { heading, body } = extractTweetHeading(text ?? '');

    const lines: string[] = [];
    lines.push(`${headingPrefix} ${heading || String(index)}`);
    if (tweetUrl) lines.push(tweetUrl);
    lines.push('');

    const photos = parsePhotos(tweet);
    const videos = parseVideos(tweet);
    const quoted = unwrapTweetResult(tweet?.quoted_status_result?.result);

    const bodyLines: string[] = [];
    if (body) bodyLines.push(...body.split(/\r?\n/));

    const quotedLines = formatQuotedTweetMarkdown(quoted);
    if (quotedLines.length > 0) {
        if (bodyLines.length > 0) bodyLines.push('');
        bodyLines.push(...quotedLines);
    }

    const photoLines = photos.map((photo) => {
        const alt = photo.alt ? escapeMarkdownAlt(photo.alt) : '';
        return `![${alt}](${photo.src})`;
    });
    if (photoLines.length > 0) {
        if (bodyLines.length > 0) bodyLines.push('');
        bodyLines.push(...photoLines);
    }

    const videoLines: string[] = [];
    for (const video of videos) {
        if (video.poster) {
            const alt = video.alt ? escapeMarkdownAlt(video.alt) : 'video';
            videoLines.push(`![${alt}](${video.poster})`);
        }
        videoLines.push(`[${video.type ?? 'video'}](${video.url})`);
    }
    if (videoLines.length > 0) {
        if (bodyLines.length > 0) bodyLines.push('');
        bodyLines.push(...videoLines);
    }

    if (bodyLines.length === 0) bodyLines.push('_No text or media._');

    lines.push(...bodyLines);
    return lines;
}

// ============================================================
// Thread tweets formatter (from thread-markdown.ts formatThreadTweetsMarkdown)
// ============================================================

export function formatThreadTweetsMarkdown(
    tweets: any[],
    options: ThreadTweetsMarkdownOptions = {}
): string {
    if (!Array.isArray(tweets) || tweets.length === 0) return '';
    const startIndex = options.startIndex ?? 1;
    const lines: string[] = [];
    tweets.forEach((tweet, index) => {
        if (lines.length > 0) lines.push('');
        lines.push(...formatTweetMarkdown(tweet, startIndex + index, options));
    });
    return lines.join('\n').trimEnd();
}

// ============================================================
// Full thread markdown (from tweet-to-markdown.ts)
// ============================================================

export type ThreadMarkdownResult = {
    markdown: string;   // full content with front matter (for copy/reference)
    body: string;       // tweet sections only, no front matter (for tutorial content)
    title: string;
    description: string;
    author: string;
    authorName: string;
    authorUsername: string;
    publishedDate: string;
    images: string[];
    coverImage: string | null;
};

export async function formatThreadResult(thread: ThreadResult, requestedUrl: string): Promise<ThreadMarkdownResult> {
    const tweets = thread.tweets ?? [];
    const firstTweet = tweets[0] as any;
    const user = thread.user ?? firstTweet?.core?.user_results?.result?.legacy;
    const username = user?.screen_name;
    const name = user?.name;
    const author =
        username && name ? `${name} (@${username})` : username ? `@${username}` : name ?? null;
    const authorUrl = username ? `https://x.com/${username}` : undefined;

    const rootUrl =
        buildTweetUrl(username, thread.rootId ?? thread.requestedId) ?? requestedUrl;
    const reqUrl =
        buildTweetUrl(username, thread.requestedId) ?? requestedUrl;

    // Cover image: first photo from first tweet
    const firstPhotos = parsePhotos(firstTweet);
    let coverImage: string | null = firstPhotos[0]?.src ?? null;

    // ── Article detection (mirrors tweet-to-markdown.ts resolveArticleEntityFromTweet) ──
    // When a tweet links to or embeds an X Article, render article content first,
    // then append remaining thread tweets as "## Thread".
    const articleEntity = await resolveArticleEntityFromTweet(firstTweet);
    let remainingTweets = tweets;
    const contentParts: string[] = [];

    if (articleEntity) {
        const articleResult = await formatArticleMarkdown(articleEntity, true);
        if (articleResult.coverUrl) coverImage = coverImage ?? articleResult.coverUrl;
        const articleMarkdown = articleResult.markdown.trimEnd();
        if (articleMarkdown) {
            contentParts.push(articleMarkdown);
            // If first tweet text is only a URL (just the article link), skip it in the thread
            const firstText = parseTweetText(firstTweet);
            if (!firstText || /^https?:\/\/\S+$/.test(firstText.trim())) {
                remainingTweets = tweets.slice(1);
            }
        }
    }

    const meta = buildFrontMatter({
        url: rootUrl,
        requestedUrl: reqUrl !== rootUrl ? reqUrl : null,
        author,
        authorName: name ?? null,
        authorUsername: username ?? null,
        authorUrl: authorUrl ?? null,
        tweetCount: thread.totalTweets ?? tweets.length,
        coverImage,
    });

    const hasArticle = contentParts.length > 0;
    if (remainingTweets.length > 0) {
        if (hasArticle) contentParts.push('## Thread');
        const tweetMarkdown = formatThreadTweetsMarkdown(remainingTweets, {
            username,
            headingLevel: hasArticle ? 3 : 2,
            startIndex: 1,
            includeTweetUrls: true,
        });
        if (tweetMarkdown) contentParts.push(tweetMarkdown);
    }

    const body = contentParts.join('\n\n').replace(/\n{3,}/g, '\n\n').trimEnd();
    const markdown = [meta, body].filter(Boolean).join('\n\n').replace(/\n{3,}/g, '\n\n').trimEnd();

    // Collect all images across thread
    const allImages: string[] = [];
    if (coverImage) allImages.push(coverImage);
    for (const tweet of tweets) {
        for (const p of parsePhotos(tweet)) {
            if (!allImages.includes(p.src)) allImages.push(p.src);
        }
        for (const v of parseVideos(tweet)) {
            if (v.poster && !allImages.includes(v.poster)) allImages.push(v.poster);
        }
    }

    const description = parseTweetText(firstTweet);
    const publishedDate = firstTweet?.legacy?.created_at ?? '';
    const titleStr = author ? `${author} on X` : 'X Post';

    return {
        markdown,
        body,
        title: titleStr,
        description,
        author: name ?? username ?? '',
        authorName: name ?? '',
        authorUsername: username ?? '',
        publishedDate,
        images: allImages,
        coverImage,
    };
}

// ============================================================
// Article markdown formatter (from markdown.ts)
// Renders Draft.js content_state blocks → Markdown
// ============================================================

type EntityLookup = {
    byIndex: Map<number, any>;
    byLogicalKey: Map<number, any>;
};

function buildEntityLookup(entityMap: Record<string, any> | undefined): EntityLookup {
    const lookup: EntityLookup = {
        byIndex: new Map(),
        byLogicalKey: new Map(),
    };
    if (!entityMap) return lookup;
    for (const [idx, entry] of Object.entries(entityMap)) {
        const idxNum = Number(idx);
        if (Number.isFinite(idxNum)) lookup.byIndex.set(idxNum, entry);
        const logicalKey = parseInt(entry?.key ?? '', 10);
        if (Number.isFinite(logicalKey) && !lookup.byLogicalKey.has(logicalKey)) {
            lookup.byLogicalKey.set(logicalKey, entry);
        }
    }
    return lookup;
}

function resolveEntityEntry(
    entityKey: number | undefined,
    entityMap: Record<string, any> | undefined,
    lookup: EntityLookup
): any | undefined {
    if (entityKey === undefined) return undefined;
    const byLogical = lookup.byLogicalKey.get(entityKey);
    if (byLogical) return byLogical;
    const byIndex = lookup.byIndex.get(entityKey);
    if (byIndex) return byIndex;
    if (!entityMap) return undefined;
    return entityMap[String(entityKey)];
}

function resolveMediaUrl(info: any): string | undefined {
    if (!info) return undefined;
    if (info.original_img_url) return info.original_img_url;
    if (info.preview_image?.original_img_url) return info.preview_image.original_img_url;
    const variants: any[] = info.variants ?? [];
    const mp4 = variants
        .filter((v: any) => v?.content_type?.includes('video'))
        .sort((a: any, b: any) => (b.bit_rate ?? 0) - (a.bit_rate ?? 0))[0];
    return mp4?.url ?? variants[0]?.url;
}

function buildMediaById(article: any): Map<string, string> {
    const map = new Map<string, string>();
    for (const entity of article.media_entities ?? []) {
        if (!entity?.media_id) continue;
        const url = resolveMediaUrl(entity.media_info);
        if (url) map.set(entity.media_id, url);
    }
    return map;
}

function buildMediaLinkMap(entityMap: Record<string, any> | undefined): Map<number, string> {
    const map = new Map<number, string>();
    if (!entityMap) return map;

    const mediaEntries: { idx: number; key: number }[] = [];
    const linkEntries: { key: number; url: string }[] = [];

    for (const [idx, entry] of Object.entries(entityMap)) {
        const value = entry?.value;
        if (!value) continue;
        const key = parseInt(entry?.key ?? '', 10);
        if (isNaN(key)) continue;
        if (value.type === 'MEDIA' || value.type === 'IMAGE') {
            mediaEntries.push({ idx: Number(idx), key });
        } else if (value.type === 'LINK' && typeof value.data?.url === 'string') {
            linkEntries.push({ key, url: value.data.url });
        }
    }

    if (!mediaEntries.length || !linkEntries.length) return map;

    mediaEntries.sort((a, b) => a.key - b.key);
    linkEntries.sort((a, b) => a.key - b.key);

    const pool = [...linkEntries];
    for (const media of mediaEntries) {
        if (!pool.length) break;
        let linkIdx = pool.findIndex((l) => l.key > media.key);
        if (linkIdx === -1) linkIdx = 0;
        const link = pool.splice(linkIdx, 1)[0]!;
        map.set(media.idx, link.url);
        map.set(media.key, link.url);
    }
    return map;
}

function renderInlineLinks(
    text: string,
    entityRanges: Array<{ key?: number; offset?: number; length?: number }>,
    entityMap: Record<string, any> | undefined,
    lookup: EntityLookup,
    mediaLinkMap: Map<number, string>
): string {
    if (!entityMap || !entityRanges.length) return text;
    const valid = entityRanges.filter(
        (r) =>
            typeof r.key === 'number' &&
            typeof r.offset === 'number' &&
            typeof r.length === 'number' &&
            r.length > 0
    );
    if (!valid.length) return text;

    const sorted = [...valid].sort((a, b) => (b.offset ?? 0) - (a.offset ?? 0));
    let result = text;
    for (const range of sorted) {
        const offset = range.offset!;
        const length = range.length!;
        const key = range.key!;
        const entry = resolveEntityEntry(key, entityMap, lookup);
        const value = entry?.value;
        if (!value) continue;

        let url: string | undefined;
        if (value.type === 'LINK' && typeof value.data?.url === 'string') {
            url = value.data.url;
        } else if (value.type === 'MEDIA' || value.type === 'IMAGE') {
            url = mediaLinkMap.get(key);
        }
        if (!url) continue;

        const linkText = result.slice(offset, offset + length);
        result = result.slice(0, offset) + `[${linkText}](${url})` + result.slice(offset + length);
    }
    return result;
}

function normalizeCaption(caption?: string): string {
    const trimmed = caption?.trim();
    if (!trimmed) return '';
    return trimmed.replace(/\s+/g, ' ');
}

function resolveEntityMediaLines(
    entityKey: number | undefined,
    entityMap: Record<string, any> | undefined,
    lookup: EntityLookup,
    mediaById: Map<string, string>,
    usedUrls: Set<string>
): string[] {
    if (entityKey === undefined) return [];
    const entry = resolveEntityEntry(entityKey, entityMap, lookup);
    const value = entry?.value;
    if (!value || (value.type !== 'MEDIA' && value.type !== 'IMAGE')) return [];

    const caption = normalizeCaption(value.data?.caption);
    const altText = caption ? escapeMarkdownAlt(caption) : '';
    const lines: string[] = [];

    for (const item of value.data?.mediaItems ?? []) {
        const mediaId = item?.mediaId ?? item?.media_id;
        const url = typeof mediaId === 'string' ? mediaById.get(mediaId) : undefined;
        if (url && !usedUrls.has(url)) {
            usedUrls.add(url);
            lines.push(`![${altText}](${url})`);
        }
    }

    const fallbackUrl = typeof value.data?.url === 'string' ? value.data.url : undefined;
    if (fallbackUrl && !usedUrls.has(fallbackUrl)) {
        usedUrls.add(fallbackUrl);
        lines.push(`![${altText}](${fallbackUrl})`);
    }
    return lines;
}

function resolveEntityTweetLines(
    entityKey: number | undefined,
    entityMap: Record<string, any> | undefined,
    lookup: EntityLookup,
    referencedTweets?: Map<string, { url: string; authorName?: string; authorUsername?: string; text?: string }>
): string[] {
    if (entityKey === undefined) return [];
    const entry = resolveEntityEntry(entityKey, entityMap, lookup);
    const value = entry?.value;
    if (!value || value.type !== 'TWEET') return [];

    const tweetId = typeof value.data?.tweetId === 'string' ? value.data.tweetId : '';
    if (!tweetId) return [];

    const referenced = referencedTweets?.get(tweetId);
    const url = referenced?.url ?? buildTweetUrl(referenced?.authorUsername, tweetId) ?? `https://x.com/i/web/status/${tweetId}`;
    const authorText =
        referenced?.authorName && referenced?.authorUsername
            ? `${referenced.authorName} (@${referenced.authorUsername})`
            : referenced?.authorUsername
                ? `@${referenced.authorUsername}`
                : referenced?.authorName;

    const lines: string[] = [];
    lines.push(`> Quoted tweet${authorText ? `: ${authorText}` : ''}`);
    const rawText = referenced?.text;
    const summary = rawText
        ? (() => {
            const normalized = rawText.trim().split(/\r?\n+/).map((l) => l.trim()).filter(Boolean).join(' ');
            return normalized.length <= 280 ? normalized : `${normalized.slice(0, 277)}...`;
        })()
        : undefined;
    if (summary) lines.push(`> ${summary}`);
    lines.push(`> ${url}`);
    return lines;
}

function renderContentBlocks(
    blocks: any[],
    entityMap: Record<string, any> | undefined,
    lookup: EntityLookup,
    mediaById: Map<string, string>,
    usedUrls: Set<string>,
    mediaLinkMap: Map<number, string>,
    referencedTweets?: Map<string, any>
): string[] {
    const lines: string[] = [];
    let previousKind: string | null = null;
    let listKind: 'ordered' | 'unordered' | null = null;
    let orderedIndex = 0;
    let inCodeBlock = false;

    const pushBlock = (blockLines: string[], kind: string) => {
        if (!blockLines.length) return;
        if (lines.length > 0 && previousKind && !(previousKind === kind && ['list', 'quote', 'media'].includes(kind))) {
            lines.push('');
        }
        lines.push(...blockLines);
        previousKind = kind;
    };

    const collectMediaLines = (block: any): string[] => {
        const ranges: any[] = Array.isArray(block.entityRanges) ? block.entityRanges : [];
        const mediaLines: string[] = [];
        for (const range of ranges) {
            if (typeof range?.key !== 'number') continue;
            mediaLines.push(...resolveEntityMediaLines(range.key, entityMap, lookup, mediaById, usedUrls));
        }
        return mediaLines;
    };

    const collectTweetLines = (block: any): string[] => {
        const ranges: any[] = Array.isArray(block.entityRanges) ? block.entityRanges : [];
        const tweetLines: string[] = [];
        for (const range of ranges) {
            if (typeof range?.key !== 'number') continue;
            tweetLines.push(...resolveEntityTweetLines(range.key, entityMap, lookup, referencedTweets));
        }
        return tweetLines;
    };

    const collectLinkLines = (block: any): string[] => {
        const ranges: any[] = Array.isArray(block.entityRanges) ? block.entityRanges : [];
        const linkLines: string[] = [];
        for (const range of ranges) {
            if (typeof range?.key !== 'number') continue;
            const entry = resolveEntityEntry(range.key, entityMap, lookup);
            const value = entry?.value;
            if (value?.type !== 'LINK') continue;
            const url = typeof value.data?.url === 'string' ? value.data.url : '';
            if (url) linkLines.push(url);
        }
        return [...new Set(linkLines)];
    };

    for (const block of blocks) {
        const type = typeof block?.type === 'string' ? block.type : 'unstyled';
        const rawText = typeof block?.text === 'string' ? block.text : '';
        const ranges: any[] = Array.isArray(block.entityRanges) ? block.entityRanges : [];
        const text =
            type !== 'atomic' && type !== 'code-block'
                ? renderInlineLinks(rawText, ranges, entityMap, lookup, mediaLinkMap)
                : rawText;

        if (type === 'code-block') {
            if (!inCodeBlock) {
                if (lines.length > 0) lines.push('');
                lines.push('```');
                inCodeBlock = true;
            }
            lines.push(text);
            previousKind = 'code';
            listKind = null;
            orderedIndex = 0;
            continue;
        }

        if (type === 'atomic') {
            if (inCodeBlock) {
                lines.push('```');
                inCodeBlock = false;
                previousKind = 'code';
            }
            listKind = null;
            orderedIndex = 0;

            const tweetLines = collectTweetLines(block);
            if (tweetLines.length) pushBlock(tweetLines, 'quote');

            const mediaLines = collectMediaLines(block);
            if (mediaLines.length) pushBlock(mediaLines, 'media');

            const linkLines = collectLinkLines(block);
            if (linkLines.length) pushBlock(linkLines, 'text');
            continue;
        }

        if (inCodeBlock) {
            lines.push('```');
            inCodeBlock = false;
            previousKind = 'code';
        }

        if (type === 'unordered-list-item') {
            listKind = 'unordered';
            orderedIndex = 0;
            pushBlock([`- ${text}`], 'list');
            const ml = collectMediaLines(block);
            if (ml.length) pushBlock(ml, 'media');
            continue;
        }

        if (type === 'ordered-list-item') {
            if (listKind !== 'ordered') orderedIndex = 0;
            listKind = 'ordered';
            orderedIndex += 1;
            pushBlock([`${orderedIndex}. ${text}`], 'list');
            const ml = collectMediaLines(block);
            if (ml.length) pushBlock(ml, 'media');
            continue;
        }

        listKind = null;
        orderedIndex = 0;

        const ml = collectMediaLines(block);
        switch (type) {
            case 'header-one':    pushBlock([`# ${text}`], 'heading'); if (ml.length) pushBlock(ml, 'media'); break;
            case 'header-two':    pushBlock([`## ${text}`], 'heading'); if (ml.length) pushBlock(ml, 'media'); break;
            case 'header-three':  pushBlock([`### ${text}`], 'heading'); if (ml.length) pushBlock(ml, 'media'); break;
            case 'header-four':   pushBlock([`#### ${text}`], 'heading'); if (ml.length) pushBlock(ml, 'media'); break;
            case 'header-five':   pushBlock([`##### ${text}`], 'heading'); if (ml.length) pushBlock(ml, 'media'); break;
            case 'header-six':    pushBlock([`###### ${text}`], 'heading'); if (ml.length) pushBlock(ml, 'media'); break;
            case 'blockquote': {
                const qLines = text.length > 0 ? text.split('\n') : [''];
                pushBlock(qLines.map((l: string) => `> ${l}`), 'quote');
                if (ml.length) pushBlock(ml, 'media');
                break;
            }
            default:
                if (/^XIMGPH_\d+$/.test(text.trim())) {
                    if (ml.length) pushBlock(ml, 'media');
                } else {
                    pushBlock([text], 'text');
                    if (ml.length) pushBlock(ml, 'media');
                }
                break;
        }
    }

    if (inCodeBlock) lines.push('```');
    return lines;
}

export type ArticleMarkdownResult = {
    markdown: string;
    coverUrl: string | null;
};

export async function formatArticleMarkdown(
    article: any,
    fetchReferenced = true
): Promise<ArticleMarkdownResult> {
    if (!article || (typeof article.title !== 'string' && !article.content_state && !article.plain_text)) {
        return {
            markdown: `\`\`\`json\n${JSON.stringify(article, null, 2)}\n\`\`\``,
            coverUrl: null,
        };
    }

    const lines: string[] = [];
    const usedUrls = new Set<string>();
    const mediaById = buildMediaById(article);

    const title = typeof article.title === 'string' ? article.title.trim() : '';
    if (title) lines.push(`# ${title}`);

    const coverUrl = resolveMediaUrl(article.cover_media?.media_info) ?? null;
    if (coverUrl) usedUrls.add(coverUrl);

    const blocks = article.content_state?.blocks;
    const entityMap = article.content_state?.entityMap;
    const lookup = buildEntityLookup(entityMap);

    // Resolve referenced tweets in the article (embedded tweet quotes)
    let referencedTweets: Map<string, any> | undefined;
    if (fetchReferenced && entityMap) {
        const tweetIds: string[] = [];
        for (const entry of Object.values(entityMap) as any[]) {
            if (entry?.value?.type === 'TWEET' && typeof entry.value.data?.tweetId === 'string') {
                tweetIds.push(entry.value.data.tweetId);
            }
        }
        if (tweetIds.length > 0) {
            referencedTweets = new Map();
            await Promise.all(
                tweetIds.map(async (id) => {
                    try {
                        const info = await fetchReferencedTweet(id);
                        referencedTweets!.set(id, info);
                    } catch {
                        referencedTweets!.set(id, {
                            id,
                            url: `https://x.com/i/web/status/${id}`,
                        });
                    }
                })
            );
        }
    }

    if (Array.isArray(blocks) && blocks.length > 0) {
        const mediaLinkMap = buildMediaLinkMap(entityMap);
        const rendered = renderContentBlocks(
            blocks,
            entityMap,
            lookup,
            mediaById,
            usedUrls,
            mediaLinkMap,
            referencedTweets
        );
        if (rendered.length > 0) {
            if (lines.length > 0) lines.push('');
            lines.push(...rendered);
        }
    } else if (typeof article.plain_text === 'string') {
        if (lines.length > 0) lines.push('');
        lines.push(article.plain_text.trim());
    } else if (typeof article.preview_text === 'string') {
        if (lines.length > 0) lines.push('');
        lines.push(article.preview_text.trim());
    }

    // Append unused media entities at the end
    const unusedMedia: string[] = [];
    for (const entity of article.media_entities ?? []) {
        const url = resolveMediaUrl(entity?.media_info);
        if (url && !usedUrls.has(url) && url !== coverUrl) {
            usedUrls.add(url);
            unusedMedia.push(url);
        }
    }
    if (unusedMedia.length > 0) {
        lines.push('', '## Media', '');
        for (const url of unusedMedia) lines.push(`![](${url})`);
    }

    return { markdown: lines.join('\n').trimEnd(), coverUrl };
}
