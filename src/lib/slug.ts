const SEO_TERM_REPLACEMENTS: Array<[RegExp, string]> = [
  [/エージェント|智能体|智能體/g, ' agent '],
  [/チュートリアル|教程/g, ' tutorial '],
  [/スキル|技能/g, ' skills '],
  [/ハーネス/g, ' harness '],
  [/工学|工程/g, ' engineering '],
  [/メモリ|記憶|记忆/g, ' memory '],
  [/ベクトルストア/g, ' vector store '],
  [/埋め込み/g, ' embedding '],
  [/生成\s*UI/gi, ' generative ui '],
  [/ワークフロー|工作流/g, ' workflow '],
  [/コンテンツ|内容/g, ' content '],
  [/バズる|爆款|爆红/g, ' viral '],
  [/フォロワー|粉丝/g, ' followers '],
  [/ベストプラクティス/g, ' best practices '],
  [/コツ|技巧/g, ' tips '],
  [/日間/g, ' days '],
  [/个月|ヶ月|か月|月/g, ' months '],
  [/使い方|用法/g, ' guide '],
]

function applySeoTermReplacements(text: string): string {
  return SEO_TERM_REPLACEMENTS.reduce(
    (result, [pattern, replacement]) => result.replace(pattern, replacement),
    text
  )
}

function trimSlug(slug: string, maxLength: number): string {
  return slug.length > maxLength
    ? slug.substring(0, maxLength).replace(/-+$/g, '')
    : slug
}

function normalizeSlugText(text: string): string {
  return applySeoTermReplacements(text)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[''"]/g, '')
}

export function slugify(text: string, maxLength = 80, fallbackText = 'article'): string {
  const slug = normalizeSlugText(text)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  const fallbackSlug = normalizeSlugText(fallbackText)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  return trimSlug(slug || fallbackSlug || 'article', maxLength)
}

function normalizeReadableSlugText(text: string): string {
  return applySeoTermReplacements(text)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[''"]/g, '')
}

export function slugifyReadablePath(text: string, maxLength = 90, fallbackText = 'article'): string {
  const slug = normalizeReadableSlugText(text)
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/(^-|-$)/g, '')

  const fallbackSlug = normalizeReadableSlugText(fallbackText)
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/(^-|-$)/g, '')

  return trimSlug(slug || fallbackSlug || 'article', maxLength)
}

export function appendSlugSuffix(baseSlug: string, suffix: number | string): string {
  const trimmedBase = baseSlug.replace(/-+$/g, '')
  return `${trimmedBase}-${suffix}`
}

export function hasThinSlug(slug: string): boolean {
  const parts = slug.split('-').filter(Boolean)
  const alphaParts = parts.filter((part) => /[a-z]/.test(part))
  return slug.length < 8 || alphaParts.length < 2
}

export function hasThinReadableSlug(slug: string): boolean {
  const parts = slug.split('-').filter(Boolean)
  const meaningfulParts = parts.filter((part) => /[\p{Letter}]/u.test(part))
  return slug.length < 8 || meaningfulParts.length < 1
}
