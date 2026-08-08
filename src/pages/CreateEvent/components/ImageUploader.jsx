import React from 'react';
import { cn } from '../../../utils/cn';

const presetImages = [
  { name: "Tech Stage", url: "https://images.unsplash.com/photo-1591115765373-5207764f72e7?q=80&w=600&auto=format&fit=crop" },
  { name: "AI/Code", url: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?q=80&w=600&auto=format&fit=crop" },
  { name: "Exhibition", url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=600&auto=format&fit=crop" }
];

export const ImageUploader = ({ value, onChange, error }) => {
  return (
    <div className="flex flex-col gap-3">
      <label className="text-micro text-black/50">Event Image</label>
      
      {/* Tab bar */}
      <div className="flex gap-6 border-b border-black/5 pb-2">
        <button
          type="button"
          className="text-micro focus:outline-none pb-1 border-b border-black text-black cursor-pointer font-bold"
        >
          Image URL
        </button>
        
        {/* Disabled File Upload tab with premium badge & tooltip */}
        <div className="relative group/tab">
          <button
            type="button"
            disabled={true}
            className="text-micro text-black/20 cursor-not-allowed focus:outline-none pb-1 flex items-center gap-2 transition-colors duration-200"
          >
            <span>File Upload</span>
            <span className="text-[0.48rem] font-technical uppercase px-1.5 py-0.5 border border-black/10 bg-black/5 text-black/35 tracking-wider rounded-md">
              Requires Cloud Storage
            </span>
          </button>
          
          {/* Premium Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tab:block z-50 pointer-events-none">
            <div className="bg-white border border-black/10 text-black/50 text-[0.55rem] font-technical uppercase tracking-wider px-3 py-2 shadow-2xl relative whitespace-nowrap rounded-lg">
              Local image uploads will be enabled after Cloud Storage is activated.
              {/* Tooltip arrow */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-black/10" />
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[2px] w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-white" />
            </div>
          </div>
        </div>
      </div>

      {/* URL Input and Presets Content */}
      <div className="flex flex-col gap-3">
        <input
          type="url"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://images.unsplash.com/..."
          className="w-full bg-white border border-black/10 px-5 py-3.5 text-sm text-black/80 placeholder-black/30 focus:outline-none focus:border-black font-ui rounded-full transition-colors"
        />
        <div className="flex items-center gap-3">
          <span className="text-[0.65rem] text-black/30 font-technical uppercase">Presets:</span>
          <div className="flex gap-2">
            {presetImages.map((img) => (
              <button
                key={img.name}
                type="button"
                onClick={() => onChange(img.url)}
                className="px-3 py-1 border border-black/5 hover:border-black/20 text-[0.6rem] font-technical text-black/40 hover:text-black uppercase transition-colors rounded-full cursor-pointer font-bold"
              >
                {img.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Image Preview */}
      {value && (
        <div className="mt-2 w-full max-w-[320px] aspect-[16/10] border border-black/10 overflow-hidden relative group rounded-2xl">
          <img
            src={value}
            alt="Upload Preview"
            className="w-full h-full object-cover grayscale transition-all duration-500 group-hover:grayscale-0"
          />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 px-3 py-1.5 bg-white/95 border border-black/10 text-[0.6rem] font-technical text-black/80 hover:text-black uppercase focus:outline-none rounded-full cursor-pointer font-bold"
          >
            Remove
          </button>
        </div>
      )}

      {error && <span className="text-[0.7rem] text-red-600 font-technical uppercase tracking-wide">{error}</span>}
    </div>
  );
};
