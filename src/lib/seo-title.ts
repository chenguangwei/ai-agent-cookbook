import { getTranslateConfig } from '@/lib/translate.config'
import { hasThinReadableSlug, slugifyReadablePath } from '@/lib/content-filenames'

const GENERIC_TITLES = new Set([
  'home',
  'homepage',
  'index',
  'article',
  'post',
  'news',
  'untitled',
  'untitled document',
  'x',
  'twitter',
])

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, ' ')
}

function compactText(text: string): string {
  return stripHtml(text)
    .replace(/[#*_`>\[\]()/{}|\\]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function hostnameFromUrl(sourceUrl?: string): string {
  if (!sourceUrl) return ''
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}

function firstHeading(content?: string): string {
  const match = content?.match(/^#\s+(.+)$/m)
  return match ? compactText(match[1]) : ''
}

function fallbackTitle(summary?: string, content?: string, fallback = 'AI article'): string {
  const heading = firstHeading(content)
  if (heading) return heading

  const text = compactText(summary || content || '')
  if (!text) return fallback

  const sentence = text.match(/^.{20,120}?(?:[.!?。！？]|$)/)?.[0] || text.slice(0, 90)
  return sentence.replace(/[.!?。！？]+$/g, '').trim() || fallback
}

export function isLowQualityTitle(title?: string, sourceUrl?: string): boolean {
  const cleaned = compactText(title || '').toLowerCase()
  if (!cleaned || cleaned.length < 4) return true
  if (GENERIC_TITLES.has(cleaned)) return true

  const host = hostnameFromUrl(sourceUrl)
  if (host && (cleaned === host || cleaned === host.replace(/\..+$/, ''))) return true

  return false
}

async function callTitleModel(prompt: string, maxTokens = 80): Promise<string | null> {
  const config = getTranslateConfig()
  if (!config.apiKey) return null

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 12000)

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    })

    if (!response.ok) return null

    const data = await response.json()
    const result = compactText(data.choices?.[0]?.message?.content || '')
      .replace(/^["']|["']$/g, '')
      .slice(0, 140)

    return result || null
  } catch {
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function resolveSeoTitle(input: {
  title?: string
  summary?: string
  content?: string
  sourceUrl?: string
  contentType?: string
  locale?: string
}): Promise<{ title: string; slugSource: string; generatedTitle: boolean; generatedSlugSource: boolean }> {
  const fallback = input.contentType ? `${input.contentType} article` : 'AI article'
  const currentTitle = compactText(input.title || '')
  let title = currentTitle
  let generatedTitle = false

  if (isLowQualityTitle(currentTitle, input.sourceUrl)) {
    const generated = await callTitleModel(
      `Generate a clear, search-friendly article title in the same language as the content.
Return only the title, no quotes.

Current title: ${currentTitle || '(missing)'}
Locale: ${input.locale || 'unknown'}
Summary: ${compactText(input.summary || '').slice(0, 800)}
Content excerpt: ${compactText(input.content || '').slice(0, 1800)}`,
      80
    )

    title = generated || fallbackTitle(input.summary, input.content, fallback)
    generatedTitle = Boolean(generated)
  }

  let slugSource = title
  let generatedSlugSource = false

  if (hasThinReadableSlug(slugifyReadablePath(slugSource, 90, fallback))) {
    const generated = await callTitleModel(
      `Create an English SEO URL slug phrase for this article.
Rules:
- 4 to 10 words
- lowercase words are fine
- no punctuation
- preserve important product/framework names
- return only the phrase, not a slug

Title: ${title}
Summary: ${compactText(input.summary || '').slice(0, 800)}
Content excerpt: ${compactText(input.content || '').slice(0, 1800)}`,
      60
    )

    slugSource = generated || `${title} ${fallbackTitle(input.summary, input.content, fallback)}`
    generatedSlugSource = Boolean(generated)
  }

  return { title, slugSource, generatedTitle, generatedSlugSource }
}
