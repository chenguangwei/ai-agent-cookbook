# Homepage Enhancement Design

**Date:** 2026-03-06
**Status:** Approved
**Scope:** `src/app/[locale]/page.tsx`, i18n message files, `src/lib/content.ts`

---

## Goal

Make the homepage more engaging and content-rich without breaking the existing clean design aesthetic.

---

## Page Structure (top → bottom)

```
Header
Hero (title + improved subtitle + 2 CTA buttons + search box)
Stats Bar (tutorial count · tool count · showcase count · languages)
Hot Topics (4 featured tutorials grid — existing, unchanged)
Recently Added (3 latest tutorials by date — new section)
Repository Segments (4 category cards with real descriptions — fixed)
Footer
```

---

## Section Specs

### 1. Hero — changes only

- **Subtitle copy (zh):** "面向 AI 开发者的实战资源库。从基础到生产级智能体，一站学习。"
- **Subtitle copy (en):** "A hands-on resource hub for AI developers. From fundamentals to production-grade agents, all in one place."
- **Add two CTA buttons** below subtitle, above search box:
  - Primary: "开始学习 →" → `/explore`
  - Secondary (outline): "浏览工具" → `/tools`

### 2. Stats Bar — new

Horizontal strip between Hero and Hot Topics. Four stats derived dynamically:

| Stat | Source |
|------|--------|
| Tutorials count | `getAllTutorials(locale).length` |
| Tools count | `getAllTools(locale).length` |
| Showcases count | `getAllShowcaseProjects(locale).length` |
| Languages | hardcoded `3` |

Render as: `[ 20+ 教程 ]  [ 3 工具 ]  [ 7 案例 ]  [ 3 语言 ]`

### 3. Hot Topics — unchanged

Keep existing 4-tutorial grid. No changes.

### 4. Recently Added — new section

- Heading: "最近更新" / "Recently Added"
- Source: `getRecentTutorials(3, locale)` — new helper, returns tutorials sorted by `date` descending, skip featured ones already shown
- Layout: 3-column grid, simpler card (no description, just thumbnail + title + category badge)
- "查看全部 →" link to `/explore`

### 5. Repository Segments — bug fix + content update

**Bug fix:** Currently title and description render the same i18n key. Fix by adding distinct `desc` keys.

Replace `Practice` card with `Tools` card. Final 4 cards:

| Card | Title key | Description | Link |
|------|-----------|-------------|------|
| Foundation | `categories.foundation` | 理解 LLM 原理、推理模式和核心概念 | `/explore?cat=llms` |
| Workflows | `categories.workflows` | 构建多步骤、多智能体自动化任务流 | `/explore?cat=workflows` |
| Tools | `categories.tools` | 发现最佳 AI 框架、向量数据库和开发工具 | `/tools` |
| Showcase | `categories.showcase` | 探索社区构建的真实 AI 项目 | `/showcase` |

---

## Files to Change

| File | Change |
|------|--------|
| `src/app/[locale]/page.tsx` | Add Stats Bar, Recently Added section, fix Segments, add CTA buttons, update subtitle |
| `src/lib/content.ts` | Add `getRecentTutorials(limit, locale)` helper |
| `src/messages/en.json` | Add `stats.*`, `recentlyAdded`, `categories.*.desc`, `ctaExplore`, `ctaTools` keys |
| `src/messages/zh.json` | Same keys in Chinese |
| `src/messages/ja.json` | Same keys in Japanese |

---

## Constraints

- Keep existing Tailwind classes and color variables (`primary-*`, `slate-*`)
- No new npm packages
- All content counts must be derived from the same locale as the page
- Stats numbers should show `+` suffix (e.g., `20+`) if count > threshold
