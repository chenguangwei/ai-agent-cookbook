import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getSiteUrl(): string {
  let url = process.env.NEXT_PUBLIC_SITE_URL || 'https://agent-cookbook.com';
  // Ensure URL has protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  try {
    const urlObj = new URL(url);
    // Clean up any duplicate domain in path (e.g., https://example.com/example.com)
    const cleanPath = urlObj.pathname.replace(new RegExp(urlObj.hostname, 'g'), '').replace(/\/+/g, '/');
    return `${urlObj.protocol}//${urlObj.host}${cleanPath || '/'}`;
  } catch {
    return 'https://agent-cookbook.com';
  }
}
