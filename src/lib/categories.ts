/**
 * Shared category configuration — single source of truth.
 *
 * To add a new category:
 *   1. Add an entry here
 *   2. Add the translation key to messages/{en,zh,ja}.json under "Categories"
 *   3. (Optional) Add to TinaCMS schema options in tina/config.ts
 */

export interface CategoryDef {
  /** Stable ID used in URLs and query params */
  id: string;
  /** Value stored in content frontmatter (must match TinaCMS schema options) */
  value: string;
  /** Key in messages/xx.json -> Categories.{key} */
  i18nKey: string;
  /** Lucide icon name */
  icon: string;
}

export const TUTORIAL_CATEGORIES: CategoryDef[] = [
  { id: 'frameworks',  value: 'Frameworks',        i18nKey: 'frameworks',  icon: 'grid' },
  { id: 'llms',        value: 'LLM Models',        i18nKey: 'llms',        icon: 'cpu' },
  { id: 'workflows',   value: 'Agentic Workflows',  i18nKey: 'workflows',   icon: 'git-merge' },
  { id: 'cases',       value: 'Real-world Cases',   i18nKey: 'cases',       icon: 'briefcase' },
  { id: 'rag',         value: 'RAG',                i18nKey: 'rag',         icon: 'database' },
  { id: 'prompting',   value: 'Prompting',          i18nKey: 'prompting',   icon: 'message-square' },
];

/** Map category value (stored in content) -> id (used in URL) */
export const categoryValueToId: Record<string, string> = Object.fromEntries(
  TUTORIAL_CATEGORIES.map((c) => [c.value, c.id])
);

/** Map category id (used in URL) -> value (stored in content) */
export const categoryIdToValue: Record<string, string> = Object.fromEntries(
  TUTORIAL_CATEGORIES.map((c) => [c.id, c.value])
);

/** All category values for TinaCMS schema */
export const CATEGORY_OPTIONS: string[] = TUTORIAL_CATEGORIES.map((c) => c.value);
