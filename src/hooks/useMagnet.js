import { useRef, useCallback } from 'react';
import { useMotionValue, useSpring } from 'framer-motion';

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1];

/**
 * useMagnet — attaches a soft magnetic pull to an element.
 *
 * The element moves toward the cursor while hovered by up to `maxDelta` pixels.
 * On mouse leave it springs back to rest via a heavy spring.
 *
 * @param {number} maxDelta   - max displacement in px (default 6)
 * @param {number} damping    - spring damping (higher = smoother return, default 28)
 * @param {number} stiffness  - spring stiffness (default 280)
 *
 * Returns { ref, x, y, handlers }
 * - Spread `handlers` on the element.
 * - Pass `x` and `y` to `motion` style={{ x, y }}.
 */
export function useMagnet({
  maxDelta = 6,
  damping = 28,
  stiffness = 280,
} = {}) {
  const ref = useRef(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  // Heavy spring — slow settle to zero on leave
  const x = useSpring(rawX, { damping, stiffness, mass: 0.6 });
  const y = useSpring(rawY, { damping, stiffness, mass: 0.6 });

  const handleMouseMove = useCallback((e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    // Normalize to center (-0.5 to 0.5)
    const cx = (e.clientX - rect.left) / rect.width - 0.5;
    const cy = (e.clientY - rect.top) / rect.height - 0.5;
    rawX.set(cx * maxDelta * 2);
    rawY.set(cy * maxDelta * 2);
  }, [maxDelta, rawX, rawY]);

  const handleMouseLeave = useCallback(() => {
    rawX.set(0);
    rawY.set(0);
  }, [rawX, rawY]);

  return {
    ref,
    x,
    y,
    handlers: {
      onMouseMove: handleMouseMove,
      onMouseLeave: handleMouseLeave,
    },
  };
}

/**
 * useAmbientLight — tracks cursor position within an element
 * and returns normalized (cx, cy) values (0–1) for placing a radial gradient.
 * Useful for cards that need atmospheric depth, not a spotlight.
 *
 * @param {number} damping   - spring damping (default 50)
 * @param {number} stiffness - spring stiffness (default 300)
 *
 * Returns { ref, lightX, lightY, handlers, isHovered, setIsHovered }
 * lightX / lightY are useSpring motion values (0–1 range, centered at 0.5)
 */
export function useAmbientLight({
  damping = 50,
  stiffness = 300,
} = {}) {
  const ref = useRef(null);
  const rawX = useMotionValue(0.5);
  const rawY = useMotionValue(0.5);

  const lightX = useSpring(rawX, { damping, stiffness, mass: 0.8 });
  const lightY = useSpring(rawY, { damping, stiffness, mass: 0.8 });

  const handleMouseMove = useCallback((e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    rawX.set((e.clientX - rect.left) / rect.width);
    rawY.set((e.clientY - rect.top) / rect.height);
  }, [rawX, rawY]);

  const handleMouseLeave = useCallback(() => {
    rawX.set(0.5);
    rawY.set(0.5);
  }, [rawX, rawY]);

  return {
    ref,
    lightX,
    lightY,
    handlers: {
      onMouseMove: handleMouseMove,
      onMouseLeave: handleMouseLeave,
    },
  };
}
