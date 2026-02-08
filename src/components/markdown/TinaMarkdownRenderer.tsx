import { TinaMarkdown, type TinaMarkdownContent } from 'tinacms/dist/rich-text';
import { CodeBlock } from './components/CodeBlock';
import { createHeadingComponent } from './components/Heading';
import { InlineCode } from './components/InlineCode';
import { Paragraph } from './components/Paragraph';
import { MdLink } from './components/MdLink';
import { MdImage } from './components/MdImage';
import { Blockquote } from './components/Blockquote';
import { UnorderedList, OrderedList, ListItem } from './components/List';
import { Table } from './components/Table';

const components = {
  h1: createHeadingComponent('h1'),
  h2: createHeadingComponent('h2'),
  h3: createHeadingComponent('h3'),
  h4: createHeadingComponent('h4'),
  h5: createHeadingComponent('h5'),
  h6: createHeadingComponent('h6'),
  p: Paragraph,
  a: MdLink,
  code: InlineCode,
  code_block: CodeBlock,
  img: MdImage,
  blockquote: Blockquote,
  block_quote: Blockquote,
  ul: UnorderedList,
  ol: OrderedList,
  li: ListItem,
  table: Table,
};

interface TinaMarkdownRendererProps {
  content: TinaMarkdownContent | TinaMarkdownContent[];
}

export function TinaMarkdownRenderer({ content }: TinaMarkdownRendererProps) {
  return (
    <div className="markdown-body">
      {/* @ts-expect-error TinaMarkdown components typing is loosely typed */}
      <TinaMarkdown content={content} components={components} />
    </div>
  );
}
