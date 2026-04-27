import { create } from 'zustand';

import { DESKTOP_ICONS } from '@/config/desktop-icons';
import type { IconPixelPosition } from '@/stores/use-desktop-icon-layout-store';

function defaultLabelForId(id: string): string {
  const c = DESKTOP_ICONS.find((i) => i.id === id);
  return c?.label ?? id;
}

type DesktopIconSessionState = {
  customLabels: Record<string, string>;
  trashedIconIds: string[];
  /** 휴지통 창 안에서만 쓰는 아이콘 좌표(데스크톱과 별도) */
  trashBinPositions: Partial<Record<string, IconPixelPosition>>;
  setCustomLabel: (id: string, label: string) => void;
  setTrashBinIconPosition: (id: string, pos: IconPixelPosition) => void;
  trashIcon: (id: string) => void;
  restoreIcon: (id: string) => void;
  isIconTrashed: (id: string) => boolean;
  getDisplayLabel: (id: string) => string;
};

export const useDesktopIconSessionStore = create<DesktopIconSessionState>(
  (set, get) => ({
    customLabels: {},
    trashedIconIds: [],
    trashBinPositions: {},
    setCustomLabel: (id, label) =>
      set((s) => {
        const next = { ...s.customLabels };
        const def = defaultLabelForId(id);
        const t = label.trim();
        if (t === '' || t === def) {
          delete next[id];
        } else {
          next[id] = t;
        }
        return { customLabels: next };
      }),
    setTrashBinIconPosition: (id, pos) =>
      set((s) => ({
        trashBinPositions: { ...s.trashBinPositions, [id]: pos },
      })),
    trashIcon: (id) =>
      set((s) => {
        if (s.trashedIconIds.includes(id)) return s;
        const n = s.trashedIconIds.length;
        const defaultPos: IconPixelPosition = {
          x: 16 + (n % 4) * 104,
          y: 16 + Math.floor(n / 4) * 112,
        };
        return {
          trashedIconIds: [...s.trashedIconIds, id],
          trashBinPositions: {
            ...s.trashBinPositions,
            [id]: s.trashBinPositions[id] ?? defaultPos,
          },
        };
      }),
    restoreIcon: (id) =>
      set((s) => {
        const nextPos = { ...s.trashBinPositions };
        delete nextPos[id];
        return {
          trashedIconIds: s.trashedIconIds.filter((x) => x !== id),
          trashBinPositions: nextPos,
        };
      }),
    isIconTrashed: (id) => get().trashedIconIds.includes(id),
    getDisplayLabel: (id) => {
      const custom = get().customLabels[id];
      if (custom) return custom;
      return defaultLabelForId(id);
    },
  }),
);
