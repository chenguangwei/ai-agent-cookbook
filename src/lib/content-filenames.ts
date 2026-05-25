import { promises as fs } from 'fs'
import path from 'path'
import { appendSlugSuffix } from '@/lib/slug'

export {
  appendSlugSuffix,
  hasThinReadableSlug,
  hasThinSlug,
  slugify,
  slugifyReadablePath,
} from '@/lib/slug'

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

  for (let attempt = 2; attempt <= 50; attempt += 1) {
    const slug = appendSlugSuffix(preferredSlug, attempt)
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
