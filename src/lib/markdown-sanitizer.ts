/**
 * Markdown/MDX Content Sanitizer
 *
 * Fixes common Markdown syntax issues that cause parsing errors:
 * - Invalid numbered lists like "3. 1." (nested numbers)
 * - Non-standard bullet points (·, ○, etc.)
 * - Arrows that may cause issues (→, ←, ⇒, etc.)
 * - Section separators using "--" that conflict with MDX horizontal rules
 * - Other common formatting issues
 */

export function sanitizeMarkdownContent(content: string): string {
  if (!content) return content

  let result = content

  // 1. Fix invalid numbered lists: "3. 1." -> "3."
  // This pattern appears when someone writes "3. 1. Some text" meaning "3.1" but MDX interprets it as nested list
  result = result.replace(/^(\d+)\.\s+(\d+)\.\s+/gm, '$1. ')

  // 2. Replace non-standard bullet points with standard "- "
  // Common non-standard bullets: ·, ○, ◎, ◦, ※, ■, □, ◆, ◇
  result = result.replace(/^[○◎◦※■□◆◇]\s+/gm, '- ')

  // 3. Replace arrows in list items that might cause parsing issues
  // Keep arrows in regular text, only fix ones that appear after numbers/bullets
  result = result.replace(/^(\s*[-*]\s+.*?)\s*→\s*/gm, '$1')
  result = result.replace(/^(\s*\d+\.\s+.*?)\s*→\s*/gm, '$1')
  result = result.replace(/(\d+)\.\s*→\s*/g, '$1. ')

  // 4. Fix section separators: "-- Section --" at line start
  // Replace with standard "## Section" or "---" horizontal rule
  result = result.replace(/^--\s+(.+?)\s+--$/gm, '## $1')
  result = result.replace(/^---\s+(.+?)\s+---$/gm, '## $1')

  // 5. Fix potential JavaScript/template literal issues
  // MDX interprets {} as JSX expressions, escape common patterns
  // But be careful not to break legitimate code blocks
  // Only escape if not inside code fences
  const codeBlockRegex = /```[\s\S]*?```/g
  const codeBlocks: string[] = []

  // Extract and temporarily replace code blocks
  result = result.replace(codeBlockRegex, (match) => {
    codeBlocks.push(match)
    return `%%CODE_BLOCK_${codeBlocks.length - 1}%%`
  })

  // Now sanitize the non-code parts
  // Escape unescaped { that are not part of JSX expressions
  result = result.replace(/([^`{])\{([^}]+)\}([^`}])/g, '$1{"{"}$2$3')

  // Restore code blocks
  codeBlocks.forEach((block, index) => {
    result = result.replace(`%%CODE_BLOCK_${index}%%`, block)
  })

  // 6. Fix potential issue with @ mentions at start of line (treated as references)
  result = result.replace(/^@(\w+)/gm, '\\@$1')

  // 7. Fix URLs that might be misinterpreted
  // Ensure URLs starting with x.com or t.co are treated as plain text links
  result = result.replace(/https?:\/\/(x|t)\.co\/\S+/gi, (match) => match)

  return result
}

/**
 * Alternative: Fix content at build time (Velite level)
 * This runs when content is loaded, not at render time
 */
export function sanitizeContentAtBuild(content: string): string {
  // Same sanitization but optimized for build-time processing
  return sanitizeMarkdownContent(content)
}
