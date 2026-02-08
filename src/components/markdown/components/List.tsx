import React from 'react';

export function UnorderedList({ children }: { children: React.ReactNode }) {
  return (
    <ul className="list-disc pl-6 mb-4 space-y-1.5 text-slate-700 dark:text-slate-300">
      {children}
    </ul>
  );
}

export function OrderedList({ children }: { children: React.ReactNode }) {
  return (
    <ol className="list-decimal pl-6 mb-4 space-y-1.5 text-slate-700 dark:text-slate-300">
      {children}
    </ol>
  );
}

export function ListItem({ children }: { children: React.ReactNode }) {
  return <li className="leading-relaxed">{children}</li>;
}
