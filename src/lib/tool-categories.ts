/**
 * Tool category configuration — single source of truth.
 *
 * To add a new tool category:
 *   1. Add an entry here
 *   2. Add the translation key to messages/{en,zh,ja}.json under "ToolCategories"
 *   3. The TinaCMS schema in tina/config.ts imports TOOL_CATEGORY_OPTIONS
 */

export interface ToolCategoryDef {
  /** Stable ID used in URLs and query params */
  id: string;
  /** Value stored in content frontmatter (must match TinaCMS schema options) */
  value: string;
  /** Key in messages/xx.json -> ToolCategories.{key} */
  i18nKey: string;
  /** Lucide icon name */
  icon: string;
}

export const TOOL_CATEGORIES: ToolCategoryDef[] = [
  { id: 'llm-framework',      value: 'LLM Framework',       i18nKey: 'llmFramework',      icon: 'bot' },
  { id: 'vector-db',          value: 'Vector Database',      i18nKey: 'vectorDb',          icon: 'database' },
  { id: 'agent-framework',    value: 'Agent Framework',      i18nKey: 'agentFramework',    icon: 'workflow' },
  { id: 'embedding',          value: 'Embedding',            i18nKey: 'embedding',         icon: 'layers' },
  { id: 'monitoring',         value: 'Monitoring',           i18nKey: 'monitoring',        icon: 'activity' },
  { id: 'ide-editor',         value: 'IDE/Editor',           i18nKey: 'ideEditor',         icon: 'code' },
  { id: 'deployment',         value: 'Deployment',           i18nKey: 'deployment',        icon: 'rocket' },
  { id: 'prompt-engineering',  value: 'Prompt Engineering',   i18nKey: 'promptEngineering', icon: 'pen-tool' },
  { id: 'data-processing',    value: 'Data Processing',      i18nKey: 'dataProcessing',    icon: 'filter' },
  { id: 'testing',            value: 'Testing',              i18nKey: 'testing',           icon: 'check-circle' },
  { id: 'other',              value: 'Other',                i18nKey: 'other',             icon: 'package' },
];

/** Map category value (stored in content) -> id (used in URL) */
export const toolCategoryValueToId: Record<string, string> = Object.fromEntries(
  TOOL_CATEGORIES.map((c) => [c.value, c.id])
);

/** Map category id (used in URL) -> value (stored in content) */
export const toolCategoryIdToValue: Record<string, string> = Object.fromEntries(
  TOOL_CATEGORIES.map((c) => [c.id, c.value])
);

/** All category values for TinaCMS schema */
export const TOOL_CATEGORY_OPTIONS: string[] = TOOL_CATEGORIES.map((c) => c.value);
