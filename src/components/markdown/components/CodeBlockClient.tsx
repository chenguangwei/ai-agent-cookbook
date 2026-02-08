'use client';

import { useEffect, useState } from 'react';
import { CodeBlockShell } from './CodeBlockShell';

interface CodeBlockClientProps {
  value: string;
  lang?: string;
}

export function CodeBlockClient({ value, lang }: CodeBlockClientProps) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function highlight() {
      try {
        const { codeToHtml } = await import('shiki');
        const result = await codeToHtml(value, {
          lang: lang || 'text',
          themes: {
            light: 'github-light',
            dark: 'github-dark',
          },
        });
        if (!cancelled) setHtml(result);
      } catch {
        // Fallback to unhighlighted
      }
    }
    highlight();
    return () => { cancelled = true; };
  }, [value, lang]);

  if (html) {
    return <CodeBlockShell html={html} code={value} lang={lang} />;
  }

  // Fallback while Shiki loads
  return (
    <figure className="relative group my-6 not-prose">
      {lang && (
        <figcaption className="px-4 py-2 text-xs font-mono text-slate-400 bg-slate-800 border-b border-slate-700 rounded-t-xl">
          {lang}
        </figcaption>
      )}
      <pre className={`overflow-x-auto py-4 bg-[#0d1117] border border-slate-700 ${lang ? 'rounded-t-none rounded-b-xl' : 'rounded-xl'}`}>
        <code className="grid text-sm px-4 text-slate-300">{value}</code>
      </pre>
    </figure>
  );
}
