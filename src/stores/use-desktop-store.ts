import { create } from "zustand";

import { useDinoRampageStore } from "@/stores/use-dino-rampage-store";

export type DesktopWindowPayload =
  | { kind: "profile"; title: string }
  | { kind: "post-list"; title: string; category?: string }
  | { kind: "post"; title: string; slug: string }
  | { kind: "trash-bin"; title: string };

export type DesktopWindowRecord = DesktopWindowPayload & {
  id: string;
  zIndex: number;
  /** 열 때 순서(스택/연출용, 0부터) */
  openIndex: number;
};

type DesktopStoreState = {
  windows: DesktopWindowRecord[];
  maxZ: number;
  openWindow: (payload: DesktopWindowPayload) => void;
  closeWindow: (id: string) => void;
  closeAllWindows: () => void;
  focusWindow: (id: string) => void;
};

function randomId(): string {
  return `win-${Math.random().toString(36).slice(2, 10)}`;
}

/** â을 한 번에 하나로 취급할 Ű(프로필 / 글 목록+ī테고리 / 글 slug / 휴지통) */
export function getDesktopWindowDedupeKey(
  item: DesktopWindowPayload | DesktopWindowRecord,
): string {
  switch (item.kind) {
    case "profile":
      return "profile";
    case "post-list":
      return `post-list:${item.category ?? "__all__"}`;
    case "post":
      return `post:${item.slug}`;
    case "trash-bin":
      return "trash-bin";
  }
}

export const useDesktopStore = create<DesktopStoreState>((set, get) => ({
  windows: [],
  maxZ: 100,
  openWindow: (payload) => {
    const winKey = getDesktopWindowDedupeKey(payload);
    const duplicate = get().windows.find(
      (w) => getDesktopWindowDedupeKey(w) === winKey,
    );
    if (duplicate) {
      get().focusWindow(duplicate.id);
      return;
    }

    const nextZ = get().maxZ + 1;
    const id = randomId();
    const openIndex = get().windows.length;
    set((s) => ({
      windows: [...s.windows, { ...payload, id, zIndex: nextZ, openIndex }],
      maxZ: nextZ,
    }));
  },
  closeWindow: (id) => {
    useDinoRampageStore.getState().removeWindowTilt(id);
    set((s) => ({
      windows: s.windows.filter((w) => w.id !== id),
    }));
  },
  closeAllWindows: () => {
    useDinoRampageStore.getState().clearWindowTilts();
    set({ windows: [], maxZ: 100 });
  },
  focusWindow: (id) => {
    const nextZ = get().maxZ + 1;
    set((s) => ({
      maxZ: nextZ,
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, zIndex: nextZ } : w,
      ),
    }));
  },
}));
