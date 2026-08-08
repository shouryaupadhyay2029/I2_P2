import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

// Easing
const EASE = [0.16, 1, 0.3, 1];

export const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default', // 'default' | 'danger' | 'warning' | 'success' | 'logout'
  loading = false,
  onConfirm,
  onCancel,
  sections, // Array of { label: string, desc: string }
  referenceId,
  technicalHeader
}) => {
  const dialogRef = useRef(null);
  const confirmBtnRef = useRef(null);

  // Esc key closes, Enter key confirms
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onCancel();
      }
      if (e.key === 'Enter' && !loading) {
        e.preventDefault();
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onConfirm, onCancel]);

  // Trap focus
  useEffect(() => {
    if (!isOpen) return;

    setTimeout(() => {
      if (confirmBtnRef.current) {
        confirmBtnRef.current.focus();
      }
    }, 50);

    const handleFocus = (e) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target)) {
        e.stopPropagation();
        confirmBtnRef.current?.focus();
      }
    };

    document.addEventListener('focus', handleFocus, true);
    return () => document.removeEventListener('focus', handleFocus, true);
  }, [isOpen]);

  // Prevent scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Derive technical header
  const techHeader = technicalHeader || (
    variant === 'logout' ? 'SESSION TERMINATION' :
    variant === 'danger' ? 'DESTRUCTIVE PROTOCOL' :
    variant === 'warning' ? 'SYSTEM WARNING' :
    variant === 'success' ? 'VERIFICATION COMPLETED' : 'SYSTEM OPERATION'
  );

  // Derive reference ID
  const refId = referenceId || (
    variant === 'logout' ? 'AUTH-002' :
    variant === 'danger' ? 'DEL-104' :
    variant === 'warning' ? 'WRN-001' :
    variant === 'success' ? 'SEC-001' : 'SYS-100'
  );

  // Theme styles based on variant
  const getTheme = () => {
    switch (variant) {
      case 'danger':
        return {
          glowColor: 'radial-gradient(circle 80% 50% at 50% -20%, rgba(239,68,68,0.035) 0%, transparent 80%)',
          accentText: 'text-red-400',
          accentBorder: 'border-red-500/18',
          techHeaderColor: 'text-red-400/80',
          indicatorColor: 'bg-red-500'
        };
      case 'success':
        return {
          glowColor: 'radial-gradient(circle 80% 50% at 50% -20%, rgba(34,197,94,0.035) 0%, transparent 80%)',
          accentText: 'text-green-400',
          accentBorder: 'border-green-500/18',
          techHeaderColor: 'text-green-400/80',
          indicatorColor: 'bg-green-500'
        };
      case 'warning':
        return {
          glowColor: 'radial-gradient(circle 80% 50% at 50% -20%, rgba(245,158,11,0.035) 0%, transparent 80%)',
          accentText: 'text-amber-400',
          accentBorder: 'border-amber-500/18',
          techHeaderColor: 'text-amber-400/80',
          indicatorColor: 'bg-amber-500'
        };
      default:
        return {
          glowColor: 'radial-gradient(circle 80% 50% at 50% -20%, rgba(201,106,43,0.035) 0%, transparent 80%)',
          accentText: 'text-accent',
          accentBorder: 'border-accent/20',
          techHeaderColor: 'text-accent/80',
          indicatorColor: 'bg-accent'
        };
    }
  };

  const theme = getTheme();

  // If no sections provided, build a single section from the message
  const displaySections = sections || (message ? [
    { label: "DETAILS & PRESENCE", desc: message }
  ] : []);

  // Framer Motion Animation Variants
  const containerVariants = {
    hidden: { opacity: 0, y: 18 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.38,
        ease: EASE,
        staggerChildren: 0.04,
        delayChildren: 0.08
      }
    },
    exit: { 
      opacity: 0, 
      y: 18,
      transition: {
        duration: 0.25,
        ease: EASE,
        staggerChildren: 0.03,
        staggerDirection: -1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3, ease: EASE }
    },
    exit: {
      opacity: 0,
      y: 8,
      transition: { duration: 0.2, ease: EASE }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop with heavy blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => {
              if (!loading) onCancel();
            }}
            className="absolute inset-0 bg-black/70 backdrop-blur-[4px]"
          />

          {/* Modal Panel Container */}
          <motion.div
            ref={dialogRef}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-[95vw] md:max-w-[620px] lg:max-w-[700px] max-h-[90vh] bg-[#0c0c0c] border border-white/[0.06] flex flex-col overflow-y-auto select-none font-ui scrollbar-custom rounded-[20px]"
            role="dialog"
            aria-modal="true"
          >
            {/* Subtle atmospheric glow behind modal header */}
            <div 
              className="absolute top-0 left-0 right-0 h-40 pointer-events-none z-0"
              style={{ background: theme.glowColor }}
            />

            {/* Extremely soft blueprint grid pattern */}
            <div 
              className="absolute inset-0 pointer-events-none opacity-[0.015] mix-blend-overlay z-0" 
              style={{
                backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px), 
                                  linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), 
                                  linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)`,
                backgroundSize: '24px 24px',
                backgroundPosition: 'center'
              }}
            />

            {/* Top Indicator Accent Line */}
            <div className={cn("w-full h-[2px]", theme.indicatorColor)} />

            {/* Content Area */}
            <div className="p-6 md:p-10 flex flex-col gap-6 relative z-10 text-left">
              {/* Header Protocol Row */}
              <motion.div 
                variants={itemVariants} 
                className="flex items-center justify-between select-none"
              >
                <div className="flex items-center gap-2">
                  <span className={cn("w-1 h-1 rounded-full", theme.indicatorColor)} />
                  <span className={cn("text-[0.45rem] font-technical uppercase tracking-[0.25em]", theme.techHeaderColor)}>
                    {techHeader}
                  </span>
                </div>
                <span className="text-[0.45rem] font-technical uppercase tracking-widest text-white/20">
                  REF. {refId}
                </span>
              </motion.div>

              {/* Title & Headline */}
              <motion.div variants={itemVariants} className="flex flex-col gap-1.5">
                <h3 className="text-display-sm font-light text-primary tracking-tight leading-[1.2]">
                  {title}
                </h3>
              </motion.div>

              {/* Architectural Information Sections (Scrollable if excessive content) */}
              {displaySections.length > 0 && (
                <motion.div 
                  variants={itemVariants} 
                  className="max-h-[280px] overflow-y-auto pr-1.5 scrollbar-custom flex flex-col font-technical"
                >
                  {displaySections.map((sec, idx) => (
                    <div key={idx} className="flex flex-col">
                      {/* Divider line before section */}
                      <div className="h-[1px] w-full bg-white/[0.04]" />
                      
                      <div className="py-3.5 flex flex-col gap-1.5">
                        {/* Numbered technical label */}
                        <span className="text-[0.45rem] tracking-[0.2em] text-white/22 uppercase font-medium">
                          {String(idx + 1).padStart(2, '0')} // {sec.label}
                        </span>
                        <span className="text-[0.7rem] text-white/45 font-light leading-relaxed font-sans">
                          {sec.desc}
                        </span>
                      </div>
                    </div>
                  ))}
                  {/* Final enclosing divider */}
                  <div className="h-[1px] w-full bg-white/[0.04]" />
                </motion.div>
              )}

              {/* Actions Label Bar */}
              <motion.div variants={itemVariants} className="flex items-center justify-between select-none mt-2">
                <span className="text-[0.45rem] font-technical uppercase tracking-[0.25em] text-white/20">
                  ACTION PROTOCOL
                </span>
                <div className="h-[1px] flex-1 bg-white/[0.04] ml-4" />
              </motion.div>

              {/* Action Buttons Directory */}
              <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 items-center w-full">
                {/* Cancel Button */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={onCancel}
                  className="w-full sm:flex-[0.4] h-[48px] bg-transparent border border-white/10 text-white/40 hover:text-white hover:border-white/20 text-[0.62rem] font-technical uppercase tracking-[0.2em] hover:bg-white/[0.015] active:scale-[0.99] transition-all duration-[180ms] ease-out select-none focus:outline-none flex items-center justify-center gap-1.5"
                >
                  <span>{cancelText}</span>
                </button>

                {/* Confirm/Execute Button */}
                <button
                  ref={confirmBtnRef}
                  type="button"
                  disabled={loading}
                  onClick={onConfirm}
                  className={cn(
                    "w-full sm:flex-[0.6] h-[48px] text-[0.62rem] font-technical uppercase tracking-[0.2em] flex items-center justify-center gap-2.5 transition-all duration-[180ms] ease-out select-none disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none group/btn active:scale-[0.99]",
                    variant === 'danger'
                      ? 'bg-red-950/40 border border-red-500/25 text-red-200 hover:bg-red-900/40 hover:border-red-400/40'
                      : variant === 'success'
                        ? 'bg-green-950/40 border border-green-500/25 text-green-200 hover:bg-green-900/40 hover:border-green-400/40'
                        : 'bg-accent/12 border border-accent/25 text-accent hover:bg-accent/20 hover:border-accent/40'
                  )}
                >
                  {loading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{confirmText}</span>
                      <svg className="w-3.5 h-3.5 stroke-current transform transition-transform duration-[180ms] ease-out group-hover/btn:translate-x-[4px]" fill="none" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </>
                  )}
                </button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
