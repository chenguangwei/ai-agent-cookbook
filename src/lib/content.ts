import { tutorials, docs, news, labs, showcase, tools } from '#velite'

// Re-export types (replaces tina-generated types)
export type Tutorial = (typeof tutorials)[number]
export type Doc = (typeof docs)[number]
export type News = (typeof news)[number]
export type PracticeLab = (typeof labs)[number]
export type Showcase = (typeof showcase)[number]
export type Tool = (typeof tools)[number]

export function getAllTutorials(locale?: string): Tutorial[] {
  if (locale) return tutorials.filter(t => t.locale === locale)
  return tutorials
}

export function getTutorialBySlug(slug: string, locale?: string): Tutorial | null {
  const results = tutorials.filter(t => t.slug === slug)
  if (locale && results.length > 0) {
    return results.find(t => t.locale === locale) ?? results[0]
  }
  return results[0] ?? null
}

export function getFeaturedTutorials(limit = 4, locale?: string): Tutorial[] {
  const all = getAllTutorials(locale)
  return [...all.filter(t => t.featured), ...all.filter(t => !t.featured)].slice(0, limit)
}

export function getRecentTutorials(limit = 3, locale?: string): Tutorial[] {
  const all = getAllTutorials(locale)
  return [...all]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit)
}

export function getAllDocs(locale?: string): Doc[] {
  const result = locale ? docs.filter(d => d.locale === locale) : [...docs]
  return result.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

export function getAllNews(locale?: string): News[] {
  const result = locale ? news.filter(n => n.locale === locale) : [...news]
  return result.sort((a, b) => {
    const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
    const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0
    return dateB - dateA
  })
}

export function getAllPracticeLabs(locale?: string): PracticeLab[] {
  if (locale) return labs.filter(l => l.locale === locale)
  return labs
}

export function getAllShowcaseProjects(locale?: string): Showcase[] {
  if (locale) return showcase.filter(s => s.locale === locale)
  return showcase
}

export function getAllTools(locale?: string): Tool[] {
  if (locale) return tools.filter(t => t.locale === locale)
  return tools
}

export function getToolBySlug(slug: string): Tool | null {
  return tools.find(t => t.slug === slug) ?? null
}

export function getFeaturedTools(limit = 6, locale?: string): Tool[] {
  const all = getAllTools(locale)
  return [...all.filter(t => t.featured), ...all.filter(t => !t.featured)].slice(0, limit)
}

export function getCategoryCounts(locale?: string): Record<string, number> {
  const counts: Record<string, number> = {}
  getAllTutorials(locale).forEach(t => {
    if (t.category) counts[t.category] = (counts[t.category] || 0) + 1
  })
  return counts
}
