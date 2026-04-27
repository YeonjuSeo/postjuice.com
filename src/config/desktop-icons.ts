export type DesktopIconOpenPayload =
  | { kind: 'profile'; title: string }
  | { kind: 'post-list'; title: string; category?: string };

export type DesktopIconConfig =
  | {
      id: string;
      label: string;
      emoji: string;
      action: 'open';
      open: DesktopIconOpenPayload;
    }
  | {
      id: string;
      label: string;
      emoji: string;
      action: 'trash';
    }
  | {
      id: string;
      label: string;
      emoji: string;
      action: 'force-quit';
    };

export const DESKTOP_ICONS: DesktopIconConfig[] = [
  {
    id: 'profile',
    label: '프로필',
    emoji: '👤',
    action: 'open',
    open: { kind: 'profile', title: '프로필' },
  },
  {
    id: 'posts-all',
    label: '글 목록',
    emoji: '📋',
    action: 'open',
    open: { kind: 'post-list', title: '모든 글' },
  },
  {
    id: 'posts-notes',
    label: '노트',
    emoji: '📝',
    action: 'open',
    open: { kind: 'post-list', title: '노트', category: 'notes' },
  },
  {
    id: 'trash',
    label: '휴지통',
    emoji: '🗑️',
    action: 'trash',
  },
  {
    id: 'force-quit',
    label: '강제 종료',
    emoji: '⚡',
    action: 'force-quit',
  },
];

export function getDesktopIconById(
  id: string,
): DesktopIconConfig | undefined {
  return DESKTOP_ICONS.find((i) => i.id === id);
}
