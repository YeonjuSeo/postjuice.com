type YtPlayer = {
  playVideo?: () => void;
  pauseVideo?: () => void;
  seekTo?: (s: number, allow: boolean) => void;
  getDuration?: () => number;
  getCurrentTime?: () => number;
  getPlayerState?: () => number;
  setVolume?: (v: number) => void;
  loadVideoById?: (id: string) => void;
  destroy?: () => void;
};

type YtWindow = Window & {
  YT?: {
    Player: new (elId: string, conf: Record<string, unknown>) => YtPlayer;
  };
  onYouTubeIframeAPIReady?: () => void;
};

const PLAYING = 1;
const BUFFERING = 3;

export function loadYoutubeIframeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const w = window as YtWindow;
  if (w.YT?.Player) return Promise.resolve();

  return new Promise((resolve, reject) => {
    let settled = false;
    let pollId = 0;

    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      if (pollId) window.clearInterval(pollId);
      if (ok && w.YT?.Player) resolve();
      else reject(new Error("YouTube IFrame API unavailable"));
    };

    const tryResolve = (): boolean => {
      if (w.YT?.Player) {
        finish(true);
        return true;
      }
      return false;
    };

    if (tryResolve()) return;

    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      try {
        prev?.();
      } finally {
        tryResolve();
      }
    };

    const scriptExists = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]',
    );

    if (!scriptExists) {
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      s.onerror = () => {
        if (settled) return;
        settled = true;
        if (pollId) window.clearInterval(pollId);
        reject(new Error("iframe_api load error"));
      };
      document.head.append(s);
    }

    /** 스크립트가 이미 있거나 ready 이벤트를 놓친 경우까지 대비 */
    const started = Date.now();
    pollId = window.setInterval(() => {
      if (tryResolve()) return;
      if (Date.now() - started > 15_000) {
        if (!settled) finish(false);
      }
    }, 100);
  });
}

export type YoutubeCtl = {
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (sec: number) => void;
  getDuration: () => number;
  getCurrentTime: () => number;
  isPlaying: () => boolean;
  setVolume: (v: number) => void;
  loadVideoById: (id: string) => void;
  destroy: () => void;
};

export async function createYoutubePlayer(
  elementId: string,
  videoId: string,
  initialVolume: number,
): Promise<{ raw: YtPlayer; ctl: YoutubeCtl }> {
  await loadYoutubeIframeApi();
  const YT = (window as YtWindow).YT;
  if (!YT?.Player) throw new Error("YT.Player missing");

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";

  const vol = () => Math.max(0, Math.min(100, Math.round(initialVolume)));

  return await new Promise((resolve, reject) => {
    let raw!: YtPlayer;

    const ctl: YoutubeCtl = {
      play: () => raw?.playVideo?.(),
      pause: () => raw?.pauseVideo?.(),
      toggle: () => {
        const st = raw?.getPlayerState?.();
        if (st === PLAYING || st === BUFFERING) ctl.pause();
        else ctl.play();
      },
      seek: (sec) => raw?.seekTo?.(sec, true),
      getDuration: () => {
        const d = raw?.getDuration?.();
        return typeof d === "number" && d > 0 ? d : 0;
      },
      getCurrentTime: () => {
        const t = raw?.getCurrentTime?.();
        return typeof t === "number" && t >= 0 ? t : 0;
      },
      isPlaying: () => {
        const st = raw?.getPlayerState?.();
        return st === PLAYING || st === BUFFERING;
      },
      setVolume: (v) => raw?.setVolume?.(Math.max(0, Math.min(100, v))),
      loadVideoById: (id) => {
        raw?.loadVideoById?.(id);
        /** load 직후 playVideo가 무시되는 경우가 있어 짧게 재시도 */
        const tryPlay = (n: number) => {
          if (n <= 0) return;
          window.requestAnimationFrame(() => {
            const st = raw?.getPlayerState?.();
            if (st === PLAYING || st === BUFFERING) return;
            raw?.playVideo?.();
            window.setTimeout(() => tryPlay(n - 1), 120);
          });
        };
        tryPlay(4);
      },
      destroy: () => raw?.destroy?.(),
    };

    raw = new YT.Player(elementId, {
      height: "200",
      width: "356",
      videoId,
      playerVars: {
        enablejsapi: 1,
        origin: origin || undefined,
        controls: 0,
        modestbranding: 1,
        rel: 0,
        playsinline: 1,
      },
      events: {
        onReady: () => {
          ctl.setVolume(vol());
          resolve({ raw, ctl });
        },
        onError: (ev: { data?: number }) => {
          reject(
            new Error(
              `YouTube embed error (code ${String(ev?.data ?? "?")})`,
            ),
          );
        },
      },
    });
  });
}
