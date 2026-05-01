const YT_REGEXES: RegExp[] = [
  /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  /youtu\.be\/([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
];

export type YoutubeParsed = {
  videoId: string;
  canonicalUrl: string;
};

/** 유튜브 URL에서 동영상 id 추출 → 실패 시 null */
export function parseYoutubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  for (const re of YT_REGEXES) {
    const m = trimmed.match(re);
    if (m?.[1]) return m[1];
  }
  /** id만 입력한 경우(11글자 근사) */
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

export function parseYoutubeInput(input: string): YoutubeParsed | null {
  const videoId = parseYoutubeVideoId(input);
  if (!videoId) return null;
  return {
    videoId,
    canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

export function youtubeThumbnailUrl(
  videoId: string,
  quality: "maxresdefault" | "hqdefault" | "mqdefault" = "hqdefault",
): string {
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}
