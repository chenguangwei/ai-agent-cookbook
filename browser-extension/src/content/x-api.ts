/**
 * X (Twitter) GraphQL API client for the browser extension.
 *
 * Ported from the baoyu-danger-x-to-markdown reference skill.
 *
 * The browser extension runs as a content script on x.com pages, so:
 * - Cookies (auth_token, ct0) are automatically included in same-origin fetch()
 * - We only need to read ct0 from document.cookie for the x-csrf-token header
 * - The Bearer token is the same public token used by all X web clients
 */

// ============================================================
// Constants (from reference skill constants.ts)
// ============================================================

export const BEARER_TOKEN =
    'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

// TweetDetail (threaded conversation) endpoint
const TWEET_DETAIL_QUERY_ID = '_8aYOgEDz35BrBcBal1-_w';
const TWEET_DETAIL_FEATURES: Record<string, boolean> = {
    rweb_video_screen_enabled: false,
    profile_label_improvements_pcf_label_in_post_enabled: true,
    rweb_tipjar_consumption_enabled: true,
    verified_phone_label_enabled: false,
    creator_subscriptions_tweet_preview_api_enabled: true,
    responsive_web_graphql_timeline_navigation_enabled: true,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    premium_content_api_read_enabled: false,
    communities_web_enable_tweet_community_results_fetch: true,
    c9s_tweet_anatomy_moderator_badge_enabled: true,
    responsive_web_grok_analyze_button_fetch_trends_enabled: false,
    responsive_web_grok_analyze_post_followups_enabled: true,
    responsive_web_jetfuel_frame: false,
    responsive_web_grok_share_attachment_enabled: true,
    articles_preview_enabled: true,
    responsive_web_edit_tweet_api_enabled: true,
    graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
    view_counts_everywhere_api_enabled: true,
    longform_notetweets_consumption_enabled: true,
    responsive_web_twitter_article_tweet_consumption_enabled: true,
    tweet_awards_web_tipping_enabled: false,
    responsive_web_grok_show_grok_translated_post: false,
    responsive_web_grok_analysis_button_from_backend: true,
    creator_subscriptions_quote_tweet_preview_enabled: false,
    freedom_of_speech_not_reach_fetch_enabled: true,
    standardized_nudges_misinfo: true,
    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
    longform_notetweets_rich_text_read_enabled: true,
    longform_notetweets_inline_media_enabled: true,
    responsive_web_grok_image_annotation_enabled: true,
    responsive_web_enhance_cards_enabled: false,
};
const TWEET_DETAIL_FIELD_TOGGLES = {
    withArticleRichContentState: true,
    withArticlePlainText: false,
    withGrokAnalyze: false,
    withDisallowedReplyControls: false,
};

// TweetResultByRestId endpoint
const TWEET_RESULT_QUERY_ID = 'HJ9lpOL-ZlOk5CkCw0JW6Q';
const TWEET_RESULT_FEATURES: Record<string, boolean> = {
    creator_subscriptions_tweet_preview_api_enabled: true,
    premium_content_api_read_enabled: false,
    communities_web_enable_tweet_community_results_fetch: true,
    c9s_tweet_anatomy_moderator_badge_enabled: true,
    responsive_web_grok_analyze_button_fetch_trends_enabled: false,
    responsive_web_grok_analyze_post_followups_enabled: true,
    responsive_web_jetfuel_frame: false,
    responsive_web_grok_share_attachment_enabled: true,
    responsive_web_grok_annotations_enabled: true,
    articles_preview_enabled: true,
    responsive_web_edit_tweet_api_enabled: true,
    graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
    view_counts_everywhere_api_enabled: true,
    longform_notetweets_consumption_enabled: true,
    responsive_web_twitter_article_tweet_consumption_enabled: true,
    tweet_awards_web_tipping_enabled: false,
    responsive_web_grok_show_grok_translated_post: false,
    responsive_web_grok_analysis_button_from_backend: true,
    creator_subscriptions_quote_tweet_preview_enabled: false,
    freedom_of_speech_not_reach_fetch_enabled: true,
    standardized_nudges_misinfo: true,
    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
    longform_notetweets_rich_text_read_enabled: true,
    longform_notetweets_inline_media_enabled: true,
    profile_label_improvements_pcf_label_in_post_enabled: true,
    responsive_web_profile_redirect_enabled: true,
    rweb_tipjar_consumption_enabled: true,
    verified_phone_label_enabled: false,
    responsive_web_grok_image_annotation_enabled: true,
    responsive_web_grok_imagine_annotation_enabled: true,
    responsive_web_grok_community_note_auto_translation_is_enabled: true,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    responsive_web_graphql_timeline_navigation_enabled: true,
    responsive_web_enhance_cards_enabled: false,
};
const TWEET_RESULT_FIELD_TOGGLES = {
    withArticleRichContentState: true,
    withArticlePlainText: true,
    withGrokAnalyze: false,
    withDisallowedReplyControls: false,
    withPayments: true,
    withAuxiliaryUserLabels: true,
};

