import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../firebase/firestore";
import { AxisMarker } from "../../../components/layout/AxisMarker";
import { RevealSection, RevealItem, StandaloneReveal } from "../../../components/ui/RevealSection";

export const Testimonials = () => {
  const [stats, setStats] = useState({
    students: "—",
    organizers: "—",
    clubs: "—",
    publishedEvents: "—",
    upcomingEvents: "—",
    registrations: "—",
    completedEvents: "—",
    loading: true
  });

  useEffect(() => {
    const fetchStats = async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      
      let studentsVal = "—";
      let organizersVal = "—";
      let clubsVal = "—";
      let publishedVal = "—";
      let upcomingVal = "—";
      let registrationsVal = "—";
      let completedVal = "—";

      // 1. Fetch Clubs (Publicly readable)
      try {
        const clubsSnap = await getDocs(collection(db, "clubs"));
        clubsVal = clubsSnap.size;
      } catch (err) {
        console.error("Could not fetch clubs count:", err);
      }

      // 2. Fetch Events (Publicly readable)
      try {
        const eventsSnap = await getDocs(collection(db, "events"));
        const eventsList = [];
        eventsSnap.forEach(d => eventsList.push(d.data()));
        
        const nonDeleted = eventsList.filter(e => e.status !== "deleted");
        publishedVal = nonDeleted.filter(e => e.status === "published" || e.status === "open" || e.status === "closed" || e.status === "completed").length;
        upcomingVal = nonDeleted.filter(e => e.status === "published" && e.date && e.date >= todayStr).length;
        completedVal = nonDeleted.filter(e => e.status === "completed" || (e.date && e.date < todayStr)).length;
      } catch (err) {
        console.error("Could not fetch events count:", err);
      }

      // 3. Fetch Users (Requires Authentication)
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        const usersList = [];
        usersSnap.forEach(d => usersList.push(d.data()));
        
        studentsVal = usersList.filter(u => (u.role || "").toLowerCase().trim() === "student").length;
        organizersVal = usersList.filter(u => (u.role || "").toLowerCase().trim() === "organizer").length;
      } catch (err) {
        console.error("Could not fetch users count (unauthenticated):", err);
      }

      // 4. Fetch Registrations (Requires Authentication)
      try {
        const regsSnap = await getDocs(collection(db, "registrations"));
        registrationsVal = regsSnap.size;
      } catch (err) {
        console.error("Could not fetch registrations count (unauthenticated):", err);
      }

      setStats({
        students: studentsVal,
        organizers: organizersVal,
        clubs: clubsVal,
        publishedEvents: publishedVal,
        upcomingEvents: upcomingVal,
        registrations: registrationsVal,
        completedEvents: completedVal,
        loading: false
      });
    };

    fetchStats();
  }, []);

  return (
    <RevealSection as="section" className="w-full flex flex-col mb-32 pt-24">
      <StandaloneReveal margin="-5%">
        <AxisMarker index="06" label="Platform Overview" />
      </StandaloneReveal>

      <RevealSection margin="-5%" staggerDelay={0.1}>
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-24 w-full max-w-[1200px] justify-between text-left">
          
          {/* Left Column: Heading and description */}
          <RevealItem className="flex-[0_0_auto] lg:max-w-sm">
            <div className="flex flex-col gap-6">
              <span className="text-micro font-technical text-white/50 tracking-[0.25em] uppercase">
                SYSTEM STATS
              </span>
              <h2 className="text-display-m font-light text-primary leading-tight">
                Platform Overview
              </h2>
              <p className="text-body-s text-secondary leading-relaxed font-light">
                NovaEvent centralizes events into a single discoverable platform designed for attendees, organizers, and administrators.
              </p>
            </div>
          </RevealItem>

          {/* Right Column: Statistics Grid */}
          <RevealItem className="flex-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 md:gap-12 w-full">
              
              <div className="flex flex-col gap-1 text-left border-b border-white/[0.06] pb-4 select-none">
                <span className="text-[0.6rem] font-mono tracking-wider text-accent uppercase">Registered Attendees</span>
                <span className="text-display-m font-light text-primary">{stats.students}</span>
              </div>
              
              <div className="flex flex-col gap-1 text-left border-b border-white/[0.06] pb-4 select-none">
                <span className="text-[0.6rem] font-mono tracking-wider text-accent uppercase">Verified Organizers</span>
                <span className="text-display-m font-light text-primary">{stats.organizers}</span>
              </div>

              <div className="flex flex-col gap-1 text-left border-b border-white/[0.06] pb-4 select-none">
                <span className="text-[0.6rem] font-mono tracking-wider text-accent uppercase">Organizations</span>
                <span className="text-display-m font-light text-primary">{stats.clubs}</span>
              </div>

              <div className="flex flex-col gap-1 text-left border-b border-white/[0.06] pb-4 select-none">
                <span className="text-[0.6rem] font-mono tracking-wider text-accent uppercase">Published Events</span>
                <span className="text-display-m font-light text-primary">{stats.publishedEvents}</span>
              </div>

              <div className="flex flex-col gap-1 text-left border-b border-white/[0.06] pb-4 select-none">
                <span className="text-[0.6rem] font-mono tracking-wider text-accent uppercase">Upcoming Events</span>
                <span className="text-display-m font-light text-primary">{stats.upcomingEvents}</span>
              </div>

              <div className="flex flex-col gap-1 text-left border-b border-white/[0.06] pb-4 select-none">
                <span className="text-[0.6rem] font-mono tracking-wider text-accent uppercase">Completed Events</span>
                <span className="text-display-m font-light text-primary">{stats.completedEvents}</span>
              </div>

              <div className="flex flex-col gap-1 text-left border-b border-white/[0.06] pb-4 select-none">
                <span className="text-[0.6rem] font-mono tracking-wider text-accent uppercase">Registrations</span>
                <span className="text-display-m font-light text-primary">{stats.registrations}</span>
              </div>

            </div>
          </RevealItem>

        </div>
      </RevealSection>
    </RevealSection>
  );
};
