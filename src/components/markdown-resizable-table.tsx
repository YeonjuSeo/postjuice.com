import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ComponentPropsWithoutRef, ReactElement, ReactNode } from 'react';

import '@/components/markdown-resizable-table.css';

type MarkdownTableProps = ComponentPropsWithoutRef<'table'> & {
  node?: unknown;
};

function countMarkdownTableColumns(children: ReactNode): number {
  let max = 0;
  const walkTr = (row: ReactNode) => {
    if (!isValidElement(row) || row.type !== 'tr') return;
    const cells = Children.toArray(row.props.children).filter(
      (c): c is ReactElement =>
        isValidElement(c) && (c.type === 'th' || c.type === 'td'),
    );
    max = Math.max(max, cells.length);
  };
  const walk = (nodes: ReactNode) => {
    Children.forEach(nodes, (child) => {
      if (!isValidElement(child)) return;
      if (child.type === 'thead' || child.type === 'tbody') {
        walk(child.props.children);
      } else if (child.type === 'tr') {
        walkTr(child);
      }
    });
  };
  walk(children);
  return max;
}

const MIN_COL_PCT = 6;

export function MarkdownResizableTable(props: MarkdownTableProps) {
  const { node, children, className, ...tableProps } = props;
  void node;
  const colCount = useMemo(
    () => countMarkdownTableColumns(children),
    [children],
  );

  const [widthsPct, setWidthsPct] = useState<number[]>(() =>
    colCount > 0
      ? Array.from({ length: colCount }, () => 100 / colCount)
      : [],
  );

  useEffect(() => {
    if (colCount < 1) {
      setWidthsPct([]);
      return;
    }
    setWidthsPct(Array.from({ length: colCount }, () => 100 / colCount));
  }, [colCount]);

  const tableRef = useRef<HTMLTableElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const [theadHeight, setTheadHeight] = useState(40);

  const measureThead = useCallback(() => {
    const thead = tableRef.current?.querySelector('thead');
    if (thead) {
      setTheadHeight(Math.max(28, thead.getBoundingClientRect().height));
    }
  }, []);

  useEffect(() => {
    measureThead();
  }, [children, measureThead, widthsPct]);

  useEffect(() => {
    const table = tableRef.current;
    if (!table || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      measureThead();
    });
    ro.observe(table);
    return () => {
      ro.disconnect();
    };
  }, [measureThead]);

  const dragRef = useRef<{
    pointerId: number;
    edgeIndex: number;
    startX: number;
    snapshot: number[];
    tableWidth: number;
    captureEl: HTMLElement;
  } | null>(null);

  const onGripMove = useCallback((e: PointerEvent) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const dx = e.clientX - d.startX;
    d.startX = e.clientX;
    const tw = d.tableWidth;
    if (tw < 1) return;
    const dPct = (dx / tw) * 100;
    const snap = [...d.snapshot];
    const i = d.edgeIndex;
    let a = snap[i] + dPct;
    let b = snap[i + 1] - dPct;
    if (a < MIN_COL_PCT) {
      const fix = MIN_COL_PCT - a;
      a = MIN_COL_PCT;
      b -= fix;
    }
    if (b < MIN_COL_PCT) {
      const fix = MIN_COL_PCT - b;
      b = MIN_COL_PCT;
      a -= fix;
    }
    snap[i] = a;
    snap[i + 1] = b;
    d.snapshot = snap;
    setWidthsPct(snap);
  }, []);

  const endGrip = useCallback((e: PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    dragRef.current = null;
    document.body.classList.remove('markdown-table-col-dragging');
    try {
      d.captureEl.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    window.addEventListener('pointermove', onGripMove);
    window.addEventListener('pointerup', endGrip);
    window.addEventListener('pointercancel', endGrip);
    return () => {
      window.removeEventListener('pointermove', onGripMove);
      window.removeEventListener('pointerup', endGrip);
      window.removeEventListener('pointercancel', endGrip);
    };
  }, [endGrip, onGripMove]);

  function startResize(edgeIndex: number, e: React.PointerEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const shell = shellRef.current;
    const tw = shell?.getBoundingClientRect().width ?? 0;
    const el = e.currentTarget as HTMLElement;
    dragRef.current = {
      pointerId: e.pointerId,
      edgeIndex,
      startX: e.clientX,
      snapshot: [...widthsPct],
      tableWidth: tw,
      captureEl: el,
    };
    document.body.classList.add('markdown-table-col-dragging');
    el.setPointerCapture(e.pointerId);
  }

  const tableClass = ['markdown-table', className].filter(Boolean).join(' ');

  const gripOffsets = useMemo(() => {
    const out: number[] = [];
    let acc = 0;
    for (let i = 0; i < widthsPct.length - 1; i += 1) {
      acc += widthsPct[i];
      out.push(acc);
    }
    return out;
  }, [widthsPct]);

  if (colCount < 1) {
    return (
      <div className="markdown-table-shell" ref={shellRef}>
        <table ref={tableRef} className={tableClass} {...tableProps}>
          {children}
        </table>
      </div>
    );
  }

  return (
    <div className="markdown-table-shell" ref={shellRef}>
      <table
        ref={tableRef}
        className={tableClass}
        {...tableProps}
        style={{
          tableLayout: 'fixed',
          width: '100%',
          ...tableProps.style,
        }}
      >
        <colgroup>
          {widthsPct.map((w, i) => (
            <col key={i} style={{ width: `${w}%` }} />
          ))}
        </colgroup>
        {children}
      </table>
      {colCount > 1 ? (
        <div
          className="markdown-table-grip-strip"
          style={{ height: theadHeight }}
          aria-hidden
        >
          {gripOffsets.map((leftPct, i) => (
            <button
              key={i}
              type="button"
              className="markdown-table-grip"
              style={{ left: `${leftPct}%` }}
              aria-label={`열 ${i + 1}과 ${i + 2} 사이 너비 조절`}
              onPointerDown={(ev) => {
                startResize(i, ev);
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
