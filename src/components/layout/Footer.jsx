import React from "react";
import { Link } from "react-router-dom";
import { cn } from "../../utils/cn";

export const Footer = ({ className }) => {
  return (
    <footer className={cn("w-full bg-[#F5F3EE] text-black border-t border-black/[0.08] relative z-10 overflow-hidden font-mono select-none", className)}>
      {/* Giant faint wordmark in the background (4-6% black) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden">
        <span className="text-[12vw] font-bold text-black/[0.04] tracking-[0.15em] uppercase font-display">
          NOVAEVENT
        </span>
      </div>

      <div className="w-full max-w-[1400px] mx-auto px-6 md:px-10 pt-20 pb-12 relative z-10 flex flex-col gap-20">
        
        {/* Main Columns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8">
          
          {/* Brand Column (takes up 4 cols) */}
          <div className="col-span-1 md:col-span-4 flex flex-col items-start text-left gap-6 pr-0 md:pr-12">
            <div className="flex items-center gap-1.5 font-display text-lg tracking-[0.1em] font-semibold text-[#111111]">
              <span>NOVAEVENT</span>
              <span className="w-1.5 h-1.5 bg-[#111111] rounded-full animate-pulse" />
            </div>
            <p className="text-[11px] leading-relaxed text-[#555555] font-light tracking-wide uppercase">
              A premium platform curating high-energy event discovery, visual coordination, and seamless experiences globally.
            </p>
          </div>

          {/* Directory Column (takes up 2 cols) */}
          <div className="col-span-1 md:col-span-2 flex flex-col items-start text-left">
            <span className="text-[10px] text-[#111111] tracking-[0.25em] uppercase mb-6 font-semibold">
              Directory
            </span>
            <div className="flex flex-col items-start gap-3">
              <Link to="/events" className="text-[11px] tracking-[0.18em] text-[#333333] hover:text-[#111111] transition-colors uppercase">
                Events
              </Link>
              <Link to="/about" className="text-[11px] tracking-[0.18em] text-[#333333] hover:text-[#111111] transition-colors uppercase">
                About
              </Link>
              <Link to="/" className="text-[11px] tracking-[0.18em] text-[#333333] hover:text-[#111111] transition-colors uppercase">
                Discover
              </Link>
              <a href="mailto:upadhyayshourya352@gmail.com" className="text-[11px] tracking-[0.18em] text-[#333333] hover:text-[#111111] transition-colors uppercase">
                Contact
              </a>
            </div>
          </div>

          {/* Sectors Column (takes up 2 cols) */}
          <div className="col-span-1 md:col-span-2 flex flex-col items-start text-left">
            <span className="text-[10px] text-[#111111] tracking-[0.25em] uppercase mb-6 font-semibold">
              Sectors
            </span>
            <div className="flex flex-col items-start gap-3 text-[#333333] text-[11px] tracking-[0.18em] uppercase">
              <span>Music</span>
              <span>Films</span>
              <span>Sports</span>
              <span>Festivals</span>
              <span>Experiences</span>
            </div>
          </div>

          {/* Access Registry Column (takes up 2 cols) */}
          <div className="col-span-1 md:col-span-2 flex flex-col items-start text-left">
            <span className="text-[10px] text-[#111111] tracking-[0.25em] uppercase mb-6 font-semibold">
              Access Registry
            </span>
            <div className="flex flex-col items-start text-left text-[#555555] text-[10px] tracking-[0.15em] gap-3 leading-relaxed uppercase">
              <div>
                <span className="text-[#333333] block font-medium">NovaEvent HQ</span>
                <span>8 Brutalist Ave, London</span>
              </div>
              <a href="mailto:info@novaevent.live" className="text-[#111111] hover:underline transition-colors mt-1 block">
                info@novaevent.live
              </a>
            </div>
          </div>

          {/* Connections Column (takes up 2 cols) */}
          <div className="col-span-1 md:col-span-2 flex flex-col items-start text-left">
            <span className="text-[10px] text-[#111111] tracking-[0.25em] uppercase mb-6 font-semibold">
              Connections
            </span>
            <div className="flex flex-col items-start gap-3">
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-[11px] tracking-[0.18em] text-[#333333] hover:text-[#111111] transition-colors uppercase">
                Twitter
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-[11px] tracking-[0.18em] text-[#333333] hover:text-[#111111] transition-colors uppercase">
                Instagram
              </a>
              <a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="text-[11px] tracking-[0.18em] text-[#333333] hover:text-[#111111] transition-colors uppercase">
                Discord
              </a>
              <a href="https://telegram.org" target="_blank" rel="noopener noreferrer" className="text-[11px] tracking-[0.18em] text-[#333333] hover:text-[#111111] transition-colors uppercase">
                Telegram
              </a>
            </div>
          </div>

        </div>

        {/* Bottom Bar Credits */}
        <div className="w-full border-t border-black/[0.08] pt-8 flex flex-col md:flex-row justify-between items-center text-[9px] text-[#666666] uppercase tracking-[0.25em] gap-4">
          <span>&copy; {new Date().getFullYear()} NOVAEVENT. ALL RIGHTS RESERVED.</span>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 border border-black/[0.08] px-2.5 py-1 rounded-none bg-black/[0.02] text-[#555555]">
              <span className="w-1.5 h-1.5 bg-[#111111] rounded-full animate-pulse" />
              <span>GRID // OFF [G]</span>
            </div>
            <span className="text-[#555555]">CONNECTION // STABLE</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
