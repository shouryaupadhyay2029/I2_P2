import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageTransition } from '../../components/layout/PageTransition';
import { PageContainer } from '../../components/layout/PageContainer';
import { SectionWrapper } from '../../components/layout/SectionWrapper';
import { AxisMarker } from '../../components/layout/AxisMarker';
import { ArrowRight, Key } from 'lucide-react';
import { cn } from '../../utils/cn';

export const AccessRequired = () => {
  const [code, setCode] = useState('');
  const [toast, setToast] = useState(null);

  const triggerToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleActivate = (e) => {
    e.preventDefault();
    if (!code.trim()) {
      triggerToast('error', 'Please enter a valid invitation code.');
      return;
    }
    // No activation logic yet, as per requirements
    triggerToast('error', 'Invitation validation is currently undergoing maintenance.');
  };

  return (
    <PageTransition>
      <PageContainer>
        <SectionWrapper className="min-h-[75vh] flex flex-col justify-center max-w-xl py-12 md:py-20 text-left relative">
          <AxisMarker index="403" label="Security Restriction" />

          {/* Heading Section */}
          <div className="flex flex-col mb-8 mt-6">
            <span className="text-[9px] font-technical text-accent uppercase tracking-[0.3em] mb-3 font-medium">
              403 // Access Restriction
            </span>
            <h1 className="text-[38px] leading-[1.1] font-display font-extralight text-white tracking-tighter">
              Organizer Access Required
            </h1>
            <p className="text-[13px] font-ui text-white/35 font-light mt-3 leading-relaxed">
              Only verified organizers can create, edit, duplicate, and manage campus events in the archive database.
            </p>
          </div>

          {/* Code Input Form */}
          <form onSubmit={handleActivate} className="flex flex-col gap-6 py-6 border-y border-white/[0.05]">
            <div className="flex flex-col gap-2">
              <span className="text-[9px] font-technical uppercase tracking-[0.25em] text-white/15">
                Authentication Code
              </span>
              <div className="relative w-full group/input flex items-center">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within/input:text-white/40 transition-colors z-10 pointer-events-none flex items-center justify-center">
                  <Key className="w-3.5 h-3.5" strokeWidth={1.25} />
                </span>
                <input
                  type="text"
                  placeholder="Enter Invitation Code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className={cn(
                    "w-full h-[52px] bg-black border border-white/[0.045] rounded-[6px] font-ui text-[13px] text-primary transition-all duration-200",
                    "shadow-[inset_0_1.5px_4px_rgba(0,0,0,0.95)] pr-12 pl-12",
                    "placeholder:text-white/15 focus:outline-none focus:border-accent/30 focus:ring-0 focus:shadow-[inset_0_1.5px_4px_rgba(0,0,0,0.95)]"
                  )}
                />
              </div>
            </div>

            {/* Action CTA (Option A Control Strip Style) */}
            <motion.button
              whileHover="hover"
              className="group/btn relative w-full h-[52px] rounded-[6px] bg-[#141414] border border-white/[0.06] text-white flex items-center justify-between cursor-pointer overflow-hidden transition-colors duration-300 hover:bg-[#191919]"
              type="submit"
            >
              {/* Top Accent line */}
              <motion.div
                className="absolute top-0 left-0 h-[2px] bg-accent z-10 pointer-events-none"
                initial={{ width: "25%" }}
                variants={{
                  hover: { width: "100%" }
                }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              />

              <div className="flex flex-col items-start justify-center pl-4 text-left flex-1 h-full select-none">
                <span className="text-[9px] font-technical uppercase tracking-[0.25em] text-white font-light transition-colors group-hover/btn:text-accent">
                  Activate Access
                </span>
                <span className="text-[9px] font-technical uppercase tracking-[0.2em] text-white/30 font-light mt-0.5">
                  Request Permission Level Update
                </span>
              </div>

              <div className="w-[110px] h-full flex items-center justify-center border-l border-white/[0.06] group-hover/btn:border-white/15 transition-colors duration-300 bg-white/[0.005]">
                <div className="flex items-center gap-1.5 select-none">
                  <span className="text-[9px] font-technical uppercase tracking-[0.2em] text-white/40 font-light group-hover/btn:text-white/60 transition-colors">
                    Activate
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-white/50 group-hover/btn:text-accent group-hover/btn:translate-x-1 transition-all duration-300" />
                </div>
              </div>
            </motion.button>
          </form>

          {/* Toast Notification */}
          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -16, filter: 'blur(4px)' }}
                className="fixed bottom-8 right-8 z-50 flex items-center gap-3 px-4 py-3 bg-[#111] border border-white/10"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
                <span className="text-[0.65rem] font-technical uppercase tracking-wider text-white/40">
                  {toast.type}
                </span>
                <span className="text-xs font-ui tracking-wide">{toast.message}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </SectionWrapper>
      </PageContainer>
    </PageTransition>
  );
};
