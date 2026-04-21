import { splitFrontmatter } from '@/lib/split-frontmatter';

export type PostMeta = {
  slug: string;
  title: string;
  description: string;
  date: string;
  /** 데스크톱 아이콘, 창 필터용 (예: notes, dev) */
  category?: string;
  ogImage?: string;
};

export type Post = PostMeta & {
  body: string;
};

const rawModules = import.meta.glob('../../content/posts/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function parsePosts(): Post[] {
  const posts: Post[] = [];

  for (const filePath of Object.keys(rawModules)) {
    const raw = rawModules[filePath];
    const { data, content } = splitFrontmatter(raw);
    const fallbackSlug = filePath.split('/').pop()?.replace(/\.md$/, '') ?? 'post';
    const slug = typeof data.slug === 'string' ? data.slug : fallbackSlug;

    posts.push({
      slug,
      title: typeof data.title === 'string' ? data.title : slug,
      description: typeof data.description === 'string' ? data.description : '',
      date: typeof data.date === 'string' ? data.date : '',
      category:
        typeof data.category === 'string' ? data.category : undefined,
      ogImage: typeof data.ogImage === 'string' ? data.ogImage : undefined,
      body: content,
    });
  }

  return posts.sort((a, b) => {
    if (a.date && b.date) return a.date < b.date ? 1 : -1;
    return 0;
  });
}

let cache: Post[] | null = null;

export function getAllPosts(): Post[] {
  if (!cache) cache = parsePosts();
  return cache;
}

export function getPostBySlug(slug: string): Post | undefined {
  return getAllPosts().find((post) => post.slug === slug);
}

/** `category`가 없으면 전체 글 */
export function getPostsByCategory(category?: string): Post[] {
  const all = getAllPosts();
  if (!category) return all;
  return all.filter((post) => post.category === category);
}
