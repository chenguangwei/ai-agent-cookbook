import { create, insert, search, type Orama } from '@orama/orama';

// Search document schema
export interface SearchDocument {
  id: string;
  title: string;
  description: string;
  content: string;
  url: string;
  type: 'tutorial' | 'doc' | 'news' | 'tool';
  category?: string;
  tags?: string[];
  locale: string;
}

// Search result type
export interface SearchResult {
  id: string;
  title: string;
  description: string;
  url: string;
  type: 'tutorial' | 'doc' | 'news' | 'tool';
  category?: string;
  score: number;
}

// Create search database schema
const schema = {
  id: 'string',
  title: 'string',
  description: 'string',
  content: 'string',
  url: 'string',
  type: 'string',
  category: 'string',
  tags: 'string[]',
  locale: 'string',
} as const;

let db: Orama<typeof schema> | null = null;

// Initialize the search database
export async function initSearchDB(): Promise<Orama<typeof schema>> {
  if (db) return db;

  db = await create({
    schema,
  });

  return db;
}

// Add documents to the search index
export async function indexDocuments(documents: SearchDocument[]): Promise<void> {
  const database = await initSearchDB();

  for (const doc of documents) {
    await insert(database, {
      id: doc.id,
      title: doc.title,
      description: doc.description,
      content: doc.content,
      url: doc.url,
      type: doc.type,
      category: doc.category || '',
      tags: doc.tags || [],
      locale: doc.locale,
    });
  }
}

// Search documents
export async function searchDocuments(
  query: string,
  options?: {
    locale?: string;
    type?: 'tutorial' | 'doc' | 'news' | 'tool';
    limit?: number;
  }
): Promise<SearchResult[]> {
  const database = await initSearchDB();

  const results = await search(database, {
    term: query,
    limit: options?.limit || 10,
    where: {
      ...(options?.locale && { locale: options.locale }),
      ...(options?.type && { type: options.type }),
    },
  });

  return results.hits.map((hit) => ({
    id: hit.document.id,
    title: hit.document.title,
    description: hit.document.description,
    url: hit.document.url,
    type: hit.document.type as 'tutorial' | 'doc' | 'news' | 'tool',
    category: hit.document.category,
    score: hit.score,
  }));
}

// Get the current database instance
export function getSearchDB(): Orama<typeof schema> | null {
  return db;
}
