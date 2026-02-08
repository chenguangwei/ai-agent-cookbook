import React from 'react';

export function Blockquote({ children }: { children: React.ReactNode }) {
  return (
    <blockquote className="my-6 border-l-4 border-primary-500 pl-4 py-2 text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-900/50 rounded-r-lg">
      {children}
    </blockquote>
  );
}
