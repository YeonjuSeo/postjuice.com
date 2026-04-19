import { create } from 'zustand';

export type DesktopWindowPayload =
  | { kind: 'profile'; title: string }
  | { kind: 'post-list'; title: string; category?: string }
  | { kind: 'post'; title: string; slug: string };

export type DesktopWindowRecord = DesktopWindowPayload & {
  id: string;
  zIndex: number;
  /** 창을 연 순서 (겹침 위치 오프셋용) */
  openIndex: number;
};

type DesktopStoreState = {
  windows: DesktopWindowRecord[];
  maxZ: number;
  openWindow: (payload: DesktopWindowPayload) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
};

function randomId(): string {
  return `win-${Math.random().toString(36).slice(2, 10)}`;
}

/** 같은 아이콘·같은 글(slug)·같은 카테고리 목록 창은 하나만 두고 재포커스한다 */
export function getDesktopWindowDedupeKey(
  item: DesktopWindowPayload | DesktopWindowRecord,
): string {
  switch (item.kind) {
    case 'profile':
      return 'profile';
    case 'post-list':
      return `post-list:${item.category ?? '__all__'}`;
    case 'post':
      return `post:${item.slug}`;
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
  closeWindow: (id) =>
    set((s) => ({
      windows: s.windows.filter((w) => w.id !== id),
    })),
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
