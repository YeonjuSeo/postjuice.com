import { create } from "zustand";

type DinoRampageState = {
  windowTiltDeg: Record<string, number>;
  setWindowTilts: (next: Record<string, number>) => void;
  setWindowTilt: (id: string, deg: number) => void;
  removeWindowTilt: (id: string) => void;
  clearWindowTilts: () => void;
};

export const useDinoRampageStore = create<DinoRampageState>((set) => ({
  windowTiltDeg: {},
  setWindowTilts: (next) => set({ windowTiltDeg: next }),
  setWindowTilt: (id, deg) =>
    set((s) => ({
      windowTiltDeg: { ...s.windowTiltDeg, [id]: deg },
    })),
  removeWindowTilt: (id) =>
    set((s) => {
      const rest = { ...s.windowTiltDeg };
      delete rest[id];
      return { windowTiltDeg: rest };
    }),
  clearWindowTilts: () => set({ windowTiltDeg: {} }),
}));
