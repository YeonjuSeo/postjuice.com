import { createContext, useContext } from "react";

export const DesktopIconSurfaceContext =
  createContext<React.RefObject<HTMLDivElement | null> | null>(null);

export function useDesktopIconSurfaceRef() {
  return useContext(DesktopIconSurfaceContext);
}
