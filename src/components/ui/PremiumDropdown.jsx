import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

const MENU_EASE = [0.16, 1, 0.3, 1];

/**
 * PremiumDropdown — dual-mode dropdown component.
 *
 * Standard mode (default): floats the label outside the trigger.
 * Compact mode: self-contained vertical pill for use inside the Discovery Console.
 *
 * Props:
 *  label       string
 *  value       string
 *  onChange    (value: string) => void
 *  options     { value: string, label: string }[]
 *  compact?    boolean — pill layout, no external label
 *  hideLabel?  boolean — suppress micro-label inside compact pill
 */
export const PremiumDropdown = ({
  label,
  value,
  onChange,
  options,
  compact = false,
  hideLabel = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const onOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  const selectedLabel = options.find(o => o.value === value)?.label || value;
  const isActive = value !== (options[0]?.value ?? 'All');

  /* ── COMPACT MODE (Discovery Console pill) ─────────────────────────────── */
  if (compact) {
    return (
      <div
        className="relative h-full flex flex-col"
        ref={dropdownRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <button
          type="button"
          onClick={() => setIsOpen(v => !v)}
          className={cn(
            'h-full flex flex-col items-start justify-center gap-[3px] px-5 py-3.5',
            'focus:outline-none cursor-pointer select-none min-w-[120px]',
            'transition-colors duration-200',
            isActive ? 'bg-accent/[0.03]' : '',
          )}
        >
          {/* Micro label */}
          {!hideLabel && (
            <span className={cn(
              'text-[0.42rem] font-technical uppercase tracking-[0.14em] transition-colors duration-200 leading-none',
              isActive
                ? 'text-accent/70'
                : isHovered || isOpen
                  ? 'text-white/40'
                  : 'text-white/22'
            )}>
              {label}
            </span>
          )}

          {/* Value + chevron */}
          <span className="flex items-center gap-2 w-full">
            <span className={cn(
              'text-[0.73rem] font-ui tracking-wide truncate transition-colors duration-200 leading-none',
              isActive
                ? 'text-accent'
                : isHovered || isOpen
                  ? 'text-white/80'
                  : 'text-white/55'
            )}>
              {selectedLabel}
            </span>
            <motion.span
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.2, ease: MENU_EASE }}
              className={cn(
                'ml-auto flex-shrink-0 transition-colors duration-200',
                isActive ? 'text-accent/50' : isHovered || isOpen ? 'text-white/35' : 'text-white/20'
              )}
            >
              <ChevronDown className="w-3 h-3" strokeWidth={1.5} />
            </motion.span>
          </span>
        </button>

        {/* Active indicator — thin bottom border */}
        <motion.div
          animate={{ scaleX: isActive ? 1 : 0, opacity: isActive ? 1 : 0 }}
          initial={{ scaleX: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: MENU_EASE }}
          className="absolute bottom-0 left-3 right-3 h-px bg-accent/40 origin-left"
        />

        {/* Dropdown menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: MENU_EASE }}
              className={cn(
                'absolute top-full left-0 z-50',
                'bg-[#111] border border-white/[0.09]',
                'shadow-[0_8px_24px_rgba(0,0,0,0.55)]',
                'max-h-[240px] overflow-y-auto scrollbar-none',
              )}
              style={{ minWidth: '160px' }}
            >
              {options.map((opt) => {
                const isSel = opt.value === value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => { onChange(opt.value); setIsOpen(false); }}
                    className={cn(
                      'px-4 py-2.5 flex items-center justify-between cursor-pointer',
                      'transition-colors duration-150 text-[0.72rem] font-ui tracking-wide',
                      isSel
                        ? 'text-accent bg-accent/[0.06]'
                        : 'text-white/55 hover:text-white/85 hover:bg-white/[0.025]'
                    )}
                  >
                    <span>{opt.label}</span>
                    {isSel && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        className="text-accent ml-3 flex-shrink-0"
                      >
                        <Check className="w-3 h-3" strokeWidth={2.5} />
                      </motion.span>
                    )}
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  /* ── STANDARD MODE (floating label, used outside the console) ───────────── */
  return (
    <div className="flex items-center gap-2 relative z-30" ref={dropdownRef}>
      <span className="text-[0.6rem] font-technical uppercase tracking-wider text-white/30">
        {label}
      </span>
      <button
        type="button"
        onClick={() => setIsOpen(v => !v)}
        className="bg-[#111] border border-white/10 text-white/80 px-3 py-1.5 rounded-none focus:outline-none focus:border-accent cursor-pointer hover:bg-white/[0.02] flex items-center justify-between gap-4 text-xs font-ui min-w-[120px]"
      >
        <span>{selectedLabel}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.22, ease: MENU_EASE }}
          className="text-white/40"
        >
          <ChevronDown className="w-3 h-3" />
        </motion.span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.2, ease: MENU_EASE }}
            className="absolute left-0 right-0 top-full mt-1.5 bg-[#141414] border border-white/10 z-40 max-h-60 overflow-y-auto shadow-[0_10px_24px_rgba(0,0,0,0.5)] scrollbar-none"
            style={{ minWidth: '150px' }}
          >
            {options.map((opt) => {
              const isSel = opt.value === value;
              return (
                <div
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setIsOpen(false); }}
                  className="px-3 py-2 text-xs text-white/75 hover:bg-white/[0.025] hover:text-white cursor-pointer flex items-center justify-between transition-colors duration-150 font-ui"
                >
                  <span>{opt.label}</span>
                  {isSel && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      className="text-accent"
                    >
                      <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    </motion.span>
                  )}
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
