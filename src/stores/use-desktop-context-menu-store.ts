import { create } from "zustand";

import type { DesktopContextMenuItem } from "@/components/desktop/desktop-context-menu";

type DesktopContextMenuState = {
  x: number;
  y: number;
  items: DesktopContextMenuItem[];
} | null;

type DesktopContextMenuStore = {
  menu: DesktopContextMenuState;
  openMenu: (next: {
    x: number;
    y: number;
    items: DesktopContextMenuItem[];
  }) => void;
  closeMenu: () => void;
};

export const useDesktopContextMenuStore = create<DesktopContextMenuStore>(
  (set) => ({
    menu: null,
    openMenu: (next) => set({ menu: next }),
    closeMenu: () => set({ menu: null }),
  }),
);
