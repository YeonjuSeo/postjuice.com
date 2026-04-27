import { DesktopContextMenu } from "@/components/desktop/desktop-context-menu";
import { useDesktopContextMenuStore } from "@/stores/use-desktop-context-menu-store";

export function DesktopContextMenuHost() {
  const menu = useDesktopContextMenuStore((s) => s.menu);
  const closeMenu = useDesktopContextMenuStore((s) => s.closeMenu);
  if (!menu) {
    return null;
  }
  return (
    <DesktopContextMenu
      x={menu.x}
      y={menu.y}
      items={menu.items}
      onRequestClose={closeMenu}
    />
  );
}
