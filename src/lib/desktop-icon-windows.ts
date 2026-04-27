import { DESKTOP_ICONS } from '@/config/desktop-icons';
import { getAllPosts, getPostsByCategory } from '@/lib/posts';
import {
  getDesktopWindowDedupeKey,
  useDesktopStore,
} from '@/stores/use-desktop-store';

export function getDedupeKeysForDesktopIconId(iconId: string): Set<string> {
  const keys = new Set<string>();
  switch (iconId) {
    case 'profile':
      keys.add('profile');
      break;
    case 'posts-all':
      keys.add('post-list:__all__');
      for (const p of getAllPosts()) {
        keys.add(`post:${p.slug}`);
      }
      break;
    case 'posts-notes':
      keys.add('post-list:notes');
      for (const p of getPostsByCategory('notes')) {
        keys.add(`post:${p.slug}`);
      }
      break;
    default:
      break;
  }
  return keys;
}

export function getMatchingWindowIdsForIconId(iconId: string): string[] {
  const cfg = DESKTOP_ICONS.find((i) => i.id === iconId);
  if (!cfg || cfg.action !== 'open') return [];

  const keySet = getDedupeKeysForDesktopIconId(iconId);
  if (keySet.size === 0) return [];

  const wins = useDesktopStore.getState().windows;

  return wins
    .filter((w) => keySet.has(getDesktopWindowDedupeKey(w)))
    .sort((a, b) => b.zIndex - a.zIndex)
    .map((w) => w.id);
}

/** 아이콘 삭제 시: 해당 아이콘과 연결된 열린 창을 모두 닫는다 */
export function closeWindowsForDesktopIconId(iconId: string): void {
  const winIds = getMatchingWindowIdsForIconId(iconId);
  const { closeWindow } = useDesktopStore.getState();
  for (const id of winIds) {
    closeWindow(id);
  }
}
