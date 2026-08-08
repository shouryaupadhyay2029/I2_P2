import React from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FeaturedEventCard } from "../../../components/ui/FeaturedEventCard";
import { cn } from "../../../utils/cn";

export const Hero = ({ event, loading }) => {
  const navigate = useNavigate();
  const { scrollY } = useScroll();

  // Scroll-linked fade-outs
  const contentOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const contentY = useTransform(scrollY, [0, 400], [0, -10]);

  return (
    <section className="min-h-[92vh] flex flex-col justify-center relative select-none bg-[#F5F2EB] text-black overflow-hidden py-24 md:py-28 px-6 md:px-16 border-b border-black/[0.04]">
      {/* ── Vertical grid guidelines ── */}
      <div className="absolute inset-0 flex justify-between pointer-events-none z-0 px-8 md:px-16 opacity-[0.03]">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="w-[1px] h-full bg-black" />
        ))}
      </div>

      {/* ── Margin vertical rotated texts ── */}
      <div className="absolute left-6 top-1/3 -translate-y-1/2 -rotate-90 origin-left hidden xl:flex items-center gap-2 text-micro text-black/30 font-technical tracking-[0.25em] whitespace-nowrap">
        <span>NOVAEVENT</span>
        <span>//</span>
        <span>2026</span>
      </div>

      {/* ── Main content grid ── */}
      <motion.div
        style={{ opacity: contentOpacity, y: contentY }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8 w-full max-w-[1240px] mx-auto items-center relative z-10"
      >
        {/* Left Typography Column */}
        <div className="col-span-1 lg:col-span-7 flex flex-col items-start text-left">
          {/* Status Label */}
          <div className="flex items-center gap-2.5 mb-8 font-technical text-micro text-black/50 tracking-[0.2em]">
            <span className="w-1.5 h-1.5 bg-black block" />
            <span>STATUS // ONLINE</span>
          </div>

          {/* Elegant Serifs Hero Title */}
          <h1 className="text-[4.5rem] md:text-[6.2rem] leading-[0.92] tracking-tight text-black font-light mb-8">
            <span className="italic block" style={{ fontFamily: "'Instrument Serif', serif" }}>Plan.</span>
            <span className="block font-normal" style={{ fontFamily: "'Instrument Serif', serif" }}>Host.</span>
            <span className="italic block" style={{ fontFamily: "'Instrument Serif', serif" }}>Experience.</span>
          </h1>

          {/* Subtitle description */}
          <p className="text-[0.95rem] md:text-[1.05rem] text-black/60 font-sans font-light max-w-sm mb-10 leading-relaxed">
            The modern event platform. Designed for the seamless creation, management, and discovery of unforgettable experiences.
          </p>

          {/* CTA Button Row */}
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => navigate("/events")}
              className="inline-flex items-center justify-center bg-black text-white text-[9px] font-technical uppercase tracking-[0.2em] px-7 h-12 hover:bg-black/90 transition-all rounded-none cursor-pointer border border-black"
            >
              <span>Explore Events</span>
              <span className="ml-2.5 text-[11px]">↗</span>
            </button>
            <button
              onClick={() => navigate("/about")}
              className="inline-flex items-center justify-center bg-transparent border border-black/15 text-black text-[9px] font-technical uppercase tracking-[0.2em] px-7 h-12 hover:bg-black/[0.04] transition-all rounded-none cursor-pointer"
            >
              <span>Learn More</span>
            </button>
          </div>
        </div>

        {/* Right Event Card Column */}
        <div className="col-span-1 lg:col-span-5 flex justify-center lg:justify-end">
          <FeaturedEventCard event={event} loading={loading} />
        </div>
      </motion.div>

      {/* ── Hero copyright/index footer ── */}
      <div className="absolute bottom-4 left-8 right-8 hidden xl:flex items-center justify-between text-micro text-black/30 border-t border-black/5 pt-3">
        <span>© 2026 NOVAEVENT. ALL RIGHTS RESERVED.</span>
        <span>01 / 03</span>
      </div>
    </section>
  );
};
