import React from 'react';
import { cn } from '../../../utils/cn';

const categories = [
  "Technical", "Hackathons", "Workshops", "Sports", "Cultural", "Seminars", "Competitions", "Networking", "Guest Lectures"
];

export const CategorySelector = ({ value, onChange, error }) => {
  return (
    <div className="flex flex-col gap-3">
      <label className="text-micro text-black/50">Category</label>
      <div className="flex flex-wrap gap-2.5">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => onChange(cat)}
            className={cn(
              "px-5 py-2 border text-xs tracking-wider font-technical uppercase transition-all duration-200 rounded-full focus:outline-none cursor-pointer font-bold",
              value === cat
                ? "bg-black text-white border-black"
                : "bg-transparent text-black/60 border-black/10 hover:border-black/25 hover:text-black"
            )}
          >
            {cat}
          </button>
        ))}
      </div>
      {error && <span className="text-[0.7rem] text-red-600 font-technical uppercase tracking-wide">{error}</span>}
    </div>
  );
};
