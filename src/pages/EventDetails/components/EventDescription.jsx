import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Users, Award } from 'lucide-react';

export const EventDescription = ({ category, title, description }) => {
  // Mock premium speakers
  const speakers = [
    { name: "Sarah Jenkins", role: "Principal Designer, Vercel", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop" },
    { name: "Marcus Chen", role: "Engineering Lead, Linear", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop" }
  ];

  // Mock premium schedule
  const schedule = [
    { time: "09:00 AM", title: "Registrations & Welcome Coffee", desc: "Access badges allocation at the main lounge." },
    { time: "10:00 AM", title: "Opening Keynote: The Modern Interface", desc: "A deep dive into modular designs and micro-animations." },
    { time: "01:30 PM", title: "Panel Discussion: Commercial Scaling", desc: "Expert talks on architecture, databases, and UX." }
  ];

  return (
    <div className="flex flex-col text-left max-w-[720px] w-full gap-12 font-ui">
      
      {/* Description Block */}
      <div className="flex flex-col gap-5">
        <span className="text-[10px] text-accent tracking-[0.25em] uppercase font-technical">
          {category} // Description
        </span>
        <h1 className="text-display-lg text-primary font-light leading-tight">
          {title}
        </h1>
        <p className="text-body-lg text-secondary leading-relaxed font-light mt-2">
          {description || "Join this premium industry experience designed for professionals, founders, and engineers alike. Engage in custom networking, learn state-of-the-art architectures, and experience design excellence."}
        </p>
      </div>

      <div className="h-px bg-white/[0.06] w-full" />

      {/* Schedule Timeline Section */}
      <div className="flex flex-col gap-6">
        <span className="text-[10px] text-white/35 tracking-[0.25em] uppercase font-technical flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-accent" /> Timeline // Schedule
        </span>
        
        <div className="relative border-l border-white/[0.06] pl-6 ml-3 flex flex-col gap-8 mt-2">
          {schedule.map((item, idx) => (
            <div key={idx} className="relative group/schedule">
              <div className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 bg-[#050505] border-[2px] border-accent" />
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-technical uppercase tracking-wider text-accent">{item.time}</span>
                <h4 className="text-sm font-medium text-primary">{item.title}</h4>
                <p className="text-xs text-secondary font-light max-w-lg leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="h-px bg-white/[0.06] w-full" />

      {/* Speakers Section */}
      <div className="flex flex-col gap-6">
        <span className="text-[10px] text-white/35 tracking-[0.25em] uppercase font-technical flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-accent" /> Expert Panel // Speakers
        </span>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-2">
          {speakers.map((speaker, idx) => (
            <div key={idx} className="flex items-center gap-4 p-4 border border-white/[0.04] bg-[#0c0c0c]/60 rounded-[12px] hover:border-white/10 transition-colors duration-200">
              <img src={speaker.avatar} alt={speaker.name} className="w-12 h-12 rounded-full object-cover border border-white/10" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-primary">{speaker.name}</span>
                <span className="text-[10px] text-white/40 font-technical uppercase tracking-wider mt-0.5">{speaker.role}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="h-px bg-white/[0.06] w-full" />

      {/* Map & Location Mockup */}
      <div className="flex flex-col gap-6">
        <span className="text-[10px] text-white/35 tracking-[0.25em] uppercase font-technical flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-accent" /> Coordinates // Venue Location
        </span>
        
        <div className="relative border border-white/[0.05] bg-[#090909] aspect-video w-full rounded-[16px] overflow-hidden flex flex-col justify-end p-6 select-none shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)]">
          {/* Abstract geometric layout representation of map */}
          <div 
            className="absolute inset-0 opacity-[0.06] mix-blend-overlay z-0" 
            style={{
              backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.15) 1.5px, transparent 1.5px), 
                                linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), 
                                linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)`,
              backgroundSize: '24px 24px',
              backgroundPosition: 'center'
            }}
          />
          {/* Abstract route line */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <svg className="w-full h-full stroke-accent/25 stroke-[1.5]" fill="none">
              <path d="M 50 150 Q 200 80 350 200 T 650 100" strokeDasharray="4 4" />
              <circle cx="350" cy="200" r="6" fill="#fa5a15" className="animate-pulse" />
            </svg>
          </div>

          <div className="relative z-10 flex flex-col gap-2 bg-[#0c0c0c]/90 border border-white/[0.04] p-4 rounded-[12px] max-w-sm backdrop-blur-md">
            <span className="text-[9px] font-technical uppercase tracking-widest text-accent font-semibold leading-none">ARRIVALS INFO</span>
            <span className="text-xs text-primary leading-tight font-medium mt-1">Main Convention Space, Sector 7</span>
            <p className="text-[10px] text-white/40 leading-normal font-light">Enter through the north gate registration lobby. Parking available in Block C.</p>
          </div>
        </div>
      </div>

    </div>
  );
};
