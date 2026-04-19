import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';

import { PostMarkdownBody } from '@/components/post-markdown-body';

import { getPostBySlug } from '@/lib/posts';
import { getSiteUrl } from '@/lib/site';

export function PostPage() {
  const { slug } = useParams();
  const post = slug ? getPostBySlug(slug) : undefined;
  const siteUrl = getSiteUrl();

  if (!post) {
    return (
      <>
        <Helmet>
          <title>글을 찾을 수 없음 · postjuice</title>
          <meta name="robots" content="noindex,nofollow" />
        </Helmet>
        <main style={{ padding: '2rem', maxWidth: '720px', margin: '0 auto' }}>
          <p>요청한 글이 없습니다.</p>
          <p>
            <Link to="/">홈으로</Link>
          </p>
        </main>
      </>
    );
  }

  const canonical = `${siteUrl}/post/${post.slug}`;
  const ogImageAbsolute =
    post.ogImage?.startsWith('http') === true
      ? post.ogImage
      : post.ogImage
        ? `${siteUrl}${post.ogImage.startsWith('/') ? '' : '/'}${post.ogImage}`
        : undefined;

  return (
    <>
      <Helmet>
        <title>{`${post.title} · postjuice`}</title>
        <meta name="description" content={post.description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.description} />
        <meta property="og:url" content={canonical} />
        {ogImageAbsolute ? (
          <meta property="og:image" content={ogImageAbsolute} />
        ) : null}
        <meta
          name="twitter:card"
          content={ogImageAbsolute ? 'summary_large_image' : 'summary'}
        />
      </Helmet>

      <main
        style={{
          padding: '2rem',
          maxWidth: '720px',
          margin: '0 auto',
        }}
      >
        <p style={{ marginTop: 0 }}>
          <Link to="/">← 홈</Link>
        </p>
        <PostMarkdownBody post={post} />
      </main>
    </>
  );
}
