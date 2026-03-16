import { supabase } from '@/lib/supabase';

// Types
export type RssSource = {
  id: string;
  name: string;
  url: string;
  category: 'Articles' | 'Podcasts' | 'Twitters' | 'Videos';
  language: 'en' | 'zh' | 'ja';
  enabled: boolean;
  created_at: string;
};

export type NewsItem = {
  id: string;
  source_id: string;
  source_name?: string;
  title: string;
  summary?: string;
  content?: string;
  url: string;
  image_url?: string;
  author?: string;
  published_at?: string;
  status: 'pending' | 'approved' | 'rejected';
  is_featured: boolean;
  language?: 'en' | 'zh' | 'ja';
  approved_at?: string;
  created_at: string;
};

// RSS Sources CRUD operations
export async function getAllRssSources(): Promise<RssSource[]> {
  const { data, error } = await supabase
    .from('rss_sources')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching RSS sources:', error);
    return [];
  }

  return (data || []).map(row => ({
    ...row,
    enabled: Boolean(row.enabled)
  }));
}

export async function getRssSourceById(id: string): Promise<RssSource | null> {
  const { data, error } = await supabase
    .from('rss_sources')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;

  return {
    ...data,
    enabled: Boolean(data.enabled)
  };
}

export async function addRssSource(source: Omit<RssSource, 'created_at'>): Promise<RssSource | null> {
  const { data, error } = await supabase
    .from('rss_sources')
    .insert({
      id: source.id,
      name: source.name,
      url: source.url,
      category: source.category,
      language: source.language || 'en',
      enabled: source.enabled ? 1 : 0
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding RSS source:', error);
    return null;
  }

  return data ? { ...data, enabled: Boolean(data.enabled) } : null;
}

export async function updateRssSource(id: string, updates: Partial<RssSource>): Promise<RssSource | null> {
  const updateData: Record<string, any> = {};

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.url !== undefined) updateData.url = updates.url;
  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.language !== undefined) updateData.language = updates.language;
  if (updates.enabled !== undefined) updateData.enabled = updates.enabled ? 1 : 0;

  const { data, error } = await supabase
    .from('rss_sources')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating RSS source:', error);
    return null;
  }

  return data ? { ...data, enabled: Boolean(data.enabled) } : null;
}

export async function deleteRssSource(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('rss_sources')
    .delete()
    .eq('id', id);

  return !error;
}

// News Items CRUD operations
export async function getAllNewsItems(status?: string): Promise<NewsItem[]> {
  let query = supabase
    .from('news_items')
    .select('*')
    .order('published_at', { ascending: false })
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching news items:', error);
    return [];
  }

  return (data || []).map(mapNewsItem);
}

export async function getApprovedNews(
  category?: string,
  limit: number = 50,
  offset: number = 0,
  language?: string
): Promise<NewsItem[]> {
  let query = supabase
    .from('news_items')
    .select('*')
    .eq('status', 'approved')
    .order('is_featured', { ascending: false })
    .order('published_at', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Filter by language if provided
  if (language) {
    query = query.eq('language', language);
  }

  // Filter by category if provided
  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching approved news:', error);
    return [];
  }

  return (data || []).map(mapNewsItem);
}

export async function getNewsItemById(id: string): Promise<NewsItem | null> {
  const { data, error } = await supabase
    .from('news_items')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;

  return mapNewsItem(data);
}

export async function addNewsItem(
  item: Omit<NewsItem, 'created_at' | 'status' | 'is_featured'>
): Promise<NewsItem | null> {
  // Check if URL already exists
  const { data: existing } = await supabase
    .from('news_items')
    .select('id')
    .eq('url', item.url)
    .single();

  if (existing) return null;

  const { data, error } = await supabase
    .from('news_items')
    .insert({
      id: item.id,
      source_id: item.source_id,
      source_name: item.source_name || null,
      title: item.title,
      summary: item.summary || null,
      content: item.content || null,
      url: item.url,
      image_url: item.image_url || null,
      author: item.author || null,
      published_at: item.published_at || null,
      language: item.language || 'en',
      status: 'pending',
      is_featured: 0
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding news item:', error);
    return null;
  }

  return data ? mapNewsItem(data) : null;
}

export async function updateNewsStatus(
  id: string,
  status: 'approved' | 'rejected',
  is_featured?: boolean
): Promise<NewsItem | null> {
  const updateData: Record<string, any> = {
    status,
    approved_at: status === 'approved' ? new Date().toISOString() : null
  };

  if (is_featured !== undefined) {
    updateData.is_featured = is_featured ? 1 : 0;
  }

  const { data, error } = await supabase
    .from('news_items')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating news status:', error);
    return null;
  }

  return data ? mapNewsItem(data) : null;
}

export async function toggleFeatured(id: string): Promise<NewsItem | null> {
  // Get current value
  const { data: current } = await supabase
    .from('news_items')
    .select('is_featured')
    .eq('id', id)
    .single();

  if (!current) return null;

  const newValue = current.is_featured === 1 ? 0 : 1;

  const { data, error } = await supabase
    .from('news_items')
    .update({ is_featured: newValue })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error toggling featured:', error);
    return null;
  }

  return data ? mapNewsItem(data) : null;
}

export async function deleteNewsItem(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('news_items')
    .delete()
    .eq('id', id);

  return !error;
}

export async function getNewsCounts(): Promise<{ pending: number; approved: number; rejected: number; total: number }> {
  const { data, error } = await supabase
    .from('news_items')
    .select('status');

  if (error) {
    console.error('Error getting news counts:', error);
    return { pending: 0, approved: 0, rejected: 0, total: 0 };
  }

  const counts = { pending: 0, approved: 0, rejected: 0, total: data?.length || 0 };

  data?.forEach(item => {
    if (item.status === 'pending') counts.pending++;
    else if (item.status === 'approved') counts.approved++;
    else if (item.status === 'rejected') counts.rejected++;
  });

  return counts;
}

export async function getFeaturedNewsByCategory(limit: number = 10): Promise<NewsItem[]> {
  const { data, error } = await supabase
    .from('news_items')
    .select('*')
    .eq('status', 'approved')
    .eq('is_featured', 1)
    .order('published_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching featured news:', error);
    return [];
  }

  return (data || []).map(mapNewsItem);
}

export async function getApprovedNewsCount(category?: string, language?: string): Promise<number> {
  let query = supabase
    .from('news_items')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved');

  // Filter by language if provided
  if (language) {
    query = query.eq('language', language);
  }

  // Filter by category if provided
  if (category) {
    query = query.eq('category', category);
  }

  const { count, error } = await query;

  if (error) {
    console.error('Error getting approved news count:', error);
    return 0;
  }

  return count || 0;
}

// Helper function to map database row to NewsItem type
function mapNewsItem(row: any): NewsItem {
  return {
    id: row.id,
    source_id: row.source_id,
    source_name: row.source_name || undefined,
    title: row.title,
    summary: row.summary || undefined,
    content: row.content || undefined,
    url: row.url,
    image_url: row.image_url || undefined,
    author: row.author || undefined,
    published_at: row.published_at || undefined,
    status: row.status,
    is_featured: row.is_featured === 1,
    approved_at: row.approved_at || undefined,
    created_at: row.created_at
  };
}
