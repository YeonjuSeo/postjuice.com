import { useLayoutEffect, useRef, useState } from 'react';

import { getDesktopIconById } from '@/config/desktop-icons';

import { useTrashBinIconSurfaceRef } from '@/contexts/trash-bin-icon-surface-context';

import type { DesktopContextMenuItem } from '@/components/desktop/desktop-context-menu';

import { ICON_HIT_BOX, type IconPixelPosition } from '@/stores/use-desktop-icon-layout-store';
import { useDesktopContextMenuStore } from '@/stores/use-desktop-context-menu-store';
import { useDesktopIconSessionStore } from '@/stores/use-desktop-icon-session-store';

function defaultTrashLayout(index: number): IconPixelPosition {
  return {
    x: 16 + (index % 4) * 104,
    y: 16 + Math.floor(index / 4) * 112,
  };
}

const DRAG_THRESHOLD_SQ = 49;

type TrashBinIconProps = {
  iconId: string;
  listIndex: number;
};

export function TrashBinIcon({ iconId, listIndex }: TrashBinIconProps) {
  const cfg = getDesktopIconById(iconId);
  const getDisplayLabel = useDesktopIconSessionStore((s) => s.getDisplayLabel);
  const storedPos = useDesktopIconSessionStore((s) => s.trashBinPositions[iconId]);
  const setTrashBinIconPosition = useDesktopIconSessionStore(
    (s) => s.setTrashBinIconPosition,
  );
  const restoreIcon = useDesktopIconSessionStore((s) => s.restoreIcon);
  const openMenu = useDesktopContextMenuStore((s) => s.openMenu);
  const surfaceRef = useTrashBinIconSurfaceRef();

  const suppressClickRef = useRef(false);
  const positionRef = useRef<IconPixelPosition>(
    storedPos ?? defaultTrashLayout(listIndex),
  );

  useLayoutEffect(() => {
    if (storedPos === undefined) {
      const next = defaultTrashLayout(listIndex);
      setTrashBinIconPosition(iconId, next);
      positionRef.current = next;
    } else {
      positionRef.current = storedPos;
    }
  }, [iconId, listIndex, setTrashBinIconPosition, storedPos]);

  const position = storedPos ?? positionRef.current;

  const [isDragging, setIsDragging] = useState(false);

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

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
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
      positionRef.current = next;
      setTrashBinIconPosition(iconId, next);
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

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        {
          id: 'restore',
          label: '복원하기',
          onSelect: () => {
            restoreIcon(iconId);
          },
        },
      ] satisfies DesktopContextMenuItem[],
    });
  };

  if (!cfg) return null;

  const displayLabel = getDisplayLabel(iconId);

  return (
    <div
      role="button"
      tabIndex={0}
      className={`desktop-icon trash-bin-icon${isDragging ? ' desktop-icon--dragging' : ''}`}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: ICON_HIT_BOX.w,
        minHeight: ICON_HIT_BOX.h,
        zIndex: 2,
      }}
      aria-label={`${displayLabel}, 우클릭하여 복원`}
      onContextMenu={onContextMenu}
      onPointerDown={handlePointerDown}
    >
      <span className="desktop-icon-emoji" aria-hidden>
        {cfg.emoji}
      </span>
      <span className="desktop-icon-label">{displayLabel}</span>
    </div>
  );
}
