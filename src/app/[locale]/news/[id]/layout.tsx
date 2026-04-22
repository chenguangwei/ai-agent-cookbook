import { Metadata } from 'next';
import { buildLocaleAlternates, getCanonicalUrl } from '@/lib/utils';
import { getNewsItemById } from '@/lib/db/news';

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }): Promise<Metadata> {
  const { locale, id } = await params;
  const canonicalUrl = getCanonicalUrl(locale, `news/${id}`);

  // Fetch article for rich metadata
  let article = null;
  try {
    article = await getNewsItemById(id);
  } catch {
    // Silently fall back to generic metadata
  }

  const title = article?.title ?? 'AI News & Updates';
  const description = article?.summary
    ? article.summary.replace(/<[^>]*>/g, '').slice(0, 160)
    : 'Stay up to date with the latest developments in AI agents, LLMs, and autonomous systems.';

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: buildLocaleAlternates(`news/${id}`),
    },
    openGraph: {
      title,
      description,
      type: 'article',
      url: canonicalUrl,
      ...(article?.published_at && { publishedTime: article.published_at }),
      ...(article?.image_url && { images: [{ url: article.image_url, alt: title }] }),
    },
    twitter: {
      card: article?.image_url ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(article?.image_url && { images: [article.image_url] }),
    },
  };
}

export default function NewsDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
