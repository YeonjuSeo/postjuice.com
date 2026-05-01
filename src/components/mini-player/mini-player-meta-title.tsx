import { useEffect, useRef } from "react";

type MiniPlayerMetaTitleProps = {
  text: string;
  /** `mini-player__meta-title` 등 */
  innerClassName: string;
};

/** 넘치는 길이에 비해 시간만 늘리므로 픽셀/초는 제목 길이와 무관하게 일정함(값 작을수록 느림) */
const TITLE_SCROLL_PX_PER_SEC = 23;

/**
 * 한 줄로 제목을 두고 넘치면 천천히 끝까지 밀었다가 시작 위치로 되돌립니다.
 * 한 사이클이 끝난 뒤 1초 멈춤 → 같은 동작을 반복합니다.
 */
export function MiniPlayerMetaTitle({
  text,
  innerClassName,
}: MiniPlayerMetaTitleProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const inner = innerRef.current;
    if (!wrap || !inner) return;

    const wrapEl = wrap;
    const innerEl = inner;

    let cancelled = false;

    let leadTimer = 0;
    let betweenCyclesTimer = 0;
    let currentAnim: Animation | null = null;

    const cleanupMotion = () => {
      window.clearTimeout(leadTimer);
      window.clearTimeout(betweenCyclesTimer);
      leadTimer = 0;
      betweenCyclesTimer = 0;
      currentAnim?.cancel();
      currentAnim = null;
      innerEl.style.transform = "";
    };

    function measureOverflow(): number {
      const dx = innerEl.scrollWidth - wrapEl.clientWidth;
      /** subpixel 폰트/레이아웃 여유 2px이면 marquee가 빠져 양쪽이 잘리는 경우가 있어 1px 이상이면 초과로 봅니다 */
      if (dx < 1) return 0;
      return Math.ceil(dx);
    }

    function syncOverflowClass() {
      const overflow = measureOverflow();
      wrapEl.classList.toggle(
        "mini-player__meta-title-wrap--scroll",
        overflow > 0,
      );
    }

    function prefersReducedMotion(): boolean {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    /** 스크롤 애니메이션만 실행. 끝나면 1초 뒤 다시 호출 */
    function runScrollPass() {
      if (cancelled) return;

      currentAnim?.cancel();
      currentAnim = null;
      innerEl.style.transform = "";

      syncOverflowClass();
      const o = measureOverflow();
      if (o <= 0) return;

      if (prefersReducedMotion()) return;

      const scrollMs = (o / TITLE_SCROLL_PX_PER_SEC) * 1000;

      currentAnim = innerEl.animate(
        [{ transform: "translateX(0)" }, { transform: `translateX(${-o}px)` }],
        { duration: scrollMs, easing: "linear", fill: "forwards" },
      );

      currentAnim.onfinish = () => {
        currentAnim = null;
        innerEl.style.transform = "translateX(0)";
        if (cancelled) return;

        betweenCyclesTimer = window.setTimeout(() => {
          betweenCyclesTimer = 0;
          if (!cancelled) runScrollPass();
        }, 1000);
      };
    }

    /** 첫 진입 등: 시작 전 짧게 멈춘 뒤 스크롤 */
    function startSequence(initialLeadMs: number) {
      if (cancelled) return;

      cleanupMotion();
      syncOverflowClass();

      if (measureOverflow() <= 0) return;

      if (prefersReducedMotion()) return;

      leadTimer = window.setTimeout(() => {
        leadTimer = 0;
        if (!cancelled) runScrollPass();
      }, initialLeadMs);
    }

    startSequence(950);

    const ro = new ResizeObserver(() => {
      cleanupMotion();
      syncOverflowClass();
      startSequence(950);
    });

    ro.observe(wrapEl);

    return () => {
      cancelled = true;
      cleanupMotion();
      wrapEl.classList.remove("mini-player__meta-title-wrap--scroll");
      ro.disconnect();
    };
  }, [text]);

  return (
    <div ref={wrapRef} className="mini-player__meta-title-wrap">
      <p ref={innerRef} className={innerClassName}>
        {text}
      </p>
    </div>
  );
}