// ArticleEntityResultByRestId endpoint
const ARTICLE_QUERY_ID = 'id8pHQbQi7eZ6P9mA1th1Q';
const ARTICLE_FEATURES: Record<string, boolean> = {
    profile_label_improvements_pcf_label_in_post_enabled: true,
    responsive_web_profile_redirect_enabled: true,
    rweb_tipjar_consumption_enabled: true,
    verified_phone_label_enabled: false,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    responsive_web_graphql_timeline_navigation_enabled: true,
};
const ARTICLE_FIELD_TOGGLES = {
    withPayments: true,
    withAuxiliaryUserLabels: true,
};

// ============================================================
// Request helpers
// ============================================================

function getCookie(name: string): string {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : '';
}

function buildHeaders(): Record<string, string> {
    const ct0 = getCookie('ct0');
    const authToken = getCookie('auth_token');
    const headers: Record<string, string> = {
        authorization: BEARER_TOKEN,
        accept: 'application/json',
        'x-twitter-active-user': 'yes',
        'x-twitter-client-language': 'en',
        'accept-language': 'en',
    };
    if (authToken) {
        headers['x-twitter-auth-type'] = 'OAuth2Session';
    }
    if (ct0) {
        headers['x-csrf-token'] = ct0;
    }
    return headers;
}

async function fetchGraphQL(url: string): Promise<any> {
    const response = await fetch(url, {
        method: 'GET',
        headers: buildHeaders(),
        credentials: 'include',
    });
    const text = await response.text();
    if (!response.ok) {
        throw new Error(`X API ${response.status}: ${text.slice(0, 200)}`);
    }
    return JSON.parse(text);
}

// ============================================================
// GraphQL endpoint wrappers (from graphql.ts)
// ============================================================

export async function apiFetchTweetDetail(tweetId: string, cursor?: string): Promise<any> {
    const variables: Record<string, any> = {
        focalTweetId: tweetId,
        with_rux_injections: false,
        includePromotedContent: true,
        withCommunity: true,
        withQuickPromoteEligibilityTweetFields: true,
        withBirdwatchNotes: true,
        withVoice: true,
        withV2Timeline: true,
        withDownvotePerspective: false,
        withReactionsMetadata: false,
        withReactionsPerspective: false,
    };
    if (cursor) {
        variables.cursor = cursor;
        variables.referrer = 'tweet';
    }
    const url = new URL(`https://x.com/i/api/graphql/${TWEET_DETAIL_QUERY_ID}/TweetDetail`);
    url.searchParams.set('variables', JSON.stringify(variables));
    url.searchParams.set('features', JSON.stringify(TWEET_DETAIL_FEATURES));
    url.searchParams.set('fieldToggles', JSON.stringify(TWEET_DETAIL_FIELD_TOGGLES));
    return fetchGraphQL(url.toString());
}

export async function apiFetchTweetResult(tweetId: string): Promise<any> {
    const url = new URL(`https://x.com/i/api/graphql/${TWEET_RESULT_QUERY_ID}/TweetResultByRestId`);
    url.searchParams.set('variables', JSON.stringify({
        tweetId,
        withCommunity: false,
        includePromotedContent: false,
        withVoice: true,
    }));
    url.searchParams.set('features', JSON.stringify(TWEET_RESULT_FEATURES));
    url.searchParams.set('fieldToggles', JSON.stringify(TWEET_RESULT_FIELD_TOGGLES));
    return fetchGraphQL(url.toString());
}

