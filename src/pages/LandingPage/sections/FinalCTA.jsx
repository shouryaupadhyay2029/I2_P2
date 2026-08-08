import React from "react";
import { motion } from "framer-motion";
import { AxisMarker } from "../../../components/layout/AxisMarker";
import { Button } from "../../../components/ui/Button";

const ease = [0.16, 1, 0.3, 1];

export const FinalCTA = () => {
  return (
    <section className="w-full flex flex-col mb-32 pt-24">
      <AxisMarker index="08" label="Action" />
      
      <div className="flex flex-col py-16 md:py-24 relative max-w-[1200px] w-full items-start text-left">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 1, ease }}
          className="flex flex-col items-start w-full max-w-4xl"
        >
          <span className="text-[0.65rem] text-primary font-technical tracking-[0.25em] uppercase mb-12">
            End of Publication — Vol. 01
          </span>
          <h2 className="text-[3rem] md:text-[5rem] leading-[0.9] tracking-tight font-display text-primary mb-16">
            Ready for your next<br className="hidden md:block"/> experience?
          </h2>
          
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <Button variant="primary" size="lg" className="w-full sm:w-auto px-12">Explore Archive</Button>
            <Button variant="ghost" size="lg" className="w-full sm:w-auto px-12">Sign In</Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
