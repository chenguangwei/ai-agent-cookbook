'use client';

import { CopyButton } from './CopyButton';

interface CodeBlockShellProps {
  html: string;
  code: string;
  lang?: string;
}

export function CodeBlockShell({ html, code, lang }: CodeBlockShellProps) {
  return (
    <figure data-rehype-pretty-code-figure="" className="relative group my-6 not-prose">
      {lang && (
        <figcaption
          data-rehype-pretty-code-title=""
          className="px-4 py-2 text-xs font-mono text-slate-400 bg-slate-800 border-b border-slate-700 rounded-t-xl"
        >
          {lang}
        </figcaption>
      )}
      <CopyButton code={code} />
      <div
        dangerouslySetInnerHTML={{ __html: html }}
        className={`[&_pre]:overflow-x-auto [&_pre]:py-4 [&_pre]:border [&_pre]:border-slate-200 [&_pre]:dark:border-slate-700 [&_code]:grid [&_code]:text-sm [&_.line]:px-4 ${
          lang ? '[&_pre]:rounded-t-none [&_pre]:rounded-b-xl' : '[&_pre]:rounded-xl'
        }`}
      />
    </figure>
  );
}
