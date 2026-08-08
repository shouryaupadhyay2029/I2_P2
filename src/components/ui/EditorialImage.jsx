import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

const EDITORIAL_FALLBACK =
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=800&auto=format&fit=crop&fm=webp';

/**
 * EditorialImage — premium image component with film grain, vignette, and
 * zoom physics. Uses identical finite-state machine as Image.jsx:
 *
 *   LOADING → LOADED          (onLoad)
 *   LOADING → FALLBACK        (onError, once)
 *   FALLBACK → LOADED         (fallback onLoad)
 *   FALLBACK → TERMINAL_ERROR (fallback onError → show transparent, no loop)
 *
 * StrictMode rescue: no-dep useEffect checks img.complete after every render
 * to correct any state poisoning from the double-invocation of useEffect([src]).
 */
export const EditorialImage = ({
  src,
  alt = 'Editorial Image',
  className,
  wrapperClassName,
  aspectRatio = 'aspect-video',
  grayscale = false,
  width,
  height,
  isHovered
}) => {
  const imgRef = useRef(null);

  const [imgState, setImgState] = useState(() => ({
    currentSrc: src || EDITORIAL_FALLBACK,
    isLoaded: false,
    fallbackAttempted: false,
  }));

  // When src prop changes from outside, reset state
  useEffect(() => {
    const resolved = src || EDITORIAL_FALLBACK;
    setImgState({
      currentSrc: resolved,
      isLoaded: false,
      fallbackAttempted: false,
    });
  }, [src]); // eslint-disable-line react-hooks/exhaustive-deps

  // StrictMode rescue: runs after every render (no deps).
  // If StrictMode's second useEffect([src]) invocation reset isLoaded=false
  // after onLoad had already fired, this detects img.complete=true and fixes it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0 && !imgState.isLoaded) {
      setImgState((prev) => ({ ...prev, isLoaded: true }));
    }
  });

  const handleLoad = () => {
    setImgState((prev) => ({ ...prev, isLoaded: true }));
  };

  const handleError = () => {
    setImgState((prev) => {
      if (!prev.fallbackAttempted) {
        return {
          currentSrc: EDITORIAL_FALLBACK,
          isLoaded: false,
          fallbackAttempted: true,
        };
      }
      // Terminal: fallback failed too — remove veil so at least the bg shows
      return { ...prev, isLoaded: true };
    });
  };

  const activeHover = isHovered !== undefined ? isHovered : false;

  return (
    <div className={cn(
      "relative overflow-hidden w-full border border-white/5 bg-[#0e0e0e] group select-none isolate rounded-[16px]",
      aspectRatio,
      wrapperClassName
    )}>
      {/* 1. Vignette layer */}
      <div className="absolute inset-0 z-10 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.45)_100%)] transition-opacity duration-700 group-hover:opacity-80" />

      {/* 2. Micro SVG Film Grain */}
      <div
        className="absolute inset-0 z-10 pointer-events-none mix-blend-overlay opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* 3. The actual image — ALWAYS in DOM, never conditionally removed */}
      <motion.img
        ref={imgRef}
        src={imgState.currentSrc}
        alt={alt}
        width={width}
        height={height}
        onLoad={handleLoad}
        onError={handleError}
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{
          opacity: imgState.isLoaded ? 1 : 0,
          scale: imgState.isLoaded 
            ? (activeHover ? 1.05 : 1) 
            : 1.05,
        }}
        transition={{
          scale: {
            duration: activeHover ? 5 : 0.7,
            ease: activeHover ? "linear" : [0.16, 1, 0.3, 1]
          },
          opacity: { duration: 0.7, ease: [0.16, 1, 0.3, 1] }
        }}
        className={cn(
          "w-full h-full object-cover origin-center [image-rendering:-webkit-optimize-contrast] filter contrast-[1.05] brightness-[0.98] transition-all duration-[700ms] ease-out-expo group-hover:contrast-[1.10] group-hover:brightness-[0.96]",
          grayscale ? "grayscale mix-blend-luminosity group-hover:grayscale-0 group-hover:mix-blend-normal" : "",
          className
        )}
      />

      {/* 4. Fine white outline boundary */}
      <div className="absolute inset-0 pointer-events-none border border-white/5 z-20" />
    </div>
  );
};
