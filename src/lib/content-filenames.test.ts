import { mkdtemp, rm, writeFile } from 'fs/promises'
import path from 'path'
import { tmpdir } from 'os'
import { describe, expect, it } from 'vitest'
import {
  hasThinReadableSlug,
  hasThinSlug,
  resolveUniqueContentFile,
  slugify,
  slugifyReadablePath,
} from './content-filenames'

describe('content filename helpers', () => {
  it('keeps useful ASCII terms and maps common Japanese SEO terms', () => {
    expect(slugify('Claude Codeを3ヶ月使ってわかった9つのベストプラクティス')).toBe(
      'claude-code-3-months-9-best-practices'
    )
    expect(slugify('AIメモリ：ベクトルストア＋埋め込みでは不十分')).toBe(
      'ai-memory-vector-store-embedding'
    )
  })

  it('detects number-only or overly short slugs as thin', () => {
    expect(hasThinSlug('3')).toBe(true)
    expect(hasThinSlug('ai')).toBe(true)
    expect(hasThinSlug('claude-code-best-practices')).toBe(false)
  })

  it('can keep CJK titles readable for public article paths', () => {
    expect(slugifyReadablePath('用了 3 个月 Claude Code，这 9 条最佳实践')).toBe(
      '用了-3-months-claude-code-这-9-条最佳实践'
    )
    expect(hasThinReadableSlug('用了-3-months-claude-code-这-9-条最佳实践')).toBe(false)
  })

  it('uses readable numeric collision suffixes', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'agent-cookbook-slug-'))

    try {
      await writeFile(path.join(dir, 'claude-code.mdx'), '')

      await expect(resolveUniqueContentFile(dir, 'claude-code', '.mdx')).resolves.toMatchObject({
        slug: 'claude-code-2',
      })
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
