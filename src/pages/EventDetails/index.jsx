import React, { useEffect, useState, useRef } from 'react';
import { trackEvent } from '../../services/analyticsService';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PageTransition } from '../../components/layout/PageTransition';
import { PageContainer } from '../../components/layout/PageContainer';
import { SectionWrapper } from '../../components/layout/SectionWrapper';
import { AxisMarker } from '../../components/layout/AxisMarker';
import { Button } from '../../components/ui/Button';
import { getEvent } from '../../services/eventService';
import { checkUserRegistration, registerForEvent } from '../../services/registrationService';
import { useAuth } from '../../hooks/useAuth';
import { EventHero } from './components/EventHero';
import { EventDescription } from './components/EventDescription';
import { resolveEventImage } from '../../utils/eventImage';
import { RegistrationPanel } from './components/RegistrationPanel';
import { LoadingSkeleton } from './components/LoadingSkeleton';

export const EventDetails = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const trackedIdRef = useRef(null);

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: '' }

  const triggerToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const fetchEventAndRegistration = async () => {
      if (!eventId) return;
      setLoading(true);
      try {
        const data = await getEvent(eventId);
        setEvent(data);

        if (data && trackedIdRef.current !== data.id) {
          trackedIdRef.current = data.id;
          trackEvent("event_view", {
            event_id: data.id,
            event_category: data.category || "General",
            event_status: data.status || "Published"
          });
        }

        if (user && data) {
          const registered = await checkUserRegistration(user.uid, eventId);
          setIsRegistered(registered);
        }
      } catch (err) {
        console.error("Failed to load event details: ", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEventAndRegistration();
  }, [eventId, user]);

  const handleRegister = async () => {
    if (!user) {
      triggerToast("error", "You must be logged in to register for events.");
      return;
    }
    if (!event) return;

    setIsRegistering(true);
    try {
      const result = await registerForEvent(user.uid, event.id);

      // Update local states reactively
      setIsRegistered(true);
      setEvent((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          registeredCount: result.newRegisteredCount,
          status: result.newStatus
        };
      });
      triggerToast("success", "Successfully registered for this event.");
      trackEvent("event_registration", {
        event_id: event.id,
        event_category: event.category || "General",
        registration_source: "details"
      });
    } catch (err) {
      console.error("Registration transaction failure: ", err);
      triggerToast("error", err.message || "Failed to complete registration.");
    } finally {
      setIsRegistering(false);
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <PageContainer>
          <SectionWrapper>
            <LoadingSkeleton />
          </SectionWrapper>
        </PageContainer>
      </PageTransition>
    );
  }

  if (!event) {
    return (
      <PageTransition>
        <PageContainer>
          <SectionWrapper className="min-h-[70vh] flex flex-col items-center justify-center text-center select-none">
            <span className="text-[0.65rem] font-technical text-white/30 uppercase tracking-[0.25em] mb-4">
              404 // ERROR
            </span>
            <h1 className="text-display-lg text-primary mb-6 font-light">
              This event could not be found.
            </h1>
            <p className="text-body-lg text-secondary max-w-md mx-auto mb-12">
              The requested event record does not exist or has been deleted from the archives.
            </p>
            <Button variant="secondary" onClick={() => navigate('/')}>
              Return Home
            </Button>
          </SectionWrapper>
        </PageContainer>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <PageContainer>
        <SectionWrapper>
          {/* Editorial Toast Notifications */}
          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: -20, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -20, filter: "blur(4px)" }}
                className={`fixed top-6 right-6 z-50 px-6 py-4 border backdrop-blur-md flex items-center gap-4 shadow-lg min-w-[300px] ${toast.type === 'success'
                    ? 'border-green-500/20 bg-green-950/80 text-green-200'
                    : 'border-red-500/20 bg-red-950/80 text-red-200'
                  }`}
              >
                <span className="text-[0.6rem] font-technical uppercase border border-current px-1.5 py-0.5">
                  {toast.type}
                </span>
                <span className="text-xs font-ui tracking-wide">{toast.message}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <AxisMarker index="02" label="Event Details" />

          <EventHero src={resolveEventImage(event)} alt={event.title} category={event.category} />

          <div className="flex flex-col md:flex-row justify-between w-full items-start gap-16 mt-16">
            <EventDescription
              category={event.category}
              title={event.title}
              description={event.description}
            />
            <RegistrationPanel
              event={event}
              isRegistered={isRegistered}
              onRegister={handleRegister}
              isRegistering={isRegistering}
            />
          </div>
        </SectionWrapper>
      </PageContainer>
    </PageTransition>
  );
};
