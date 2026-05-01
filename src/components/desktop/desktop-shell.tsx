import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { DESKTOP_ICONS } from "@/config/desktop-icons";

import { DesktopDinoRampageContext } from "@/contexts/desktop-dino-rampage-context";
import { DesktopIconSurfaceContext } from "@/contexts/desktop-icon-surface-context";
import { DesktopPterosaurContext } from "@/contexts/desktop-pterosaur-context";

import { DinoRampageOverlay } from "@/components/desktop/dino-rampage-overlay";
import { DesktopContextMenuHost } from "@/components/desktop/desktop-context-menu-host";
import { DesktopIcon } from "@/components/desktop/desktop-icon";
import { PterosaurAttackOverlay } from "@/components/desktop/pterosaur-attack-overlay";
import { DesktopWindow } from "@/components/desktop/desktop-window";

import "@/components/desktop/desktop.css";

import { useMiniPlayerStore } from "@/stores/use-mini-player-store";
import { useDesktopIconSessionStore } from "@/stores/use-desktop-icon-session-store";
import {
  clampStoredDesktopIconsToSurface,
  getForceQuitDefaultPosition,
  useDesktopIconLayoutStore,
} from "@/stores/use-desktop-icon-layout-store";
import { useDesktopStore } from "@/stores/use-desktop-store";

export function DesktopShell() {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const setIconPosition = useDesktopIconLayoutStore((s) => s.setIconPosition);
  const windows = useDesktopStore((s) => s.windows);
  const trashedIconIds = useDesktopIconSessionStore((s) => s.trashedIconIds);
  const [dinoOpen, setDinoOpen] = useState(false);
  const [pterosaurIconId, setPterosaurIconId] = useState<string | null>(null);

  const startDinoRampage = useCallback(() => {
    setDinoOpen(true);
  }, []);

  const startPterosaurAttack = useCallback((iconId: string) => {
    setPterosaurIconId(iconId);
  }, []);

  const visibleIcons = useMemo(
    () => DESKTOP_ICONS.filter((i) => !trashedIconIds.includes(i.id)),
    [trashedIconIds],
  );

  const ordered = [...windows].sort((a, b) => a.zIndex - b.zIndex);

  useLayoutEffect(() => {
    function placeForceQuitIfNeeded() {
      const el = surfaceRef.current;
      if (!el || el.clientWidth < 8 || el.clientHeight < 8) return;
      if (
        useDesktopIconLayoutStore.getState().positions["force-quit"] != null
      ) {
        return;
      }
      setIconPosition(
        "force-quit",
        getForceQuitDefaultPosition(el.clientWidth, el.clientHeight),
      );
    }
    placeForceQuitIfNeeded();
    const id = requestAnimationFrame(placeForceQuitIfNeeded);
    return () => cancelAnimationFrame(id);
  }, [setIconPosition]);

  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;

    let rafId = 0;
    function runClamp() {
      rafId = 0;
      const surface = surfaceRef.current;
      if (!surface) return;
      clampStoredDesktopIconsToSurface(
        surface.clientWidth,
        surface.clientHeight,
      );
    }
    function scheduleClamp() {
      if (rafId !== 0) return;
      rafId = window.requestAnimationFrame(runClamp);
    }

    scheduleClamp();

    const ro = new ResizeObserver(scheduleClamp);
    ro.observe(el);

    window.addEventListener("resize", scheduleClamp, { passive: true });

    return () => {
      if (rafId !== 0) window.cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener("resize", scheduleClamp);
    };
  }, []);

  return (
    <DesktopDinoRampageContext.Provider value={startDinoRampage}>
      <DesktopPterosaurContext.Provider value={startPterosaurAttack}>
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
              {visibleIcons.map((icon) => (
                <DesktopIcon key={icon.id} config={icon} />
              ))}
            </nav>
          </DesktopIconSurfaceContext.Provider>

          <div className="desktop-windows-layer">
            {ordered.map((w) => (
              <DesktopWindow
                key={w.id}
                windowRecord={w}
                stackIndex={w.openIndex}
              />
            ))}
          </div>

          {dinoOpen ? (
            <DinoRampageOverlay
              onClose={() => setDinoOpen(false)}
              onAfterRampageImpact={() =>
                useMiniPlayerStore.getState().bumpForceQuit()
              }
            />
          ) : null}
          {pterosaurIconId ? (
            <PterosaurAttackOverlay
              iconId={pterosaurIconId}
              onClose={() => setPterosaurIconId(null)}
            />
          ) : null}
          <DesktopContextMenuHost />
        </div>
      </DesktopPterosaurContext.Provider>
    </DesktopDinoRampageContext.Provider>
  );
}
