import React from "react";
import { motion } from "framer-motion";
import { RevealSection, RevealItem } from "../../../components/ui/RevealSection";

export const TrustedOrganizations = () => {
  const logos = [
    { name: "Vercel", icon: "▲" },
    { name: "Linear", icon: "⧉" },
    { name: "Raycast", icon: "⌘" },
    { name: "Framer", icon: "✦" },
    { name: "Stripe", icon: "⟁" },
    { name: "Notion", icon: "▰" }
  ];

  return (
    <RevealSection as="section" className="w-full py-16 border-t border-b border-black/[0.06] bg-transparent select-none my-12">
      <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
        <RevealItem className="flex-[0_0_auto]">
          <span className="text-[10px] font-technical uppercase tracking-[0.25em] text-black/40">
            TRUSTED BY LEADING TEAMS
          </span>
        </RevealItem>

        <RevealItem className="flex-grow w-full">
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-10 md:gap-14 opacity-60">
            {logos.map((logo) => (
              <motion.div
                key={logo.name}
                whileHover={{ scale: 1.05, opacity: 1, color: "#000" }}
                className="flex items-center gap-2 text-black/70 text-xs font-technical transition-colors cursor-default"
              >
                <span className="text-sm font-semibold">{logo.icon}</span>
                <span className="font-medium tracking-widest uppercase text-[10px]">{logo.name}</span>
              </motion.div>
            ))}
          </div>
        </RevealItem>
      </div>
    </RevealSection>
  );
};
