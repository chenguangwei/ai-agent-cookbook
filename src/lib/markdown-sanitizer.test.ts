import { describe, expect, it } from 'vitest'
import { sanitizeMarkdownContent } from './markdown-sanitizer'

describe('sanitizeMarkdownContent', () => {
  it('preserves markdown blockquote markers while escaping quote body angle brackets', () => {
    const input = [
      '> 最好的 AI 产品 PM，能缩短从“有这个想法”到“产品到了用户手里”的时间。',
      '> （“The PMs who do the best on AI native products are the ones who can figure out: How can I shorten the time.”）',
      '',
      '2 > 1 and <tag> should not become JSX',
    ].join('\n')

    expect(sanitizeMarkdownContent(input)).toBe([
      '> 最好的 AI 产品 PM，能缩短从“有这个想法”到“产品到了用户手里”的时间。',
      '> （“The PMs who do the best on AI native products are the ones who can figure out: How can I shorten the time.”）',
      '',
      '2 &gt; 1 and &lt;tag&gt; should not become JSX',
    ].join('\n'))
  })

  it('does not sanitize fenced code blocks', () => {
    const input = [
      'Before <tag>',
      '```tsx',
      'const element = <div>{a > b}</div>',
      '```',
      '> After > quote',
      '> > Nested <quote>',
    ].join('\n')

    expect(sanitizeMarkdownContent(input)).toBe([
      'Before &lt;tag&gt;',
      '```tsx',
      'const element = <div>{a > b}</div>',
      '```',
      '> After &gt; quote',
      '> > Nested &lt;quote&gt;',
    ].join('\n'))
  })
})
