import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AuthInput } from './AuthInput';
import { useAuth } from '../../hooks/useAuth';
import { Mail, ArrowRight } from 'lucide-react';
import { cn } from '../../utils/cn';

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] }
  }
};

export const ForgotPassword = ({ onSwitchState, onClose }) => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const result = await resetPassword(email);
      if (result && result.error) {
        setError(result.error);
      } else {
        setSuccessMsg('Password reset email has been sent.');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="mb-4 p-3.5 rounded-[6px] bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-ui">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="mb-4 p-3.5 rounded-[6px] bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-ui">
          {successMsg}
        </div>
      )}
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col"
      >
        {/* Email block */}
        <motion.div className="py-6 border-b border-white/[0.05] flex flex-col gap-2" variants={itemVariants}>
          <span className="text-[9px] font-technical uppercase tracking-[0.25em] text-white/15 text-left">
            01 // Target Identity (Email)
          </span>
          <AuthInput 
            type="email" 
            placeholder="name@domain.com" 
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading || !!successMsg}
            icon={Mail}
          />
        </motion.div>
        
        {/* Submit button block (Option A Architectural Control Strip) */}
        <motion.div className="py-6 border-b border-white/[0.05]" variants={itemVariants}>
          <motion.button
            whileHover="hover"
            className={cn(
              "group/btn relative w-full h-[52px] rounded-[6px] bg-[#141414] border border-white/[0.06] text-white flex items-center justify-between cursor-pointer overflow-hidden transition-colors duration-300",
              (loading || successMsg) ? "opacity-75 cursor-not-allowed" : "hover:bg-[#191919]"
            )}
            type="submit"
            disabled={loading || !!successMsg}
          >
            {/* Top Accent orange loader bar - expands on hover */}
            <motion.div 
              className="absolute top-0 left-0 h-[2px] bg-accent z-10 pointer-events-none"
              initial={{ width: "25%" }}
              variants={{
                hover: { width: "100%" }
              }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            />

            {/* Left Section labels */}
            <div className="flex flex-col items-start justify-center pl-4 text-left flex-1 h-full select-none">
              <span className="text-[9px] font-technical uppercase tracking-[0.25em] text-white font-light transition-colors group-hover/btn:text-accent">
                Send Reset Link
              </span>
              <span className="text-[9px] font-technical uppercase tracking-[0.2em] text-white/30 font-light mt-0.5">
                Reset Secure Key // Edition 01
              </span>
            </div>

            {/* Right Section execute block */}
            <div className="w-[110px] h-full flex items-center justify-center border-l border-white/[0.06] group-hover/btn:border-white/15 transition-colors duration-300 bg-white/[0.005]">
              {(loading || successMsg) ? (
                <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <div className="flex items-center gap-1.5 select-none">
                  <span className="text-[9px] font-technical uppercase tracking-[0.2em] text-white/40 font-light group-hover/btn:text-white/60 transition-colors">
                    Execute
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-white/50 group-hover/btn:text-accent group-hover/btn:translate-x-1 transition-all duration-300" />
                </div>
              )}
            </div>
          </motion.button>
        </motion.div>
      </motion.div>
      
      <div className="flex justify-center mt-6">
        <button 
          type="button"
          onClick={() => onSwitchState('login')}
          className="text-xs text-white/35 hover:text-white transition-colors flex items-center gap-1.5 font-ui focus:outline-none"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>Back to Login</span>
        </button>
      </div>
    </form>
  );
};
