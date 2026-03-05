import React from 'react';
import NextLink from 'next/link';
import { ExternalLink } from 'lucide-react';

export function MdLink({ href, children }: { href?: string; children: React.ReactNode }) {
  if (!href) return <>{children}</>;
  const isExternal = href.startsWith('http');

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1"
      >
        {children}
        <ExternalLink className="w-3.5 h-3.5 inline flex-shrink-0" />
      </a>
    );
  }

  return (
    <NextLink href={href} className="text-primary-600 dark:text-primary-400 hover:underline">
      {children}
    </NextLink>
  );
}
