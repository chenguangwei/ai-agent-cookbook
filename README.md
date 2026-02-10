# Agent Hub

A multi-language AI agent tutorial platform built with Next.js 16, TinaCMS, and Shiki.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| CMS | TinaCMS (local Git-based) |
| UI | Tailwind CSS 4 + Shadcn/ui |
| Markdown | TinaMarkdown + Shiki (syntax highlighting) |
| Search | Orama (client-side full-text) |
| I18n | next-intl (en / zh / ja) |
| Theme | next-themes (dark mode) |

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
│   │   ├── tools/             # AI Agent Tools directory
│   │   ├── translate/         # Translation manager
│   │   └── request/           # Tutorial request form
│   └── api/
│       ├── docs/              # Docs API (locale filtering)
│       ├── translate/         # AI translation API
│       ├── tutorials/         # Tutorials API
│       ├── tools/             # Tools API
│       ├── search-index/      # Search index builder
│       └── request/           # Tutorial request submission
├── components/
│   ├── ui/                    # Shadcn components
│   ├── layout/                # Header, Footer, Sidebar
│   ├── features/              # Feature components
│   └── markdown/              # Custom TinaMarkdown renderer
│       ├── TinaMarkdownRenderer.tsx       # Server Component
│       ├── TinaMarkdownRendererClient.tsx  # Client Component
│       └── components/        # CodeBlock, Heading, Table, etc.
├── lib/
│   ├── tina.ts                # TinaCMS data access layer
│   ├── shiki.ts               # Shiki highlighter singleton
│   ├── translate.config.ts    # Translation API config
│   └── search.ts              # Orama search utilities
├── i18n/
│   ├── config.ts              # Locale configuration
│   └── request.ts             # next-intl request config
└── messages/
    ├── en.json                # English UI translations
    ├── zh.json                # Chinese UI translations
    └── ja.json                # Japanese UI translations

content/                       # All content, organized by locale
├── tutorials/{en,zh,ja}/      # Tutorial MDX files
├── docs/{en,zh}/              # Documentation MDX files
├── news/{en}/                 # News articles MDX files
├── labs/{en}/                 # Practice labs JSON files
├── showcase/{en}/             # Showcase projects JSON files
├── tools/{en,zh,ja}/          # Tools MDX files
└── requests/                  # Tutorial requests JSON files

tina/
├── config.ts                  # TinaCMS schema definition
└── __generated__/             # Auto-generated types & client
```

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server (TinaCMS + Next.js)
npm run dev

# Open in browser
# App:   http://localhost:3000
# CMS:   http://localhost:3000/admin
# API:   http://localhost:4001/graphql
```

## Adding Content

Content can be managed in two ways:

1. **TinaCMS Admin** - Visual editor at `/admin`
2. **Direct file editing** - Create/edit files in `content/` (fully compatible, changes are picked up automatically)

### New Tutorial

Create `content/tutorials/en/my-tutorial.mdx`:

```mdx
---
title: "My Tutorial"
slug: "my-tutorial"
locale: "en"
description: "Brief description"
category: "Frameworks"
tags: ["LangChain", "Python"]
techStack: ["Python", "LangChain"]
difficulty: "Beginner"
duration: "30 mins"
featured: false
date: 2025-01-01
---

# My Tutorial

Content here with code blocks, images, etc.
```

### New Documentation

Create `content/docs/en/my-doc.mdx`:

```mdx
---
title: "My Doc"
slug: "my-doc"
locale: "en"
category: "Guides"
order: 10
lastUpdated: "2025-01-01"
---

Documentation content...
```

### New News Article

Create `content/news/en/my-news.mdx`:

```mdx
---
title: "News Title"
slug: "my-news"
locale: "en"
summary: "Brief summary"
source: "Source Name"
sourceUrl: "https://..."
author: "Author"
publishedAt: "2025-01-01"
category: "Tech"
readTime: "5 min read"
---

Article body...
```

### New Practice Lab / Showcase

Create JSON files in `content/labs/en/` or `content/showcase/en/`:

```json
{
  "title": "My Lab",
  "locale": "en",
  "description": "Lab description",
  "environment": "Python",
  "difficulty": "Beginner",
  "status": "Online",
  "usersOnline": 0
}
```

### New Tool

Create `content/tools/en/my-tool.mdx`:

```mdx
---
title: "My Tool"
slug: "my-tool"
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
date: 2025-01-01
---

# My Tool

Tool description and documentation...
```

## Multi-Language Support

All content types support locale-based subdirectories:

```
content/{type}/{locale}/filename.{mdx|json}
```

Supported locales: `en` (English), `zh` (Chinese), `ja` (Japanese).

### AI Translation

The platform includes a built-in Translation Manager at `/translate` that uses any OpenAI-compatible API to translate content between languages.

Configure in `.env.local`:

```bash
TRANSLATE_API_KEY=your-api-key
TRANSLATE_BASE_URL=https://api.openai.com/v1   # or any compatible endpoint
TRANSLATE_MODEL=gpt-4o                          # or deepseek-chat, etc.
```

Features:
- Translates all content types (tutorials, docs, news, labs, showcase, tools)
- Content type filtering tabs
- Locale filter (show missing translations)
- Multi-select with batch translation
- Supports MDX and JSON formats

## Environment Variables

Copy `.env.example` to `.env.local`:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SITE_URL` | Yes | Production URL for sitemap/SEO |
| `TRANSLATE_API_KEY` | No | API key for AI translation |
| `TRANSLATE_BASE_URL` | No | Translation API endpoint (default: OpenAI) |
| `TRANSLATE_MODEL` | No | Model name (default: gpt-4o) |

## Build & Deploy

```bash
# Production build
npm run build

# Full build (TinaCMS + Next.js)
npm run build:tina

# Start production server
npm start
```

Optimized for Vercel deployment.
