import React, { useRef, useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { resolveEventImage } from '../../utils/eventImage';
import { cn } from '../../utils/cn';

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  } catch {
    return dateStr;
  }
};

export const FeaturedEventCard = ({ event, loading }) => {
  const navigate = useNavigate();
  const imgRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const title = event?.title || "Stanford Design Symposium '26";
  const resolvedImage = resolveEventImage(event);

  const [imgState, setImgState] = useState(() => ({
    currentImage: resolvedImage,
    isLoaded: false,
    fallbackAttempted: false,
  }));

  useEffect(() => {
    const resImg = resolveEventImage(event);
    setImgState({ currentImage: resImg, isLoaded: false, fallbackAttempted: false });
  }, [event]);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0 && !imgState.isLoaded) {
      setImgState((prev) => ({ ...prev, isLoaded: true }));
    }
  });

  const { currentImage, isLoaded } = imgState;

  const category = event?.category || "FEATURED";
  const venue = event?.venue || "Auditorium";
  const dateText = event?.date ? formatDate(event.date) : "Oct 14, 2026";
  const seatsText = event?.capacity || "80";

  if (loading) {
    return (
      <div className="w-full aspect-[4/5] bg-white/5 animate-pulse border border-white/5 rounded-[32px]" />
    );
  }

  const handleCardClick = () => {
    if (event?.id) {
      navigate(`/events/${event.id}`);
    } else {
      navigate('/events');
    }
  };

  return (
    <motion.div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
      whileTap={{ scale: 0.985 }}
      className="w-full max-w-[420px] bg-[#0C0C0C] border border-white/10 rounded-[32px] p-5 flex flex-col justify-between gap-6 shadow-[0_24px_50px_rgba(0,0,0,0.4)] cursor-pointer select-none mx-auto relative overflow-hidden group"
    >
      {/* Film grain effect */}
      <div
        className="absolute inset-0 z-10 mix-blend-overlay pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="flex flex-col gap-5">
        {/* Image Frame */}
        <div className="w-full aspect-[4/3] rounded-[24px] overflow-hidden relative border border-white/10 bg-black">
          <motion.img
            ref={imgRef}
            src={currentImage}
            alt={title}
            onLoad={() => {
              setImgState((prev) => ({ ...prev, isLoaded: true }));
            }}
            onError={() => {
              setImgState((prev) => {
                if (!prev.fallbackAttempted) {
                  return {
                    currentImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=800&auto=format&fit=crop&fm=webp',
                    isLoaded: false,
                    fallbackAttempted: true,
                  };
                }
                return { ...prev, isLoaded: true };
              });
            }}
            animate={{
              scale: isHovered ? 1.05 : 1,
              opacity: isLoaded ? 1 : 0.7,
            }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="w-full h-full object-cover"
          />

          {/* Featured Badge */}
          <div className="absolute top-4 left-4 z-20 bg-black/75 backdrop-blur-md border border-white/10 px-3 py-1 rounded-[6px]">
            <span className="text-[8px] font-technical uppercase tracking-[0.25em] text-white">
              {category}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-[1.35rem] font-sans font-medium text-white tracking-tight leading-tight text-left px-1 mt-1">
          {title}
        </h3>
      </div>

      {/* Divider */}
      <div className="w-full h-[1px] bg-white/10" />

      {/* Info grid & CTA circle */}
      <div className="flex items-end justify-between px-1 pb-1">
        <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-left">
          <div className="flex flex-col gap-1.5">
            <span className="text-[8px] font-technical text-white/35 uppercase tracking-[0.2em]">Date</span>
            <span className="text-[11px] font-sans font-medium text-white/80">{dateText}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[8px] font-technical text-white/35 uppercase tracking-[0.2em]">Venue</span>
            <span className="text-[11px] font-sans font-medium text-white/80">{venue}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[8px] font-technical text-white/35 uppercase tracking-[0.2em]">Seats</span>
            <span className="text-[11px] font-sans font-medium text-white/80">{seatsText}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[8px] font-technical text-white/35 uppercase tracking-[0.2em]">Category</span>
            <span className="text-[11px] font-sans font-semibold text-accent uppercase tracking-wider">{category}</span>
          </div>
        </div>

        {/* Diagonal Arrow Circle */}
        <motion.div
          animate={{ scale: isHovered ? 1.08 : 1 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black shadow-lg flex-shrink-0 cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <line x1="7" y1="17" x2="17" y2="7" />
            <polyline points="7 7 17 7 17 17" />
          </svg>
        </motion.div>
      </div>
    </motion.div>
  );
};
