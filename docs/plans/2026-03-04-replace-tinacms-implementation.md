# Replace TinaCMS with Velite Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove TinaCMS entirely and replace it with Velite (build-time type-safe content SDK) + next-mdx-remote/rsc, keeping all existing content files and page structures intact.

**Architecture:** Velite reads `content/**/*.{mdx,json}` at build time, validates frontmatter via Zod, and exposes typed static data via the `#velite` path alias. `src/lib/content.ts` wraps this with the same function signatures as the removed `tina.ts`. MDX body is rendered server-side with `MDXRemote` from `next-mdx-remote/rsc`. The docs page is converted from a client-fetched component to a server component using `searchParams` for navigation.

**Tech Stack:** velite, next-mdx-remote (already installed), gray-matter (already installed via next-mdx-remote deps), Next.js 16 App Router

---

## Pre-flight: Understand the Scope

- **12 files** import from `@/lib/tina` → all will import from `@/lib/content` (same signatures)
- **3 files** use `TinaMarkdownRenderer` → will use new `MDXRenderer`
- **`next-mdx-remote` v6** is already installed — no new MDX package needed
- **Content files** in `content/` are untouched throughout
- **Translate API** (`src/app/api/translate/route.ts`) is already pure `fs` — zero changes needed

---

## Task 1: Install Velite and Wire Up Build

**Files:**
- Modify: `package.json`
- Modify: `next.config.ts`
- Modify: `tsconfig.json`
- Modify: `.gitignore`

**Step 1: Install velite**

```bash
npm install velite
```

Expected: velite appears in `dependencies` in package.json.

**Step 2: Update `package.json` scripts**

Replace the TinaCMS-wrapped scripts with clean Next.js scripts:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "build:tina": "next build",
  "start": "next start",
  "lint": "eslint"
}
```

**Step 3: Add Velite plugin to `next.config.ts`**

Full file replacement:

```typescript
import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    unoptimized: true,
  },
};

export default withNextIntl(nextConfig);
```

Note: Removed the `/admin` rewrite (TinaCMS admin gone).
Note: Velite integrates via webpack automatically when `velite.config.ts` exists in root — no explicit plugin needed for Next.js 16.

**Step 4: Add `#velite` path alias to `tsconfig.json`**

Add to `compilerOptions.paths`:

```json
"paths": {
  "@/*": ["./src/*"],
  "#velite": ["./.velite"]
}
```

**Step 5: Add `.velite/` to `.gitignore`**

Append to `.gitignore`:

```
# Velite generated output
.velite/
```

**Step 6: Commit**

```bash
git add package.json next.config.ts tsconfig.json .gitignore
git commit -m "build: add velite, remove tinacms build scripts"
```

---

## Task 2: Write `velite.config.ts`

**Files:**
- Create: `velite.config.ts` (project root)

**Step 1: Create the schema file**

```typescript
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
        body: s.raw(),
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
        body: s.raw(),
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
        body: s.raw(),
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
        body: s.raw().optional(),
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
        body: s.raw(),
      }),
    },
  },
})
```

**Step 2: Run velite build to verify all content parses**

```bash
npx velite build
```

Expected: `.velite/` directory created with `tutorials.json`, `docs.json`, `news.json`, `labs.json`, `showcase.json`, `tools.json`.

If any files fail schema validation, they will show errors — fix the content file or relax the schema (change `.string()` to `.string().optional()` for the failing field).

**Step 3: Spot-check generated data**

```bash
node -e "const t = require('./.velite/tutorials.json'); console.log('Tutorials:', t.length, 'First:', t[0]?.title)"
```

Expected: prints tutorial count and first title.

**Step 4: Commit**

```bash
git add velite.config.ts
git commit -m "build: add velite schema for all 6 content collections"
```

---

## Task 3: Create `src/lib/content.ts`

This is a drop-in replacement for `src/lib/tina.ts` with identical function signatures.

**Files:**
- Create: `src/lib/content.ts`

