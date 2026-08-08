import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageContainer } from '../../components/layout/PageContainer';
import { SectionWrapper } from '../../components/layout/SectionWrapper';
import { AxisMarker } from '../../components/layout/AxisMarker';
import { Button } from '../../components/ui/Button';
import { trackEvent } from '../../services/analyticsService';
import { ArrowUpRight, ArrowRight } from 'lucide-react';

// Shared Stagger Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export const About = () => {
  const navigate = useNavigate();

  // Track page view once on mount
  useEffect(() => {
    trackEvent("about_view");
  }, []);

  return (
    <PageContainer width="1400px" className="select-none">
      
      {/* SECTION 01 — OPENING MANIFESTO */}
      <SectionWrapper spacing="lg" id="opening-manifesto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-8 w-full"
        >
          {/* Micro-label */}
          <motion.div variants={itemVariants} className="text-micro text-accent flex items-center gap-3">
            <span>NOVAEVENT // PLATFORM MANIFESTO</span>
            <span className="w-1.5 h-[1px] bg-accent/40" />
            <span>REF. 001</span>
          </motion.div>

          {/* Primary Headline */}
          <motion.h1 
            variants={itemVariants} 
            className="text-[2.2rem] sm:text-[3.2rem] md:text-[4.6rem] lg:text-[5.4rem] font-light text-primary tracking-tight leading-[1.0] max-w-5xl text-left"
          >
            Events were never meant<br className="hidden md:inline" />
            to be discovered through<br className="hidden md:inline" />
            forwarded screenshots.
          </motion.h1>

          {/* Horizontal Progress Line */}
          <motion.div 
            variants={itemVariants}
            className="w-full h-[1px] bg-white/5 my-4 relative overflow-hidden"
          >
            <motion.div 
              initial={{ left: "-100%" }}
              animate={{ left: "100%" }}
              transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
              className="absolute top-0 bottom-0 w-1/3 bg-gradient-to-r from-transparent via-accent/30 to-transparent"
            />
          </motion.div>

          {/* Supporting copy & metadata */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start mt-4">
            <motion.div 
              variants={itemVariants} 
              className="lg:col-span-2 flex flex-col gap-6 text-body-l text-secondary font-light text-left"
            >
              <p>
                Events disappear inside temporary group chats. Registrations get buried under endless forms. 
                Opportunities reach attendees after the deadlines have already passed.
              </p>
              <p>
                NovaEvent was built to create a single, structured archive for experiences—giving visibility 
                to ideas, groups, and actions that define the modern event.
              </p>
            </motion.div>

            {/* Document Metadata block */}
            <motion.div 
              variants={itemVariants} 
              className="grid grid-cols-2 gap-y-6 gap-x-4 border-l border-white/5 pl-8 text-technical text-[0.62rem] uppercase tracking-widest text-left"
            >
              <div>
                <span className="block text-white/20 mb-1">Document</span>
                <span className="text-primary font-medium">DOCUMENT / 001</span>
              </div>
              <div>
                <span className="block text-white/20 mb-1">Subject</span>
                <span className="text-primary font-medium">Manifesto</span>
              </div>
              <div>
                <span className="block text-white/20 mb-1">Edition</span>
                <span className="text-primary font-medium">2026 // v1.0</span>
              </div>
              <div>
                <span className="block text-white/20 mb-1">Status</span>
                <span className="text-accent font-medium">Active</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </SectionWrapper>

      {/* Axis Boundary */}
      <AxisMarker index="01" label="System Diagnosis" />

      {/* SECTION 02 — THE DISCOVERY PROBLEM */}
      <SectionWrapper spacing="lg" id="discovery-problem">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-start w-full">
          
          {/* Left Column */}
          <div className="flex flex-col gap-4 text-left">
            <span className="text-micro text-accent">[01 — FRAGMENTATION]</span>
            <h2 className="text-[2.2rem] sm:text-[2.8rem] md:text-[3.6rem] text-primary tracking-tight font-light leading-[1.05] uppercase">
              THE EVENT<br />
              DISCOVERY<br />
              PROBLEM.
            </h2>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-12 text-left">
            <div className="flex flex-col gap-5 text-body-l text-secondary font-light">
              <p>One event posted on a personal social story.</p>
              <p>Another shared in a massive, noisy announcement community.</p>
              <p>A registration link buried inside a text thread.</p>
              <p>An entry deadline discovered exactly one day too late.</p>
            </div>
            
            <div className="pt-8 border-t border-white/5">
              <p className="text-[1.5rem] md:text-[2rem] font-light leading-snug text-primary tracking-tight">
                The problem isn't a lack of events. It is a <span className="text-accent font-medium">lack of discovery</span>.
              </p>
            </div>
          </div>

        </div>
      </SectionWrapper>

      {/* Axis Boundary */}
      <AxisMarker index="02" label="Core Philosophy" />

      {/* SECTION 03 — THE NOVAEVENT SYSTEM */}
      <SectionWrapper spacing="lg" id="novaevent-system">
        <div className="w-full text-left">
          {/* Section Heading */}
          <div className="flex flex-col gap-2 mb-16">
            <span className="text-micro text-accent">[02 — SYSTEM]</span>
            <h2 className="text-[2.2rem] sm:text-[2.8rem] md:text-[3.6rem] text-primary font-light tracking-tight leading-none uppercase">
              ONE SYSTEM.<br />
              THREE MOVEMENTS.
            </h2>
          </div>

          {/* System Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 border-t border-white/5 divide-y md:divide-y-0 md:divide-x divide-white/5">
            
            {/* Movement 1 */}
            <div className="group py-12 md:py-16 md:pr-10 flex flex-col justify-between min-h-[280px]">
              <div className="flex items-start justify-between">
                <span className="text-technical text-white/30 text-xs">DISCOVER // 01</span>
                <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
              </div>
              <div className="mt-12">
                <h3 className="text-heading text-primary mb-3 group-hover:text-accent transition-colors duration-300">Discovery Engine</h3>
                <p className="text-body text-secondary font-light">
                  Find events through one structured, searchable discovery system. No social algorithmic filters.
                </p>
              </div>
            </div>

            {/* Movement 2 */}
            <div className="group py-12 md:py-16 md:px-10 flex flex-col justify-between min-h-[280px]">
              <div className="flex items-start justify-between">
                <span className="text-technical text-white/30 text-xs">REGISTER // 02</span>
                <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
              </div>
              <div className="mt-12">
                <h3 className="text-heading text-primary mb-3 group-hover:text-accent transition-colors duration-300">Direct Connection</h3>
                <p className="text-body text-secondary font-light">
                  Move from discovery to participation without fragmented form links and disconnected profiles.
                </p>
              </div>
            </div>

            {/* Movement 3 */}
            <div className="group py-12 md:py-16 md:pl-10 flex flex-col justify-between min-h-[280px]">
              <div className="flex items-start justify-between">
                <span className="text-technical text-white/30 text-xs">ARCHIVE // 03</span>
                <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
              </div>
              <div className="mt-12">
                <h3 className="text-heading text-primary mb-3 group-hover:text-accent transition-colors duration-300">Persistent Record</h3>
                <p className="text-body text-secondary font-light">
                  Past events remain part of the archive record instead of disappearing into historical chat backlogs.
                </p>
              </div>
            </div>

          </div>
        </div>
      </SectionWrapper>

      {/* SECTION 04 — MASSIVE PLATFORM STATEMENT */}
      <SectionWrapper spacing="none" id="massive-statement" className="w-full">
        <div className="py-24 md:py-40 flex flex-col justify-center items-start border-y border-white/5 relative overflow-hidden text-left">
          
          {/* Subtle Grid Intersections */}
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <div className="absolute left-[30%] top-0 bottom-0 w-[1px] bg-white/5" />
            <div className="absolute left-[70%] top-0 bottom-0 w-[1px] bg-white/5" />
          </div>

          <div className="relative z-10 w-full">
            <span className="text-technical text-accent text-xs mb-8 block">[ THE PLATFORM ESSENCE ]</span>
            <h2 className="text-[2.6rem] sm:text-[4.2rem] md:text-[6.5rem] lg:text-[7.5rem] font-light leading-[0.9] tracking-tighter text-primary uppercase select-none mb-12">
              PLAN.<br />
              HOST.<br />
              EXPERIENCE.
            </h2>
            <div className="max-w-xl text-body-lg text-secondary font-light flex flex-col gap-1.5">
              <p>Not another social feed algorithm.</p>
              <p>Not another crowded notice board.</p>
              <p className="text-accent font-medium">A structured discovery infrastructure for event discovery.</p>
            </div>
          </div>

        </div>
      </SectionWrapper>

      {/* SECTION 05 — BUILT FOR THE EVENT ECOSYSTEM */}
      <SectionWrapper spacing="lg" id="campus-ecosystem">
        <div className="w-full text-left">
          
          {/* Header */}
          <div className="flex flex-col gap-2 mb-16">
            <span className="text-micro text-accent">[03 — ECOSYSTEM]</span>
            <h2 className="text-[2.2rem] sm:text-[2.8rem] md:text-[3.6rem] text-primary font-light tracking-tight leading-none uppercase">
              BUILT AROUND<br />
              EVENTS.
            </h2>
          </div>

          {/* Directory Rows */}
          <div className="flex flex-col border-t border-white/5">
            
            {/* STUDENTS */}
            <div className="group flex flex-col md:flex-row md:items-center justify-between py-8 border-b border-white/5 hover:bg-white/[0.015] px-4 -mx-4 transition-all duration-300">
              <div className="flex items-center gap-8 mb-4 md:mb-0">
                <span className="text-technical text-white/20 text-xs w-8">01</span>
                <h3 className="text-heading text-primary group-hover:text-accent group-hover:translate-x-2 transition-all duration-300 w-48 font-light">ATTENDEES</h3>
              </div>
              <div className="flex-grow max-w-xl mb-4 md:mb-0">
                <p className="text-body text-secondary font-light">
                  Discover opportunities, manage your bookings, and find events before deadlines slip by.
                </p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-white/20 group-hover:text-accent transition-colors duration-300" />
            </div>

            {/* ORGANIZERS */}
            <div className="group flex flex-col md:flex-row md:items-center justify-between py-8 border-b border-white/5 hover:bg-white/[0.015] px-4 -mx-4 transition-all duration-300">
              <div className="flex items-center gap-8 mb-4 md:mb-0">
                <span className="text-technical text-white/20 text-xs w-8">02</span>
                <h3 className="text-heading text-primary group-hover:text-accent group-hover:translate-x-2 transition-all duration-300 w-48 font-light">ORGANIZERS</h3>
              </div>
              <div className="flex-grow max-w-xl mb-4 md:mb-0">
                <p className="text-body text-secondary font-light">
                  Publish, modify, and track registration numbers in real time from a private workspace.
                </p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-white/20 group-hover:text-accent transition-colors duration-300" />
            </div>

            {/* CLUBS */}
            <div className="group flex flex-col md:flex-row md:items-center justify-between py-8 border-b border-white/5 hover:bg-white/[0.015] px-4 -mx-4 transition-all duration-300">
              <div className="flex items-center gap-8 mb-4 md:mb-0">
                <span className="text-technical text-white/20 text-xs w-8">03</span>
                <h3 className="text-heading text-primary group-hover:text-accent group-hover:translate-x-2 transition-all duration-300 w-48 font-light">ORGANIZATIONS</h3>
              </div>
              <div className="flex-grow max-w-xl mb-4 md:mb-0">
                <p className="text-body text-secondary font-light">
                  Establish a persistent archive of past events and achievements beyond temporary messaging threads.
                </p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-white/20 group-hover:text-accent transition-colors duration-300" />
            </div>

            {/* CAMPUS */}
            <div className="group flex flex-col md:flex-row md:items-center justify-between py-8 border-b border-white/5 hover:bg-white/[0.015] px-4 -mx-4 transition-all duration-300">
              <div className="flex items-center gap-8 mb-4 md:mb-0">
                <span className="text-technical text-white/20 text-xs w-8">04</span>
                <h3 className="text-heading text-primary group-hover:text-accent group-hover:translate-x-2 transition-all duration-300 w-48 font-light">NETWORKS</h3>
              </div>
              <div className="flex-grow max-w-xl mb-4 md:mb-0">
                <p className="text-body text-secondary font-light">
                  Generate a clean, searchable, and verified timeline of event activity and participation.
                </p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-white/20 group-hover:text-accent transition-colors duration-300" />
            </div>

          </div>
        </div>
      </SectionWrapper>

      {/* Axis Boundary */}
      <AxisMarker index="03" label="Platform Origin" />

      {/* SECTION 06 — ORIGIN */}
      <SectionWrapper spacing="lg" id="platform-origin">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 relative w-full items-start text-left">
          
          {/* Subtle low opacity background watermark */}
          <div className="absolute right-0 bottom-0 select-none pointer-events-none text-white/[0.01] font-technical text-[9vw] leading-none uppercase tracking-widest font-bold">
            2026 // ORIGIN
          </div>

          <div className="flex flex-col gap-4">
            <span className="text-micro text-accent">ORIGIN // 2026</span>
            <h2 className="text-[2.2rem] sm:text-[2.8rem] md:text-[3.6rem] text-primary font-light tracking-tight leading-none uppercase">
              Built from a problem<br />
              experienced firsthand.
            </h2>
          </div>

          <div className="flex flex-col gap-10">
            <div className="flex flex-col gap-6 text-body-l text-secondary font-light max-w-xl">
              <p>NovaEvent began with a simple observation: discovering events was unnecessarily difficult.</p>
              <p>Information was fragmented everywhere, but there was no single platform built specifically to catalog and organize it.</p>
              <p>What started as a discovery problem became a larger architectural question—</p>
              <div className="pl-4 border-l-2 border-accent/60 py-2 my-2 text-primary font-light text-heading leading-snug">
                What would event management infrastructure look like if it were designed properly from the beginning?
              </div>
            </div>
            
            <div className="pt-8 border-t border-white/5 flex flex-col gap-1.5 text-technical">
              <span className="text-xs text-primary font-medium tracking-widest">SHOURYA UPADHYAY</span>
              <span className="text-[0.62rem] text-white/30 uppercase tracking-widest">FOUNDER & DEVELOPER</span>
            </div>
          </div>

        </div>
      </SectionWrapper>

      {/* SECTION 07 — CLOSING MANIFESTO / CTA */}
      <SectionWrapper spacing="lg" id="closing-cta">
        <div className="flex flex-col items-center justify-center text-center py-16 border-t border-white/5 relative">
          
          <span className="text-micro text-accent mb-6">[ CLOSING ENTRY ]</span>
          
          <h2 className="text-[2rem] sm:text-[2.8rem] md:text-[3.8rem] text-primary font-light tracking-tight mb-6 uppercase">
            THE ARCHIVE IS<br />STILL BEING WRITTEN.
          </h2>
          
          <p className="text-body text-secondary max-w-2xl mx-auto mb-12 font-light">
            Every event discovered, every registration made, and every moment documented becomes part of a larger record. Join us in building it.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center w-full max-w-md">
            <Button 
              variant="primary" 
              onClick={() => navigate('/events')}
              className="w-full flex items-center justify-center gap-2 group/btn py-3"
            >
              <span>Explore Events</span>
              <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform duration-300" />
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => navigate('/create-event')}
              className="w-full flex items-center justify-center gap-2 group/btn py-3"
            >
              <span>Create an Event</span>
              <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform duration-300" />
            </Button>
          </div>
          
          <div className="mt-28 border-t border-white/5 pt-8 w-full flex flex-col sm:flex-row items-center justify-between text-technical text-[0.62rem] text-white/20 uppercase tracking-widest gap-4 sm:gap-0">
            <span>NOVAEVENT // ARCHIVE // 2026</span>
            <span>STATUS / ACTIVE</span>
            <span className="text-accent font-medium">DOCUMENT END //</span>
          </div>

        </div>
      </SectionWrapper>

    </PageContainer>
  );
};
