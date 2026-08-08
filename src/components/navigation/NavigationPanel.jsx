import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NavLink } from "./NavLink";
import { Wordmark } from "./Wordmark";
import { cn } from "../../utils/cn";

export const NavigationPanel = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ y: "-100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "-100%", opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-0 left-0 right-0 z-50 bg-surface border-b border-border shadow-2xl md:hidden overflow-hidden"
          >
            <div className="h-[72px] px-6 flex items-center justify-between border-b border-border/50">
              <Wordmark />
              <button 
                onClick={onClose}
                className="p-2 -mr-2 text-primary hover:text-accent transition-colors focus:outline-none"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <nav className="flex flex-col py-6 px-6 gap-6 text-heading">
              <NavLink to="/events" onClick={onClose}>Events</NavLink>
              <NavLink to="/discover" onClick={onClose}>Discover</NavLink>
              <NavLink to="/about" onClick={onClose}>About</NavLink>
              <NavLink to="/support" onClick={onClose}>Support</NavLink>
              <NavLink to="/login" onClick={onClose} className="text-secondary mt-4 border-t border-border pt-6">Login</NavLink>
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
