import React, { useEffect, useState } from "react";
import { useScroll, useSpring, motion } from "framer-motion";
import { PageContainer } from "../../components/layout/PageContainer";
import { Hero } from "./sections/Hero";
import { TrustedOrganizations } from "./sections/TrustedOrganizations";
import { FeaturedEvent } from "./sections/FeaturedEvent";
import { WhyNexEvent } from "./sections/WhyNexEvent";
import { Categories } from "./sections/Categories";
import { UpcomingEvents } from "./sections/UpcomingEvents";
import { Statistics } from "./sections/Statistics";
import { Testimonials } from "./sections/Testimonials";
import { FAQ } from "./sections/FAQ";
import { FinalCTA } from "./sections/FinalCTA";
import { getAllEvents } from "../../services/eventService";

const ScrollProgressBar = () => {
  const { scrollYProgress } = useScroll();
  const scaleY = useSpring(scrollYProgress, { damping: 50, stiffness: 400 });
  
  return (
    <motion.div
      style={{ scaleY }}
      className="fixed left-4 md:left-8 top-0 bottom-0 w-[1px] bg-accent origin-top z-40 pointer-events-none hidden md:block"
    />
  );
};

export const LandingPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await getAllEvents();
        setEvents(data || []);
      } catch (err) {
        console.error("Failed to load events: ", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  // Filter for upcoming events (date is today or in the future)
  const upcomingEvents = events.filter(e => e.date && e.date >= todayStr);

  let featuredEvent = null;
  let remainingUpcoming = [];

  if (upcomingEvents.length > 0) {
    // Sort upcoming ascending by date, then time to get the nearest upcoming one
    upcomingEvents.sort((a, b) => {
      if (a.date === b.date) {
        return (a.time || '').localeCompare(b.time || '');
      }
      return a.date.localeCompare(b.date);
    });
    featuredEvent = upcomingEvents[0];
    remainingUpcoming = upcomingEvents.slice(1);
  } else if (events.length > 0) {
    // Fallback: sort all by createdAt descending to show the newest
    const sortedAll = [...events].sort((a, b) => {
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
    featuredEvent = sortedAll[0];
    remainingUpcoming = [];
  }

  return (
    <div className="landing-light-theme w-full min-h-screen bg-[#F5F2EB] text-[#1a1a1a]">
      <PageContainer width="1400px" className="px-0 md:px-0 pt-0 flex flex-col gap-24 md:gap-32 bg-transparent">
        <ScrollProgressBar />
        <Hero event={featuredEvent} loading={loading} />
        <TrustedOrganizations />
        <div className="flex flex-col gap-12">
          <FeaturedEvent event={featuredEvent} loading={loading} />
          <UpcomingEvents events={remainingUpcoming} loading={loading} />
        </div>
        <WhyNexEvent />
        <Categories />
        <div className="flex flex-col gap-16">
          <Statistics />
          <Testimonials />
        </div>
        <FAQ />
        <FinalCTA />
      </PageContainer>
    </div>
  );
};
