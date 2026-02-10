import type {
  ContentType,
  TutorialCategory,
  NewsCategory,
  Locale,
  Difficulty,
  LabEnvironment,
} from './types';

// ============================================================
// Content type definitions
// ============================================================

export interface ContentTypeDef {
  id: ContentType;
  label: string;
  icon: string; // emoji for simplicity in extension
  description: string;
}

export const CONTENT_TYPES: ContentTypeDef[] = [
  { id: 'tutorial', label: 'Tutorial', icon: '📚', description: 'Technical tutorial or guide' },
  { id: 'news', label: 'News', icon: '📰', description: 'AI news or announcement' },
  { id: 'showcase', label: 'Showcase', icon: '🚀', description: 'Community project showcase' },
  { id: 'lab', label: 'Lab', icon: '🧪', description: 'Interactive practice lab' },
];

// ============================================================
// Category constants
// ============================================================

export const TUTORIAL_CATEGORIES: { id: string; value: TutorialCategory; icon: string }[] = [
  { id: 'frameworks', value: 'Frameworks', icon: '⚡' },
  { id: 'llms', value: 'LLM Models', icon: '🧠' },
  { id: 'workflows', value: 'Agentic Workflows', icon: '🔀' },
  { id: 'cases', value: 'Real-world Cases', icon: '💼' },
  { id: 'rag', value: 'RAG', icon: '🗄️' },
  { id: 'prompting', value: 'Prompting', icon: '💬' },
];

export const NEWS_CATEGORIES: { value: NewsCategory; label: string }[] = [
  { value: 'Tech', label: 'Tech' },
  { value: 'Research', label: 'Research' },
  { value: 'Industry', label: 'Industry' },
];

export const DIFFICULTIES: Difficulty[] = ['Beginner', 'Intermediate', 'Advanced'];

export const LOCALES: { value: Locale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' },
  { value: 'ja', label: '日本語' },
];

export const LAB_ENVIRONMENTS: LabEnvironment[] = ['Python', 'Node.js', 'Go'];

// ============================================================
// Keyword → Category mapping for auto-detection
// ============================================================

export const TUTORIAL_CATEGORY_KEYWORDS: Record<TutorialCategory, string[]> = {
  'Frameworks': [
    'langchain', 'crewai', 'autogen', 'llamaindex', 'langgraph',
    'semantic kernel', 'dspy', 'haystack', 'flowise', 'langflow',
    'openai sdk', 'vercel ai', 'mastra', 'phidata',
  ],
  'LLM Models': [
    'gpt-4', 'gpt-5', 'claude', 'llama', 'gemini', 'mistral',
    'qwen', 'deepseek', 'phi-', 'command r', 'o1', 'o3',
    'fine-tuning', 'finetuning', 'model training', 'gguf', 'quantization',
  ],
  'Agentic Workflows': [
    'react pattern', 'reflection', 'planning agent', 'tool use',
    'multi-agent', 'orchestration', 'agent loop', 'chain of agents',
    'self-reflecting', 'autonomous', 'agentic', 'swarm',
  ],
  'Real-world Cases': [
    'production', 'case study', 'deployment', 'enterprise',
    'real-world', 'use case', 'implementation', 'industry',
  ],
  'RAG': [
    'rag', 'retrieval', 'vector database', 'embedding', 'pinecone',
    'chroma', 'weaviate', 'knowledge base', 'semantic search',
    'document qa', 'chunking', 'indexing', 'milvus', 'qdrant',
  ],
  'Prompting': [
    'prompt engineering', 'chain of thought', 'few-shot', 'system prompt',
    'zero-shot', 'prompt template', 'instruction tuning', 'prompting',
    'structured output', 'json mode',
  ],
};

export const NEWS_CATEGORY_KEYWORDS: Record<NewsCategory, string[]> = {
  'Tech': [
    'release', 'launch', 'update', 'api', 'sdk', 'open source',
    'new feature', 'version', 'announced', 'introducing',
  ],
  'Research': [
    'paper', 'arxiv', 'benchmark', 'study', 'findings', 'research',
    'evaluation', 'dataset', 'experiment', 'methodology',
  ],
  'Industry': [
    'funding', 'acquisition', 'partnership', 'market', 'startup',
    'valuation', 'investment', 'revenue', 'regulation', 'policy',
  ],
};

// ============================================================
// Common AI/Agent tags for suggestion
// ============================================================

export const COMMON_TAGS: string[] = [
  'LangChain', 'OpenAI', 'Claude', 'GPT-4', 'Llama',
  'RAG', 'Vector DB', 'Embeddings', 'Multi-Agent',
  'Tool Use', 'ReAct', 'Reflection', 'Planning',
  'Python', 'TypeScript', 'Node.js',
  'AutoGPT', 'CrewAI', 'LlamaIndex', 'LangGraph',
  'Prompt Engineering', 'Fine-tuning', 'Evaluation',
  'Pinecone', 'ChromaDB', 'Weaviate',
  'Hugging Face', 'Ollama', 'vLLM',
];

// ============================================================
// Default settings
// ============================================================

export const DEFAULT_LLM_SETTINGS = {
  enabled: false,
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o',
  autoClean: false,
};

export const DEFAULT_SETTINGS = {
  apiUrl: 'http://localhost:3000',
  defaultLocale: 'en' as Locale,
  autoExtract: true,
  defaultContentType: 'tutorial' as ContentType,
  llm: DEFAULT_LLM_SETTINGS,
};
