# Homepage Enhancement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enrich the homepage with a Stats Bar, Recently Added tutorials section, improved Hero CTAs, and fixed category card descriptions.

**Architecture:** All changes are in the single server component `src/app/[locale]/page.tsx` plus i18n message files and one new helper in `src/lib/content.ts`. No new packages, no client components added.

**Tech Stack:** Next.js 16 App Router, next-intl, Tailwind CSS 4, Velite (content layer)

---

## Task 1: Add `getRecentTutorials` helper to content.ts

**Files:**
- Modify: `src/lib/content.ts`

**Step 1: Add the function after `getFeaturedTutorials`**

```ts
export function getRecentTutorials(limit = 3, locale?: string): Tutorial[] {
  const all = getAllTutorials(locale)
  return [...all]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit)
}
```

**Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

**Step 3: Commit**

```bash
git add src/lib/content.ts
git commit -m "feat: add getRecentTutorials helper"
```

---

## Task 2: Add i18n keys — English

**Files:**
- Modify: `src/messages/en.json`

**Step 1: Add new keys inside the `"Home"` object**

Add after `"systemStatus"`:

```json
"ctaExplore": "Start Learning →",
"ctaTools": "Browse Tools",
"recentlyAdded": "Recently Added",
"stats": {
  "tutorials": "Tutorials",
  "tools": "Tools",
  "showcases": "Showcases",
  "languages": "Languages"
},
```

**Step 2: Update `"categories"` object** — replace existing with:

```json
"categories": {
  "foundation": "Foundation",
  "foundationDesc": "Understand LLM fundamentals, reasoning patterns, and core concepts",
  "workflows": "Workflows",
  "workflowsDesc": "Build multi-step, multi-agent automation pipelines",
  "tools": "Tools",
  "toolsDesc": "Discover the best AI frameworks, vector databases, and developer tools",
  "showcase": "Showcase",
  "showcaseDesc": "Explore real-world AI projects built by the community",
  "llms": "LLMs"
}
```

**Step 3: Commit**

```bash
git add src/messages/en.json
git commit -m "feat: add homepage i18n keys (en)"
```

---

## Task 3: Add i18n keys — Chinese

**Files:**
- Modify: `src/messages/zh.json`

**Step 1: Add same keys inside `"Home"` object**

```json
"subtitle": "面向 AI 开发者的实战资源库。从基础到生产级智能体，一站学习。",
"ctaExplore": "开始学习 →",
"ctaTools": "浏览工具",
"recentlyAdded": "最近更新",
"stats": {
  "tutorials": "教程",
  "tools": "工具",
  "showcases": "案例",
  "languages": "语言"
},
```

> Note: replace the existing `"subtitle"` value with the new copy above.

**Step 2: Update `"categories"` object**

```json
"categories": {
  "foundation": "基础知识",
  "foundationDesc": "理解 LLM 原理、推理模式和核心概念",
  "workflows": "工作流程",
  "workflowsDesc": "构建多步骤、多智能体自动化任务流",
  "tools": "工具目录",
  "toolsDesc": "发现最佳 AI 框架、向量数据库和开发工具",
  "showcase": "案例展示",
  "showcaseDesc": "探索社区构建的真实 AI 项目",
  "llms": "大语言模型"
}
```

**Step 3: Commit**

```bash
git add src/messages/zh.json
git commit -m "feat: add homepage i18n keys (zh)"
```

---

## Task 4: Add i18n keys — Japanese

**Files:**
- Modify: `src/messages/ja.json`

**Step 1: Add same keys inside `"Home"` object**

```json
"subtitle": "AIデベロッパーのための実践リソースハブ。基礎から本番グレードのエージェントまで一か所で学べます。",
"ctaExplore": "学習を始める →",
"ctaTools": "ツールを見る",
"recentlyAdded": "最近追加",
"stats": {
  "tutorials": "チュートリアル",
  "tools": "ツール",
  "showcases": "事例",
  "languages": "言語"
},
```

> Note: replace the existing `"subtitle"` value.

**Step 2: Update `"categories"` object**

