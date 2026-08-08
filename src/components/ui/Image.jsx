import React, { useState, useEffect, useRef } from 'react';
import { cn } from '../../utils/cn';

const EVENT_FALLBACK =
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=800&auto=format&fit=crop&fm=webp';

/**
 * Image — finite-state image loader with self-healing fallback.
 *
 * State machine:
 *   LOADING → LOADED          (onLoad fires)
 *   LOADING → FALLBACK        (onError fires, fallback assigned once)
 *   FALLBACK → LOADED         (fallback onLoad fires)
 *   FALLBACK → TERMINAL_ERROR (fallback onError fires — stays transparent, no infinite loop)
 *
 * Survives React StrictMode double-invocation via imgRef.complete rescue effect.
 * The <img> is ALWAYS mounted — spinner is an absolute overlay, never a replacement.
 */
export const Image = ({
  src,
  alt = 'Image',
  className,
  aspectRatio = 'aspect-video',
  ...props
}) => {
  const imgRef = useRef(null);

  // Single state atom to prevent split-brain between loading/error/src
  const [imgState, setImgState] = useState(() => ({
    currentSrc: src || EVENT_FALLBACK,
    isLoaded: false,
    fallbackAttempted: false,
  }));

  // When the src PROP changes from outside (e.g. preview modal opened for a
  // different event), reset to the new source.
  useEffect(() => {
    const resolved = src || EVENT_FALLBACK;
    setImgState({
      currentSrc: resolved,
      isLoaded: false,
      fallbackAttempted: false,
    });
  }, [src]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── StrictMode rescue ──────────────────────────────────────────────────────
  // React StrictMode double-invokes effects. If onLoad fired in pass-1 and
  // useEffect([src]) re-ran in pass-2 resetting isLoaded=false, this no-dep
  // effect (runs after EVERY render) sees img.complete=true and immediately
  // corrects the state. React bails out of the re-render when value is same.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0 && !imgState.isLoaded) {
      setImgState((prev) => ({ ...prev, isLoaded: true }));
    }
  }); // intentionally no deps array — runs after every render, O(1) cost

  const handleLoad = () => {
    setImgState((prev) => ({ ...prev, isLoaded: true }));
  };

  const handleError = () => {
    setImgState((prev) => {
      // Primary src failed → switch to fallback ONCE
      if (!prev.fallbackAttempted) {
        return {
          currentSrc: EVENT_FALLBACK,
          isLoaded: false,
          fallbackAttempted: true,
        };
      }
      // Fallback also failed → terminal error; stop spinning, keep transparent
      return { ...prev, isLoaded: true }; // treat as "done" to remove spinner
    });
  };

  return (
    <div className={cn('relative overflow-hidden shrink-0', aspectRatio, className)}>
      {/* Spinner overlay — absolutely positioned so <img> is NEVER unmounted */}
      {!imgState.isLoaded && (
        <div className="pointer-events-none absolute inset-0 z-10 flex animate-pulse items-center justify-center bg-white/[0.03]">
          <div className="h-4 w-4 animate-spin rounded-full border border-white/10 border-t-accent" />
        </div>
      )}

      {/* <img> is ALWAYS in the DOM so browser can initiate the request */}
      <img
        ref={imgRef}
        src={imgState.currentSrc}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'h-full w-full object-cover transition-opacity duration-500',
          imgState.isLoaded ? 'opacity-100' : 'opacity-0',
        )}
        {...props}
      />
    </div>
  );
};
