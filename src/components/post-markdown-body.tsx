import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import type { Post } from '@/lib/posts';

type PostMarkdownBodyProps = {
  post: Post;
};

export function PostMarkdownBody({ post }: PostMarkdownBodyProps) {
  return (
    <article className="markdown-body">
      <h1 style={{ marginTop: 0 }}>{post.title}</h1>
      {post.date ? (
        <p style={{ color: '#64748b', marginTop: '-0.5rem' }}>{post.date}</p>
      ) : null}
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
    </article>
  );
}