```json
"categories": {
  "foundation": "基礎",
  "foundationDesc": "LLMの基礎、推論パターン、コアコンセプトを理解する",
  "workflows": "ワークフロー",
  "workflowsDesc": "マルチステップ・マルチエージェントの自動化パイプラインを構築する",
  "tools": "ツール",
  "toolsDesc": "最適なAIフレームワーク、ベクターDB、開発ツールを発見する",
  "showcase": "事例紹介",
  "showcaseDesc": "コミュニティが構築した実際のAIプロジェクトを探索する",
  "llms": "LLM"
}
```

**Step 3: Commit**

```bash
git add src/messages/ja.json
git commit -m "feat: add homepage i18n keys (ja)"
```

---

## Task 5: Rewrite `page.tsx` — Hero + CTA buttons

**Files:**
- Modify: `src/app/[locale]/page.tsx`

**Step 1: Update imports at top of file**

Add `getRecentTutorials` to the import from `@/lib/content`:

```ts
import { getFeaturedTutorials, getRecentTutorials, getAllTutorials, getAllTools, getAllShowcaseProjects } from '@/lib/content';
```

Remove unused `Database` from lucide-react (was used for Practice card). The import line becomes:

```ts
import { Search, ArrowUpRight, Terminal, Activity, Sparkles, Command, Wrench } from 'lucide-react';
```

**Step 2: Update `repositorySegments` array** — replace the existing array with:

```ts
const repositorySegments = [
  {
    titleKey: 'categories.foundation',
    descKey: 'categories.foundationDesc',
    icon: Activity,
    href: '/explore?cat=llms',
  },
  {
    titleKey: 'categories.workflows',
    descKey: 'categories.workflowsDesc',
    icon: Terminal,
    href: '/explore?cat=workflows',
  },
  {
    titleKey: 'categories.tools',
    descKey: 'categories.toolsDesc',
    icon: Wrench,
    href: '/tools',
  },
  {
    titleKey: 'categories.showcase',
    descKey: 'categories.showcaseDesc',
    icon: Sparkles,
    href: '/showcase',
  },
];
```

**Step 3: Fetch data in the server component function**

Replace the existing data-fetch line:

```ts
const featuredTutorials = await getFeaturedTutorials(4, locale);
```

with:

```ts
const featuredTutorials = getFeaturedTutorials(4, locale);
const recentTutorials = getRecentTutorials(3, locale);
const tutorialCount = getAllTutorials(locale).length;
const toolCount = getAllTools(locale).length;
const showcaseCount = getAllShowcaseProjects(locale).length;
```

> Note: `getFeaturedTutorials` is synchronous (Velite), so remove `await`.

**Step 4: Update Hero subtitle and add CTA buttons**

Replace the `<p>` subtitle + closing `</div>` of the Hero section:

```tsx
<p className="text-slate-500 dark:text-slate-400 text-lg md:text-xl text-center max-w-2xl leading-relaxed font-light mb-8">
  {t('subtitle')}
</p>
<div className="flex items-center gap-4 mb-8">
  <Link
    href="/explore"
    className="px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold transition-colors"
  >
    {t('ctaExplore')}
  </Link>
  <Link
    href="/tools"
    className="px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-primary-400 dark:hover:border-primary-600 text-sm font-bold transition-colors bg-white dark:bg-slate-900"
  >
    {t('ctaTools')}
  </Link>
</div>
```

**Step 5: Commit**

```bash
git add src/app/[locale]/page.tsx
git commit -m "feat: homepage hero CTA buttons + updated data fetching"
```

---

## Task 6: Add Stats Bar to `page.tsx`

**Files:**
- Modify: `src/app/[locale]/page.tsx`

**Step 1: Add Stats Bar between the search box and Hot Topics heading**

After the closing `</div>` of the search box section and before the `{/* Hot Topics Section */}` comment, insert:

```tsx
{/* Stats Bar */}
<div className="flex flex-wrap justify-center gap-8 mb-20 py-6 border-y border-slate-100 dark:border-slate-800">
  {[
    { value: tutorialCount, label: tStat('tutorials') },
    { value: toolCount, label: tStat('tools') },
    { value: showcaseCount, label: tStat('showcases') },
    { value: 3, label: tStat('languages') },
  ].map((stat) => (
    <div key={stat.label} className="flex flex-col items-center gap-1">
      <span className="text-3xl font-bold text-slate-900 dark:text-white font-display">
        {stat.value}+
      </span>
      <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest font-medium">
        {stat.label}
      </span>
    </div>
  ))}
</div>
```

