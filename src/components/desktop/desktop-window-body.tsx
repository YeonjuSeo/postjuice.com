import { Link } from 'react-router-dom';

import { useDesktopStore } from '@/stores/use-desktop-store';

import type { DesktopWindowRecord } from '@/stores/use-desktop-store';

import { getPostBySlug, getPostsByCategory } from '@/lib/posts';

import { PostMarkdownBody } from '@/components/post-markdown-body';
import { TrashBinPanel } from '@/components/desktop/trash-bin-panel';

type DesktopWindowBodyProps = {
  windowRecord: DesktopWindowRecord;
};

export function DesktopWindowBody({ windowRecord }: DesktopWindowBodyProps) {
  switch (windowRecord.kind) {
    case 'profile':
      return <ProfilePanel />;
    case 'post-list':
      return (
        <PostListPanel
          category={windowRecord.category}
          title={windowRecord.title}
        />
      );
    case 'post':
      return <PostDetailPanel slug={windowRecord.slug} />;
    case 'trash-bin':
      return <TrashBinPanel />;
  }
}

function ProfilePanel() {
  return (
    <div style={{ padding: '0.25rem 0' }}>
      <p style={{ marginTop: 0 }}>postjuice 데스크톱 · 개인 사이트</p>
      <p style={{ color: '#64748b', marginBottom: 0 }}>
        아이콘을 더블클릭하면 창이 열립니다. 모바일에서는 한 번 탭합니다.
      </p>
    </div>
  );
}

type PostListPanelProps = {
  category?: string;
  title: string;
};

function PostListPanel({ category, title }: PostListPanelProps) {
  const openWindow = useDesktopStore((s) => s.openWindow);
  const posts = getPostsByCategory(category);

  return (
    <div>
      <p style={{ marginTop: 0, color: '#64748b', fontSize: '0.875rem' }}>
        {category ? `category: ${category}` : '전체'} · {title}
      </p>
      {posts.length === 0 ? (
        <p style={{ color: '#64748b' }}>
          해당하는 글이 없습니다. 마크다운 frontmatter의{' '}
          <code>category</code>를 확인해 보세요.
        </p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
          {posts.map((post) => (
            <li key={post.slug} style={{ marginBottom: '0.45rem' }}>
              <button
                type="button"
                className="desktop-post-link"
                onClick={() =>
                  openWindow({
                    kind: 'post',
                    title: post.title,
                    slug: post.slug,
                  })
                }
              >
                {post.title}
              </button>
              {post.date ? (
                <span style={{ color: '#94a3b8', marginLeft: '0.35rem' }}>
                  · {post.date}
                </span>
              ) : null}
              <span style={{ marginLeft: '0.35rem' }}>
                <Link
                  to={`/post/${post.slug}`}
                  style={{ fontSize: '0.8rem', color: '#64748b' }}
                >
                  URL로 열기
                </Link>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type PostDetailPanelProps = {
  slug: string;
};

function PostDetailPanel({ slug }: PostDetailPanelProps) {
  const post = getPostBySlug(slug);

  if (!post) {
    return <p style={{ margin: 0 }}>글을 찾을 수 없습니다.</p>;
  }

  return <PostMarkdownBody post={post} />;
}
