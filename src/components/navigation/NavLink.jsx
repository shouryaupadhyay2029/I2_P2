import React, { createContext, useContext, useId, useState } from "react";
import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "../../utils/cn";
import { useMagnet } from "../../hooks/useMagnet";

// Shared context so all NavLinks in the same nav share a single layoutId namespace
const NavIndicatorContext = createContext(null);

export const NavGroup = ({ children, className }) => {
  const id = useId();
  return (
    <NavIndicatorContext.Provider value={id}>
      <nav className={cn("hidden md:flex items-center gap-8", className)}>
        {children}
      </nav>
    </NavIndicatorContext.Provider>
  );
};

export const NavLink = ({ to, children, className, onClick, index }) => {
  const location = useLocation();
  const indicatorId = useContext(NavIndicatorContext);
  const isActive = location.pathname === to || (to !== "/" && location.pathname.startsWith(to));
  const [isHovered, setIsHovered] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const isHome = location.pathname === '/';

  // Gentle 5px magnetic pull on the text
  const { ref, x, y, handlers } = useMagnet({ maxDelta: 5, damping: 32, stiffness: 320 });

  const labelTransition = shouldReduceMotion 
    ? { duration: 0.05 } 
    : { duration: 0.18, ease: [0.16, 1, 0.3, 1] };

  return (
    <RouterNavLink
      to={to}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "relative py-2 px-0.5 outline-none focus-visible:ring-1 focus-visible:ring-accent/60 rounded-none flex items-center justify-center group",
        className
      )}
    >
      {/* Text layer — magnetic + opacity-based brightness */}
      <motion.span
        ref={ref}
        style={{ x, y }}
        {...handlers}
        animate={{
          color: isHome
            ? (isActive
              ? "rgba(26, 26, 26, 1)"
              : isHovered
                ? "rgba(26, 26, 26, 1)"
                : "rgba(26, 26, 26, 0.6)")
            : (isActive
              ? "rgba(255,255,255,1)"
              : isHovered 
                ? "rgba(255,255,255,1)"
                : "rgba(255,255,255,0.52)"),
          fontWeight: isActive ? 500 : 400,
          letterSpacing: isActive ? "0.005em" : isHovered ? "0.03em" : "0.005em",
        }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 will-change-transform text-[0.8125rem] font-ui"
      >
        {children}
      </motion.span>

      {/* Active indicator — the ONLY place layoutId lives */}
      {isActive && indicatorId && (
        <motion.span
          layoutId={`nav-indicator-${indicatorId}`}
          className={cn(
            "absolute -bottom-[3px] left-0 right-0 h-[1.5px] origin-center",
            isHome ? "bg-black" : "bg-accent"
          )}
          initial={false}
          transition={{
            layout: {
              type: "tween",
              duration: shouldReduceMotion ? 0.05 : 0.25,
              ease: [0.16, 1, 0.3, 1], // easeOutExpo
            },
          }}
        />
      )}

      {/* Hover underline — only when NOT active, grows from center */}
      {!isActive && (
        <motion.span
          className="absolute -bottom-[3px] left-0 right-0 h-[1px] origin-center"
          style={{ backgroundColor: "rgba(255, 255, 255, 0)" }}
          initial={{ scaleX: 0 }}
          animate={{
            scaleX: isHovered ? 1 : 0,
            backgroundColor: isHovered 
              ? (isHome ? "rgba(0, 0, 0, 0.4)" : "rgba(255, 255, 255, 0.6)") 
              : "rgba(255, 255, 255, 0)",
          }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        />
      )}

      {/* Technical Label (microdetail) */}
      <AnimatePresence>
        {isHovered && index && (
          <motion.span
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 4 }}
            animate={{ opacity: 0.45, y: 0 }}
            exit={{ opacity: 0, y: shouldReduceMotion ? 0 : 4 }}
            transition={labelTransition}
            className="absolute top-[calc(100%+4px)] left-1/2 -translate-x-1/2 text-[0.45rem] font-technical tracking-[0.15em] text-white/60 select-none whitespace-nowrap pointer-events-none uppercase"
          >
            INDEX {index}
          </motion.span>
        )}
      </AnimatePresence>
    </RouterNavLink>
  );
};
