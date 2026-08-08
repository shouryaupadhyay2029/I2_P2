import React from 'react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { revealVariants, revealVariantsImage, staggerContainer } from '../../animations/scrollReveal';
import { cn } from '../../utils/cn';

/**
 * RevealSection — wraps a section and fades in its direct children with stagger.
 * Uses opacity-based scroll indicator: partially visible → 0.6 opacity, fully visible → 1.
 *
 * @param {string}  className     — applied to the outer wrapper
 * @param {number}  staggerDelay  — delay between child reveals (default 0.12s)
 * @param {boolean} image         — if true, uses slower image reveal variant
 * @param {string}  margin        — IntersectionObserver rootMargin (default '-8%')
 */
export const RevealSection = ({
  children,
  className,
  staggerDelay = 0.12,
  image = false,
  margin = '-8%',
  delay = 0,
  as = 'div',
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin, amount: 0.2 });

  // Partial-visibility fading: if we can see the element but it's not "fully in"
  const partialRef = useRef(null);
  const isPartiallyVisible = useInView(partialRef, { once: false, margin: '0px', amount: 0.01 });
  const isFullyVisible = useInView(partialRef, { once: false, margin: '0px', amount: 0.5 });
  const containerVars = staggerContainer(staggerDelay, delay);

  const MotionTag = motion[as] || motion.div;

  return (
    <MotionTag
      ref={(el) => {
        ref.current = el;
        partialRef.current = el;
      }}
      variants={containerVars}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      style={{
        // Scroll indicator: partial → 0.6 opacity, full → 1
        opacity: !isPartiallyVisible ? 1 : isFullyVisible ? 1 : 0.65,
        transition: 'opacity 0.4s cubic-bezier(0.16,1,0.3,1)',
      }}
      className={cn('will-change-transform', className)}
    >
      {children}
    </MotionTag>
  );
};

/**
 * RevealItem — animates a single element on scroll reveal.
 * Place inside RevealSection or use standalone with whileInView.
 */
export const RevealItem = ({
  children,
  className,
  image = false,
  delay = 0,
  as = 'div',
}) => {
  const baseVariants = image ? revealVariantsImage : revealVariants;

  const variants = delay
    ? {
        hidden: baseVariants.hidden,
        visible: {
          ...baseVariants.visible,
          transition: { ...baseVariants.visible.transition, delay },
        },
      }
    : baseVariants;

  const MotionTag = motion[as] || motion.div;

  return (
    <MotionTag
      variants={variants}
      className={cn('will-change-transform', className)}
    >
      {children}
    </MotionTag>
  );
};

/**
 * StandaloneReveal — for elements not nested in RevealSection.
 * Uses whileInView directly.
 */
export const StandaloneReveal = ({
  children,
  className,
  image = false,
  delay = 0,
  margin = '-8%',
  as = 'div',
}) => {
  const baseVariants = image ? revealVariantsImage : revealVariants;

  const MotionTag = motion[as] || motion.div;

  return (
    <MotionTag
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin, amount: 0.2 }}
      variants={{
        hidden: baseVariants.hidden,
        visible: {
          ...baseVariants.visible,
          transition: { ...baseVariants.visible.transition, delay },
        },
      }}
      className={cn('will-change-transform', className)}
    >
      {children}
    </MotionTag>
  );
};
