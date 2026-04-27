import { createContext, useContext } from "react";

export const TrashBinIconSurfaceContext =
  createContext<React.RefObject<HTMLDivElement | null> | null>(null);

export function useTrashBinIconSurfaceRef() {
  return useContext(TrashBinIconSurfaceContext);
}
