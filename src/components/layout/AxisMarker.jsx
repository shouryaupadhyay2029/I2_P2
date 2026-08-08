import React from "react";
import { motion, useReducedMotion } from "framer-motion";

export const AxisMarker = ({ index, label }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-5%", amount: 0.1 }}
      className="relative w-full flex items-center mb-32 h-[1px] select-none"
    >
      {/* Technical divider grows horizontally left -> right over 500ms */}
      <motion.div
        variants={{
          hidden: { scaleX: 0 },
          visible: { scaleX: 1 }
        }}
        transition={{ duration: shouldReduceMotion ? 0.05 : 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-12 h-[1px] bg-border origin-left"
      />
      
      {/* The Space Mono label resting exactly on the notch */}
      <div className="flex items-center gap-4 pl-4 text-micro">
        {/* Tiny orange square appears */}
        <motion.span
          variants={{
            hidden: { scale: 0, opacity: 0 },
            visible: { scale: 1, opacity: 1 }
          }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: shouldReduceMotion ? 0 : 0.1 }}
          className="w-1.5 h-1.5 bg-accent inline-block shrink-0"
        />

        {/* Label text fades in */}
        <motion.div
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1 }
          }}
          transition={{ duration: 0.4, ease: "easeOut", delay: shouldReduceMotion ? 0 : 0.25 }}
          className="flex items-center gap-4"
        >
          <span className="text-primary font-medium">[{index}]</span>
          <span className="opacity-30">·</span>
          <span>{label}</span>
        </motion.div>
      </div>
    </motion.div>
  );
};
