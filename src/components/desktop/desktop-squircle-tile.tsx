import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

import "@/components/desktop/desktop-squircle-tile.css";

import { useDesktopIconSurfaceRef } from "@/contexts/desktop-icon-surface-context";

import {
  clampTilePixelPositionToSurface,
  SQUIRCLE_TILE_PX,
  useDesktopSquircleTileStore,
} from "@/stores/use-desktop-squircle-tile-store";

const DRAG_THRESHOLD_SQ = 49;

/** 무한 반복 시 느린 재생(1 = 원본 속도). 브라우저/OS에 따라 허용 범위만 적용된다. */
const TILE_VIDEO_SLOW_RATE = 0.26;

const TILE_VIDEO_SRC = "/videos/desktop-tile-loop.mov";

export function DesktopSquircleTile() {
  const surfaceRef = useDesktopIconSurfaceRef();
  const position = useDesktopSquircleTileStore((s) => s.position);
  const setPosition = useDesktopSquircleTileStore((s) => s.setPosition);
  const positionRef = useRef(position);
  positionRef.current = position;

  const videoRef = useRef<HTMLVideoElement>(null);

  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const syncRate = () => {
      const node = videoRef.current;
      if (!node) return;
      try {
        node.playbackRate = TILE_VIDEO_SLOW_RATE;
      } catch {
        /* noop */
      }
    };

    syncRate();
    el.addEventListener("loadedmetadata", syncRate);
    el.addEventListener("playing", syncRate);
    el.addEventListener("seeked", syncRate);

    void el.play().catch(() => {
      /* 자동 재생 차단 등 */
    });

    return () => {
      el.removeEventListener("loadedmetadata", syncRate);
      el.removeEventListener("playing", syncRate);
      el.removeEventListener("seeked", syncRate);
    };
  }, []);

  function clamp(pos: { x: number; y: number }) {
    const surf = surfaceRef?.current;
    if (!surf) return pos;
    return clampTilePixelPositionToSurface(
      pos,
      surf.clientWidth,
      surf.clientHeight,
    );
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const ox = positionRef.current.x;
    const oy = positionRef.current.y;
    let draggingOn = false;
    const target = e.currentTarget;

    try {
      target.setPointerCapture(e.pointerId);
    } catch {
      /* noop */
    }

    const v = videoRef.current;
    if (v?.paused)
      void v.play().catch(() => {
        /* noop */
      });

    function move(ev: PointerEvent) {
      if (ev.pointerId !== e.pointerId) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!draggingOn && dx * dx + dy * dy > DRAG_THRESHOLD_SQ) {
        draggingOn = true;
        setDragging(true);
      }
      if (!draggingOn) return;
      const next = clamp({ x: ox + dx, y: oy + dy });
      setPosition(next);
    }

    function up(ev: PointerEvent) {
      if (ev.pointerId !== e.pointerId) return;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      try {
        target.releasePointerCapture(ev.pointerId);
      } catch {
        /* noop */
      }
      if (draggingOn) setDragging(false);
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  const tileStyle: CSSProperties & { "--squircle-size"?: string } = {
    left: position.x,
    top: position.y,
    "--squircle-size": `${SQUIRCLE_TILE_PX}px`,
  };

  return (
    <div
      role="group"
      className={`desktop-squircle-tile${dragging ? " desktop-squircle-tile--dragging" : ""}`}
      aria-label="영상 타일 위젯, 드래그해서 옮길 수 있습니다"
      aria-grabbed={dragging}
      style={tileStyle}
      tabIndex={0}
      onPointerDown={onPointerDown}
    >
      <video
        ref={videoRef}
        className="desktop-squircle-tile__video"
        src={TILE_VIDEO_SRC}
        muted
        playsInline
        loop
        autoPlay
        preload="metadata"
        aria-hidden
      />
    </div>
  );
}
