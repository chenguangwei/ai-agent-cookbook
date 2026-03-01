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

export function MdImage({ url, caption, alt }: MdImageProps) {
  const isLocal = url.startsWith('/');
  const isOptimizable = isLocal || OPTIMIZABLE_HOSTS.some((h) => url.includes(h));

  // Use div instead of figure to avoid HTML nesting issues:
  // <figure> cannot be a descendant of <p>
  return (
    <div className="my-8">
      {isOptimizable ? (
        <NextImage
          src={url}
          alt={alt || caption || ''}
          width={800}
          height={450}
          className="rounded-xl border border-slate-200 dark:border-slate-700 w-full h-auto"
          sizes="(max-width: 768px) 100vw, 800px"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
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
