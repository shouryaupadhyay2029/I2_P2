import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FcGoogle } from 'react-icons/fc';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/cn';

export const SocialLogin = ({ onClose }) => {
  const { googleLogin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const result = await googleLogin();
      if (result && result.error) {
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
    <div className="w-full flex flex-col gap-2">
      {error && (
        <div className="p-3.5 rounded-[12px] bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-ui mb-2">
          {error}
        </div>
      )}
      <motion.button
        onClick={handleGoogleLogin}
        whileHover={!loading ? { y: -1 } : {}}
        className={cn(
          "group/btn relative w-full h-[54px] rounded-[6px] bg-[#161616] text-white font-technical uppercase tracking-[0.15em] text-[10px] font-medium transition-all duration-200",
          "border border-white/[0.05] flex items-center justify-between cursor-pointer overflow-hidden shadow-[0_2px_4px_rgba(0,0,0,0.3)]",
          "hover:bg-[#1c1c1c] hover:border-white/15"
        )}
        type="button"
        disabled={loading}
      >
        <span className="flex-1 text-center pl-[54px]">Continue with Google</span>
        <span className="w-[54px] h-full flex items-center justify-center border-l border-white/[0.05] group-hover/btn:border-white/15 transition-colors">
          {loading ? (
            <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <FcGoogle className="w-[18px] h-[18px]" />
          )}
        </span>
      </motion.button>
    </div>
  );
};
