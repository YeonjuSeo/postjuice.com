import { useRef } from 'react';

import { useDesktopIconSessionStore } from '@/stores/use-desktop-icon-session-store';

import { TrashBinIcon } from '@/components/desktop/trash-bin-icon';
import { TrashBinIconSurfaceContext } from '@/contexts/trash-bin-icon-surface-context';

import '@/components/desktop/trash-bin-panel.css';

export function TrashBinPanel() {
  const trashedIconIds = useDesktopIconSessionStore((s) => s.trashedIconIds);
  const surfaceRef = useRef<HTMLDivElement | null>(null);

  if (trashedIconIds.length === 0) {
    return (
      <p className="trash-bin-panel__empty">
        휴지통이 비어 있어요. 데스크톱에서 아이콘을 삭제하면 여기에 표시됩니다.
      </p>
    );
  }

  return (
    <div className="trash-bin-panel">
      <TrashBinIconSurfaceContext.Provider value={surfaceRef}>
        <div
          ref={surfaceRef}
          className="trash-bin-panel__surface"
          role="list"
          aria-label="휴지통에 있는 항목"
        >
          {trashedIconIds.map((id, index) => (
            <TrashBinIcon key={id} iconId={id} listIndex={index} />
          ))}
        </div>
      </TrashBinIconSurfaceContext.Provider>
    </div>
  );
}
