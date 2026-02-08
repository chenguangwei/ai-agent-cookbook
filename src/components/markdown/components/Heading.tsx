import React from 'react';

function extractText(node: React.ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (React.isValidElement(node)) {
    const props = node.props as Record<string, unknown>;
    if (props.children) {
      return extractText(props.children as React.ReactNode);
    }
  }
  if (Array.isArray(node)) return node.map(extractText).join('');
  return '';
}

function generateId(children: React.ReactNode): string {
  const text = extractText(children);
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const headingStyles: Record<string, string> = {
  h1: 'text-4xl font-bold mt-12 mb-6 font-display text-slate-900 dark:text-white',
  h2: 'text-3xl font-bold mt-10 mb-4 font-display text-slate-900 dark:text-white scroll-mt-20 border-b border-slate-200 dark:border-slate-800 pb-2',
  h3: 'text-2xl font-semibold mt-8 mb-3 text-slate-900 dark:text-white scroll-mt-20',
  h4: 'text-xl font-semibold mt-6 mb-2 text-slate-900 dark:text-white',
  h5: 'text-lg font-medium mt-4 mb-2 text-slate-800 dark:text-slate-200',
  h6: 'text-base font-medium mt-4 mb-2 text-slate-700 dark:text-slate-300',
};

export function createHeadingComponent(level: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6') {
  const Tag = level;
  const styles = headingStyles[level];

  return function HeadingComponent({ children }: { children: React.ReactNode }) {
    const id = generateId(children);
    return (
      <Tag id={id} className={styles}>
        <a href={`#${id}`} className="no-underline hover:underline decoration-slate-300 dark:decoration-slate-600 underline-offset-4">
          {children}
        </a>
      </Tag>
    );
  };
}
