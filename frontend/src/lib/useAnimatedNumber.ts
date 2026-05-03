import { useEffect, useRef, useState } from "react";

/**
 * Smoothly tween a number toward `target` over `duration` ms (ease-out cubic).
 * Returns the integer current value for display.
 */
export function useAnimatedNumber(target: number, duration = 220): number {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (display === target) return;
    fromRef.current = display;
    const start = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = fromRef.current + (target - fromRef.current) * eased;
      setDisplay(value);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return Math.round(display);
}
