import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export const HeroHeadline = () => {
  const [sweepActive, setSweepActive] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  // Staggered reveal animation variants (120ms stagger)
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.12,
      }
    }
  };

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      y: shouldReduceMotion ? 0 : 35, 
    },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        duration: 0.7, // 700ms reveal
        ease: [0.16, 1, 0.3, 1] // easeOutExpo
      }
    }
  };

  return (
    <div 
      onMouseEnter={() => setSweepActive(true)}
      onMouseLeave={() => setSweepActive(false)}
      className="relative mb-10 w-fit select-none overflow-hidden group cursor-default"
    >
      <motion.div
        animate={{
          opacity: [0.98, 1, 0.98],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="relative z-10"
      >
        <motion.h1 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-display-xl flex flex-col relative z-10"
        >
          {/* Base Text Layer (Default view) */}
          <div className="flex flex-col relative z-0 leading-none">
            <motion.span variants={itemVariants} className="text-primary font-light font-display italic">Plan.</motion.span>
            <motion.span variants={itemVariants} className="text-primary font-light font-display">Host.</motion.span>
            <motion.span variants={itemVariants} className="text-secondary font-normal font-display italic">Experience.</motion.span>
          </div>
        </motion.h1>
      </motion.div>

      {/* Brushed aluminum light sweep (5% peak opacity, 700ms duration) */}
      {!shouldReduceMotion && (
        <motion.div
          className="absolute inset-0 z-20 pointer-events-none mix-blend-overlay"
          style={{
            background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.05) 50%, transparent 70%)',
            width: '200%',
            height: '100%',
            left: '-100%',
          }}
          animate={sweepActive ? { x: ['0%', '150%'] } : { x: '-100%' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        />
      )}
    </div>
  );
};
