import React, { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AxisMarker } from "../../../components/layout/AxisMarker";
import { RevealSection } from "../../../components/ui/RevealSection";

import { useLocation } from "react-router-dom";

const categories = [
  "Technical", "Hackathons", "Workshops", "Sports", "Cultural", "Seminars", "Competitions", "Networking", "Guest Lectures"
];

const ease = [0.16, 1, 0.3, 1];

const CategoryBadge = ({ category, index }) => {
  const [isHovered, setIsHovered] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.7, delay: index * 0.05, ease }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      animate={{
        borderColor: isHovered 
          ? (isHome ? "rgba(26, 26, 26, 0.4)" : "rgba(255, 255, 255, 0.35)") 
          : (isHome ? "rgba(26, 26, 26, 0.1)" : "rgba(255, 255, 255, 0.08)"),
        color: isHovered 
          ? (isHome ? "rgba(26, 26, 26, 1)" : "rgba(255, 255, 255, 1)") 
          : (isHome ? "rgba(26, 26, 26, 0.65)" : "rgba(255, 255, 255, 0.82)"),
      }}
      className="px-6 py-3 border bg-transparent text-sm font-ui rounded-none focus:outline-none relative flex items-center gap-2.5 cursor-pointer transition-colors duration-180"
    >
      {/* Tiny orange square rotates */}
      <motion.span
        animate={{
          scale: isHovered ? 1 : 0,
          opacity: isHovered ? 1 : 0,
          rotate: isHovered && !shouldReduceMotion ? 45 : 0,
        }}
        transition={{ duration: 0.18 }}
        className="w-1.5 h-1.5 bg-accent shrink-0"
      />
      
      <motion.span
        animate={{
          letterSpacing: isHovered && !shouldReduceMotion ? "0.08em" : "0.02em",
        }}
        transition={{ duration: 0.18 }}
      >
        {category}
      </motion.span>
      
      <span className="absolute -bottom-[1px] left-0 w-full h-[1px] bg-primary scale-x-0 group-hover:scale-x-100 transform origin-left transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]" />
    </motion.button>
  );
};

export const Categories = () => {
  return (
    <RevealSection as="section" className="w-full flex flex-col mb-32 pt-24">
      <AxisMarker index="03" label="Academic Domains" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 0.8, ease }}
        className="w-full max-w-[1200px] mb-24 flex flex-col md:flex-row justify-between items-start md:items-end gap-8"
      >
        <h2 className="text-display-l text-primary font-light">
          Explore by academic<br />and cultural domains.
        </h2>
        <div className="hidden lg:flex flex-col text-left gap-1 opacity-50 pr-8 pb-2">
          <span className="text-micro text-primary">NEX-EV-03 // DOMAINS</span>
          <span className="text-micro text-secondary">CLASSIFIED // ALL.CATEGORIES</span>
          <span className="text-micro text-secondary">TOTAL GROUPS // 09</span>
        </div>
      </motion.div>

      <div className="flex flex-wrap gap-4 w-full max-w-[1200px] pb-8">
        {categories.map((category, index) => (
          <CategoryBadge key={category} category={category} index={index} />
        ))}
      </div>
    </RevealSection>
  );
};
