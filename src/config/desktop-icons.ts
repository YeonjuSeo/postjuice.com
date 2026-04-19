export type DesktopIconOpenPayload =
  | { kind: 'profile'; title: string }
  | { kind: 'post-list'; title: string; category?: string };

export type DesktopIconConfig = {
  id: string;
  label: string;
  emoji: string;
  /** 더블클릭 시 열 창 설정 */
  open: DesktopIconOpenPayload;
};

export const DESKTOP_ICONS: DesktopIconConfig[] = [
  {
    id: 'profile',
    label: '프로필',
    emoji: '👤',
    open: { kind: 'profile', title: '프로필' },
  },
  {
    id: 'posts-all',
    label: '글 목록',
    emoji: '📂',
    open: { kind: 'post-list', title: '모든 글' },
  },
  {
    id: 'posts-notes',
    label: '노트',
    emoji: '📝',
    open: { kind: 'post-list', title: '노트', category: 'notes' },
  },
];
