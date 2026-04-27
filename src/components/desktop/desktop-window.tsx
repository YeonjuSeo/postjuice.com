import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { DesktopWindowBody } from "@/components/desktop/desktop-window-body";

import type { DesktopWindowRecord } from "@/stores/use-desktop-store";

import { useDinoRampageStore } from "@/stores/use-dino-rampage-store";
import { useDesktopStore } from "@/stores/use-desktop-store";

type ResizeEdge = "nw" | "ne" | "sw" | "se" | "e" | "w" | "s";

type DesktopWindowProps = {
  windowRecord: DesktopWindowRecord;
  stackIndex: number;
};

function defaultWindowSize() {
  if (typeof window === "undefined") {
    return { w: 520, h: 440 };
  }
  return {
    w: Math.min(520, Math.max(260, Math.round(window.innerWidth * 0.92))),
    h: Math.min(680, Math.max(200, Math.round(window.innerHeight * 0.74))),
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

const RESIZE_HANDLES: { edge: ResizeEdge; classSuffix: string }[] = [
  { edge: "nw", classSuffix: "nw" },
  { edge: "ne", classSuffix: "ne" },
  { edge: "sw", classSuffix: "sw" },
  { edge: "se", classSuffix: "se" },
  { edge: "s", classSuffix: "s" },
  { edge: "e", classSuffix: "e" },
  { edge: "w", classSuffix: "w" },
];

export function DesktopWindow({
  windowRecord,
  stackIndex,
}: DesktopWindowProps) {
  const closeWindow = useDesktopStore((s) => s.closeWindow);
  const focusWindow = useDesktopStore((s) => s.focusWindow);
  const rampageTiltDeg = useDinoRampageStore(
    (s) => s.windowTiltDeg[windowRecord.id] ?? 0,
  );

  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    ox: number;
    oy: number;
    captureEl: HTMLElement;
  } | null>(null);

  const resizeRef = useRef<{
    pointerId: number;
    edge: ResizeEdge;
    startX: number;
    startY: number;
    w0: number;
    h0: number;
    ox0: number;
    oy0: number;
    captureEl: HTMLElement;
  } | null>(null);

  const [offset, setOffset] = useState(() => ({
    x: stackIndex * 20,
    y: stackIndex * 24,
  }));

  const [size, setSize] = useState(() => ({ w: 520, h: 440 }));

  useLayoutEffect(() => {
    setSize(defaultWindowSize());
  }, []);

  const readResizeLimits = useCallback(() => {
    const minW = 260;
    const minH = 200;
    const maxW = Math.max(minW, window.innerWidth - 24);
    const maxH = Math.max(minH, window.innerHeight - 72 - 24);
    return { minW, minH, maxW, maxH };
  }, []);

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const r = resizeRef.current;
      if (r && r.pointerId === e.pointerId) {
        const dx = e.clientX - r.startX;
        const dy = e.clientY - r.startY;
        let w = r.w0;
        let h = r.h0;
        let ox = r.ox0;
        let oy = r.oy0;
        const edge = r.edge;

        if (edge.includes("e")) {
          w += dx;
          ox += dx / 2;
        }
        if (edge.includes("w")) {
          w -= dx;
          ox += dx / 2;
        }
        if (edge.includes("s")) {
          h += dy;
        }
        if (edge.includes("n")) {
          h -= dy;
          oy += dy;
        }

        const { minW, minH, maxW, maxH } = readResizeLimits();
        w = clamp(w, minW, maxW);
        h = clamp(h, minH, maxH);
        setSize({ w, h });
        setOffset({ x: ox, y: oy });
        return;
      }

      const d = dragRef.current;
      if (!d || d.pointerId !== e.pointerId) return;
      setOffset({
        x: d.ox + (e.clientX - d.startX),
        y: d.oy + (e.clientY - d.startY),
      });
    },
    [readResizeLimits],
  );

  const endPointer = useCallback((e: PointerEvent) => {
    const r = resizeRef.current;
    if (r && r.pointerId === e.pointerId) {
      resizeRef.current = null;
      try {
        r.captureEl.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      return;
    }

    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    dragRef.current = null;
    try {
      d.captureEl.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endPointer);
    window.addEventListener("pointercancel", endPointer);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endPointer);
      window.removeEventListener("pointercancel", endPointer);
    };
  }, [endPointer, onPointerMove]);

  function handleTitlePointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest?.(".desktop-window-close")) return;

    focusWindow(windowRecord.id);
    const el = e.currentTarget as HTMLElement;
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      ox: offset.x,
      oy: offset.y,
      captureEl: el,
    };
    el.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function handleResizePointerDown(edge: ResizeEdge) {
    return (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      focusWindow(windowRecord.id);
      const el = e.currentTarget as HTMLElement;
      resizeRef.current = {
        pointerId: e.pointerId,
        edge,
        startX: e.clientX,
        startY: e.clientY,
        w0: size.w,
        h0: size.h,
        ox0: offset.x,
        oy0: offset.y,
        captureEl: el,
      };
      el.setPointerCapture(e.pointerId);
      e.preventDefault();
    };
  }

  function handleShellPointerDown() {
    focusWindow(windowRecord.id);
  }

  return (
    <div
      className="desktop-window-frame"
      data-desktop-window-id={windowRecord.id}
      style={{
        left: `calc(50% + ${offset.x}px)`,
        top: `${72 + offset.y}px`,
        transform: `translateX(-50%) rotate(${rampageTiltDeg}deg)`,
        transition: "transform 0.28s ease",
        zIndex: windowRecord.zIndex,
        width: size.w,
        height: size.h,
      }}
      role="dialog"
      aria-labelledby={`desktop-win-title-${windowRecord.id}`}
      onPointerDown={handleShellPointerDown}
    >
      <div className="desktop-window">
        <div
          className="desktop-window-titlebar"
          id={`desktop-win-drag-${windowRecord.id}`}
          onPointerDown={handleTitlePointerDown}
        >
          <span
            className="desktop-window-title"
            id={`desktop-win-title-${windowRecord.id}`}
          >
            {windowRecord.title}
          </span>
          <button
            type="button"
            className="desktop-window-close"
            aria-label={"\uB2EB\uAE30"}
            onPointerDown={(ev) => {
              ev.stopPropagation();
            }}
            onClick={(ev) => {
              ev.stopPropagation();
              closeWindow(windowRecord.id);
            }}
          >
            {"\u00D7"}
          </button>
        </div>
        <div className="desktop-window-body">
          <DesktopWindowBody windowRecord={windowRecord} />
        </div>
      </div>
      <div className="desktop-window-resize-layer" aria-hidden>
        {RESIZE_HANDLES.map(({ edge, classSuffix }) => (
          <div
            key={edge}
            role="presentation"
            className={`desktop-window-resize-handle desktop-window-resize-handle--${classSuffix}`}
            onPointerDown={handleResizePointerDown(edge)}
          />
        ))}
      </div>
    </div>
  );
}