export async function apiFetchArticleEntity(articleId: string): Promise<any> {
    const url = new URL(`https://x.com/i/api/graphql/${ARTICLE_QUERY_ID}/ArticleEntityResultByRestId`);
    url.searchParams.set('variables', JSON.stringify({ articleEntityId: articleId }));
    url.searchParams.set('features', JSON.stringify(ARTICLE_FEATURES));
    url.searchParams.set('fieldToggles', JSON.stringify(ARTICLE_FIELD_TOGGLES));
    return fetchGraphQL(url.toString());
}

// ============================================================
// Thread parsing helpers (from thread.ts)
// ============================================================

export function unwrapTweetResult(result: any): any {
    if (!result) return null;
    if (result.__typename === 'TweetWithVisibilityResults' && result.tweet) return result.tweet;
    return result;
}

function extractTweetEntry(itemContent: any): any | null {
    const result = itemContent?.tweet_results?.result;
    if (!result) return null;
    return unwrapTweetResult(result?.tweet ?? result);
}

function parseInstruction(instruction: any): {
    entries: any[];
    moreCursor?: string;
    topCursor?: string;
    bottomCursor?: string;
} {
    const { entries: entities, moduleItems } = instruction || {};
    const entries: any[] = [];
    let moreCursor: string | undefined;
    let topCursor: string | undefined;
    let bottomCursor: string | undefined;

    const parseItems = (items: any[]) => {
        items?.forEach((item: any) => {
            const itemContent = item?.item?.itemContent ?? item?.itemContent;
            if (!itemContent) return;
            if (
                itemContent.cursorType &&
                ['ShowMore', 'ShowMoreThreads'].includes(itemContent.cursorType) &&
                itemContent.itemType === 'TimelineTimelineCursor'
            ) {
                moreCursor = itemContent.value;
                return;
            }
            const entry = extractTweetEntry(itemContent);
            if (entry) entries.push(entry);
        });
    };

    if (moduleItems) parseItems(moduleItems);

    for (const entity of entities ?? []) {
        if (entity?.content?.clientEventInfo?.component === 'you_might_also_like') continue;
        const { itemContent, items, cursorType, entryType, value } = entity?.content ?? {};
        if (cursorType === 'Bottom' && entryType === 'TimelineTimelineCursor') bottomCursor = value;
        if (
            itemContent?.cursorType === 'Bottom' &&
            itemContent?.itemType === 'TimelineTimelineCursor'
        ) {
            bottomCursor = bottomCursor ?? itemContent?.value;
        }
        if (cursorType === 'Top' && entryType === 'TimelineTimelineCursor') {
            topCursor = topCursor ?? value;
        }
        if (itemContent) {
            const entry = extractTweetEntry(itemContent);
            if (entry) entries.push(entry);
            if (
                itemContent.cursorType &&
                ['ShowMore', 'ShowMoreThreads'].includes(itemContent.cursorType) &&
                itemContent.itemType === 'TimelineTimelineCursor'
            ) {
                moreCursor = moreCursor ?? itemContent.value;
            }
            if (
                itemContent.cursorType === 'Top' &&
                itemContent.itemType === 'TimelineTimelineCursor'
            ) {
                topCursor = topCursor ?? itemContent.value;
            }
        }
        if (items) parseItems(items);
    }

    return { entries, moreCursor, topCursor, bottomCursor };
}

export function parseTweetsAndToken(response: any): ReturnType<typeof parseInstruction> {
    const instruction =
        response?.data?.threaded_conversation_with_injections_v2?.instructions?.find(
            (ins: any) => ins?.type === 'TimelineAddEntries' || ins?.type === 'TimelineAddToModule'
        ) ??
        response?.data?.threaded_conversation_with_injections?.instructions?.find(
            (ins: any) => ins?.type === 'TimelineAddEntries' || ins?.type === 'TimelineAddToModule'
        );
    return parseInstruction(instruction);
}

// ============================================================
// Tweet data accessors (from thread-markdown.ts)
// ============================================================

export function parseTweetText(tweet: any): string {
    const noteText = tweet?.note_tweet?.note_tweet_results?.result?.text;
    const legacyText = tweet?.legacy?.full_text ?? tweet?.legacy?.text ?? '';
    return (noteText ?? legacyText ?? '').trim();
}

export function parsePhotos(tweet: any): { src: string; alt: string }[] {
    const media: any[] = tweet?.legacy?.extended_entities?.media ?? [];
    return media
        .filter((item: any) => item?.type === 'photo')
        .map((item: any) => ({
            src: `${item.media_url_https ?? item.media_url ?? ''}:large`,
            alt: (item.ext_alt_text ?? '').trim(),
        }))
        .filter((p) => p.src !== ':large');
}

