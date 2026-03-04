# Design: Replace TinaCMS with Velite + next-mdx-remote

**Date**: 2026-03-04
**Status**: Approved
**Scope**: CMS layer only — content files and all other features unchanged

---

## Problem

TinaCMS is a paid/commercial product. The project only uses it for:
1. Schema definition and Zod-like validation (`tina/config.ts`)
2. GraphQL-based data access (`src/lib/tina.ts`)
3. Visual admin UI at `/admin`
4. MDX body rendering (`TinaMarkdownRenderer`)

The actual content files in `content/` are plain MDX/JSON — TinaCMS is only a wrapper around them.

## Solution

Replace TinaCMS with **Velite** (build-time type-safe content SDK) + **next-mdx-remote** (MDX rendering). No database, no admin UI, no paid dependencies.

---

## Architecture

### Data Flow (After)

```
content/**/*.{mdx,json}
    ↓ velite build (Zod validation + MDX compilation, runs at build time)
.velite/*.json  (generated, git-ignored)
    ↓ TypeScript path alias #velite
src/lib/content.ts (direct import, zero runtime IO)
    ↓
Next.js pages (statically generated)
```

### Key Properties

- **Build-time only**: Velite runs once during `next build`, output cached as JSON modules
- **Type-safe**: Zod schemas validate every frontmatter field at build time — missing `title` = build error, not runtime white screen
- **Zero runtime overhead**: No GraphQL server, no fs reads at request time
- **Content unchanged**: `content/` directory stays exactly as-is

---

## Files Changed

### Deleted
| Path | Reason |
|------|--------|
| `tina/` | TinaCMS config, generated types, GraphQL client |
| `public/admin/` | TinaCMS built admin panel |
| `src/app/[locale]/create/page.tsx` | Points to TinaCMS admin |
| `src/lib/tina.ts` | TinaCMS GraphQL data access |
| `src/components/markdown/TinaMarkdownRenderer.tsx` | TinaMarkdown renderer |
| `src/components/markdown/TinaMarkdownRendererClient.tsx` | TinaMarkdown client renderer |

### Added
| Path | Purpose |
|------|---------|
| `velite.config.ts` | Zod schema definitions for all 6 content collections |
| `src/lib/content.ts` | Data access layer — imports from `#velite`, same function signatures as `tina.ts` |
| `src/components/markdown/MDXRenderer.tsx` | Server component MDX renderer using next-mdx-remote |
| `src/components/markdown/MDXRendererClient.tsx` | Client component MDX renderer |

### Modified
| Path | Change |
|------|--------|
| `package.json` | Remove `tinacms`, `@tinacms/cli`; add `velite`, `next-mdx-remote` |
| `next.config.ts` | Add Velite webpack plugin |
| `tsconfig.json` | Add `"#velite": ["./.velite"]` path alias |
| `src/app/api/search-index/route.ts` | Import from `content.ts` instead of `tina.ts` |
| `src/app/api/docs/route.ts` | Import from `content.ts` |
| All pages importing from `tina.ts` | Update import path |

### Unchanged
| Path | Reason |
|------|--------|
| `content/` | All MDX/JSON content files — zero changes |
| `src/app/api/translate/` | Already pure fs operations, no TinaCMS dependency |
| `src/components/markdown/components/` | CodeBlock, Heading, Table, etc. — reused as-is |
| `src/lib/shiki.ts` | Shiki syntax highlighting |
| `src/lib/translate.config.ts` | Translation config |
| All page routes | Structure unchanged |
| `src/i18n/`, `src/messages/` | i18n unchanged |

---

## Velite Schema

