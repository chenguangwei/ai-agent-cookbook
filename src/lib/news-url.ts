import { slugifyReadablePath } from '@/lib/slug'

const UUID_AT_END_RE = /([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i

export function getNewsPathSegment(item: { id: string; slug?: string; title?: string }): string {
  if (item.slug) return item.slug

  const readableTitle = slugifyReadablePath(item.title || '', 70, 'news article')
  return `${readableTitle}-${item.id}`
}

export function extractNewsIdFromPathSegment(segment: string): string {
  return segment.match(UUID_AT_END_RE)?.[1] || segment
}
