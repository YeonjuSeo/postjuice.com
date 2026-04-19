import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

import { getAllPosts } from '@/lib/posts';
import { getSiteUrl } from '@/lib/site';

export function HomePage() {
  const siteUrl = getSiteUrl();
  const title = 'postjuice';
  const description = '개인 사이트 — 마크다운으로 올린 글 목록입니다.';
  const posts = getAllPosts();

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`${siteUrl}/`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={`${siteUrl}/`} />
        <meta name="twitter:card" content="summary" />
      </Helmet>

      <main style={{ padding: '2rem', maxWidth: '720px', margin: '0 auto' }}>
        <h1 style={{ marginTop: 0 }}>{title}</h1>
        <p style={{ color: '#64748b' }}>{description}</p>
        {posts.length === 0 ? (
          <p style={{ color: '#64748b' }}>아직 게시된 글이 없습니다.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
            {posts.map((post) => (
              <li key={post.slug} style={{ marginBottom: '0.45rem' }}>
                <Link to={`/post/${post.slug}`}>{post.title}</Link>
                {post.date ? (
                  <span style={{ color: '#94a3b8', marginLeft: '0.35rem' }}>
                    · {post.date}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
