import { useInView } from 'framer-motion';
import { useRef } from 'react';

// Centralized easing curve used consistently across all scroll reveals
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1];

/**
 * Reveal variants for standard text/content elements.
 * Y: 30px → 0, opacity: 0 → 1, duration: 0.7s (700ms)
 */
export const revealVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.7, ease: EASE_OUT_EXPO }
  }
};

/**
 * Slightly slower reveal for images and visual-heavy elements.
 * Y: 24px → 0, duration: 0.9s
 */
export const revealVariantsImage = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.9, ease: EASE_OUT_EXPO }
  }
};

/**
 * Staggered container — staggers children by 0.12s
 */
export const staggerContainer = (staggerDelay = 0.12, delayChildren = 0) => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren: staggerDelay,
      delayChildren,
    }
  }
});

/**
 * Hook: returns {ref, controls, isInView} for imperative animation control.
 * @param {number} threshold - 0 to 1, how much of element must be visible
 * @param {number} margin - IntersectionObserver margin string, e.g. '-10%'
 */
export function useReveal(threshold = 0.12, margin = '-5%') {
  const ref = useRef(null);
  const isInView = useInView(ref, {
    once: true,
    margin,
    amount: threshold,
  });

  return { ref, isInView };
}
