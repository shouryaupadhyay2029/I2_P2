import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { LivingBackground } from "./LivingBackground";
import { Navbar } from "../navigation/Navbar";
import { Footer } from "./Footer";
import { initLenis } from "../../lib/lenis";
import { cn } from "../../utils/cn";

export const Layout = ({ children }) => {
  const location = useLocation();
  const isHome = location.pathname === '/' || location.pathname.startsWith('/organizer');

  useEffect(() => {
    const lenis = initLenis();
    let isLocked = false;

    const checkModalOpen = () => {
      const elements = document.querySelectorAll('.fixed, .absolute');
      let foundModal = false;

      for (const el of elements) {
        // Skip elements with pointer-events-none (like noise or grid overlays)
        if (el.classList.contains('pointer-events-none') || el.style.pointerEvents === 'none') {
          continue;
        }

        // Check for z-index >= 40 classes (e.g. z-40, z-50, z-[100], etc.)
        const hasHighZ = Array.from(el.classList).some(cls => {
          if (cls.startsWith('z-')) {
            const zStr = cls.replace('z-', '').replace('[', '').replace(']', '');
            const zNum = parseInt(zStr);
            return !isNaN(zNum) && zNum >= 40;
          }
          return false;
        }) || (el.style.zIndex && parseInt(el.style.zIndex) >= 40);

        // Check if it covers the full viewport height (inset-0, or top-0 + bottom-0/h-screen/h-full)
        const isBackdropOrPanel = el.classList.contains('inset-0') ||
          ((el.classList.contains('top-0') || el.classList.contains('inset-y-0')) &&
            (el.classList.contains('bottom-0') || el.classList.contains('h-screen') || el.classList.contains('h-full')));

        if (hasHighZ && isBackdropOrPanel) {
          const style = window.getComputedStyle(el);
          if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
            foundModal = true;
            if (!el.hasAttribute('data-lenis-prevent')) {
              el.setAttribute('data-lenis-prevent', 'true');
            }
          }
        }
      }

      if (foundModal && !isLocked) {
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        if (scrollbarWidth > 0) {
          document.body.style.paddingRight = `${scrollbarWidth}px`;
        }
        lenis.stop();
        isLocked = true;
      } else if (!foundModal && isLocked) {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        lenis.start();
        isLocked = false;
      }
    };

    // Run initial check
    checkModalOpen();

    // Observe body for changes
    const observer = new MutationObserver(() => {
      checkModalOpen();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    return () => {
      observer.disconnect();
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      if (lenis.cleanup) {
        lenis.cleanup();
      } else {
        lenis.destroy();
      }
    };
  }, []);

  return (
    <div className={cn(
      "relative min-h-screen w-full overflow-x-hidden font-ui flex flex-col",
      isHome ? (location.pathname.startsWith('/organizer') ? "bg-[#F5F3EE] text-[#111111]" : "bg-[#F5F2EB] text-black") : "bg-background text-primary"
    )}>
      {!isHome && <LivingBackground />}
      <Navbar />

      {isHome ? (
        /* Edge-to-edge cream layout for Landing Page */
        <div className="flex-grow flex flex-col w-full relative z-10 pt-0">
          <div className="w-full flex flex-col">
            {children}
          </div>
        </div>
      ) : (
        /* Framed technical layout with Event Axis column for other pages */
        <div className="flex-grow flex flex-col w-full relative z-10 pt-32">
          <div className="w-full max-w-[1400px] mx-auto px-6 md:px-10 relative flex">

            {/* THE EVENT AXIS WITH DETAILED EDITORIAL MARKINGS */}
            <div className="absolute left-6 md:left-10 top-0 bottom-0 w-[1px] bg-border hidden md:block">
              {/* Top Anchor: coordinates */}
              <div className="absolute top-[12%] -left-[140px] w-[280px] flex items-center justify-center pointer-events-none select-none rotate-90 origin-center">
                <span className="text-micro text-primary font-light whitespace-nowrap">
                  LOC [ 37.4275° N, 122.1697° W ]
                </span>
              </div>

              {/* Mid Anchor 1: term marker */}
              <div className="absolute top-[35%] -left-[140px] w-[280px] flex items-center justify-center pointer-events-none select-none rotate-90 origin-center">
                <span className="text-micro text-primary font-light whitespace-nowrap">
                  EDITION // 2026.AUTUMN
                </span>
              </div>

              {/* Mid Anchor 2: alignment crosshair */}
              <div className="absolute top-[62%] -left-[140px] w-[280px] flex items-center justify-center pointer-events-none select-none rotate-90 origin-center">
                <span className="text-micro text-primary font-light whitespace-nowrap">
                  ALIGN.INDEX.REF // 01
                </span>
              </div>

              {/* Bottom Anchor: term status */}
              <div className="absolute top-[85%] -left-[140px] w-[280px] flex items-center justify-center pointer-events-none select-none rotate-90 origin-center">
                <span className="text-micro text-accent opacity-60 font-light whitespace-nowrap">
                  TERM.01 // ACTIVE
                </span>
              </div>
            </div>

            {/* Content Column (shifted right to give axis space) */}
            <div className="w-full md:pl-24 flex flex-col pb-32">
              {children}
            </div>

          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};
