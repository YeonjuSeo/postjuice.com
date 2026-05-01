import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { buildDefaultMiniPlayerSeedTracks } from "@/lib/mini-player-default-playlist";
import { fetchYoutubeOembedFromWatchUrl } from "@/lib/youtube-oembed";
import { parseYoutubeInput } from "@/lib/youtube-url";

export type MiniPlayerTrack = {
  id: string;
  videoId: string;
  url: string;
  /** oEmbed 제목 또는 수동 라벨 */
  title: string | null;
  /** oEmbed 업로더(채널 이름) */
  channelTitle: string | null;
};

type MiniPlayerState = {
  tracks: MiniPlayerTrack[];
  currentIndex: number;
  position: { x: number; y: number };
  volume: number;
  hidden: boolean;
  playlistOpen: boolean;
  collapsed: boolean;
  /** 데스크톱 「강제 종료」 등에서 증가 → 플레이어 일시정지 + 피드백 */
  forceQuitPulse: number;
  bumpForceQuit: () => void;
  addTrackFromUrl: (input: string) => void;
  removeTrack: (trackId: string) => void;
  patchTrackMeta: (
    trackId: string,
    patch: Partial<Pick<MiniPlayerTrack, "title" | "channelTitle">>,
  ) => void;
  setCurrentIndex: (index: number) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  setPosition: (p: { x: number; y: number }) => void;
  setVolume: (v: number) => void;
  setHidden: (v: boolean) => void;
  setPlaylistOpen: (v: boolean) => void;
  setCollapsed: (v: boolean) => void;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

const DEFAULT_SEEDS = buildDefaultMiniPlayerSeedTracks();

function migrateTrackShape(t: Partial<MiniPlayerTrack> | undefined): MiniPlayerTrack | null {
  if (
    typeof t?.id !== "string" ||
    typeof t?.videoId !== "string" ||
    typeof t?.url !== "string"
  ) {
    return null;
  }

  const titleArg = t.title;
  const chanArg = t.channelTitle;

  return {
    id: t.id,
    videoId: t.videoId,
    url: t.url,
    title: typeof titleArg === "string" ? titleArg : null,
    channelTitle:
      typeof chanArg === "string"
        ? chanArg
        : chanArg === null
          ? null
          : null,
  };
}

/** 기본 플레이리스트 영상(videoId 기준)이 빠져 있으면 목록 선두에 다시 채움 */
export function prependMissingSeedTracks(tracks: MiniPlayerTrack[]): MiniPlayerTrack[] {
  const ids = new Set(tracks.map((t) => t.videoId));
  const missing = DEFAULT_SEEDS.filter((seed) => !ids.has(seed.videoId));
  if (missing.length === 0) return tracks;
  return [...missing, ...tracks];
}

export const useMiniPlayerStore = create<MiniPlayerState>()(
  persist(
    (set, get) => ({
      tracks: prependMissingSeedTracks([]),
      currentIndex: 0,
      position: {
        x: typeof window !== "undefined" ? window.innerWidth - 312 : 560,
        y: 100,
      },
      volume: 80,
      hidden: false,
      playlistOpen: false,
      collapsed: false,
      forceQuitPulse: 0,

      bumpForceQuit: () =>
        set((s) => ({
          forceQuitPulse: s.forceQuitPulse + 1,
        })),

      addTrackFromUrl: (input) => {
        const parsed = parseYoutubeInput(input);
        if (!parsed) return;
        if (get().tracks.some((t) => t.videoId === parsed.videoId)) return;

        const id =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `yt-${parsed.videoId}-${Date.now()}`;

        const nextTrack: MiniPlayerTrack = {
          id,
          videoId: parsed.videoId,
          url: parsed.canonicalUrl,
          title: null,
          channelTitle: null,
        };

        set((s) => {
          const tracks = [...s.tracks, nextTrack];
          const currentIndex =
            s.tracks.length === 0 ? 0 : s.currentIndex;
          return {
            tracks,
            currentIndex: clamp(
              currentIndex,
              0,
              Math.max(0, tracks.length - 1),
            ),
            hidden: false,
          };
        });

        void fetchYoutubeOembedFromWatchUrl(parsed.canonicalUrl).then(
          (meta) => {
            if (!meta) return;
            const patch: Partial<
              Pick<MiniPlayerTrack, "title" | "channelTitle">
            > = {};
            if (meta.title) patch.title = meta.title;
            if (meta.channelTitle) patch.channelTitle = meta.channelTitle;
            if (Object.keys(patch).length === 0) return;
            get().patchTrackMeta(id, patch);
          },
        );
      },

      removeTrack: (trackId) =>
        set((s) => {
          const ix = s.tracks.findIndex((t) => t.id === trackId);
          if (ix === -1) return {};
          const tracks = s.tracks.filter((t) => t.id !== trackId);
          let currentIndex = s.currentIndex;
          if (tracks.length === 0) currentIndex = 0;
          else if (ix < currentIndex) currentIndex -= 1;
          else if (ix === currentIndex)
            currentIndex = Math.min(ix, tracks.length - 1);

          currentIndex = clamp(
            currentIndex,
            0,
            Math.max(0, tracks.length - 1),
          );
          return { tracks, currentIndex };
        }),

      patchTrackMeta: (trackId, patch) =>
        set((s) => ({
          tracks: s.tracks.map((t) => {
            if (t.id !== trackId) return t;
            return {
              ...t,
              ...(patch.title !== undefined ? { title: patch.title } : {}),
              ...(patch.channelTitle !== undefined
                ? { channelTitle: patch.channelTitle }
                : {}),
            };
          }),
        })),

      setCurrentIndex: (index) =>
        set((s) => ({
          currentIndex:
            s.tracks.length === 0
              ? 0
              : clamp(index, 0, s.tracks.length - 1),
        })),

      nextTrack: () => {
        const { tracks, currentIndex } = get();
        if (tracks.length === 0) return;
        const next =
          currentIndex >= tracks.length - 1 ? 0 : currentIndex + 1;
        set({ currentIndex: next });
      },

      prevTrack: () => {
        const { tracks, currentIndex } = get();
        if (tracks.length === 0) return;
        const prev =
          currentIndex <= 0 ? tracks.length - 1 : currentIndex - 1;
        set({ currentIndex: prev });
      },

      setPosition: (p) => set({ position: { x: p.x, y: p.y } }),
      setVolume: (v) => set({ volume: clamp(Math.round(v), 0, 100) }),
      setHidden: (v) => set({ hidden: v }),
      setPlaylistOpen: (v) => set({ playlistOpen: v }),
      setCollapsed: (v) => set({ collapsed: v }),
    }),
    {
      name: "postjuice-mini-player",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        tracks: s.tracks,
        currentIndex: s.currentIndex,
        position: s.position,
        volume: s.volume,
        hidden: s.hidden,
        collapsed: s.collapsed,
      }),
      merge: (persisted, current): MiniPlayerState => {
        type PTracks = Partial<MiniPlayerTrack>[];

        const p = persisted as
          | (Partial<Omit<MiniPlayerState, "tracks">> & {
              tracks?: Partial<MiniPlayerTrack>[];
            })
          | undefined;

        let tracks: MiniPlayerTrack[] = Array.isArray(p?.tracks)
          ? prependMissingSeedTracks(
              (p!.tracks!.filter(Boolean) as PTracks & unknown[])
                .map((t) => migrateTrackShape(t))
                .filter(Boolean) as MiniPlayerTrack[],
            )
          : prependMissingSeedTracks([...current.tracks]);

        if (tracks.length === 0)
          tracks = prependMissingSeedTracks([]);

        const currentIndexRaw =
          typeof p?.currentIndex === "number"
            ? p!.currentIndex
            : current.currentIndex;

        return {
          ...current,
          tracks,
          currentIndex: clamp(
            currentIndexRaw,
            0,
            Math.max(0, tracks.length - 1),
          ),
          position: p?.position ?? current.position,
          volume:
            typeof p?.volume === "number" ? p.volume : current.volume,
          hidden:
            typeof p?.hidden === "boolean" ? p.hidden : current.hidden,
          collapsed:
            typeof p?.collapsed === "boolean"
              ? p.collapsed
              : current.collapsed,
        };
      },
    },
  ),
);
