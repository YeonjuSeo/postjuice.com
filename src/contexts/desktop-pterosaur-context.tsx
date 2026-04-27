import { createContext, useContext } from "react";

export const DesktopPterosaurContext = createContext<(iconId: string) => void>(
  () => {},
);

export function useDesktopPterosaurAttack() {
  return useContext(DesktopPterosaurContext);
}
