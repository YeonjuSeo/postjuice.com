import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { DESKTOP_ICONS } from '@/config/desktop-icons';

export type IconPixelPosition = { x: number; y: number };

/** 아이콘 버튼 박스 (드래그 클램프·레이아웃과 맞출 것) */
export const ICON_HIT_BOX = { w: 96, h: 104 };

/** 최초·리셋 시 그리드 배치 */
export const ICON_LAYOUT_DEFAULTS: Record<string, IconPixelPosition> =
  Object.fromEntries(
    DESKTOP_ICONS.map((icon, index) => [
      icon.id,
      { x: 24 + index * 112, y: 24 },
    ]),
  );

type IconLayoutState = {
  /** 비어 있으면 `ICON_LAYOUT_DEFAULTS[id]` 사용 */
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
      name: 'postjuice-desktop-icon-positions',
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
