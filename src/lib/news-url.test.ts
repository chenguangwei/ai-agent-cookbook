import { describe, expect, it } from 'vitest'
import { extractNewsIdFromPathSegment, getNewsPathSegment } from './news-url'

describe('news URL helpers', () => {
  it('builds readable fallback paths for items without stored slugs', () => {
    const id = '123e4567-e89b-12d3-a456-426614174000'
    expect(getNewsPathSegment({ id, title: '用了 3 个月 Claude Code，这 9 条最佳实践' })).toBe(
      `用了-3-months-claude-code-这-9-条最佳实践-${id}`
    )
  })

  it('extracts the stable id from readable fallback paths', () => {
    const id = '123e4567-e89b-12d3-a456-426614174000'
    expect(extractNewsIdFromPathSegment(`claude-code-best-practices-${id}`)).toBe(id)
  })
})
