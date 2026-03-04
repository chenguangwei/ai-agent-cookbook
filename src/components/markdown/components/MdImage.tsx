import NextImage from 'next/image';

interface MdImageProps {
  url: string;
  caption?: string;
  alt?: string;
}

const OPTIMIZABLE_HOSTS = [
  'images.unsplash.com',
  'picsum.photos',
  'i.pravatar.cc',
  'assets.tina.io',
];

// Normalize TinaCMS image URLs that contain nested URLs
// e.g., https://assets.tina.io/xxxhttps://pbs.twimg.com/xxx -> https://pbs.twimg.com/xxx
function normalizeImageUrl(url: string): string {
  if (!url) return url;
  // Match pattern: https://assets.tina.io/xxxhttps://...
  const match = url.match(/^https?:\/\/[^\/]+\/.*?(https?:\/\/.*)$/i);
  if (match && match[1]) {
    return decodeURIComponent(match[1]);
  }
  return url;
}

export function MdImage({ url, caption, alt }: MdImageProps) {
  const normalizedUrl = normalizeImageUrl(url);
  const isLocal = normalizedUrl.startsWith('/');
  const isOptimizable = isLocal || OPTIMIZABLE_HOSTS.some((h) => normalizedUrl.includes(h));

  // Use div instead of figure to avoid HTML nesting issues:
  // <figure> cannot be a descendant of <p>
  return (
    <div className="my-8">
      {isOptimizable ? (
        <NextImage
          src={normalizedUrl}
          alt={alt || caption || ''}
          width={800}
          height={450}
          className="rounded-xl border border-slate-200 dark:border-slate-700 w-full h-auto"
          sizes="(max-width: 768px) 100vw, 800px"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={normalizedUrl}
          alt={alt || caption || ''}
          className="rounded-xl border border-slate-200 dark:border-slate-700 max-w-full h-auto"
        />
      )}
      {caption && (
        <p className="mt-3 text-center text-sm text-slate-500 dark:text-slate-400">
          {caption}
        </p>
      )}
    </div>
  );
}
