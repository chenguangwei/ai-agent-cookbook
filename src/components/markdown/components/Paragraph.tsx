import React from 'react';

export function Paragraph({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
      {children}
    </p>
  );
}
