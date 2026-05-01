export type YoutubeOembedMeta = {
  title: string | null;
  channelTitle: string | null;
};

/** oEmbed(JSON). 크로스 오리진·차단 등으로 실패 시 null */
export async function fetchYoutubeOembedFromWatchUrl(
  watchUrl: string,
): Promise<YoutubeOembedMeta | null> {
  try {
    const u = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;
    const res = await fetch(u);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      title?: string;
      author_name?: string;
    };
    const title = data.title?.trim();
    const author = data.author_name?.trim();
    return {
      title: title && title.length > 0 ? title : null,
      channelTitle:
        author && author.length > 0 ? author : null,
    };
  } catch {
    return null;
  }
}

/** 브라우저에서 가능할 때만 제목 로드(oEmbed CORS는 환경에 따라 실패 가능) */
export async function fetchYoutubeTitleFromWatchUrl(
  watchUrl: string,
): Promise<string | null> {
  const m = await fetchYoutubeOembedFromWatchUrl(watchUrl);
  return m?.title ?? null;
}
