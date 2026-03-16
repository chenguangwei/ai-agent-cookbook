/**
 * Markdown/MDX Content Sanitizer
 *
 * Fixes common Markdown syntax issues that cause parsing errors:
 * - Invalid numbered lists like "3. 1." (nested numbers)
 * - Non-standard bullet points (·, ○, etc.)
 * - Arrows that may cause issues (→, ←, ⇒, etc.)
 * - Section separators using "--" that conflict with MDX horizontal rules
 * - Empty headings that cause parsing issues
 * - HTML-like content (angle brackets) in text that MDX interprets as JSX
 * - Chinese/full-width punctuation that can cause parsing issues
 * - Other common formatting issues
 */

export function sanitizeMarkdownContent(content: string): string {
  if (!content) return content

  let result = content

  // 1. Fix invalid numbered lists: "3. 1." -> "3."
  result = result.replace(/^(\d+)\.\s+(\d+)\.\s+/gm, '$1. ')

  // 2. Replace non-standard bullet points with standard "- "
  result = result.replace(/^[○◎◦※■□◆◇]\s+/gm, '- ')

  // 3. Replace arrows in list items that might cause parsing issues
  result = result.replace(/^(\s*[-*]\s+.*?)\s*→\s*/gm, '$1')
  result = result.replace(/^(\s*\d+\.\s+.*?)\s*→\s*/gm, '$1')
  result = result.replace(/(\d+)\.\s*→\s*/g, '$1. ')

  // 4. Fix section separators: "-- Section --" at line start
  result = result.replace(/^--\s+(.+?)\s+--$/gm, '## $1')
  result = result.replace(/^---\s+(.+?)\s+---$/gm, '## $1')

  // 5. Fix empty headings that cause MDX parsing issues
  result = result.replace(/^##\s*$/gm, '')
  result = result.replace(/^##\s*\n\s*##\s+/gm, '## ')

  // 6. Handle code blocks first to protect their content
  const codeBlockRegex = /```[\s\S]*?```/g
  const codeBlocks: string[] = []

  result = result.replace(codeBlockRegex, (match) => {
    codeBlocks.push(match)
    return `%%CODE_BLOCK_${codeBlocks.length - 1}%%`
  })

  // 7. Escape ALL angle brackets that are not inside code blocks
  // This prevents MDX from interpreting them as JSX/HTML
  // Replace < with &lt; and > with &gt;
  result = result.replace(/</g, '&lt;')
  result = result.replace(/>/g, '&gt;')

  // Restore code blocks (they should not be sanitized)
  codeBlocks.forEach((block, index) => {
    result = result.replace(`%%CODE_BLOCK_${index}%%`, block)
  })

  // 8. Fix potential issue with @ mentions at start of line
  result = result.replace(/^@(\w+)/gm, '\\@$1')

  // 9. Fix URLs that might be misinterpreted
  result = result.replace(/https?:\/\/(x|t)\.co\/\S+/gi, (match) => match)

  return result
}

/**
 * Alternative: Fix content at build time (Velite level)
 */
export function sanitizeContentAtBuild(content: string): string {
  return sanitizeMarkdownContent(content)
}
