import "./mini-player-widget.css";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { CSSProperties } from "react";

import { MiniPlayerMetaTitle } from "@/components/mini-player/mini-player-meta-title";
import type { YoutubeCtl } from "@/lib/youtube-iframe-player";
import { createYoutubePlayer } from "@/lib/youtube-iframe-player";
import { fetchYoutubeOembedFromWatchUrl } from "@/lib/youtube-oembed";
import { youtubeThumbnailUrl } from "@/lib/youtube-url";
import type { MiniPlayerTrack } from "@/stores/use-mini-player-store";
import { useMiniPlayerStore } from "@/stores/use-mini-player-store";

function clampNum(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function formatClock(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const s = Math.floor(sec % 60);
  const m = Math.floor(sec / 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

type DragCtx = {
  startX: number;
  startY: number;
  originX: number;
  originY: number;
};

/** 토글 직후 이 시간 동안 폴링이 재생 아이콘을 덮어쓰지 않음(YT 상태 지연으로 인한 깜빡임 완화) */
const PLAY_UI_HOLD_AFTER_TOGGLE_MS = 600;

export function MiniPlayerWidget() {
  const rawYtId = useId().replace(/:/g, "");
  const ytHostId = `yt-mini-${rawYtId}`;

  const shellRef = useRef<HTMLDivElement | null>(null);
  const fabRef = useRef<HTMLButtonElement | null>(null);
  const ctlRef = useRef<YoutubeCtl | null>(null);
  /** 강제 정지 직후 YT가 한 박자 느리면 재생 버튼이 재생 가능(▶) 상태로 안 바뀌는 것 방지용 */
  const playbackUiOverrideRef = useRef<"none" | "paused">("none");
  /** 사용자 토글 직후 YT 상태가 따라오기 전 재생 아이콘이 왔다갔다 하는 것 방지 — 이 시각까지는 폴링이 UI를 바꾸지 않음 */
  const playUiHoldPollUntilMsRef = useRef(0);
  const playUiReconcileTimerRef = useRef<ReturnType<typeof setTimeout>>(0);

  function clearPlayUiPollHold() {
    playUiHoldPollUntilMsRef.current = 0;
    if (playUiReconcileTimerRef.current) {
      window.clearTimeout(playUiReconcileTimerRef.current);
      playUiReconcileTimerRef.current = 0;
    }
  }

  const dragRef = useRef<DragCtx | null>(null);
  const rafClampRef = useRef<number>(0);

  const [mounted, setMounted] = useState(false);
  const [addInput, setAddInput] = useState("");
  const [playingUI, setPlayingUI] = useState(false);
  const [currentSec, setCurrentSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [scrubSec, setScrubSec] = useState<number | null>(null);
  const scrubRef = useRef(false);

  const tracks = useMiniPlayerStore((s) => s.tracks);
  const currentIndex = useMiniPlayerStore((s) => s.currentIndex);
  const position = useMiniPlayerStore((s) => s.position);
  const volume = useMiniPlayerStore((s) => s.volume);
  const hidden = useMiniPlayerStore((s) => s.hidden);
  const playlistOpen = useMiniPlayerStore((s) => s.playlistOpen);
  const collapsed = useMiniPlayerStore((s) => s.collapsed);

  const addTrackFromUrl = useMiniPlayerStore((s) => s.addTrackFromUrl);
  const removeTrack = useMiniPlayerStore((s) => s.removeTrack);
  const nextTrack = useMiniPlayerStore((s) => s.nextTrack);
  const prevTrack = useMiniPlayerStore((s) => s.prevTrack);
  const setCurrentIndex = useMiniPlayerStore((s) => s.setCurrentIndex);
  const setPosition = useMiniPlayerStore((s) => s.setPosition);
  const setVolume = useMiniPlayerStore((s) => s.setVolume);
  const setHidden = useMiniPlayerStore((s) => s.setHidden);
  const setPlaylistOpen = useMiniPlayerStore((s) => s.setPlaylistOpen);
  const setCollapsed = useMiniPlayerStore((s) => s.setCollapsed);
  const patchTrackMeta = useMiniPlayerStore((s) => s.patchTrackMeta);
  const forceQuitPulse = useMiniPlayerStore((s) => s.forceQuitPulse);

  const currentTrack: MiniPlayerTrack | undefined = tracks[currentIndex];

  const clampToViewport = useCallback(() => {
    const el = shellRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const margin = 8;
    const maxX = Math.max(margin, window.innerWidth - w - margin);
    const maxY = Math.max(margin, window.innerHeight - h - margin);
    const { position: pos, setPosition: persistPosition } =
      useMiniPlayerStore.getState();
    persistPosition({
      x: clampNum(pos.x, margin, maxX),
      y: clampNum(pos.y, margin, maxY),
    });
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || forceQuitPulse === 0) return;

    /** 흔들림 종료 후 재생 중지 및 재생(▶) UI 표시 유지 → 사용자가 다시 재생할 때까지 */
    function applyForcedStopAfterShake() {
      clearPlayUiPollHold();
      playbackUiOverrideRef.current = "paused";
      ctlRef.current?.pause();
      window.requestAnimationFrame(() => setPlayingUI(false));
    }

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      applyForcedStopAfterShake();
      return;
    }

    let cancelled = false;
    let fallbackTid = 0;

    const el = shellRef.current ?? fabRef.current;
    if (!el) {
      applyForcedStopAfterShake();
      return;
    }

    const finishShake = () => {
      el.classList.remove("mini-player--force-quit-shake");
      if (!cancelled) applyForcedStopAfterShake();
    };

    const onAnimationEnd = (ev: Event) => {
      if (cancelled) return;
      const names = String((ev as AnimationEvent).animationName);
      if (!names.includes("mini-player-force-quit-shake")) return;
      el.removeEventListener("animationend", onAnimationEnd);
      window.clearTimeout(fallbackTid);
      finishShake();
    };

    el.classList.add("mini-player--force-quit-shake");
    el.addEventListener("animationend", onAnimationEnd);
    fallbackTid = window.setTimeout(() => {
      el.removeEventListener("animationend", onAnimationEnd);
      finishShake();
    }, 800);

    return () => {
      cancelled = true;
      window.clearTimeout(fallbackTid);
      el.removeEventListener("animationend", onAnimationEnd);
      el.classList.remove("mini-player--force-quit-shake");
    };
  }, [mounted, forceQuitPulse]);

  useEffect(() => {
    if (!mounted) return;
    for (const t of tracks) {
      if (t.title && t.channelTitle) continue;
      void fetchYoutubeOembedFromWatchUrl(t.url).then((meta) => {
        if (!meta) return;
        const latest = useMiniPlayerStore
          .getState()
          .tracks.find((x) => x.id === t.id);
        if (!latest) return;
        const patch: Partial<Pick<MiniPlayerTrack, "title" | "channelTitle">> =
          {};
        if (!latest.title && meta.title) patch.title = meta.title;
        if (!latest.channelTitle && meta.channelTitle)
          patch.channelTitle = meta.channelTitle;
        if (Object.keys(patch).length === 0) return;
        patchTrackMeta(t.id, patch);
      });
    }
  }, [mounted, tracks, patchTrackMeta]);

  useEffect(() => {
    if (!mounted) return;
    const onResize = () => {
      if (rafClampRef.current) cancelAnimationFrame(rafClampRef.current);
      rafClampRef.current = requestAnimationFrame(() => {
        rafClampRef.current = 0;
        clampToViewport();
      });
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (rafClampRef.current) cancelAnimationFrame(rafClampRef.current);
    };
  }, [mounted, clampToViewport]);

  useEffect(() => {
    if (!mounted) return;
    const t = requestAnimationFrame(() => clampToViewport());
    return () => cancelAnimationFrame(t);
  }, [mounted, collapsed, playlistOpen, clampToViewport]);

  useEffect(() => {
    if (!mounted) return;
    const videoId = currentTrack?.videoId;
    if (!videoId) {
      clearPlayUiPollHold();
      playbackUiOverrideRef.current = "none";
      ctlRef.current?.destroy();
      ctlRef.current = null;
      setPlayingUI(false);
      setCurrentSec(0);
      setDurationSec(0);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        if (!ctlRef.current) {
          const { ctl } = await createYoutubePlayer(ytHostId, videoId, volume);
          if (cancelled) {
            ctl.destroy();
            return;
          }
          ctlRef.current = ctl;
          ctl.play();
          playbackUiOverrideRef.current = "none";
          clearPlayUiPollHold();
          setPlayingUI(true);
          return;
        }
        clearPlayUiPollHold();
        ctlRef.current.loadVideoById(videoId);
        ctlRef.current.play();
        playbackUiOverrideRef.current = "none";
        setPlayingUI(true);
      } catch (e) {
        console.error("[mini-player]", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted, currentTrack?.videoId, ytHostId]);

  useEffect(() => {
    ctlRef.current?.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    return () => {
      clearPlayUiPollHold();
      ctlRef.current?.destroy();
      ctlRef.current = null;
    };
  }, []);

  useEffect(() => {
    /** videoId는 즉시인데 플레이어는 비동기로 준비됨 — 최초 붙일 때 폴링 effect가 재실행되지 않던 문제 방지 */
    if (!mounted) return undefined;
    if (!currentTrack?.videoId) return undefined;

    const tick = window.setInterval(() => {
      const ctl = ctlRef.current;
      if (!ctl || scrubRef.current) return;
      const ct = ctl.getCurrentTime?.() ?? 0;
      const du = ctl.getDuration?.() ?? 0;
      setCurrentSec(ct);
      if (du > 0) setDurationSec(du);
      if (playbackUiOverrideRef.current === "paused") {
        setPlayingUI(false);
        return;
      }
      const nowMs =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      const holdUntil = playUiHoldPollUntilMsRef.current;
      if (holdUntil > 0 && nowMs < holdUntil) return;
      setPlayingUI(ctl.isPlaying?.() ?? false);
    }, 250);

    return () => window.clearInterval(tick);
  }, [mounted, currentTrack?.videoId]);

  const displaySec = scrubSec !== null ? scrubSec : currentSec || 0;

  const onSeekInput = useCallback((v: number) => {
    setScrubSec(v);
  }, []);

  const onSeekCommit = useCallback(() => {
    scrubRef.current = false;
    const t = scrubSec ?? currentSec;
    setScrubSec(null);
    ctlRef.current?.seek(t);
    setCurrentSec(t);
  }, [scrubSec, currentSec]);

  const thumbSrc = currentTrack
    ? youtubeThumbnailUrl(currentTrack.videoId)
    : undefined;

  const metaTitle = currentTrack
    ? (currentTrack.title ?? `YouTube · ${currentTrack.videoId}`)
    : "재생 목록 비어 있음";

  const metaSub = currentTrack
    ? (currentTrack.channelTitle ?? "…")
    : "아래에서 링크를 추가할 수 있습니다.";

  const onDragPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: position.x,
      originY: position.y,
    };
    const el = e.currentTarget as HTMLElement;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onDragPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || !shellRef.current) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const shell = shellRef.current.getBoundingClientRect();
    const w = shell.width;
    const h = shell.height;
    const margin = 8;
    const maxX = Math.max(margin, window.innerWidth - w - margin);
    const maxY = Math.max(margin, window.innerHeight - h - margin);
    setPosition({
      x: clampNum(drag.originX + dx, margin, maxX),
      y: clampNum(drag.originY + dy, margin, maxY),
    });
  };

  const onDragPointerUp = (e: React.PointerEvent) => {
    dragRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const togglePlayPause = () => {
    playbackUiOverrideRef.current = "none";
    const ctl = ctlRef.current;
    if (!ctl) return;
    window.clearTimeout(playUiReconcileTimerRef.current);

    const wasPlaying = ctl.isPlaying?.() ?? false;
    const intendPlaying = !wasPlaying;
    ctl.toggle();
    setPlayingUI(intendPlaying);

    const nowMs =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    playUiHoldPollUntilMsRef.current =
      nowMs + PLAY_UI_HOLD_AFTER_TOGGLE_MS;

    playUiReconcileTimerRef.current = window.setTimeout(() => {
      playUiReconcileTimerRef.current = 0;
      const cur = ctlRef.current;
      if (!cur) return;
      if (playbackUiOverrideRef.current === "paused") {
        setPlayingUI(false);
        return;
      }
      setPlayingUI(cur.isPlaying?.() ?? false);
    }, PLAY_UI_HOLD_AFTER_TOGGLE_MS);
  };

  if (!mounted) return null;

  if (hidden) {
    return (
      <button
        ref={fabRef}
        type="button"
        className="mini-player-fab"
        title="미니 플레이어 열기"
        aria-label="미니 플레이어 열기"
        onClick={() => setHidden(false)}
      >
        ♪
      </button>
    );
  }

  return (
    <div
      ref={shellRef}
      className={`mini-player-shell mini-player${collapsed ? " mini-player--collapsed" : ""}`}
      style={{ left: position.x, top: position.y }}
    >
      <div
        className="mini-player__drag"
        onPointerDown={onDragPointerDown}
        onPointerMove={onDragPointerMove}
        onPointerUp={onDragPointerUp}
        onPointerCancel={onDragPointerUp}
      >
        <div className="mini-player__traffic">
          <button
            type="button"
            data-dot="close"
            title="숨기기"
            aria-label="미니 플레이어 숨기기"
            onClick={() => setHidden(true)}
          />
          <button
            type="button"
            data-dot="minimize"
            title="접기"
            aria-label="위젯 접기"
            onClick={() => setCollapsed(!collapsed)}
          />
          <button
            type="button"
            data-dot="zoom"
            title="플레이리스트"
            aria-label="플레이리스트 패널"
            onClick={() => setPlaylistOpen(!playlistOpen)}
          />
        </div>
        <h2 className="mini-player__title">MINIPLAY</h2>
        <span style={{ width: 38, flexShrink: 0 }} aria-hidden />
      </div>

      <div className="mini-player__body">
        <div className="mini-player__yt-wrap" aria-hidden>
          <div id={ytHostId} />
        </div>

        <div className="mini-player__art">
          {thumbSrc ? (
            <img alt="" draggable={false} src={thumbSrc} />
          ) : (
            <div
              role="presentation"
              style={{
                height: "100%",
                background: "linear-gradient(145deg,#e8e8ec,#d4d4d8)",
              }}
            />
          )}
        </div>

        <div className="mini-player__time-row mini-player__time-row--bar">
          <span>{formatClock(displaySec)}</span>
          <input
            className="mini-player__progress mini-player__range"
            type="range"
            min={0}
            max={durationSec > 0 ? durationSec : 100}
            step={durationSec > 0 ? 0.1 : 1}
            value={durationSec > 0 ? clampNum(displaySec, 0, durationSec) : 0}
            style={
              durationSec > 0
                ? ({
                    "--range-pct": `${clampNum((displaySec / durationSec) * 100, 0, 100)}%`,
                  } as CSSProperties)
                : ({ "--range-pct": "0%" } as CSSProperties)
            }
            disabled={!durationSec || !currentTrack}
            onPointerDown={() => {
              scrubRef.current = true;
            }}
            onInput={(ev) => onSeekInput(Number(ev.currentTarget.value))}
            onChange={(ev) => onSeekInput(Number(ev.currentTarget.value))}
            onPointerUp={onSeekCommit}
            onPointerCancel={onSeekCommit}
          />
          <span>
            {durationSec > 0
              ? `-${formatClock(Math.max(0, durationSec - displaySec))}`
              : "\u00a0"}
          </span>
        </div>

        <div className="mini-player__meta">
          <MiniPlayerMetaTitle
            text={metaTitle}
            innerClassName="mini-player__meta-title"
          />
          <p className="mini-player__meta-sub">{metaSub}</p>
        </div>

        <div className="mini-player__transport">
          <button
            type="button"
            data-prev
            title="이전"
            aria-label="이전 곡"
            disabled={tracks.length === 0}
            onClick={() => prevTrack()}
          >
            ⏮
          </button>
          <button
            type="button"
            data-main
            title={playingUI ? "일시정지" : "재생"}
            aria-label={playingUI ? "일시정지" : "재생"}
            disabled={!currentTrack}
            onClick={togglePlayPause}
          >
            {playingUI ? "⏸" : "▶"}
          </button>
          <button
            type="button"
            data-next
            title="다음"
            aria-label="다음 곡"
            disabled={tracks.length === 0}
            onClick={() => nextTrack()}
          >
            ⏭
          </button>
        </div>

        <div className="mini-player__vol">
          <span aria-hidden>🔈</span>
          <input
            className="mini-player__vol-range mini-player__range"
            type="range"
            min={0}
            max={100}
            value={volume}
            style={{ "--range-pct": `${volume}%` } as CSSProperties}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label="볼륨"
          />
          <span aria-hidden>🔊</span>
        </div>

        {playlistOpen ? (
          <div className="mini-player__playlist-panel">
            <div className="mini-player__add-row">
              <input
                type="url"
                placeholder="YouTube URL 붙여넣기"
                value={addInput}
                onChange={(e) => setAddInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const v = addInput.trim();
                    if (v) {
                      addTrackFromUrl(v);
                      setAddInput("");
                    }
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const v = addInput.trim();
                  if (!v) return;
                  addTrackFromUrl(v);
                  setAddInput("");
                }}
              >
                추가
              </button>
            </div>
            {tracks.length === 0 ? (
              <p className="mini-player__empty">
                링크를 추가하면 썸네일과 재생이 가능합니다. watch, youtu.be,
                shorts, 11글자 영상 ID를 지원합니다.
              </p>
            ) : (
              <ul className="mini-player__track-list">
                {tracks.map((tr, idx) => (
                  <li
                    key={tr.id}
                    className={idx === currentIndex ? "is-active" : undefined}
                  >
                    <button
                      type="button"
                      title={tr.url}
                      style={{
                        textAlign: "left",
                        opacity: 1,
                        overflow: "hidden",
                        cursor: "pointer",
                      }}
                      onClick={() => setCurrentIndex(idx)}
                    >
                      <strong style={{ display: "block" }}>
                        {tr.title ?? `YouTube (${tr.videoId})`}
                      </strong>
                      <span
                        style={{
                          opacity: 0.7,
                          fontSize: "0.55rem",
                          wordBreak: "break-word",
                        }}
                      >
                        {tr.channelTitle ?? "…"}
                      </span>
                    </button>
                    <button
                      type="button"
                      title="삭제"
                      aria-label={`${tr.videoId} 삭제`}
                      onClick={() => removeTrack(tr.id)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
