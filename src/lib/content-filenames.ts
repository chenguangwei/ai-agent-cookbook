import { promises as fs } from 'fs'
import path from 'path'

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function slugify(text: string, maxLength = 80): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  return slug.length > maxLength ? slug.substring(0, maxLength) : slug
}

export function createSlugSuffix(date = new Date()): string {
  const timestamp = [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('')

  const random = Math.random().toString(36).slice(2, 6)
  return `${timestamp}-${random}`
}

export function appendSlugSuffix(baseSlug: string, suffix = createSlugSuffix()): string {
  const trimmedBase = baseSlug.replace(/-+$/g, '')
  return `${trimmedBase}-${suffix}`
}

export async function resolveUniqueContentFile(
  contentDir: string,
  preferredSlug: string,
  extension: '.mdx' | '.json'
): Promise<{ slug: string; filePath: string; relativePath: string }> {
  const initialPath = path.join(contentDir, `${preferredSlug}${extension}`)

  try {
    await fs.access(initialPath)
  } catch {
    return {
      slug: preferredSlug,
      filePath: initialPath,
      relativePath: path.relative(process.cwd(), initialPath).replace(/\\/g, '/'),
    }
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const slug = appendSlugSuffix(preferredSlug)
    const filePath = path.join(contentDir, `${slug}${extension}`)

    try {
      await fs.access(filePath)
    } catch {
      return {
        slug,
        filePath,
        relativePath: path.relative(process.cwd(), filePath).replace(/\\/g, '/'),
      }
    }
  }

  throw new Error(`Unable to allocate a unique filename for slug "${preferredSlug}"`)
}
