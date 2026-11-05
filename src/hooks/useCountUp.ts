import { useEffect, useRef, useState } from "react";

export function useCountUp(target: number, duration = 750): number {
  const [value, setValue] = useState(target);
  const displayRef = useRef(target);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const from = displayRef.current;
    if (Math.abs(from - target) < 0.0001) {
      displayRef.current = target;
      setValue(target);
      return;
    }

    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion || document.visibilityState === "hidden") {
      displayRef.current = target;
      setValue(target);
      return;
    }

    const startedAt = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = from + (target - from) * eased;
      displayRef.current = next;
      setValue(next);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        displayRef.current = target;
        setValue(target);
      }
    };

    frameRef.current = requestAnimationFrame(tick);

    // Background windows can throttle requestAnimationFrame indefinitely. Always
    // settle on the real value so the header never shows a stale total.
    const settle = window.setTimeout(() => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      displayRef.current = target;
      setValue(target);
    }, duration + 160);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      window.clearTimeout(settle);
    };
  }, [target, duration]);

  return value;
}
