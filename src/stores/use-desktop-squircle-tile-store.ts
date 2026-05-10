import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type TilePixelPosition = { x: number; y: number };

/** 화면에 보이는 정사변 한 변 길이 */
export const SQUIRCLE_TILE_PX = 140;

export function clampTilePixelPositionToSurface(
  pos: TilePixelPosition,
  surfaceWidth: number,
  surfaceHeight: number,
): TilePixelPosition {
  const s = SQUIRCLE_TILE_PX;
  const maxX = Math.max(0, surfaceWidth - s);
  const maxY = Math.max(0, surfaceHeight - s);
  return {
    x: Math.min(Math.max(0, pos.x), maxX),
    y: Math.min(Math.max(0, pos.y), maxY),
  };
}

/** 서피스가 줄었을 때 타일 좌표를 스토어에 반영한다. */
export function clampStoredSquircleTileToSurface(
  surfaceWidth: number,
  surfaceHeight: number,
): void {
  if (surfaceWidth < 8 || surfaceHeight < 8) return;
  const { position, setPosition } = useDesktopSquircleTileStore.getState();
  const next = clampTilePixelPositionToSurface(
    position,
    surfaceWidth,
    surfaceHeight,
  );
  if (next.x !== position.x || next.y !== position.y) setPosition(next);
}

type SquircleTileState = {
  position: TilePixelPosition;
  setPosition: (p: TilePixelPosition) => void;
};

export const useDesktopSquircleTileStore = create<SquircleTileState>()(
  persist(
    (set) => ({
      position: { x: 256, y: 96 },
      setPosition: (p) => set({ position: p }),
    }),
    {
      name: "postjuice-desktop-squircle-tile",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ position: s.position }),
    },
  ),
);
