import NextImage from 'next/image';
import Link from 'next/link';
import { Play } from 'lucide-react';

interface MdImageProps {
  src?: string;
  alt?: string;
}

const OPTIMIZABLE_HOSTS = [
  'images.unsplash.com',
  'picsum.photos',
  'i.pravatar.cc',
];

// Convert Twitter video thumbnail URL to actual video URL
function getVideoUrl(thumbnailUrl: string): string | null {
  if (thumbnailUrl.includes('tweet_video_thumb')) {
    return thumbnailUrl
      .replace('tweet_video_thumb', 'tweet_video')
      .replace('.jpg', '.mp4');
  }
  return null;
}

export function MdImage({ src, alt }: MdImageProps) {
  if (!src) return null;

  const isLocal = src.startsWith('/');
  const isOptimizable = isLocal || OPTIMIZABLE_HOSTS.some((h) => src.includes(h));

  // Check if this is a video thumbnail (alt starts with "video" or is exactly "video")
  const isVideo = alt?.toLowerCase().startsWith('video') || alt?.toLowerCase() === 'video';

  // Get video URL for Twitter video thumbnails
  const videoUrl = isVideo ? getVideoUrl(src) : null;

  // Use div instead of figure to avoid HTML nesting issues:
  // <figure> cannot be a descendant of <p>
  const imageContent = (
    <>
      {isOptimizable ? (
        <div className="relative">
          <NextImage
            src={src}
            alt={alt || ''}
            width={800}
            height={450}
            className="rounded-xl border border-slate-200 dark:border-slate-700 w-full h-auto"
            sizes="(max-width: 768px) 100vw, 800px"
          />
          {isVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors rounded-xl">
              <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                <Play className="w-8 h-8 text-slate-900 ml-1 fill-current" />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt || ''}
            className="rounded-xl border border-slate-200 dark:border-slate-700 max-w-full h-auto"
          />
          {isVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors rounded-xl">
              <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                <Play className="w-8 h-8 text-slate-900 ml-1 fill-current" />
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );

  // If it's a video with a valid video URL, make it clickable
  if (isVideo && videoUrl) {
    return (
      <div className="my-8">
        <Link
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block group cursor-pointer"
        >
          {imageContent}
        </Link>
      </div>
    );
  }

  return (
    <div className={`my-8 ${isVideo ? 'relative inline-block w-full' : ''}`}>
      {imageContent}
    </div>
  );
}