export function parseVideos(tweet: any): { url: string; poster?: string; alt: string; type: string }[] {
    const media: any[] = tweet?.legacy?.extended_entities?.media ?? [];
    return media
        .filter((item: any) => item?.type && ['animated_gif', 'video'].includes(item.type))
        .map((item: any) => {
            const variants: any[] = item?.video_info?.variants ?? [];
            const videoVariants = variants
                .filter((v: any) => String(v?.content_type ?? '').includes('video'))
                .sort((a: any, b: any) => (b.bitrate ?? 0) - (a.bitrate ?? 0));
            const best = (videoVariants.length > 0 ? videoVariants : variants)[0];
            return {
                url: best?.url ?? '',
                poster: item.media_url_https ?? item.media_url,
                alt: (item.ext_alt_text ?? '').trim(),
                type: item.type ?? 'video',
            };
        })
        .filter((v) => v.url);
}

export function resolveTweetId(tweet: any): string | undefined {
    return tweet?.legacy?.id_str ?? tweet?.rest_id;
}

export function buildTweetUrl(username: string | undefined, tweetId: string | undefined): string | null {
    if (!tweetId) return null;
    if (username) return `https://x.com/${username}/status/${tweetId}`;
    return `https://x.com/i/web/status/${tweetId}`;
}

// ============================================================
// Full thread fetch (from thread.ts fetchTweetThread)
// ============================================================

export type ThreadResult = {
    requestedId: string;
    rootId: string;
    tweets: any[];
    totalTweets: number;
    user?: any;
};

