import { createHighlighter, type Highlighter } from 'shiki';

let highlighterPromise: Promise<Highlighter> | null = null;

export function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['github-dark', 'github-light'],
      langs: [
        'javascript', 'typescript', 'python', 'bash', 'json',
        'html', 'css', 'jsx', 'tsx', 'yaml', 'markdown',
        'go', 'rust', 'sql', 'diff', 'shell', 'text',
      ],
    });
  }
  return highlighterPromise;
}

export async function highlightCode(
  code: string,
  lang: string = 'text'
): Promise<string> {
  const highlighter = await getHighlighter();
  const loadedLangs = highlighter.getLoadedLanguages();
  const safeLang = loadedLangs.includes(lang) ? lang : 'text';

  return highlighter.codeToHtml(code, {
    lang: safeLang,
    themes: {
      light: 'github-light',
      dark: 'github-dark',
    },
  });
}
