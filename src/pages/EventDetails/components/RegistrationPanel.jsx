import React from 'react';
import { Button } from '../../../components/ui/Button';
import { EventInfoGrid } from './EventInfoGrid';
import { getParticipationHours } from '../../../utils/clubHours';

export const RegistrationPanel = ({ event, isRegistered, onRegister, isRegistering }) => {
  const isOpen = event.status?.toLowerCase() === "open";

  // Determine button copy and interaction locks
  let buttonLabel = "Register Now";
  let isButtonDisabled = !isOpen || isRegistering;

  if (isRegistered) {
    buttonLabel = "Registered ✓";
    isButtonDisabled = true;
  } else if (isRegistering) {
    buttonLabel = "Registering...";
    isButtonDisabled = true;
  } else if (!isOpen) {
    buttonLabel = "Registration Closed";
    isButtonDisabled = true;
  }

  return (
    <div className="flex flex-col gap-8 min-w-[320px] w-full md:w-[360px] border border-white/5 bg-[#090909]/40 backdrop-blur-md p-8 relative rounded-[20px] shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
      <h3 className="text-micro text-primary border-b border-white/5 pb-4 mb-2">
        EVENT ACCESS // PANEL
      </h3>
      
      <EventInfoGrid event={event} />

      <Button
        variant="primary"
        disabled={isButtonDisabled}
        onClick={onRegister}
        className="w-full h-12 flex items-center justify-center text-xs uppercase tracking-wider font-technical"
      >
        {buttonLabel}
      </Button>
    </div>
  );
};
