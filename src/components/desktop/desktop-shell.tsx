import { useRef } from 'react';

import { DESKTOP_ICONS } from '@/config/desktop-icons';

import { DesktopIconSurfaceContext } from '@/contexts/desktop-icon-surface-context';

import { DesktopIcon } from '@/components/desktop/desktop-icon';
import { DesktopWindow } from '@/components/desktop/desktop-window';

import '@/components/desktop/desktop.css';

import { useDesktopStore } from '@/stores/use-desktop-store';

export function DesktopShell() {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const windows = useDesktopStore((s) => s.windows);

  const ordered = [...windows].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div className="desktop-shell">
      <div className="desktop-wallpaper" aria-hidden />

      <header className="desktop-shell-header">
        <p className="desktop-shell-brand">postjuice</p>
      </header>

      <DesktopIconSurfaceContext.Provider value={surfaceRef}>
        <nav
          ref={surfaceRef}
          className="desktop-icon-surface"
          aria-label="데스크톱 아이콘"
        >
          {DESKTOP_ICONS.map((icon) => (
            <DesktopIcon key={icon.id} config={icon} />
          ))}
        </nav>
      </DesktopIconSurfaceContext.Provider>

      <div className="desktop-windows-layer">
        {ordered.map((w) => (
          <DesktopWindow key={w.id} windowRecord={w} stackIndex={w.openIndex} />
        ))}
      </div>
    </div>
  );
}
