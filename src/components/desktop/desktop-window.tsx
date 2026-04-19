import { useCallback, useEffect, useRef, useState } from 'react';

import { DesktopWindowBody } from '@/components/desktop/desktop-window-body';

import type { DesktopWindowRecord } from '@/stores/use-desktop-store';

import { useDesktopStore } from '@/stores/use-desktop-store';

type DesktopWindowProps = {
  windowRecord: DesktopWindowRecord;
  stackIndex: number;
};

export function DesktopWindow({
  windowRecord,
  stackIndex,
}: DesktopWindowProps) {
  const closeWindow = useDesktopStore((s) => s.closeWindow);
  const focusWindow = useDesktopStore((s) => s.focusWindow);

  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    ox: number;
    oy: number;
  } | null>(null);

  const [offset, setOffset] = useState(() => ({
    x: stackIndex * 20,
    y: stackIndex * 24,
  }));

  const onPointerMove = useCallback((e: PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    setOffset({
      x: d.ox + (e.clientX - d.startX),
      y: d.oy + (e.clientY - d.startY),
    });
  }, []);

  const endDrag = useCallback((e: PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    dragRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
    };
  }, [endDrag, onPointerMove]);

  function handleTitlePointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest?.('.desktop-window-close')) return;

    focusWindow(windowRecord.id);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      ox: offset.x,
      oy: offset.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function handleShellPointerDown() {
    focusWindow(windowRecord.id);
  }

  return (
    <div
      className="desktop-window"
      style={{
        left: `calc(50% + ${offset.x}px)`,
        top: `${72 + offset.y}px`,
        transform: 'translateX(-50%)',
        zIndex: windowRecord.zIndex,
      }}
      role="dialog"
      aria-labelledby={`desktop-win-title-${windowRecord.id}`}
      onPointerDown={handleShellPointerDown}
    >
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
          aria-label="닫기"
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            closeWindow(windowRecord.id);
          }}
        >
          ×
        </button>
      </div>
      <div className="desktop-window-body">
        <DesktopWindowBody windowRecord={windowRecord} />
      </div>
    </div>
  );
}
