import React from 'react';

export const CapacityInput = ({ value, onChange, error }) => {
  return (
    <div className="flex flex-col gap-3 w-full">
      <label className="text-micro text-black/50">Event Capacity</label>
      <input
        type="number"
        value={value}
        min="1"
        onChange={(e) => {
          const val = parseInt(e.target.value, 10);
          onChange(isNaN(val) ? '' : val);
        }}
        placeholder="e.g. 100"
        className="w-full bg-white border border-black/10 px-5 py-3.5 text-sm text-black/80 placeholder-black/30 focus:outline-none focus:border-black font-ui rounded-full transition-colors"
      />
      {error && <span className="text-[0.7rem] text-red-600 font-technical uppercase tracking-wide">{error}</span>}
    </div>
  );
};
