import { useEffect, useRef, useState } from 'react';

import type { DesktopIconConfig } from '@/config/desktop-icons';

import { useDesktopIconSurfaceRef } from '@/contexts/desktop-icon-surface-context';

import {
  ICON_HIT_BOX,
  type IconPixelPosition,
  useDesktopIconLayoutStore,
  useIconLayoutPosition,
} from '@/stores/use-desktop-icon-layout-store';

import { useDesktopStore } from '@/stores/use-desktop-store';

type DesktopIconProps = {
  config: DesktopIconConfig;
};

const DRAG_THRESHOLD_SQ = 49;

export function DesktopIcon({ config }: DesktopIconProps) {
  const openWindow = useDesktopStore((s) => s.openWindow);
  const setIconPosition = useDesktopIconLayoutStore((s) => s.setIconPosition);
  const position = useIconLayoutPosition(config.id);
  const surfaceRef = useDesktopIconSurfaceRef();

  const suppressClickRef = useRef(false);
  const coarsePointerRef = useRef(false);
  const positionRef = useRef(position);
  positionRef.current = position;

  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const apply = () => {
      coarsePointerRef.current = mq.matches;
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  function clampToSurface(pos: IconPixelPosition): IconPixelPosition {
    const surf = surfaceRef?.current;
    if (!surf) return pos;
    const maxX = Math.max(0, surf.clientWidth - ICON_HIT_BOX.w);
    const maxY = Math.max(0, surf.clientHeight - ICON_HIT_BOX.h);
    return {
      x: Math.min(Math.max(0, pos.x), maxX),
      y: Math.min(Math.max(0, pos.y), maxY),
    };
  }

  function handleOpen() {
    openWindow(config.open);
  }

  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (e.button !== 0) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const originX = positionRef.current.x;
    const originY = positionRef.current.y;
    let dragging = false;

    function move(ev: PointerEvent) {
      if (ev.pointerId !== e.pointerId) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!dragging && dx * dx + dy * dy > DRAG_THRESHOLD_SQ) {
        dragging = true;
        setIsDragging(true);
        suppressClickRef.current = true;
      }
      if (!dragging) return;
      const next = clampToSurface({
        x: originX + dx,
        y: originY + dy,
      });
      setIconPosition(config.id, next);
    }

    function up(ev: PointerEvent) {
      if (ev.pointerId !== e.pointerId) return;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (dragging) {
        setIsDragging(false);
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 320);
      } else {
        suppressClickRef.current = false;
      }
    }

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  return (
    <button
      type="button"
      className={`desktop-icon${isDragging ? ' desktop-icon--dragging' : ''}`}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: ICON_HIT_BOX.w,
        minHeight: ICON_HIT_BOX.h,
        zIndex: 2,
      }}
      aria-grabbed={isDragging}
      aria-label={`${config.label}, 드래그하여 옮기기. 더블클릭하면 열기`}
      onPointerDown={handlePointerDown}
      onClick={() => {
        if (suppressClickRef.current) return;
        if (coarsePointerRef.current) handleOpen();
      }}
      onDoubleClick={(ev) => {
        if (!coarsePointerRef.current && !suppressClickRef.current) {
          ev.preventDefault();
          handleOpen();
        }
      }}
    >
      <span className="desktop-icon-emoji" aria-hidden>
        {config.emoji}
      </span>
      <span className="desktop-icon-label">{config.label}</span>
    </button>
  );
}
