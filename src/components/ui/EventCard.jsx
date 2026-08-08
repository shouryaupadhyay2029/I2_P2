import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useTransform, useReducedMotion } from 'framer-motion';
import { EditorialImage } from './EditorialImage';
import { useAmbientLight } from '../../hooks/useMagnet';
import { cn } from '../../utils/cn';
import { resolveEventImage } from '../../utils/eventImage';
import { getParticipationHours } from '../../utils/clubHours';

/**
 * EventCard — individual upcoming event card with ambient light shift on cursor movement.
 * The light is not a spotlight — it's a very low-opacity atmospheric depth effect.
 */
export const EventCard = ({ event, index, className }) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const { ref, lightX, lightY, handlers } = useAmbientLight({ damping: 55, stiffness: 280 });

  const transformX = useTransform(lightX, (lx) => `calc(${lx * 100}% - 130px)`);
  const transformY = useTransform(lightY, (ly) => `calc(${ly * 100}% - 130px)`);

  // Parallax Shifts: max movement 6px (-3px to 3px)
  const rawCardParallaxX = useTransform(lightX, [0, 1], [-3, 3]);
  const rawCardParallaxY = useTransform(lightY, [0, 1], [-3, 3]);
  const rawImgParallaxX = useTransform(lightX, [0, 1], [-2.4, 2.4]);
  const rawImgParallaxY = useTransform(lightY, [0, 1], [-2.4, 2.4]);
  const rawTextParallaxX = useTransform(lightX, [0, 1], [-1.5, 1.5]);
  const rawTextParallaxY = useTransform(lightY, [0, 1], [-1.5, 1.5]);
  const rawTiltX = useTransform(lightY, [0, 1], [1.5, -1.5]);
  const rawTiltY = useTransform(lightX, [0, 1], [-1.5, 1.5]);

  const cardParallaxX = shouldReduceMotion ? 0 : rawCardParallaxX;
  const cardParallaxY = shouldReduceMotion ? 0 : rawCardParallaxY;
  const imgParallaxX = shouldReduceMotion ? 0 : rawImgParallaxX;
  const imgParallaxY = shouldReduceMotion ? 0 : rawImgParallaxY;
  const textParallaxX = shouldReduceMotion ? 0 : rawTextParallaxX;
  const textParallaxY = shouldReduceMotion ? 0 : rawTextParallaxY;
  const tiltX = shouldReduceMotion ? 0 : rawTiltX;
  const tiltY = shouldReduceMotion ? 0 : rawTiltY;

  const hours = getParticipationHours(event);

  const resolveCountdown = (eVal) => {
    const status = (eVal.status || 'open').toLowerCase();
    if (status === 'draft') return 'Draft';
    if (status === 'archived') return 'Archived';
    if (status === 'completed') return 'Completed';
    if (status === 'live') return 'LIVE NOW';

    if (eVal.date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const eventDate = new Date(eVal.date);
      eventDate.setHours(0, 0, 0, 0);
      
      const diffTime = eventDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Starts Today';
      if (diffDays === 1) return 'Starts Tomorrow';
      if (diffDays > 1) return `Starts In ${diffDays} Days`;
    }
    return 'Upcoming';
  };

  return (
    <motion.div
      ref={ref}
      {...handlers}
      onClick={() => navigate(`/events/${event.id}`)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        x: cardParallaxX,
        y: cardParallaxY,
        rotateX: tiltX,
        rotateY: tiltY,
        transformPerspective: 1000,
      }}
      whileHover={shouldReduceMotion ? {} : { y: -6 }}
      className={cn(
        'flex flex-col group cursor-pointer relative p-5 border border-white/[0.04] bg-[#0c0c0c] rounded-[20px] shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-all duration-300',
        event.status?.toLowerCase() === 'completed' ? 'opacity-40 hover:opacity-75' : '',
        className
      )}
    >
      {/* Faint hover bg transition */}
      <motion.div
        animate={{
          backgroundColor: isHovered ? 'rgba(255, 255, 255, 0.015)' : 'rgba(255, 255, 255, 0)'
        }}
        transition={{ duration: 0.25 }}
        className="absolute inset-0 pointer-events-none z-0 rounded-[20px]"
      />

      {/* Faint hover border overlay */}
      <motion.div
        animate={{
          borderColor: isHovered ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.04)'
        }}
        transition={{ duration: 0.25 }}
        className="absolute inset-0 border pointer-events-none z-30 rounded-[20px]"
      />

      {/* Image Container with Parallax offsets */}
      <motion.div 
        style={{ x: imgParallaxX, y: imgParallaxY }}
        className="w-full relative mb-8 z-10"
      >
        <EditorialImage
          src={resolveEventImage(event)}
          alt={event.title}
          aspectRatio="aspect-[4/5]"
          grayscale={true}
          width={400}
          height={500}
          isHovered={isHovered}
        />

        {/* Ambient light overlay on the image using GPU translation */}
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden mix-blend-overlay">
          <motion.div
            className="absolute w-[260px] h-[260px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.12)_0%,transparent_70%)]"
            style={{
              x: transformX,
              y: transformY,
              opacity: isHovered ? 1 : 0,
            }}
            transition={{ opacity: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }}
          />
        </div>

        {/* Figure label on hover */}
        <div className="absolute bottom-0 left-0 w-full flex justify-between items-center text-micro border-t border-border pt-2 pb-2 px-2 bg-background/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-700 z-30">
          <span>FIG. 0{index + 3}</span>
        </div>
      </motion.div>

      {/* Text content with Parallax offsets */}
      <motion.div style={{ x: textParallaxX, y: textParallaxY }} className="flex flex-col z-10 flex-grow justify-between">
        <div>
          <div className="flex items-center gap-4 mb-6">
            {/* Category label becomes slightly brighter */}
            <motion.span
              animate={{ color: isHovered ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.6)' }}
              transition={{ duration: 0.25 }}
              className="text-micro font-medium"
            >
              {event.category}
            </motion.span>
            <span className="w-4 h-[1px] bg-border" />
            <div className="flex items-center gap-2">
              {event.status?.toLowerCase() === "live" && <span className="w-1 h-1 rounded-none bg-red-500 animate-pulse" />}
              {/* Status Badges scale-up on load and brighten on hover */}
              <motion.span 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ filter: "brightness(1.2)" }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  "text-micro font-technical uppercase tracking-wider",
                  event.status?.toLowerCase() === "live" ? "text-red-400" :
                  event.status?.toLowerCase() === "open" ? "text-green-400" :
                  event.status?.toLowerCase() === "closed" ? "text-red-400" :
                  event.status?.toLowerCase() === "completed" ? "text-white/40" :
                  "text-white/30"
                )}
              >
                {resolveCountdown(event)}
              </motion.span>
            </div>
          </div>

          {/* Heading with 2px upward translate response */}
          <motion.h3
            animate={{
              y: isHovered ? -2 : 0,
              color: isHovered ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.88)',
            }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="text-display-m mb-6 font-light"
          >
            {event.title}
          </motion.h3>
        </div>

        <div>
          {/* DATA METADATA BLOCKS */}
          <div className="grid grid-cols-2 gap-y-4 gap-x-2 border-t border-white/[0.06] pt-4 mt-2">
            <div className="flex flex-col gap-1 text-left">
              <span className="text-[0.44rem] font-technical uppercase tracking-[0.14em] text-white/22">Seats</span>
              <span className="text-[0.82rem] font-light text-white/60 leading-none tabular-nums">
                {event.capacity || '80'}
              </span>
            </div>
            <div className="flex flex-col gap-1 text-right">
              <span className="text-[0.44rem] font-technical uppercase tracking-[0.14em] text-white/22">Registered</span>
              <span className="text-[0.82rem] font-light text-white/60 leading-none tabular-nums">
                {event.registeredCount || 0}
              </span>
            </div>
            <div className="flex flex-col gap-1 text-left">
              <span className="text-[0.44rem] font-technical uppercase tracking-[0.14em] text-white/22">Deadline</span>
              <span className="text-[0.62rem] font-light text-white/45 leading-none tabular-nums truncate max-w-full">
                {event.registrationDeadline ? (() => {
                  try {
                    const d = new Date(event.registrationDeadline);
                    if (isNaN(d.getTime())) return event.registrationDeadline;
                    return d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
                  } catch {
                    return event.registrationDeadline;
                  }
                })() : 'TBA'}
              </span>
            </div>
            <div className="flex flex-col gap-1 text-right">
              <span className="text-[0.44rem] font-technical uppercase tracking-[0.14em] text-white/22">Club Hours</span>
              <div className="flex flex-col items-end gap-0.5">
                {hours > 0 ? (
                  <span className="text-[0.78rem] font-technical uppercase tracking-wider text-accent leading-none font-semibold">
                    +{hours} HRS
                  </span>
                ) : (
                  <span className="text-[0.62rem] font-light text-white/30 leading-none">
                    NOT ELIGIBLE
                  </span>
                )}
                {hours > 0 && (event.facultyVerified || event.clubHours?.facultyVerified || event.clubHours?.verifiedCredit) && (
                  <span className="text-[0.48rem] text-white/40 tracking-wider uppercase font-technical leading-none">
                    Verified Credit
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Metadata opacity increases */}
          <motion.div
            animate={{ 
              color: isHovered ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.35)',
              borderTopColor: isHovered ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'
            }}
            transition={{ duration: 0.25 }}
            className="flex justify-between items-center text-micro border-t pt-4 mt-4"
          >
            <span>
              {(() => {
                if (!event.date) return "";
                try {
                  const d = new Date(event.date);
                  if (isNaN(d.getTime())) return event.date;
                  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
                } catch {
                  return event.date;
                }
              })()}
            </span>
            <span>{event.venue}</span>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};
