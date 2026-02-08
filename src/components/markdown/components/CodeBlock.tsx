import { highlightCode } from '@/lib/shiki';
import { CodeBlockShell } from './CodeBlockShell';

interface CodeBlockProps {
  value: string;
  lang?: string;
}

export async function CodeBlock({ value, lang }: CodeBlockProps) {
  const html = await highlightCode(value, lang || 'text');
  return <CodeBlockShell html={html} code={value} lang={lang} />;
}