export async function fetchXThread(tweetId: string): Promise<ThreadResult> {
    const res = await apiFetchTweetDetail(tweetId);
    let { entries, moreCursor, topCursor, bottomCursor } = parseTweetsAndToken(res);

    if (!entries.length) {
        const msg = res?.errors?.[0]?.message;
        throw new Error(msg || 'No tweets found in response');
    }

    let allEntries = entries.slice();

    const rootTweet = allEntries.find((t: any) => t?.legacy?.id_str === tweetId);
    if (!rootTweet) throw new Error('Root tweet not found in response');

    let rootLegacy = rootTweet.legacy;

    const isSameThread = (tweet: any) => {
        const leg = tweet?.legacy;
        if (!leg) return false;
        return (
            leg.user_id_str === rootLegacy.user_id_str &&
            leg.conversation_id_str === rootLegacy.conversation_id_str &&
            (leg.id_str === rootLegacy.id_str ||
                leg.in_reply_to_user_id_str === rootLegacy.user_id_str ||
                leg.in_reply_to_status_id_str === rootLegacy.conversation_id_str ||
                !leg.in_reply_to_user_id_str)
        );
    };

    const inThread = (items: any[]) => items.some(isSameThread);
    let maxPages = 20;

    // Fetch previous pages (conversation above the requested tweet)
    let topHasThread = true;
    while (topCursor && topHasThread && maxPages > 0) {
        const newRes = await apiFetchTweetDetail(tweetId, topCursor);
        const parsed = parseTweetsAndToken(newRes);
        topHasThread = inThread(parsed.entries);
        topCursor = parsed.topCursor;
        allEntries = parsed.entries.concat(allEntries);
        maxPages--;
    }

    // Fetch "ShowMore" pages
    const checkMore = async (focalId: string) => {
        while (moreCursor && inThread(allEntries) && maxPages > 0) {
            const newRes = await apiFetchTweetDetail(focalId, moreCursor);
            const parsed = parseTweetsAndToken(newRes);
            moreCursor = parsed.moreCursor;
            bottomCursor = bottomCursor ?? parsed.bottomCursor;
            allEntries = allEntries.concat(parsed.entries);
            maxPages--;
        }
        if (bottomCursor) {
            const newRes = await apiFetchTweetDetail(focalId, bottomCursor);
            const parsed = parseTweetsAndToken(newRes);
            allEntries = allEntries.concat(parsed.entries);
            bottomCursor = undefined;
        }
    };

    await checkMore(tweetId);

    // Deduplicate and sort chronologically
    const seenIds = new Set<string>();
    const distinct: any[] = [];
    for (const entry of allEntries) {
        const id = entry?.legacy?.id_str ?? entry?.rest_id;
        if (id && !seenIds.has(id)) {
            seenIds.add(id);
            distinct.push(entry);
        }
    }
    distinct.sort((a: any, b: any) => {
        return (Date.parse(a?.legacy?.created_at ?? '') || 0) -
            (Date.parse(b?.legacy?.created_at ?? '') || 0);
    });

    // Build entry map for root traversal
    const entriesMap = new Map<string, any>();
    for (const entry of distinct) {
        const id = entry?.legacy?.id_str;
        if (id) entriesMap.set(id, entry);
    }

    // Walk up to find true thread root (same author, same conversation)
    while (rootLegacy.in_reply_to_status_id_str) {
        const parent = entriesMap.get(rootLegacy.in_reply_to_status_id_str)?.legacy;
        if (
            parent &&
            parent.user_id_str === rootLegacy.user_id_str &&
            parent.conversation_id_str === rootLegacy.conversation_id_str &&
            parent.id_str !== rootLegacy.id_str
        ) {
            rootLegacy = parent;
        } else {
            break;
        }
    }

    // Slice from root onwards
    const rootIdx = distinct.findIndex((t: any) => t?.legacy?.id_str === rootLegacy.id_str);
    const fromRoot = rootIdx > 0 ? distinct.slice(rootIdx) : distinct;

    // Fetch continuation from the last thread entry
    const threadSoFar = fromRoot.filter(
        (t: any) => t?.legacy?.id_str === tweetId || isSameThread(t)
    );
    const lastEntry = threadSoFar[threadSoFar.length - 1];
    if (lastEntry?.legacy?.id_str) {
        const lastRes = await apiFetchTweetDetail(lastEntry.legacy.id_str);
        const parsed = parseTweetsAndToken(lastRes);
        allEntries = allEntries.concat(parsed.entries);
        moreCursor = parsed.moreCursor;
        bottomCursor = parsed.bottomCursor;
        await checkMore(lastEntry.legacy.id_str);

        // Re-deduplicate after additional fetches
        for (const entry of allEntries) {
            const id = entry?.legacy?.id_str ?? entry?.rest_id;
            if (id && !seenIds.has(id)) {
                seenIds.add(id);
                distinct.push(entry);
            }
        }
        distinct.sort((a: any, b: any) => {
            return (Date.parse(a?.legacy?.created_at ?? '') || 0) -
                (Date.parse(b?.legacy?.created_at ?? '') || 0);
        });
    }

    const finalThreadEntries = distinct.filter(
        (t: any) => t?.legacy?.id_str === tweetId || isSameThread(t)
    );
    if (!finalThreadEntries.length) throw new Error('Thread is empty after parsing');

    const tweets = finalThreadEntries;
    const user = tweets[0]?.core?.user_results?.result?.legacy;

    return {
        requestedId: tweetId,
        rootId: rootLegacy.id_str ?? tweetId,
        tweets,
        totalTweets: tweets.length,
        user,
    };
}

// ============================================================
// Article data extraction (from tweet-article.ts + graphql.ts)
// ============================================================

// Extract article entity embedded directly inside a tweet object
// (mirrors tweet-article.ts extractArticleEntityFromTweet)
export function extractArticleEntityFromTweet(tweet: any): any | null {
    return (
        tweet?.article?.article_results?.result ??
        tweet?.article?.result ??
        tweet?.legacy?.article?.article_results?.result ??
        tweet?.legacy?.article?.result ??
        tweet?.article_results?.result ??
        null
    );
}

function parseArticleIdFromUrl(raw: string | undefined): string | null {
    if (!raw) return null;
    try {
        const parsed = new URL(raw);
        const match = parsed.pathname.match(/\/(?:i\/)?article\/(\d+)/);
        return match?.[1] ?? null;
    } catch {
        return null;
    }
}

function extractArticleIdFromUrls(urls: any[] | undefined): string | null {
    if (!Array.isArray(urls)) return null;
    for (const url of urls) {
        const candidate =
            url?.expanded_url ??
            url?.url ??
            (url?.display_url ? `https://${url.display_url}` : undefined);
        const id = parseArticleIdFromUrl(candidate);
        if (id) return id;
    }
    return null;
}

