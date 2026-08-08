import React from "react";
import { motion } from "framer-motion";
import { AxisMarker } from "../../../components/layout/AxisMarker";
import { Button } from "../../../components/ui/Button";
import { EventCard } from "../../../components/ui/EventCard";
import { RevealSection, RevealItem, StandaloneReveal } from "../../../components/ui/RevealSection";
import { PremiumEmptyState } from "../../../components/ui/PremiumEmptyState";

const EventCardSkeleton = () => (
  <div className="flex flex-col w-full select-none">
    <div className="w-full aspect-[4/5] bg-white/5 skeleton-shimmer mb-8" />
    <div className="h-4 w-1/3 bg-white/5 skeleton-shimmer mb-6" />
    <div className="h-6 w-3/4 bg-white/5 skeleton-shimmer mb-8" />
    <div className="h-4 w-full bg-white/5 skeleton-shimmer" />
  </div>
);

const UpcomingSkeleton = () => (
  <section className="w-full flex flex-col mb-32 pt-24">
    <div className="w-full flex items-center mb-32 h-[1px] bg-white/5" />
    <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-24 gap-6 max-w-[1200px]">
      <div className="h-12 w-64 bg-white/5 skeleton-shimmer" />
      <div className="h-10 w-32 bg-white/5 skeleton-shimmer hidden md:block" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-12 max-w-[1200px]">
      {[1, 2, 3].map((n) => (
        <EventCardSkeleton key={n} />
      ))}
    </div>
  </section>
);

export const UpcomingEvents = ({ events, loading }) => {
  if (loading) {
    return <UpcomingSkeleton />;
  }

  const hasEvents = events && events.length > 0;

  // Staggered grid variants (80ms stagger delay)
  const gridContainerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.08,
      }
    }
  };

  const gridCardVariants = {
    hidden: {
      opacity: 0,
      y: 24,
      scale: 0.98
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.7,
        ease: [0.16, 1, 0.3, 1]
      }
    }
  };

  return (
    <section className="w-full flex flex-col mb-32 pt-24">
      <StandaloneReveal margin="-5%">
        <AxisMarker index="04" label="Global Schedule" />
      </StandaloneReveal>

      <RevealSection margin="-5%" staggerDelay={0.1}>
        <RevealItem>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-24 gap-6 max-w-[1200px]">
            <h2 className="text-display-l text-primary font-light">Upcoming Events</h2>
            <Button variant="ghost" className="hidden md:flex">View Calendar</Button>
          </div>
        </RevealItem>

        <RevealItem>
          {hasEvents ? (
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-5%", amount: 0.2 }}
              variants={gridContainerVariants}
              className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-12 max-w-[1200px]"
            >
              {events.map((event, index) => (
                <motion.div key={event.id} variants={gridCardVariants}>
                  <EventCard event={event} index={index} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <PremiumEmptyState 
              type="events"
            />
          )}
        </RevealItem>
      </RevealSection>

      <div className="mt-20 flex justify-start md:hidden">
        <Button variant="ghost">View Calendar</Button>
      </div>
    </section>
  );
};
