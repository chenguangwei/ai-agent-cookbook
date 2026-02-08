export interface Category {
  id: string;
  name: string;
  icon: string;
  count: number;
  description?: string;
}

export const CATEGORIES: Category[] = [
  {
    id: 'frameworks',
    name: 'Frameworks',
    icon: 'grid',
    count: 42,
    description: 'Comprehensive guides on AI agent frameworks like LangChain, AutoGPT, and CrewAI.',
  },
  {
    id: 'llms',
    name: 'LLM Models',
    icon: 'cpu',
    count: 18,
    description: 'Deep dives into Large Language Models, fine-tuning, and optimization.',
  },
  {
    id: 'workflows',
    name: 'Agentic Workflows',
    icon: 'git-merge',
    count: 24,
    description: 'Architectural patterns for autonomous agents - ReAct, planning, reflection.',
  },
  {
    id: 'cases',
    name: 'Real-world Cases',
    icon: 'briefcase',
    count: 31,
    description: 'Case studies of AI agents in production environments.',
  },
];