**Step 2: Add `tStat` translation accessor**

In the function body, add after the existing `tCat` line:

```ts
const tStat = await getTranslations('Home.stats');
```

**Step 3: Commit**

```bash
git add src/app/[locale]/page.tsx
git commit -m "feat: homepage stats bar"
```

---

## Task 7: Add Recently Added section to `page.tsx`

**Files:**
- Modify: `src/app/[locale]/page.tsx`

**Step 1: Add the section between Hot Topics grid and Repository Segments**

After the closing `</div>` of the Featured Tutorials Grid (`mb-32` grid) and before `{/* Repository Segments Section */}`, insert:

```tsx
{/* Recently Added Section */}
<div className="flex items-center justify-between mb-10">
  <div className="flex items-center gap-4">
    <div className="h-6 w-1 bg-primary-600 rounded-full"></div>
    <h2 className="text-slate-900 dark:text-white text-xl font-bold tracking-widest uppercase font-display">
      {t('recentlyAdded')}
    </h2>
  </div>
  <Link
    href="/explore"
    className="text-primary-600 dark:text-primary-400 text-xs font-bold uppercase tracking-widest hover:underline transition-all flex items-center gap-2"
  >
    {t('viewAll')} <ArrowUpRight className="w-4 h-4" />
  </Link>
</div>

<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-32">
  {recentTutorials.map((tutorial) => (
    <Link
      href={`/tutorial/${tutorial.slug}`}
      key={tutorial.slug}
      className="group flex flex-col gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 hover:shadow-xl hover:shadow-primary-500/5 hover:border-primary-200 dark:hover:border-primary-800 transition-all duration-300"
    >
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
        {tutorial.thumbnail && (
          <Image
            src={tutorial.thumbnail}
            alt={tutorial.title || ''}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <TutorialBadge type="difficulty" value={tutorial.difficulty || 'Beginner'} />
        <h3 className="text-slate-900 dark:text-white font-bold text-sm leading-tight group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
          {tutorial.title}
        </h3>
      </div>
    </Link>
  ))}
</div>
```

**Step 2: Commit**

```bash
git add src/app/[locale]/page.tsx
git commit -m "feat: homepage recently added section"
```

---

## Task 8: Fix Repository Segments cards in `page.tsx`

**Files:**
- Modify: `src/app/[locale]/page.tsx`

**Step 1: Replace the segment card render logic**

Find the existing `repositorySegments.map(...)` block (currently renders duplicate title/description) and replace the entire card body:

```tsx
{repositorySegments.map((item) => {
  const titleKey = item.titleKey.split('.')[1] as 'foundation' | 'workflows' | 'tools' | 'showcase';
  const descKey = item.descKey.split('.')[1] as 'foundationDesc' | 'workflowsDesc' | 'toolsDesc' | 'showcaseDesc';
  return (
    <Link
      href={item.href}
      key={item.titleKey}
      className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl hover:border-primary-600 dark:hover:border-primary-600 hover:shadow-lg transition-all cursor-pointer"
    >
      <div className="w-14 h-14 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mb-6 group-hover:bg-primary-600 transition-colors duration-300">
        <item.icon className="text-primary-600 dark:text-primary-400 group-hover:text-white w-7 h-7 transition-colors duration-300" />
      </div>
      <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-white uppercase tracking-wider font-display">
        {tCat(titleKey)}
      </h3>
      <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
        {tCat(descKey)}
      </p>
    </Link>
  );
})}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

**Step 3: Commit**

```bash
git add src/app/[locale]/page.tsx
git commit -m "fix: repository segment cards show real descriptions, replace Practice with Tools"
```

---

## Task 9: Build verification

**Step 1: Run production build**

```bash
npm run build
```

Expected: Exits 0, all pages generated, no TypeScript errors.

**Step 2: Start dev server and visually verify**

```bash
npm run dev
```

Open `http://localhost:3000/zh` and check:
- [ ] Hero has two CTA buttons
- [ ] Stats bar shows correct counts
- [ ] "热门话题" grid shows 4 tutorials
- [ ] "最近更新" grid shows 3 tutorials
- [ ] Category cards show different title vs description text
- [ ] No "实践练习" card — replaced by "工具目录"

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: homepage enhancement complete - stats bar, recently added, CTA buttons, fixed segments"
```
