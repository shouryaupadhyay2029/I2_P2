import React from 'react';
import { motion } from 'framer-motion';
import { Wordmark } from '../navigation/Wordmark';
import { NoiseOverlay } from './NoiseOverlay';
import { staggerItem, staggerContainer } from '../../animations/framerPresets';

export const AuthenticationLayout = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row font-ui relative overflow-hidden">
      <NoiseOverlay />
      
      {/* Left Panel - Brand Storytelling */}
      <div className="w-full md:w-[45%] lg:w-[40%] flex flex-col justify-between p-8 md:p-12 lg:p-16 border-b md:border-b-0 md:border-r border-border relative z-10 bg-surface/30 backdrop-blur-md">
        
        {/* Decorative subtle grid background specifically for the left panel */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)`,
            backgroundSize: '4rem 4rem'
          }}
        />

        <div className="relative z-10">
          <Wordmark className="mb-12" />
        </div>

        <motion.div 
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="relative z-10 max-w-md mt-12 md:mt-0"
        >
          <motion.div variants={staggerItem} className="mb-6 inline-block border border-border px-3.5 py-1.5 rounded-none bg-surface/50">
            <span className="text-metadata text-secondary tracking-widest uppercase">
              Digital Experience Foundation
            </span>
          </motion.div>
          
          <motion.h1 variants={staggerItem} className="text-section-heading text-primary mb-4">
            {title || "Welcome to the future of experiences."}
          </motion.h1>
          
          <motion.p variants={staggerItem} className="text-body text-secondary leading-relaxed">
            {subtitle || "A thoughtfully designed space for discovering, organizing, and attending events without the noise."}
          </motion.p>
        </motion.div>

        <div className="hidden md:block relative z-10 mt-12 text-caption text-muted">
          © {new Date().getFullYear()} NovaEvent Platform. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Form Area */}
      <div className="w-full md:w-[55%] lg:w-[60%] flex items-center justify-center p-8 md:p-12 lg:p-16 relative z-10">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>

      {/* Mobile Footer */}
      <div className="md:hidden p-8 text-center text-caption text-muted relative z-10">
        © {new Date().getFullYear()} NovaEvent Platform
      </div>
    </div>
  );
};