**Step 1: Write the file**

```typescript
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

export function getTutorialBySlug(slug: string): Tutorial | null {
  return tutorials.find(t => t.slug === slug) ?? null
}

export function getFeaturedTutorials(limit = 4, locale?: string): Tutorial[] {
  const all = getAllTutorials(locale)
  return [...all.filter(t => t.featured), ...all.filter(t => !t.featured)].slice(0, limit)
}

export function getAllDocs(locale?: string): Doc[] {
  let result = locale ? docs.filter(d => d.locale === locale) : docs
  return result.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

export function getAllNews(locale?: string): News[] {
  let result = locale ? news.filter(n => n.locale === locale) : news
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
```

**Step 2: Verify TypeScript compilation**

```bash
npx tsc --noEmit
```

Expected: No errors related to `src/lib/content.ts`. (There may be errors from existing files that still import from `tina.ts` — that's expected and will be fixed in later tasks.)

**Step 3: Commit**

```bash
git add src/lib/content.ts
git commit -m "feat: add content.ts data access layer using velite"
```

---

## Task 4: Create MDX Renderer Components

Replace `TinaMarkdownRenderer` and `TinaMarkdownRendererClient` with `next-mdx-remote/rsc`-based equivalents.

**Files:**
- Create: `src/components/markdown/MDXRenderer.tsx`
- Modify: `src/components/markdown/index.ts`

**Step 1: Create `MDXRenderer.tsx` (Server Component)**

```typescript
import { MDXRemote } from 'next-mdx-remote/rsc'
import { CodeBlock } from './components/CodeBlock'
import { createHeadingComponent } from './components/Heading'
import { InlineCode } from './components/InlineCode'
import { Paragraph } from './components/Paragraph'
import { MdLink } from './components/MdLink'
import { MdImage } from './components/MdImage'
import { Blockquote } from './components/Blockquote'
import { UnorderedList, OrderedList, ListItem } from './components/List'
import { Table } from './components/Table'

const components = {
  h1: createHeadingComponent('h1'),
  h2: createHeadingComponent('h2'),
  h3: createHeadingComponent('h3'),
  h4: createHeadingComponent('h4'),
  h5: createHeadingComponent('h5'),
  h6: createHeadingComponent('h6'),
  p: Paragraph,
  a: MdLink,
  code: InlineCode,
  pre: CodeBlock,
  img: MdImage,
  blockquote: Blockquote,
  ul: UnorderedList,
  ol: OrderedList,
  li: ListItem,
  table: Table,
}

interface MDXRendererProps {
  content: string
}

export async function MDXRenderer({ content }: MDXRendererProps) {
  return (
    <div className="markdown-body">
      <MDXRemote source={content} components={components as Record<string, unknown>} />
    </div>
  )
}
```

Note: `CodeBlock` in TinaCMS received a `code_block` event. With next-mdx-remote, the MDX `pre` > `code` structure is standard. You may need to adjust `CodeBlock` to accept the standard `pre` props — see Task 5 note.

**Step 2: Update `src/components/markdown/index.ts`**

Read the current file first, then add the new export:

```typescript
export { MDXRenderer } from './MDXRenderer'
// Keep existing exports if other parts of the code still need them during migration
export { TinaMarkdownRenderer } from './TinaMarkdownRenderer'
export { TinaMarkdownRendererClient } from './TinaMarkdownRendererClient'
```

**Step 3: Commit**

```bash
git add src/components/markdown/MDXRenderer.tsx src/components/markdown/index.ts
git commit -m "feat: add MDXRenderer using next-mdx-remote/rsc"
```

---

## Task 5: Check CodeBlock Component Compatibility

The `CodeBlock` component was designed for TinaMarkdown's `code_block` event. With `next-mdx-remote`, code blocks come as `<pre><code className="language-js">...</code></pre>`. Verify and update if needed.

**Files:**
- Read: `src/components/markdown/components/CodeBlock.tsx`
- Possibly modify: `src/components/markdown/components/CodeBlock.tsx`
- Read: `src/components/markdown/components/CodeBlockShell.tsx`

**Step 1: Read current CodeBlock**

```bash
# Read src/components/markdown/components/CodeBlock.tsx
```

**Step 2: Check what props CodeBlock expects**

TinaMarkdown passes: `{ lang?: string, value?: string }` to `code_block`
next-mdx-remote passes standard `<pre>` props: `{ children: ReactNode }` where children is `<code className="language-js">...</code>`

**Step 3: If CodeBlock uses TinaMarkdown props, create a wrapper**

In `MDXRenderer.tsx`, wrap `CodeBlock` to adapt standard MDX `<pre>` to the existing component's interface:

```typescript
// In MDXRenderer.tsx, replace the pre mapping:
const Pre = (props: React.HTMLAttributes<HTMLPreElement>) => {
  const child = props.children as React.ReactElement<{ className?: string; children?: string }>
  const className = child?.props?.className || ''
  const lang = className.replace('language-', '')
  const code = child?.props?.children || ''
  return <CodeBlock lang={lang} value={typeof code === 'string' ? code : ''} />
}

// Then in components:
const components = {
  // ...
  pre: Pre,
  // remove the 'code' block mapping, keep InlineCode for inline
}
```

**Step 4: Commit if changes were needed**

```bash
git add src/components/markdown/MDXRenderer.tsx
git commit -m "fix: adapt CodeBlock to standard MDX pre/code structure"
```

---

## Task 6: Update `tutorial/[slug]/page.tsx`

**Files:**
- Modify: `src/app/[locale]/tutorial/[slug]/page.tsx`

**Step 1: Update imports**

Change:
```typescript
import { TinaMarkdownRenderer } from '@/components/markdown';
import { getAllTutorials, getTutorialBySlug } from '@/lib/tina';
```

To:
```typescript
import { MDXRenderer } from '@/components/markdown';
import { getAllTutorials, getTutorialBySlug } from '@/lib/content';
```

**Step 2: Update the MDX rendering call**

Change (around line 155-157):
```tsx
{tutorial.body && (
  <TinaMarkdownRenderer content={tutorial.body} />
)}
```

To:
```tsx
{tutorial.body && (
  <MDXRenderer content={tutorial.body} />
)}
```

**Step 3: Remove null-safety operators on non-nullable fields**

The Velite types are non-nullable (unlike TinaCMS GraphQL which returns nullable types). Update field accesses:

Change `tutorial?.slug` → `tutorial.slug`, `t?.slug` → `t.slug` etc. throughout the file.
Also remove `?? []` fallbacks on arrays that Velite guarantees (like `tags` which defaults to `[]`).

**Step 4: Verify build**

```bash
npx tsc --noEmit 2>&1 | grep "tutorial"
```

Expected: No TypeScript errors in this file.

**Step 5: Commit**

```bash
git add src/app/[locale]/tutorial/[slug]/page.tsx
git commit -m "refactor: tutorial page uses velite content and MDXRenderer"
```

---

## Task 7: Update `tools/[slug]/page.tsx` and `showcase/[slug]/page.tsx`

**Files:**
- Modify: `src/app/[locale]/tools/[slug]/page.tsx`
- Modify: `src/app/[locale]/showcase/[slug]/page.tsx`

Apply the same pattern as Task 6:
1. Change import from `@/lib/tina` → `@/lib/content`
2. Change import from `TinaMarkdownRenderer` → `MDXRenderer`
3. Change `content={item.body}` prop (body type changes from TinaMarkdown JSON to string)
4. Remove unnecessary null-coalescing operators

**Step 1: Update tools/[slug]/page.tsx**

Read the file, apply the three changes above.

**Step 2: Update showcase/[slug]/page.tsx**

Read the file, apply the three changes above.

**Step 3: Commit**

```bash
git add src/app/[locale]/tools/[slug]/page.tsx src/app/[locale]/showcase/[slug]/page.tsx
git commit -m "refactor: tools and showcase detail pages use velite + MDXRenderer"
```

---

## Task 8: Refactor Docs Page to Server Component

The docs page is currently a client component that fetches from `/api/docs`. Converting to a server component eliminates the API route and renders MDX server-side.

**Files:**
- Rewrite: `src/app/[locale]/docs/page.tsx`
- Create: `src/components/features/DocsSidebar.tsx` (client component for navigation)
- Delete (later): `src/app/api/docs/route.ts`

**Step 1: Create `DocsSidebar.tsx` (Client Component for sidebar navigation)**

```typescript
'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface DocItem {
  slug: string
  title: string
  category?: string
}

interface DocsSidebarProps {
  docs: DocItem[]
  activeSlug: string
  onSelect: (slug: string) => void
}

export function DocsSidebar({ docs, activeSlug, onSelect }: DocsSidebarProps) {
  const [query, setQuery] = useState('')
  const t = useTranslations('Docs')
  const categories = [...new Set(docs.map(d => d.category).filter(Boolean))]
  const filtered = query
    ? docs.filter(d => d.title.toLowerCase().includes(query.toLowerCase()))
    : docs

  return (
    <aside className="w-64 flex-shrink-0 hidden lg:block">
      <div className="sticky top-24">
        <div className="mb-6">
          <label className="flex items-center w-full h-10 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 px-3 focus-within:ring-2 focus-within:ring-primary-500">
            <Search className="w-4 h-4 text-slate-400 mr-2" />
            <input
              className="flex-1 bg-transparent border-none text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none"
              placeholder={t('searchPlaceholder')}
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </label>
        </div>
        <nav className="flex flex-col gap-6">
          {categories.map(category => (
            <div key={category}>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                {category}
              </h4>
              <ul className="flex flex-col gap-1">
                {filtered.filter(doc => doc.category === category).map(doc => (
                  <li key={doc.slug}>
                    <button
                      onClick={() => onSelect(doc.slug)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeSlug === doc.slug
                          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {doc.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  )
}
```

**Step 2: Create `DocsViewer.tsx` (Client Component that holds sidebar state + renders MDX)**

Since MDXRemote is a server component but we need client-side navigation, we use a client component to manage which doc is shown, and use server actions or fetch to get doc content. The simplest approach: pass all docs content to a client "shell" and render using a hidden iframe-like approach.

Actually the simpler approach: Make the docs page entirely a Server Component but accept `searchParams`:

**Step 2 (revised): Rewrite `docs/page.tsx` as a Server Component with searchParams**

```typescript
import Link from 'next/link'
import { BookOpen, ExternalLink, ChevronRight } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { MDXRenderer } from '@/components/markdown'
import { getAllDocs } from '@/lib/content'
import { getTranslations } from 'next-intl/server'

interface DocsPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ doc?: string }>
}

export default async function DocsPage({ params, searchParams }: DocsPageProps) {
  const { locale } = await params
  const { doc: docSlug } = await searchParams
  const t = await getTranslations('Docs')
  const docs = getAllDocs(locale)
  const categories = [...new Set(docs.map(d => d.category).filter(Boolean))]
  const activeDoc = docs.find(d => d.slug === docSlug) ?? docs[0] ?? null

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Header />
      <main className="flex-1">
        <div className="max-w-[1400px] mx-auto px-6 py-8 lg:py-12">
          <div className="flex gap-8">
            {/* Sidebar Navigation */}
            <aside className="w-64 flex-shrink-0 hidden lg:block">
              <div className="sticky top-24">
                <nav className="flex flex-col gap-6">
                  {categories.map(category => (
                    <div key={category}>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                        {category}
                      </h4>
                      <ul className="flex flex-col gap-1">
                        {docs.filter(doc => doc.category === category).map(doc => (
                          <li key={doc.slug}>
                            <Link
                              href={`?doc=${doc.slug}`}
                              className={`block w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                activeDoc?.slug === doc.slug
                                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              {doc.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {activeDoc ? (
                <>
                  <nav className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-6">
                    <Link href="/" className="hover:text-primary-600 dark:hover:text-primary-400">
                      {t('home')}
                    </Link>
                    <ChevronRight className="w-4 h-4" />
                    <Link href="/docs" className="hover:text-primary-600 dark:hover:text-primary-400">
                      {t('docs')}
                    </Link>
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-slate-900 dark:text-white font-medium">
                      {activeDoc.title}
                    </span>
                  </nav>

                  <article className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8">
                    <h1 className="flex items-center gap-3 text-3xl font-bold text-slate-900 dark:text-white mb-8">
                      <BookOpen className="w-8 h-8 text-primary-600" />
                      {activeDoc.title}
                    </h1>
                    {activeDoc.body && (
                      <MDXRenderer content={activeDoc.body} />
                    )}
                    <div className="flex items-center justify-between pt-8 mt-8 border-t border-slate-200 dark:border-slate-800">
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {t('lastUpdated', { date: activeDoc.lastUpdated
                          ? new Date(activeDoc.lastUpdated).toLocaleDateString()
                          : 'N/A' })}
                      </div>
                      <a
                        href="#"
                        className="flex items-center gap-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        {t('editOnGithub')}
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </article>
                </>
              ) : (
                <div className="text-slate-500">{t('noDocs')}</div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
```

**Step 3: Check for 'noDocs' translation key**

The existing messages may not have `noDocs`. Add it to all locale files if missing:

- `src/messages/en.json`: `"Docs": { ..., "noDocs": "No documentation available." }`
- `src/messages/zh.json`: `"Docs": { ..., "noDocs": "暂无文档。" }`
- `src/messages/ja.json`: `"Docs": { ..., "noDocs": "ドキュメントがありません。" }`

**Step 4: Update `/api/docs/route.ts` to use content.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAllDocs } from '@/lib/content';

export async function GET(request: NextRequest) {
  try {
    const locale = request.nextUrl.searchParams.get('locale') || undefined;
    const docs = getAllDocs(locale);
    return NextResponse.json(docs);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
```

(Keep the API route for now in case other things depend on it; we'll remove it in cleanup.)

**Step 5: Commit**

```bash
git add src/app/[locale]/docs/page.tsx src/app/api/docs/route.ts src/messages/
git commit -m "refactor: docs page converted to server component with searchParams navigation"
```

---

## Task 9: Update All Remaining Pages and API Routes

Update all 12 files that import from `@/lib/tina` to use `@/lib/content` instead. These are list/index pages that don't render MDX body.

**Files to update (all change `@/lib/tina` → `@/lib/content`, no renderer changes):**
- `src/app/[locale]/page.tsx`
- `src/app/[locale]/explore/page.tsx`
- `src/app/[locale]/news/page.tsx`
- `src/app/[locale]/practice/page.tsx`
- `src/app/[locale]/tools/page.tsx`
- `src/app/[locale]/showcase/page.tsx`
- `src/app/api/search-index/route.ts`
- `src/app/sitemap.ts`

**Step 1: Global find-and-replace in each file**

For each file, change:
```typescript
import { ... } from '@/lib/tina'
```
to:
```typescript
import { ... } from '@/lib/content'
```

**Step 2: Remove null-safety operators on Velite-guaranteed fields**

Velite returns non-nullable typed data. Remove `?.` and `?? []` on fields that Velite guarantees:
- `tags`, `techStack` — guaranteed `string[]` (default: `[]`)
- `slug`, `title`, `locale` — guaranteed `string`
- `featured` — guaranteed `boolean` (default: `false`)

Keep `?.` on optional fields: `description`, `category`, `thumbnail`, `videoUrl`, etc.

**Step 3: Fix `id` field in search-index route**

TinaCMS had an auto-generated `id` field. Velite doesn't. In `src/app/api/search-index/route.ts`, change:
```typescript
id: t?.id || '',
```
to (using slug + locale as unique id):
```typescript
id: `${t.locale}-${t.slug}`,
```

Apply same pattern for `docs`, `news`, `labs`, `showcases`, `tools`.

**Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: Zero errors (or only errors in TinaMarkdown files we haven't deleted yet).

**Step 5: Commit**

```bash
git add src/app/[locale]/page.tsx src/app/[locale]/explore/page.tsx \
  src/app/[locale]/news/page.tsx src/app/[locale]/practice/page.tsx \
  src/app/[locale]/tools/page.tsx src/app/[locale]/showcase/page.tsx \
  src/app/api/search-index/route.ts src/app/sitemap.ts
git commit -m "refactor: all pages and API routes use velite content.ts"
```

---

## Task 10: Remove TinaCMS — Full Cleanup

**Files:**
- Delete: `tina/` directory
- Delete: `public/admin/` directory
- Delete: `src/app/[locale]/create/page.tsx`
- Delete: `src/components/markdown/TinaMarkdownRenderer.tsx`
- Delete: `src/components/markdown/TinaMarkdownRendererClient.tsx`
- Modify: `src/components/markdown/index.ts`
- Modify: `package.json`

**Step 1: Delete TinaCMS directories and files**

```bash
rm -rf tina/
rm -rf public/admin/
rm -f src/app/[locale]/create/page.tsx
rm -f src/components/markdown/TinaMarkdownRenderer.tsx
rm -f src/components/markdown/TinaMarkdownRendererClient.tsx
```

**Step 2: Update `src/components/markdown/index.ts`**

Remove TinaMarkdownRenderer exports, keep only MDXRenderer:

```typescript
export { MDXRenderer } from './MDXRenderer'
```

**Step 3: Uninstall TinaCMS packages**

```bash
npm uninstall tinacms @tinacms/cli
```

**Step 4: Final TypeScript check**

```bash
npx tsc --noEmit
```

Expected: Zero errors.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: remove tinacms completely, migration to velite complete"
```

---

## Task 11: End-to-End Build Verification

**Step 1: Run full Next.js build**

```bash
npm run build
```

Expected:
- Velite runs and generates `.velite/*.json`
- Next.js builds all pages successfully
- `Generating static pages` shows the tutorial, tools, showcase pages
- Zero build errors

**Step 2: Check for missing content**

If velite validation fails during build (schema mismatch), the error will name the file and field. Fix by:
- Adding `.optional()` to the field in `velite.config.ts` if the field is genuinely optional in some files
- Or adding the missing field to the content file

**Step 3: Spot-check key routes locally**

```bash
npm run start
```

Visit:
- `/en/tutorial/[any-slug]` — verify MDX content renders with code highlighting
- `/en/docs` — verify docs load and switching works
- `/en/tools/[any-slug]` — verify tool detail MDX renders
- `/en/explore` — verify tutorial listing loads
- Command+K search — verify search index populates

**Step 4: Commit final state**

```bash
git add .
git commit -m "build: verified full build passes after tinacms → velite migration"
```

---

## Summary: What Changed

| Before | After |
|--------|-------|
| `tina/` (GraphQL schema + generated client) | `velite.config.ts` (Zod schema) |
| `src/lib/tina.ts` (GraphQL queries) | `src/lib/content.ts` (static imports) |
| `TinaMarkdownRenderer` (TinaMarkdown JSON) | `MDXRenderer` (next-mdx-remote/rsc) |
| `/admin` visual editor | Direct file editing in `content/` |
| `tinacms dev` + `tinacms build` scripts | `next dev` + `next build` |
| `tutorial.body: TinaMarkdownContent` | `tutorial.body: string` (raw MDX) |
| Client-fetched docs page | Server component with `searchParams` |
| ~300MB TinaCMS node_modules | +velite (~15MB) |

**Unchanged:** All `content/**` files, translate system, Shiki highlighting, i18n routing, search (Orama), all UI components.
