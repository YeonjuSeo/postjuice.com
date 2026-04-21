import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { MarkdownResizableTable } from '@/components/markdown-resizable-table';
import type { Post } from '@/lib/posts';

import '@/components/post-markdown-body.css';

type PostMarkdownBodyProps = {
  post: Post;
};

/** 백틱 인라인 코드 중 `…/deps/파일.js?v=해시` 형태 (Vite 의존성 프리번들 URL) */
function isViteDepsQuerySnippet(text: string): boolean {
  const t = text.trim();
  return /\/deps\/[^?\s`]+\?v=[^\s`]+/.test(t);
}

type MarkdownCodeProps = React.ComponentPropsWithoutRef<'code'> & {
  node?: unknown;
};

function MarkdownCode({ className, children, node: _n, ...props }: MarkdownCodeProps) {
  void _n;
  const raw = String(children).replace(/\n$/, '');
  const isFenceBlock =
    (typeof className === 'string' && /\blanguage-[\w-]+\b/.test(className)) ||
    raw.includes('\n');
  const highlight = !isFenceBlock && isViteDepsQuerySnippet(raw);
  const merged = [className, highlight ? 'markdown-code-vite-dep' : null]
    .filter(Boolean)
    .join(' ');
  return (
    <code className={merged || undefined} {...props}>
      {children}
    </code>
  );
}

export function PostMarkdownBody({ post }: PostMarkdownBodyProps) {
  return (
    <article className="markdown-body">
      <h1 style={{ marginTop: 0 }}>{post.title}</h1>
      {post.date ? (
        <p style={{ color: '#64748b', marginTop: '-0.5rem' }}>{post.date}</p>
      ) : null}
      <ReactMarkdown
        key={post.slug}
        remarkPlugins={[remarkGfm]}
        components={{
          table: MarkdownResizableTable,
          code: MarkdownCode,
        }}
      >
        {post.body}
      </ReactMarkdown>
    </article>
  );
}
