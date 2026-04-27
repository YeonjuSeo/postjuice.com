import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import "@/components/desktop/desktop-context-menu.css";

export type DesktopContextMenuItem = {
  id: string;
  label: string;
  disabled?: boolean;
  onSelect: () => void;
};

type DesktopContextMenuProps = {
  x: number;
  y: number;
  items: DesktopContextMenuItem[];
  onRequestClose: () => void;
};

export function DesktopContextMenu({
  x,
  y,
  items,
  onRequestClose,
}: DesktopContextMenuProps) {
  const rootRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onRequestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onRequestClose]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      onRequestClose();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", onPointerDown, true);
  }, [onRequestClose]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let left = x;
    let top = y;
    const pad = 8;
    if (left + r.width > window.innerWidth - pad) {
      left = window.innerWidth - r.width - pad;
    }
    if (top + r.height > window.innerHeight - pad) {
      top = window.innerHeight - r.height - pad;
    }
    el.style.left = `${Math.max(pad, left)}px`;
    el.style.top = `${Math.max(pad, top)}px`;
  }, [x, y, items]);

  const body = typeof document !== "undefined" ? document.body : null;
  if (!body) {
    return null;
  }

  return createPortal(
    <ul
      ref={rootRef}
      className="desktop-context-menu"
      style={{ left: x, top: y }}
      role="menu"
    >
      {items.map((item) => (
        <li key={item.id} role="none">
          <button
            type="button"
            role="menuitem"
            className="desktop-context-menu__item"
            disabled={item.disabled}
            onClick={() => {
              if (item.disabled) return;
              item.onSelect();
              onRequestClose();
            }}
          >
            {item.label}
          </button>
        </li>
      ))}
    </ul>,
    body,
  );
}
