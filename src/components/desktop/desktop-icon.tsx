import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import type { DesktopIconConfig } from '@/config/desktop-icons';

import { useDesktopDinoRampage } from '@/contexts/desktop-dino-rampage-context';
import { useDesktopIconSurfaceRef } from '@/contexts/desktop-icon-surface-context';
import { useDesktopPterosaurAttack } from '@/contexts/desktop-pterosaur-context';

import type { DesktopContextMenuItem } from '@/components/desktop/desktop-context-menu';

import { closeWindowsForDesktopIconId } from '@/lib/desktop-icon-windows';

import {
  clampIconPositionToSurface,
  ICON_HIT_BOX,
  type IconPixelPosition,
  useDesktopIconLayoutStore,
  useIconLayoutPosition,
} from '@/stores/use-desktop-icon-layout-store';
import { useDesktopContextMenuStore } from '@/stores/use-desktop-context-menu-store';
import { useDesktopIconSessionStore } from '@/stores/use-desktop-icon-session-store';
import { useDesktopStore } from '@/stores/use-desktop-store';

type DesktopIconProps = {
  config: DesktopIconConfig;
};

const DRAG_THRESHOLD_SQ = 49;

export function DesktopIcon({ config }: DesktopIconProps) {
  const openWindow = useDesktopStore((s) => s.openWindow);
  const startDinoRampage = useDesktopDinoRampage();
  const startPterosaurAttack = useDesktopPterosaurAttack();
  const openContextMenu = useDesktopContextMenuStore((s) => s.openMenu);
  const setIconPosition = useDesktopIconLayoutStore((s) => s.setIconPosition);
  const position = useIconLayoutPosition(config.id);
  const surfaceRef = useDesktopIconSurfaceRef();
  const customLabel = useDesktopIconSessionStore(
    (s) => s.customLabels[config.id],
  );
  const setCustomLabel = useDesktopIconSessionStore((s) => s.setCustomLabel);
  const trashIcon = useDesktopIconSessionStore((s) => s.trashIcon);

  const displayLabel = customLabel ?? config.label;

  const suppressClickRef = useRef(false);
  const coarsePointerRef = useRef(false);
  const positionRef = useRef(position);
  positionRef.current = position;

  const [isDragging, setIsDragging] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState('');
  const skipRenameCommitRef = useRef(false);
  const renameTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    if (!renaming) return;
    const el = renameTextareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [draft, renaming]);

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
    return clampIconPositionToSurface(pos, surf.clientWidth, surf.clientHeight);
  }

  function handleOpen() {
    if (config.action === 'trash' || config.action === 'force-quit') return;
    openWindow(config.open);
  }

  function handleOpenTrashBin() {
    openWindow({ kind: 'trash-bin', title: '휴지통' });
  }

  function handleForceQuit() {
    startDinoRampage();
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

  function buildContextItems(): DesktopContextMenuItem[] {
    const items: DesktopContextMenuItem[] = [
      {
        id: 'rename',
        label: '이름 바꾸기',
        onSelect: () => {
          setDraft(displayLabel);
          setRenaming(true);
        },
      },
    ];
    if (config.action === 'open') {
      items.push(
        {
          id: 'delete',
          label: '삭제하기',
          onSelect: () => {
            closeWindowsForDesktopIconId(config.id);
            trashIcon(config.id);
          },
        },
        {
          id: 'close-related',
          label: '열린 창 닫기',
          onSelect: () => {
            startPterosaurAttack(config.id);
          },
        },
      );
    }
    return items;
  }

  const ariaLabel =
    config.action === 'trash'
      ? `${displayLabel}, 더블클릭하면 휴지통 창이 열립니다`
      : config.action === 'force-quit'
        ? `${displayLabel}, 더블클릭하면 모든 창이 강제로 닫힙니다`
        : `${displayLabel}, 드래그하여 옮기기. 더블클릭하면 열기.`;

  return (
    <div
      role="button"
      tabIndex={0}
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
      aria-label={ariaLabel}
      onContextMenu={(e) => {
        e.preventDefault();
        openContextMenu({
          x: e.clientX,
          y: e.clientY,
          items: buildContextItems(),
        });
      }}
      onPointerDown={handlePointerDown}
      onKeyDown={(e) => {
        const t = e.target as HTMLElement;
        if (
          t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.isContentEditable
        ) {
          return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (config.action === 'trash') handleOpenTrashBin();
          else if (config.action === 'force-quit') handleForceQuit();
          else handleOpen();
        }
      }}
      onClick={(ev) => {
        if ((ev.target as HTMLElement).closest('input,textarea')) return;
        if (suppressClickRef.current) return;
        if (config.action === 'trash') {
          if (coarsePointerRef.current) handleOpenTrashBin();
          return;
        }
        if (config.action === 'force-quit') {
          if (coarsePointerRef.current) handleForceQuit();
          return;
        }
        if (coarsePointerRef.current) handleOpen();
      }}
      onDoubleClick={(ev) => {
        if ((ev.target as HTMLElement).closest('input,textarea')) return;
        if (suppressClickRef.current) return;
        if (config.action === 'trash') {
          if (!coarsePointerRef.current) {
            ev.preventDefault();
            handleOpenTrashBin();
          }
          return;
        }
        if (config.action === 'force-quit') {
          if (!coarsePointerRef.current) {
            ev.preventDefault();
            handleForceQuit();
          }
          return;
        }
        if (!coarsePointerRef.current) {
          ev.preventDefault();
          handleOpen();
        }
      }}
    >
      <span className="desktop-icon-emoji" aria-hidden>
        {config.emoji}
      </span>
      {renaming ? (
        <textarea
          ref={renameTextareaRef}
          className="desktop-icon-rename-input"
          value={draft}
          rows={1}
          spellCheck={false}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (skipRenameCommitRef.current) {
              skipRenameCommitRef.current = false;
              return;
            }
            setCustomLabel(config.id, draft);
            setRenaming(false);
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              (e.target as HTMLTextAreaElement).blur();
              return;
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              skipRenameCommitRef.current = true;
              setRenaming(false);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          autoFocus
        />
      ) : (
        <span className="desktop-icon-label">{displayLabel}</span>
      )}
    </div>
  );
}
