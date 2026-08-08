import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';
import { ForgotPassword } from './ForgotPassword';
import { SocialLogin } from './SocialLogin';

const modalVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.16, 1, 0.3, 1],
      when: "beforeChildren",
      staggerChildren: 0.05
    }
  },
  exit: {
    opacity: 0,
    y: 8,
    transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] }
  }
};

const childVariants = {
  hidden: { opacity: 0, y: 4 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] }
  }
};

export const AuthModal = ({ isOpen, onClose, initialView = 'login' }) => {
  const [view, setView] = useState(initialView);
  const modalRef = useRef(null);

  // Reset view when modal opens
  useEffect(() => {
    if (isOpen) {
      setView(initialView);
    }
  }, [isOpen, initialView]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle click outside
  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  const titles = {
    login: {
      title: "Welcome Back",
      subtitle: "Continue to your archive."
    },
    signup: {
      title: "Create Account",
      subtitle: "Let's get you started."
    },
    forgotPassword: {
      title: "Reset Password",
      subtitle: "We'll send you a recovery link."
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          
          {/* ── BACKGROUND OVERLAY ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-black/60 z-0 pointer-events-auto"
            onClick={handleBackdropClick}
          />

          {/* Very soft white radial glow behind the card (extremely low opacity) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.01)_0%,transparent_70%)] pointer-events-none blur-3xl z-0" />

          {/* Film grain overlay (matching the website grain) */}
          <div 
            className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-[0.025] z-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            }}
          />

          {/* ── SHARP ARCHITECTURAL PANEL ── */}
          <motion.div
            ref={modalRef}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-[440px] bg-[#101010] border border-white/[0.045] rounded-[8px] shadow-[inset_0_1px_0_rgba(255,255,255,0.015),_0_24px_50px_rgba(0,0,0,0.6)] flex flex-col z-10 overflow-hidden"
          >
            {/* Top Accent Indicator Bar (static loadbar detail) */}
            <div className="absolute top-0 left-0 h-[2px] w-[25%] bg-white z-20" />

            {/* Inner Content Padding */}
            <div className="p-8 sm:p-10 flex flex-col h-full relative">
              
              {/* SECTION 1: HEADER */}
              <motion.div className="pb-8 border-b border-white/[0.05] flex flex-col relative text-left" variants={childVariants}>
                {/* Tiny architectural metadata label */}
                <div className="absolute right-0 top-0 text-[8px] font-technical uppercase tracking-[0.2em] text-white/20 select-none">
                  VOL.01 // NODE.09
                </div>
                <span className="text-[9px] font-technical text-accent uppercase tracking-[0.3em] mb-3 font-medium">
                  NOVAEVENT // AUTHENTICATION
                </span>
                <h2 className="text-[38px] leading-[1.05] font-display font-extralight text-white tracking-tighter">
                  {titles[view].title}
                </h2>
                <p className="text-[13px] font-ui text-white/35 font-light mt-2 leading-relaxed">
                  {titles[view].subtitle}
                </p>
              </motion.div>

              {/* SECTION 2: DYNAMIC FORM */}
              <motion.div variants={childVariants}>
                {view === 'login' && <LoginForm onSwitchState={setView} onClose={onClose} />}
                {view === 'signup' && <SignupForm onSwitchState={setView} onClose={onClose} />}
                {view === 'forgotPassword' && <ForgotPassword onSwitchState={setView} onClose={onClose} />}
              </motion.div>

              {/* SECTION 3: SOCIAL LOGIN (GOOGLE) */}
              {view !== 'forgotPassword' && (
                <motion.div className="py-6 border-b border-white/[0.05] flex flex-col gap-4" variants={childVariants}>
                  <div className="flex justify-between items-center select-none">
                    <span className="text-[8px] font-technical uppercase tracking-[0.2em] text-white/20 text-left">
                      Alternative Method
                    </span>
                    <span className="text-[8px] font-technical uppercase tracking-[0.2em] text-white/20 text-right">
                      OAuth Secure
                    </span>
                  </div>
                  <SocialLogin onClose={onClose} />
                </motion.div>
              )}

              {/* SECTION 4: FOOTER ACTIONS */}
              {view !== 'forgotPassword' && (
                <motion.div className="pt-6 flex justify-between items-center text-[10px] font-technical uppercase tracking-widest text-white/20" variants={childVariants}>
                  <span className="select-none">EDITION 07.2026 // ONLINE</span>
                  <p className="font-light tracking-widest text-white/45">
                    {view === 'login' ? "New? " : "Registered? "}
                    <button
                      onClick={() => setView(view === 'login' ? 'signup' : 'login')}
                      className="text-accent hover:text-accent/80 font-medium transition-colors outline-none focus:underline"
                    >
                      {view === 'login' ? "[ CREATE ]" : "[ SIGN IN ]"}
                    </button>
                  </p>
                </motion.div>
              )}

            </div>
          </motion.div>

        </div>
      )}
    </AnimatePresence>
  );
};
