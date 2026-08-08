import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertCircle, FiCheckCircle, FiInfo } from 'react-icons/fi';
import { cn } from '../../utils/cn';

const variants = {
  error: {
    container: 'text-red-500 bg-red-500/10 border-red-500/20',
    icon: <FiAlertCircle className="w-4 h-4" />
  },
  success: {
    container: 'text-green-500 bg-green-500/10 border-green-500/20',
    icon: <FiCheckCircle className="w-4 h-4" />
  },
  warning: {
    container: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
    icon: <FiAlertCircle className="w-4 h-4" />
  },
  helper: {
    container: 'text-secondary',
    icon: <FiInfo className="w-4 h-4" />
  }
};

export const ValidationMessage = ({ message, type = 'error', className }) => {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -4, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -4, height: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={cn(
            'flex items-center gap-2 text-caption mt-2 px-2 py-1.5 rounded-none border border-transparent overflow-hidden',
            variants[type].container,
            className
          )}
        >
          <span className="shrink-0">{variants[type].icon}</span>
          <p>{message}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
