import NextImage from 'next/image';

interface MdImageProps {
  src?: string;
  alt?: string;
}

const OPTIMIZABLE_HOSTS = [
  'images.unsplash.com',
  'picsum.photos',
  'i.pravatar.cc',
];

export function MdImage({ src, alt }: MdImageProps) {
  if (!src) return null;
  const isLocal = src.startsWith('/');
  const isOptimizable = isLocal || OPTIMIZABLE_HOSTS.some((h) => src.includes(h));

  // Use div instead of figure to avoid HTML nesting issues:
  // <figure> cannot be a descendant of <p>
  return (
    <div className="my-8">
      {isOptimizable ? (
        <NextImage
          src={src}
          alt={alt || ''}
          width={800}
          height={450}
          className="rounded-xl border border-slate-200 dark:border-slate-700 w-full h-auto"
          sizes="(max-width: 768px) 100vw, 800px"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt || ''}
          className="rounded-xl border border-slate-200 dark:border-slate-700 max-w-full h-auto"
        />
      )}
    </div>
  );
}
