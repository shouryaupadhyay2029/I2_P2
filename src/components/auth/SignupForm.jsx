import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AuthInput } from './AuthInput';
import { useAuth } from '../../hooks/useAuth';
import { User, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
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

export const SignupForm = ({ onSwitchState, onClose }) => {
  const { signup } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!fullName || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await signup(email, password, fullName);
      if (result.error) {
        setError(result.error);
      } else {
        if (onClose) onClose();
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
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col"
      >
        {/* Full Name block */}
        <motion.div className="py-5 border-b border-white/[0.05] flex flex-col gap-2" variants={itemVariants}>
          <span className="text-[9px] font-technical uppercase tracking-[0.25em] text-white/15 text-left">
            01 // Register Full Name
          </span>
          <AuthInput 
            type="text" 
            placeholder="John Doe" 
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={loading}
            icon={User}
          />
        </motion.div>

        {/* Email Address block */}
        <motion.div className="py-5 border-b border-white/[0.05] flex flex-col gap-2" variants={itemVariants}>
          <span className="text-[9px] font-technical uppercase tracking-[0.25em] text-white/15 text-left">
            02 // Email Address
          </span>
          <AuthInput 
            type="email" 
            placeholder="name@domain.com" 
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            icon={Mail}
          />
        </motion.div>

        {/* Password block */}
        <motion.div className="py-5 border-b border-white/[0.05] flex flex-col gap-2" variants={itemVariants}>
          <span className="text-[9px] font-technical uppercase tracking-[0.25em] text-white/15 text-left">
            03 // Secure Access Key
          </span>
          <AuthInput 
            type={showPassword ? "text" : "password"} 
            placeholder="••••••••" 
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            icon={Lock}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-white/20 hover:text-white/55 transition-colors focus:outline-none flex items-center justify-center p-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            }
          />
        </motion.div>

        {/* Confirm Password block */}
        <motion.div className="py-5 border-b border-white/[0.05] flex flex-col gap-2" variants={itemVariants}>
          <span className="text-[9px] font-technical uppercase tracking-[0.25em] text-white/15 text-left">
            04 // Verify Access Key
          </span>
          <AuthInput 
            type={showConfirmPassword ? "text" : "password"} 
            placeholder="••••••••" 
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            icon={Lock}
            rightElement={
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="text-white/20 hover:text-white/55 transition-colors focus:outline-none flex items-center justify-center p-1"
                aria-label={showConfirmPassword ? "Hide password confirmation" : "Show password confirmation"}
              >
                {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            }
          />
        </motion.div>

        {/* Submit button block (Option A Architectural Control Strip) */}
        <motion.div className="py-6 border-b border-white/[0.05]" variants={itemVariants}>
          <motion.button
            whileHover="hover"
            className={cn(
              "group/btn relative w-full h-[52px] rounded-[6px] bg-[#141414] border border-white/[0.06] text-white flex items-center justify-between cursor-pointer overflow-hidden transition-colors duration-300",
              loading ? "opacity-75 cursor-not-allowed" : "hover:bg-[#191919]"
            )}
            type="submit"
            disabled={loading}
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
                Create Account
              </span>
              <span className="text-[9px] font-technical uppercase tracking-[0.2em] text-white/30 font-light mt-0.5">
                Register Secure Access // Edition 01
              </span>
            </div>

            {/* Right Section execute block */}
            <div className="w-[110px] h-full flex items-center justify-center border-l border-white/[0.06] group-hover/btn:border-white/15 transition-colors duration-300 bg-white/[0.005]">
              {loading ? (
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
    </form>
  );
};
