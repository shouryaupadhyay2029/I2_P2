import React from "react";
import { motion } from "framer-motion";
import { AxisMarker } from "../../../components/layout/AxisMarker";
import { RevealSection } from "../../../components/ui/RevealSection";

const ease = [0.16, 1, 0.3, 1];

const pillars = [
  {
    label: "VOL. 01 // DISCOVER",
    title: "Curated Discovery",
    desc: "Navigate through a meticulously curated catalog of premium experiences. Find exactly what aligns with your interests without the noise.",
  },
  {
    label: "VOL. 01 // REGISTER",
    title: "Frictionless Entry",
    desc: "A singular, unified registration flow. Secure your attendance instantly with secure credentials and architectural precision.",
  },
  {
    label: "VOL. 01 // CONNECT",
    title: "Meaningful Network",
    desc: "Beyond the event itself. Build your professional network through verified attendance and post-event engagement.",
  }
];

export const WhyNexEvent = () => {
  return (
    <RevealSection as="section" className="w-full flex flex-col mb-32 pt-24">
      <h2 className="sr-only">Core Philosophy</h2>
      <AxisMarker index="02" label="Core Philosophy" />
      
      {/* Balancing the 3 columns across the full width */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-12 lg:gap-16 w-full max-w-[1200px] justify-between">
        {pillars.map((pillar, index) => (
          <motion.div 
            key={pillar.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.8, delay: index * 0.15, ease }}
            className="flex flex-col group cursor-default"
          >
            <span className="text-[0.65rem] text-secondary tracking-[0.25em] mb-8 font-technical uppercase border-b border-border pb-4">
              {pillar.label}
            </span>
            <h3 className="text-[2rem] leading-[0.9] font-display text-primary mb-6 tracking-[-0.02em]">{pillar.title}</h3>
            <p className="text-body text-secondary font-light max-w-sm leading-relaxed">
              {pillar.desc}
            </p>
          </motion.div>
        ))}
      </div>
    </RevealSection>
  );
};
