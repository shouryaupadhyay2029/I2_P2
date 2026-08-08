import React from 'react';
import { getParticipationHours } from '../../../utils/clubHours';
import { cn } from '../../../utils/cn';

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
};

export const EventInfoGrid = ({ event }) => {
  const remainingSeats = Math.max(0, (event.capacity || 0) - (event.registeredCount || 0));
  const hours = getParticipationHours(event);

  const infoItems = [
    { label: "Date", value: formatDate(event.date) },
    { label: "Time", value: event.time || "N/A" },
    { label: "Venue", value: event.venue },
    { label: "Organizer", value: event.organizer },
    { label: "Capacity", value: `${event.capacity} seats` },
    { label: "Remaining Seats", value: `${remainingSeats} available` },
    { label: "Deadline", value: formatDate(event.registrationDeadline) },
    { 
      label: "Category", 
      value: event.category || "General"
    }
  ];

  return (
    <div className="flex flex-col gap-5 w-full">
      {infoItems.map((item, index) => (
        <div 
          key={index}
          className="flex justify-between items-center py-3.5 border-b border-white/5 text-[0.7rem] md:text-xs font-technical uppercase"
        >
          <span className="text-white/40 text-left">{item.label}</span>
          <div className="flex flex-col items-end gap-1 text-right">
            <span className={cn(
              "font-medium tracking-wide", 
              item.isCredit ? "text-accent" : item.label === "Club Hours" ? "text-white/30" : "text-primary"
            )}>
              {item.value || "N/A"}
            </span>
            {item.facultyVerified && (
              <span className="text-[0.48rem] text-white/40 tracking-wider font-technical leading-none">
                Verified Credit
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
