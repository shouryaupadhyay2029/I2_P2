import React from 'react';
import { cn } from '../../../utils/cn';

export const StatusSelector = ({ value, onChange, error }) => {
  return (
    <div className="flex flex-col gap-3 w-full">
      <label className="text-micro text-primary">Registration Status</label>
      <div className="flex gap-4">
        {['open', 'closed'].map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => onChange(status)}
            className={cn(
              "flex-1 py-3 border text-xs tracking-wider font-technical uppercase transition-all duration-300 rounded-none focus:outline-none",
              value === status
                ? "border-accent text-accent bg-accent/5"
                : "border-white/10 text-white/50 hover:border-white/20 hover:text-white"
            )}
          >
            {status}
          </button>
        ))}
      </div>
      {error && <span className="text-[0.7rem] text-red-400 font-technical uppercase tracking-wide">{error}</span>}
    </div>
  );
};
