# Agent Hub - AI Agent Tutorials Platform

## Project Overview

A multi-language tutorial platform for AI agents built with Next.js 16, featuring TinaCMS content management, Shiki syntax highlighting, AI-powered translation, and responsive design.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **CMS**: TinaCMS (local Git-based, visual editor at `/admin`)
- **UI**: Tailwind CSS 4 + Shadcn/ui + @tailwindcss/typography
- **Markdown**: TinaMarkdown with custom components + Shiki (dual-theme syntax highlighting)
- **Search**: Orama (client-side full-text)
- **I18n**: next-intl (en, zh, ja)
- **Theme**: next-themes

## Project Structure

```
src/
├── app/
│   ├── [locale]/              # Localized pages
│   │   ├── page.tsx           # Home
│   │   ├── explore/           # Tutorial listing
│   │   ├── tutorial/[slug]/   # Tutorial detail
│   │   ├── docs/              # Documentation
│   │   ├── news/              # News feed
│   │   ├── practice/          # Practice labs
│   │   ├── showcase/          # Community projects
│   │   ├── tools/             # Tools directory
│   │   ├── translate/         # Translation manager (admin)
│   │   └── request/           # Tutorial request form
│   └── api/
│       ├── docs/              # Docs API (locale filtering)
│       ├── translate/         # AI translation API (all content types)
│       ├── tutorials/         # Tutorials API
│       ├── tools/             # Tools API
│       ├── search-index/      # Search index builder
│       └── request/           # Tutorial request submission
├── components/
│   ├── ui/                    # Shadcn components
│   ├── layout/                # Header, Footer, Sidebar
│   ├── features/              # Feature components
│   └── markdown/              # Custom TinaMarkdown renderer
│       ├── TinaMarkdownRenderer.tsx       # Server Component (tutorials)
│       ├── TinaMarkdownRendererClient.tsx  # Client Component (docs)
│       └── components/        # CodeBlock, Heading, Table, etc.
├── lib/
│   ├── tina.ts                # TinaCMS data access (all functions accept locale)
│   ├── shiki.ts               # Shiki highlighter singleton
│   ├── translate.config.ts    # Translation API config
│   └── search.ts              # Orama search utilities
├── i18n/
│   ├── config.ts              # Locale configuration (en, zh, ja)
│   └── request.ts             # next-intl request config
└── messages/
    ├── en.json                # English UI translations
    ├── zh.json                # Chinese UI translations
    └── ja.json                # Japanese UI translations

content/                       # All content, organized by locale subdirectories
├── tutorials/{en,zh,ja}/      # Tutorial MDX files
├── docs/{en,zh}/              # Documentation MDX files
├── news/{en}/                 # News articles MDX files
├── labs/{en}/                 # Practice labs JSON files
├── showcase/{en}/             # Showcase projects JSON files
├── tools/{en,zh,ja}/         # Tools MDX files
└── requests/                  # Tutorial requests JSON files

tina/
├── config.ts                  # TinaCMS schema (all collections have locale field)
└── __generated__/             # Auto-generated types & client
```

## Key Features

1. **TinaCMS Integration**: Visual editor at `/admin` + direct file editing in `content/`
2. **Multi-language**: English, Chinese, Japanese with URL-based routing
3. **All content types support locale**: tutorials, docs, news, labs, showcase, tools
4. **AI Translation**: Built-in translation manager at `/translate`, supports any OpenAI-compatible API
5. **Shiki Syntax Highlighting**: Dual-theme (light/dark) code blocks with copy button and language label
6. **Search**: Command+K global search powered by Orama
7. **Dark Mode**: System-aware theme switching
8. **SEO**: Dynamic metadata, sitemap, robots.txt

## Development Commands

```bash
# Install dependencies
npm install

# Development server (TinaCMS + Next.js)
npm run dev

# Build for production
npm run build

# Full build (TinaCMS + Next.js)
npm run build:tina

# Regenerate TinaCMS types
npx tinacms dev -c "echo done"
```

## Adding Content

Two ways to manage content:
1. **TinaCMS Admin** at `/admin`
2. **Direct file editing** in `content/` directory

Content pattern: `content/{type}/{locale}/filename.{mdx|json}`

### New Tutorial (English)

Create `content/tutorials/en/your-tutorial.mdx`:

```mdx
---
title: "Your Tutorial Title"
slug: "your-tutorial"
locale: "en"
description: "Brief description"
category: "Frameworks"
tags: ["tag1", "tag2"]
techStack: ["Tech1", "Tech2"]
difficulty: "Beginner"
duration: "30 mins"
featured: false
date: 2024-01-01
---

# Your Tutorial Content

Write your content here with code blocks...
```

### Chinese / Japanese version

Create same file in `content/tutorials/zh/` or `content/tutorials/ja/` with matching `locale` field.

### New Tool (English)

Create `content/tools/en/your-tool.mdx`:

```mdx
---
title: "Your Tool Name"
slug: "your-tool"
locale: "en"
description: "Brief description of the tool"
category: "Agent Framework"
tags: ["Python", "Agent"]
websiteUrl: "https://..."
repoUrl: "https://github.com/..."
docsUrl: "https://..."
pricing: "Open Source"
stars: 5000
license: "MIT"
featured: false
date: 2024-01-01
---

# Your Tool Name

Tool description and documentation content...
```

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

- `NEXT_PUBLIC_SITE_URL`: Production URL for sitemap
- `TRANSLATE_API_KEY`: API key for AI translation (optional)
- `TRANSLATE_BASE_URL`: Translation API endpoint (default: OpenAI)
- `TRANSLATE_MODEL`: Model name (default: gpt-4o)

## Deployment

Optimized for Vercel deployment. Push to GitHub and import in Vercel.

```bash
vercel deploy
```