```typescript
// velite.config.ts
import { defineConfig, s } from 'velite'

export default defineConfig({
  root: 'content',
  output: {
    data: '.velite',
    assets: 'public/static',
    base: '/static/',
    clean: true,
  },
  collections: {
    tutorials: {
      name: 'Tutorial',
      pattern: 'tutorials/**/*.mdx',
      schema: s.object({
        title: s.string(),
        slug: s.string(),
        locale: s.enum(['en', 'zh', 'ja']),
        description: s.string().optional(),
        category: s.string().optional(),
        tags: s.array(s.string()).default([]),
        techStack: s.array(s.string()).default([]),
        difficulty: s.enum(['Beginner', 'Intermediate', 'Advanced']).optional(),
        duration: s.string().optional(),
        featured: s.boolean().default(false),
        date: s.isodate(),
        thumbnail: s.string().optional(),
        videoUrl: s.string().optional(),
        content: s.mdx(),
      }),
    },
    docs: {
      name: 'Doc',
      pattern: 'docs/**/*.mdx',
      schema: s.object({
        title: s.string(),
        slug: s.string(),
        locale: s.enum(['en', 'zh', 'ja']),
        category: s.string().optional(),
        order: s.number().default(0),
        lastUpdated: s.isodate().optional(),
        content: s.mdx(),
      }),
    },
    news: {
      name: 'News',
      pattern: 'news/**/*.mdx',
      schema: s.object({
        title: s.string(),
        slug: s.string(),
        locale: s.enum(['en', 'zh', 'ja']),
        summary: s.string().optional(),
        source: s.string().optional(),
        sourceUrl: s.string().optional(),
        author: s.string().optional(),
        imageUrl: s.string().optional(),
        publishedAt: s.isodate(),
        category: s.string().optional(),
        readTime: s.string().optional(),
        content: s.mdx(),
      }),
    },
    labs: {
      name: 'PracticeLab',
      pattern: 'labs/**/*.json',
      schema: s.object({
        title: s.string(),
        locale: s.enum(['en', 'zh', 'ja']),
        description: s.string().optional(),
        environment: s.string().optional(),
        difficulty: s.string().optional(),
        status: s.string().optional(),
        usersOnline: s.number().optional(),
        thumbnail: s.string().optional(),
        launchUrl: s.string().optional(),
        launchMode: s.string().optional(),
      }),
    },
    showcase: {
      name: 'Showcase',
      pattern: 'showcase/**/*.{mdx,json}',
      schema: s.object({
        title: s.string(),
        slug: s.string(),
        locale: s.enum(['en', 'zh', 'ja']),
        contentType: s.string().optional(),
        description: s.string().optional(),
        tags: s.array(s.string()).default([]),
        stars: s.number().optional(),
        demoUrl: s.string().optional(),
        videoUrl: s.string().optional(),
        repoUrl: s.string().optional(),
        websiteUrl: s.string().optional(),
        thumbnail: s.string().optional(),
        content: s.mdx().optional(),
      }),
    },
    tools: {
      name: 'Tool',
      pattern: 'tools/**/*.mdx',
      schema: s.object({
        title: s.string(),
        slug: s.string(),
        locale: s.enum(['en', 'zh', 'ja']),
        description: s.string().optional(),
        category: s.string().optional(),
        tags: s.array(s.string()).default([]),
        logoUrl: s.string().optional(),
        websiteUrl: s.string().optional(),
        repoUrl: s.string().optional(),
        docsUrl: s.string().optional(),
        pricing: s.string().optional(),
        stars: s.number().optional(),
        license: s.string().optional(),
        featured: s.boolean().default(false),
        date: s.isodate(),
        content: s.mdx(),
      }),
    },
  },
})
```

---

## Data Access Layer

`src/lib/content.ts` exposes the same function signatures as the current `src/lib/tina.ts`. All callers require zero changes.

```typescript
// src/lib/content.ts
import { tutorials, docs, news, labs, showcase, tools } from '#velite'

export type Tutorial = (typeof tutorials)[number]
export type Doc = (typeof docs)[number]
// ... etc

export function getAllTutorials(locale?: string) {
  return locale ? tutorials.filter(t => t.locale === locale) : tutorials
}

export function getTutorialBySlug(slug: string) {
  return tutorials.find(t => t.slug === slug) ?? null
}

export function getFeaturedTutorials(limit = 4, locale?: string) {
  const all = getAllTutorials(locale)
  return [...all.filter(t => t.featured), ...all.filter(t => !t.featured)].slice(0, limit)
}

// ... getAllDocs, getAllNews, getAllPracticeLabs, getAllShowcaseProjects,
//     getAllTools, getToolBySlug, getFeaturedTools, getCategoryCounts
```

Note: The runtime in-memory cache in `tina.ts` is no longer needed — Velite data is a static import (JSON module), already in memory.

---

## MDX Rendering

Replace `TinaMarkdownRenderer` with `next-mdx-remote`:

```typescript
// src/components/markdown/MDXRenderer.tsx (Server Component)
import { MDXRemote } from 'next-mdx-remote/rsc'
import { customComponents } from './components'

export function MDXRenderer({ source }: { source: string }) {
  return <MDXRemote source={source} components={customComponents} />
}
```

The custom components (`CodeBlock`, `Heading`, `Table`, etc.) in `src/components/markdown/components/` are reused without changes.

---

## Build Configuration

### package.json scripts
```json
{
  "dev": "next dev",
  "build": "next build",
  "postinstall": "velite build"
}
```

Velite integrates with Next.js via webpack plugin in `next.config.ts` — runs automatically on `next dev` and `next build`.

### next.config.ts addition
```typescript
import { withVelite } from 'velite/next'
export default withVelite({ /* existing next config */ })
```

### tsconfig.json addition
```json
{
  "compilerOptions": {
    "paths": {
      "#velite": ["./.velite"]
    }
  }
}
```

### .gitignore addition
```
.velite/
```

---

## Migration Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| MDX compiled output format differs from TinaMarkdown | Medium | Test all content types after migration; adjust custom components if needed |
| Showcase collection has mixed .mdx/.json files | Low | Velite supports mixed patterns per collection |
| Labs collection is JSON (no MDX body) | Low | Schema uses `s.object()` without `s.mdx()` |
| Image URLs currently normalized via `normalizeImageUrl()` | Low | Keep the utility function, apply in `content.ts` if needed |
| Build time increase | Low | Velite is compile-time only; expected <5s for current content volume |

---

## What This Achieves

- **Remove**: `tinacms` + `@tinacms/cli` (~300MB of node_modules)
- **Remove**: GraphQL overhead on every data fetch
- **Remove**: TinaCMS cloud dependency / paid tier requirement
- **Gain**: Build-time Zod validation (catch schema errors before deploy)
- **Gain**: Zero-cost data access (static import = already in memory)
- **Keep**: All existing content, routes, translation system, Shiki highlighting, i18n
