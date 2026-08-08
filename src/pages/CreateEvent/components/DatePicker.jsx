import React from 'react';
import { cn } from '../../../utils/cn';

export const DatePicker = ({ label, value, onChange, error, min, type = "date" }) => {
  return (
    <div className="flex flex-col gap-3 w-full">
      <label className="text-micro text-black/50">{label}</label>
      <input
        type={type}
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border border-black/10 px-5 py-3.5 text-sm text-black/80 focus:outline-none focus:border-black font-ui rounded-full transition-colors"
      />
      {error && <span className="text-[0.7rem] text-red-600 font-technical uppercase tracking-wide">{error}</span>}
    </div>
  );
};
