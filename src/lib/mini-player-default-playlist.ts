import { parseYoutubeInput } from "@/lib/youtube-url";

/** 빌더 반환 타입은 스토어 `MiniPlayerTrack`와 동형입니다. */

/** 사이트 접속 시 목록 선두에 채워지는 기본 곡(URL). 편집 시 이 배열만 바꾸면 됩니다. */
export const MINI_PLAYER_DEFAULT_PLAYLIST_INPUTS = [
  "https://www.youtube.com/watch?v=hC3Sl6Un9L0",
  "https://www.youtube.com/watch?v=DyWgcE9EpKw",
  "https://www.youtube.com/watch?v=9XzrJPJLwn8",
] as const;

export function buildDefaultMiniPlayerSeedTracks() {
  return MINI_PLAYER_DEFAULT_PLAYLIST_INPUTS.map((input) => {
    const parsed = parseYoutubeInput(input.trim());
    if (!parsed)
      throw new Error(
        `[mini-player] 유효하지 않은 기본 플레이리스트 링크: ${input}`,
      );
    const track = {
      id: `mini-seed-${parsed.videoId}`,
      videoId: parsed.videoId,
      url: parsed.canonicalUrl,
      title: null,
      channelTitle: null,
    };
    return track;
  });
}
