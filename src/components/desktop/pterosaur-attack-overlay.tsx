import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { getMatchingWindowIdsForIconId } from "@/lib/desktop-icon-windows";
import { useDinoRampageStore } from "@/stores/use-dino-rampage-store";
import { useDesktopStore } from "@/stores/use-desktop-store";

import "@/components/desktop/pterosaur-attack-overlay.css";

function randomTiltDeg(): number {
  return Math.random() * 8 - 4;
}

function randomBirdTilt(): number {
  return Math.random() * 20 - 10;
}

type PterosaurAttackOverlayProps = {
  iconId: string;
  onClose: () => void;
};

export function PterosaurAttackOverlay({
  iconId,
  onClose,
}: PterosaurAttackOverlayProps) {
  const setWindowTilt = useDinoRampageStore((s) => s.setWindowTilt);
  const closeWindow = useDesktopStore((s) => s.closeWindow);
  const [ids, setIds] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [pos, setPos] = useState({
    left: 0,
    top: 0,
    w: 160,
    endTop: 0,
  });
  const [animating, setAnimating] = useState(false);
  const [birdTiltDeg, setBirdTiltDeg] = useState(0);
  const transitionHitRef = useRef(false);
  const dinoNudgeIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useLayoutEffect(() => {
    if (reduced) {
      const list = getMatchingWindowIdsForIconId(iconId);
      for (const id of list) {
        setWindowTilt(id, randomTiltDeg());
        closeWindow(id);
      }
      onClose();
    }
  }, [reduced, iconId, closeWindow, onClose, setWindowTilt]);

  const flyToWindow = useCallback((winId: string) => {
    transitionHitRef.current = false;
    if (dinoNudgeIdRef.current) {
      clearInterval(dinoNudgeIdRef.current);
      dinoNudgeIdRef.current = null;
    }
    const el = document.querySelector<HTMLElement>(
      `[data-desktop-window-id="${winId}"]`,
    );
    if (!el) {
      setIndex((i) => i + 1);
      return;
    }
    const rect = el.getBoundingClientRect();
    const w = Math.min(200, window.innerWidth * 0.22);
    const left = rect.left + rect.width / 2 - w / 2;
    const endTop = Math.max(56, rect.top - w * 0.28);
    const startTop = -w;
    setPos({ left, top: startTop, w, endTop });
    setBirdTiltDeg(randomBirdTilt());
    setAnimating(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAnimating(true);
        setPos((p) => ({ ...p, top: endTop }));
      });
    });
  }, []);

  useLayoutEffect(() => {
    if (reduced) return;
    const list = getMatchingWindowIdsForIconId(iconId);
    setIds(list);
    setIndex(0);
    transitionHitRef.current = false;
    if (list.length === 0) onClose();
  }, [iconId, onClose, reduced]);

  useLayoutEffect(() => {
    if (reduced) return;
    if (ids.length === 0) return;
    if (index >= ids.length) {
      onClose();
      return;
    }
    flyToWindow(ids[index]);
  }, [reduced, ids, index, flyToWindow, onClose]);

  useEffect(() => {
    if (reduced) return;
    if (!animating) {
      if (dinoNudgeIdRef.current) {
        clearInterval(dinoNudgeIdRef.current);
        dinoNudgeIdRef.current = null;
      }
      return;
    }
    dinoNudgeIdRef.current = setInterval(() => {
      setBirdTiltDeg((d) => {
        const n = d + (Math.random() * 5 - 2.5);
        return Math.max(-22, Math.min(22, n));
      });
    }, 100);
    return () => {
      if (dinoNudgeIdRef.current) {
        clearInterval(dinoNudgeIdRef.current);
        dinoNudgeIdRef.current = null;
      }
    };
  }, [reduced, animating]);

  const onTransEnd = useCallback(
    (e: React.TransitionEvent<HTMLImageElement>) => {
      if (!animating) return;
      if (e.propertyName !== "top") return;
      if (transitionHitRef.current) return;
      const id = ids[index];
      if (!id) return;
      transitionHitRef.current = true;
      if (dinoNudgeIdRef.current) {
        clearInterval(dinoNudgeIdRef.current);
        dinoNudgeIdRef.current = null;
      }
      setBirdTiltDeg((d) => {
        const kick = Math.random() * 12 - 6 + (Math.random() * 8 - 4);
        return Math.max(-28, Math.min(28, d + kick));
      });
      setWindowTilt(id, randomTiltDeg());
      window.setTimeout(() => {
        closeWindow(id);
        setAnimating(false);
        transitionHitRef.current = false;
        setIndex((i) => i + 1);
      }, 400);
    },
    [animating, closeWindow, ids, index, setWindowTilt],
  );

  if (reduced) return null;
  if (ids.length === 0) return null;
  if (index >= ids.length) return null;

  return (
    <div className="pterosaur-attack" role="presentation" aria-hidden="true">
      <img
        src="/images/desktop/quetzalcoatlus.png"
        alt=""
        className="pterosaur-attack__bird"
        style={{
          left: pos.left,
          top: pos.top,
          width: pos.w,
          height: "auto",
          transform: `rotate(${birdTiltDeg}deg)`,
          transformOrigin: "50% 50%",
          transition: animating
            ? "top 0.88s cubic-bezier(0.25, 0.9, 0.32, 1), left 0.88s cubic-bezier(0.25, 0.9, 0.32, 1), transform 0.12s ease-out"
            : "transform 0.2s ease",
        }}
        onTransitionEnd={onTransEnd}
      />
    </div>
  );
}
