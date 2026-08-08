import React from 'react';
import { PageTransition } from '../../components/layout/PageTransition';
import { PageContainer } from '../../components/layout/PageContainer';
import { SectionWrapper } from '../../components/layout/SectionWrapper';
import { AxisMarker } from '../../components/layout/AxisMarker';
import { EventForm } from './components/EventForm';

export const CreateEvent = () => {
  return (
    <PageTransition>
      <div className="landing-light-theme relative min-h-screen bg-[#F5F2EB] text-[#1a1a1a] overflow-hidden font-ui">
        {/* Grain Layer */}
        <div
          className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none z-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
          }}
        />

        {/* Subtle Architectural Grid Lines */}
        <div className="absolute inset-0 flex justify-between pointer-events-none z-0 px-8 md:px-16 opacity-[0.03]">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-[1px] h-full bg-black" />
          ))}
        </div>

        {/* Warm Radial Glow */}
        <div className="absolute inset-0 pointer-events-none z-0 bg-[radial-gradient(circle_at_center,rgba(255,253,245,0.6)_0%,transparent_75%)]" />

        <PageContainer className="relative z-10 bg-transparent">
          <SectionWrapper className="max-w-4xl py-12 md:py-20 flex flex-col gap-12 text-left relative">
            <AxisMarker index="09" label="Event Operations" />
            
            <div className="flex flex-col mb-16 max-w-2xl text-left">
              <h1 className="text-display-l text-black mb-6 font-light">Publish Event</h1>
              <p className="text-body-l text-black/60 font-light leading-relaxed">
                Configure and publish a new event into the campus archive. Ensure all details, limits, and deadlines are correctly defined.
              </p>
            </div>

            <EventForm />
          </SectionWrapper>
        </PageContainer>
      </div>
    </PageTransition>
  );
};