// Find the article ID referenced in a tweet (either embedded or linked via URL)
export function extractArticleIdFromTweet(tweet: any): string | null {
    const embedded = extractArticleEntityFromTweet(tweet);
    if ((embedded as any)?.rest_id) return (embedded as any).rest_id;
    const noteUrls = tweet?.note_tweet?.note_tweet_results?.result?.entity_set?.urls;
    const legacyUrls = tweet?.legacy?.entities?.urls;
    return extractArticleIdFromUrls(noteUrls) ?? extractArticleIdFromUrls(legacyUrls);
}

// Resolve the full article entity from the first tweet in a thread.
// Returns the article entity if the tweet contains or links to an X article.
// Always tries to fetch the full article when an ID is available — the embedded
// entity in a tweet is often a truncated preview that omits code blocks and later content.
export async function resolveArticleEntityFromTweet(tweet: any): Promise<any | null> {
    if (!tweet) return null;
    const embedded = extractArticleEntityFromTweet(tweet);

    const articleId = extractArticleIdFromTweet(tweet);
    if (articleId) {
        try {
            const fetched = await fetchXArticle(articleId);
            if (fetched && hasArticleContent(fetched)) return fetched;
        } catch {
            // Fall through to embedded content
        }
    }

    if (embedded && hasArticleContent(embedded)) return embedded;
    return embedded ?? null;
}

// --- Internal helpers (for GraphQL response unwrapping) ---

function extractArticleFromTweet(tweetPayload: any): any | null {
    const root = tweetPayload?.data ?? tweetPayload;
    const result = root?.tweetResult?.result ?? root?.tweet_result?.result ?? root?.tweet_result;
    const tweet = unwrapTweetResult(result);
    const legacy = tweet?.legacy ?? {};
    const article = legacy?.article ?? tweet?.article;
    return (
        article?.article_results?.result ??
        legacy?.article_results?.result ??
        tweet?.article_results?.result ??
        null
    );
}

function extractArticleFromEntity(payload: any): any | null {
    const root = payload?.data ?? payload;
    return (
        root?.article_result_by_rest_id?.result ??
        root?.article_result_by_rest_id ??
        root?.article_entity_result?.result ??
        null
    );
}

function hasArticleContent(article: any): boolean {
    if (!article) return false;
    const blocks = article.content_state?.blocks;
    if (Array.isArray(blocks) && blocks.length > 0) return true;
    if (typeof article.plain_text === 'string' && article.plain_text.trim()) return true;
    if (typeof article.preview_text === 'string' && article.preview_text.trim()) return true;
    return false;
}

export async function fetchXArticle(articleId: string): Promise<any> {
    // Fetch article entity directly via ArticleEntityResultByRestId.
    // Note: articleId from /article/ URLs is an article entity ID, NOT a tweet ID.
    // Using TweetResultByRestId with an article entity ID returns wrong/empty data.
    const entityPayload = await apiFetchArticleEntity(articleId);
    const article = extractArticleFromEntity(entityPayload);
    if (article && hasArticleContent(article)) return article;

    // Fallback: some article IDs coincide with the tweet ID that published them.
    // Try fetching as a tweet result and extracting the embedded article.
    try {
        const tweetPayload = await apiFetchTweetResult(articleId);
        const tweetArticle = extractArticleFromTweet(tweetPayload);
        if (tweetArticle && hasArticleContent(tweetArticle)) return tweetArticle;
    } catch {
        // ignore
    }

    // Return whatever entity we have, even without full content_state
    if (article) return article;

    throw new Error(`Article ${articleId} not found`);
}

// ============================================================
// Referenced tweet fetching (for articles with embedded tweets)
// ============================================================

export async function fetchReferencedTweet(tweetId: string): Promise<{
    id: string;
    url: string;
    authorName?: string;
    authorUsername?: string;
    text?: string;
}> {
    const payload = await apiFetchTweetResult(tweetId);
    const root = payload?.data ?? payload;
    const result = root?.tweetResult?.result ?? root?.tweet_result?.result ?? root?.tweet_result;
    const tweet = unwrapTweetResult(result);

    const userLegacy = tweet?.core?.user_results?.result?.legacy;
    const authorName = userLegacy?.name;
    const authorUsername = userLegacy?.screen_name;
    const text = parseTweetText(tweet);
    const url = authorUsername
        ? `https://x.com/${authorUsername}/status/${tweetId}`
        : `https://x.com/i/web/status/${tweetId}`;

    return { id: tweetId, url, authorName, authorUsername, text: text || undefined };
}
