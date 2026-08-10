import React from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "../../utils/cn";

export const Wordmark = ({ className }) => {
  const location = useLocation();
  const isLight = location.pathname === '/' || 
                  location.pathname.startsWith('/organizer') || 
                  location.pathname === '/events' || 
                  location.pathname === '/my-events' || 
                  location.pathname === '/create-event';
  const easeOutQuart = [0.25, 1, 0.5, 1];

  return (
    <Link
      to="/"
      className={cn(
        "flex items-center gap-3 focus:outline-none rounded-none select-none group",
        className
      )}
    >
      <motion.div
        className="flex items-center gap-3"
        whileHover="hover"
      >
        {/* Minimal geometric N logo in a box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 0.96, scale: 1 }}
          variants={{
            hover: {
              scale: 1.05,
              opacity: 1,
            }
          }}
          transition={{
            duration: 0.22,
            ease: easeOutQuart
          }}
          className={cn(
            "w-8 h-8 flex items-center justify-center rounded-[8px] transition-colors",
            isLight ? "bg-black text-white" : "bg-white/10 text-white"
          )}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-[18px] h-[18px]"
          >
            <path d="M4 20V4h4l8 12V4h4v16h-4l-8-12v12H4z" />
          </svg>
        </motion.div>

        {/* Vertical subtle separator */}
        <motion.div 
          className={cn("h-5 w-[1px] hidden sm:block", isLight ? "bg-black/15" : "bg-white/10")}
          variants={{
            hover: {
              backgroundColor: isLight ? "rgba(0, 0, 0, 0.3)" : "rgba(255, 255, 255, 0.2)"
            }
          }}
          transition={{
            duration: 0.22,
            ease: easeOutQuart
          }}
        />

        {/* Premium Wordmark Stack */}
        <div className="flex flex-col text-left justify-center">
          <motion.span
            variants={{
              hover: {
                color: isLight ? "rgba(0, 0, 0, 1)" : "rgba(255, 255, 255, 1)"
              }
            }}
            transition={{ duration: 0.22, ease: easeOutQuart }}
            className={cn(
              "font-ui text-[0.875rem] md:text-[0.9375rem] font-bold tracking-[0.18em] leading-none mb-1",
              isLight ? "text-black" : "text-white/90"
            )}
          >
            NOVAEVENT
          </motion.span>

          <span className={cn(
            "text-[0.52rem] md:text-[0.56rem] tracking-[0.24em] font-technical uppercase leading-none opacity-90",
            isLight ? "text-black/40" : "text-white/35"
          )}>
            Plan. Host. Experience.
          </span>
        </div>
      </motion.div>
    </Link>
  );
};
