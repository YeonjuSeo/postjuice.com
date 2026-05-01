import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { DESKTOP_ICONS } from "@/config/desktop-icons";

export type IconPixelPosition = { x: number; y: number };

/** Icon hit box (drag clamp, layout) */
export const ICON_HIT_BOX = { w: 96, h: 104 };

const GRID_STEP = 112;
const LAYOUT_MARGIN = 24;

function buildDefaultPositions(): Record<string, IconPixelPosition> {
  const out: Record<string, IconPixelPosition> = {};
  let i = 0;
  for (const icon of DESKTOP_ICONS) {
    if (icon.id === "force-quit") continue;
    out[icon.id] = { x: LAYOUT_MARGIN + i * GRID_STEP, y: LAYOUT_MARGIN };
    i += 1;
  }
  out["force-quit"] = { x: LAYOUT_MARGIN, y: LAYOUT_MARGIN };
  return out;
}

/** Default grid; force-quit is placed by DesktopShell using surface size */
export const ICON_LAYOUT_DEFAULTS: Record<string, IconPixelPosition> =
  buildDefaultPositions();

/** Bottom-right of desktop icon surface with LAYOUT_MARGIN inset */
export function getForceQuitDefaultPosition(
  surfaceWidth: number,
  surfaceHeight: number,
): IconPixelPosition {
  const w = Math.max(0, surfaceWidth);
  const h = Math.max(0, surfaceHeight);
  return {
    x: Math.max(LAYOUT_MARGIN, w - ICON_HIT_BOX.w - LAYOUT_MARGIN),
    y: Math.max(LAYOUT_MARGIN, h - ICON_HIT_BOX.h - LAYOUT_MARGIN),
  };
}

export function clampIconPositionToSurface(
  pos: IconPixelPosition,
  surfaceWidth: number,
  surfaceHeight: number,
): IconPixelPosition {
  const maxX = Math.max(0, surfaceWidth - ICON_HIT_BOX.w);
  const maxY = Math.max(0, surfaceHeight - ICON_HIT_BOX.h);
  return {
    x: Math.min(Math.max(0, pos.x), maxX),
    y: Math.min(Math.max(0, pos.y), maxY),
  };
}

/** 서피스가 줄었을 때 넘친 좌표를 스토어에서 보정한다. */
export function clampStoredDesktopIconsToSurface(
  surfaceWidth: number,
  surfaceHeight: number,
): void {
  if (surfaceWidth < 8 || surfaceHeight < 8) return;
  const { positions, setIconPosition } = useDesktopIconLayoutStore.getState();
  for (const icon of DESKTOP_ICONS) {
    const raw = positions[icon.id] ?? ICON_LAYOUT_DEFAULTS[icon.id];
    const next = clampIconPositionToSurface(raw, surfaceWidth, surfaceHeight);
    if (next.x !== raw.x || next.y !== raw.y) {
      setIconPosition(icon.id, next);
    }
  }
}

type IconLayoutState = {
  /** When missing, use ICON_LAYOUT_DEFAULTS[id] */
  positions: Partial<Record<string, IconPixelPosition>>;
  setIconPosition: (id: string, pos: IconPixelPosition) => void;
};

export const useDesktopIconLayoutStore = create<IconLayoutState>()(
  persist(
    (set) => ({
      positions: {},
      setIconPosition: (id, pos) =>
        set((s) => ({
          positions: { ...s.positions, [id]: pos },
        })),
    }),
    {
      name: "postjuice-desktop-icon-positions",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ positions: s.positions }),
      merge: (persisted, current) => {
        const p = persisted as Partial<IconLayoutState> | undefined;
        return {
          ...current,
          positions: { ...current.positions, ...p?.positions },
        };
      },
    },
  ),
);

export function getIconPosition(id: string): IconPixelPosition {
  const saved = useDesktopIconLayoutStore.getState().positions[id];
  return saved ?? ICON_LAYOUT_DEFAULTS[id] ?? { x: 24, y: 24 };
}

export function useIconLayoutPosition(id: string): IconPixelPosition {
  return useDesktopIconLayoutStore(
    (s) => s.positions[id] ?? ICON_LAYOUT_DEFAULTS[id] ?? { x: 24, y: 24 },
  );
}
