// ============================================================
// Content types aligned with Agent Hub website schemas
// ============================================================

export type ContentType = 'tutorial' | 'news' | 'showcase' | 'lab';
export type Locale = 'en' | 'zh' | 'ja';
export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export type TutorialCategory =
  | 'Frameworks'
  | 'LLM Models'
  | 'Agentic Workflows'
  | 'Real-world Cases'
  | 'RAG'
  | 'Prompting';

export type NewsCategory = 'Tech' | 'Research' | 'Industry';
export type LabEnvironment = 'Python' | 'Node.js' | 'Go';
export type LaunchMode = 'external' | 'iframe';

// ============================================================
// Data models matching website content schemas
// ============================================================

export interface TutorialData {
  title: string;
  slug?: string;
  locale: Locale;
  description: string;
  category: TutorialCategory;
  tags: string[];
  techStack: string[];
  difficulty: Difficulty;
  duration: string;
  videoUrl?: string;
  thumbnail?: string;
  featured: boolean;
  date: string;
  content: string; // markdown body
}

export interface NewsData {
  title: string;
  slug?: string;
  locale: Locale;
  summary: string;
  source: string;
  sourceUrl: string;
  author: string;
  imageUrl?: string;
  publishedAt: string;
  category: NewsCategory;
  readTime: string;
  content: string; // markdown body
}

export interface ShowcaseData {
  title: string;
  locale: Locale;
  author: {
    name: string;
    avatar?: string;
  };
  description: string;
  tags: string[];
  stars: number;
  demoUrl?: string;
  repoUrl?: string;
  websiteUrl?: string;
  thumbnail?: string;
}

export interface LabData {
  title: string;
  locale: Locale;
  description: string;
  environment: LabEnvironment;
  difficulty: Difficulty;
  status: 'Online' | 'Maintenance';
  usersOnline: number;
  thumbnail?: string;
  launchUrl: string;
  launchMode: LaunchMode;
}

// ============================================================
// Extracted page data from content script
// ============================================================

export interface ExtractedPageData {
  url: string;
  title: string;
  description: string;
  content: string;       // Markdown-converted content
  rawHtml: string;       // Original HTML for LLM re-processing
  codeBlocks: string[];
  images: string[];
  author: string;
  publishedDate: string;
  language: string;
  siteName: string;
}

// ============================================================
// LLM configuration for AI-powered content cleaning
// ============================================================

export interface LLMSettings {
  enabled: boolean;
  apiKey: string;
  baseUrl: string;       // OpenAI-compatible endpoint
  model: string;
  autoClean: boolean;    // Auto-run AI clean after extraction
}

export type AIAction =
  | 'clean_content'      // Clean & format as MDX
  | 'extract_metadata'   // Auto-detect category, tags, techStack, difficulty
  | 'generate_summary'   // Generate description/summary
  | 'full_process';      // All of the above

// ============================================================
// Storage types
// ============================================================

export interface Draft {
  id: string;
  contentType: ContentType;
  data: TutorialData | NewsData | ShowcaseData | LabData;
  extractedFrom: string;
  createdAt: string;
  updatedAt: string;
}

export interface HistoryItem {
  id: string;
  contentType: ContentType;
  title: string;
  sourceUrl: string;
  submittedAt: string;
  status: 'submitted' | 'saved_local';
  slug?: string;
}

export interface Settings {
  apiUrl: string;
  defaultLocale: Locale;
  autoExtract: boolean;
  defaultContentType: ContentType;
  llm: LLMSettings;
}

export interface ExtractCacheEntry {
  data: ExtractedPageData;
  timestamp: number;
}

export interface StorageSchema {
  drafts: Draft[];
  history: HistoryItem[];
  settings: Settings;
  extractCache: Record<string, ExtractCacheEntry>;
}

// ============================================================
// Message types for chrome.runtime messaging
// ============================================================

export type MessageType =
  | 'EXTRACT_PAGE'
  | 'EXTRACT_RESULT'
  | 'COLLECT_AS'
  | 'GET_EXTRACTED_DATA'
  | 'START_PROCESS_MDX'
  | 'GET_PROCESS_STATUS';

export interface ExtensionMessage {
  type: MessageType;
  payload?: unknown;
}

// ============================================================
// Background Processing Task (for popup-close-safe processing)
// ============================================================

export interface ProcessingTask {
  id: string;
  url: string;
  title: string;
  contentType: ContentType;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: string;  // Final MDX content
  error?: string;
  timestamp: number;
}

export interface ProcessStatus {
  taskId: string;
  status: ProcessingTask['status'];
  progress?: string;  // Human-readable progress message
  result?: string;
  error?: string;
}
