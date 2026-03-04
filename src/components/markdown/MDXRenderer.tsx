import React from 'react'
import { MDXRemote } from 'next-mdx-remote/rsc'
import type { MDXComponents } from 'mdx/types'
import { CodeBlock } from './components/CodeBlock'
import { createHeadingComponent } from './components/Heading'
import { InlineCode } from './components/InlineCode'
import { Paragraph } from './components/Paragraph'
import { MdLink } from './components/MdLink'
import { MdImage } from './components/MdImage'
import { Blockquote } from './components/Blockquote'
import { UnorderedList, OrderedList, ListItem } from './components/List'
import { Table } from './components/Table'

// Adapter: MDX renders fenced code as <pre><code className="language-js">...</code></pre>
// CodeBlock expects { value: string, lang?: string } — extract from the child code element
function Pre(props: React.HTMLAttributes<HTMLPreElement>) {
  const child = React.Children.only(props.children) as React.ReactElement<{
    className?: string
    children?: React.ReactNode
  }>
  const className = child?.props?.className || ''
  const lang = className.replace('language-', '') || undefined
  const code = child?.props?.children
  const value = typeof code === 'string' ? code.trimEnd() : ''
  return <CodeBlock value={value} lang={lang} />
}

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
  pre: Pre,
  img: MdImage,
  blockquote: Blockquote,
  ul: UnorderedList,
  ol: OrderedList,
  li: ListItem,
  table: Table,
}

interface MDXRendererProps {
  content: string
}

export async function MDXRenderer({ content }: MDXRendererProps) {
  return (
    <div className="markdown-body">
      <MDXRemote
        source={content}
        components={components as MDXComponents}
      />
    </div>
  )
}
