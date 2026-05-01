import {
  type AnimationEvent as ReactAnimationEvent,
  type TransitionEvent as ReactTransitionEvent,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { useDinoRampageStore } from "@/stores/use-dino-rampage-store";
import { useDesktopStore } from "@/stores/use-desktop-store";

import "@/components/desktop/dino-rampage-overlay.css";

type Step = "in" | "bob" | "out";

type DinoRampageOverlayProps = {
  onClose: () => void;
  /**
   * 슬라이드 인 후 중앙에서 bob까지 끝난 순간 호출 —
   * 미니 플레이어 흔들림 등은 여기와 맞춘다.
   */
  onAfterRampageImpact?: () => void;
};

function randomTiltDeg(): number {
  return Math.random() * 9 - 4.5;
}

export function DinoRampageOverlay({
  onClose,
  onAfterRampageImpact,
}: DinoRampageOverlayProps) {
  const [step, setStep] = useState<Step>("in");
  const [slideIn, setSlideIn] = useState(false);
  const setWindowTilts = useDinoRampageStore((s) => s.setWindowTilts);
  const clearWindowTilts = useDinoRampageStore((s) => s.clearWindowTilts);
  const closeAllWindows = useDesktopStore((s) => s.closeAllWindows);
  const enterOnceRef = useRef(false);
  const outOnceRef = useRef(false);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      clearWindowTilts();
      closeAllWindows();
      onAfterRampageImpact?.();
      onClose();
      return;
    }
    let id2 = 0;
    const id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => {
        setSlideIn(true);
      });
    });
    return () => {
      cancelAnimationFrame(id1);
      cancelAnimationFrame(id2);
    };
  }, [clearWindowTilts, closeAllWindows, onAfterRampageImpact, onClose]);

  const onEnterDone = useCallback(
    (e: ReactTransitionEvent<HTMLImageElement>) => {
      if (step !== "in" || !slideIn) return;
      if (e.propertyName !== "left" && e.propertyName !== "transform") {
        return;
      }
      if (enterOnceRef.current) return;
      enterOnceRef.current = true;
      const wins = useDesktopStore.getState().windows;
      if (wins.length > 0) {
        setWindowTilts(
          Object.fromEntries(wins.map((w) => [w.id, randomTiltDeg()])),
        );
      }
      setStep("bob");
    },
    [setWindowTilts, slideIn, step],
  );

  const onBobDone = useCallback(
    (e: ReactAnimationEvent<HTMLImageElement>) => {
      if (e.animationName !== "dino-rampage-bob" || step !== "bob") return;
      onAfterRampageImpact?.();
      clearWindowTilts();
      closeAllWindows();
      setStep("out");
    },
    [
      clearWindowTilts,
      closeAllWindows,
      onAfterRampageImpact,
      step,
    ],
  );

  const onOutDone = useCallback(
    (e: ReactTransitionEvent<HTMLImageElement>) => {
      if (step !== "out") return;
      if (e.propertyName !== "left" && e.propertyName !== "transform") {
        return;
      }
      if (outOnceRef.current) return;
      outOnceRef.current = true;
      onClose();
    },
    [onClose, step],
  );

  const className = [
    "dino-rampage__dino",
    slideIn || step === "bob" || step === "out"
      ? "dino-rampage__dino--mid"
      : "dino-rampage__dino--start",
    step === "bob" ? "dino-rampage__dino--bob" : "",
    step === "out" ? "dino-rampage__dino--out" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="dino-rampage" role="presentation" aria-hidden="true">
      <img
        src="/images/desktop/velociraptor.png"
        alt=""
        className={className}
        onTransitionEnd={
          step === "in" ? onEnterDone : step === "out" ? onOutDone : undefined
        }
        onAnimationEnd={step === "bob" ? onBobDone : undefined}
      />
    </div>
  );
}
