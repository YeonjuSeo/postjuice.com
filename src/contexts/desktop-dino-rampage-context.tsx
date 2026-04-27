import { createContext, useContext } from "react";

export const DesktopDinoRampageContext = createContext<() => void>(() => {
  /* default no-op */
});

export function useDesktopDinoRampage() {
  return useContext(DesktopDinoRampageContext);
}
