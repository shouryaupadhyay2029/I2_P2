import React from 'react';

export const LoadingSkeleton = () => {
  return (
    <div className="w-full flex flex-col pt-24 animate-pulse">
      <div className="h-6 w-32 bg-white/5 mb-16" />
      <div className="w-full aspect-[21/9] bg-white/5 mb-16" />
      
      <div className="flex flex-col md:flex-row justify-between w-full items-start gap-16 mt-8">
        <div className="flex flex-col gap-6 w-full max-w-[650px]">
          <div className="h-4 w-24 bg-white/5" />
          <div className="h-12 w-full bg-white/5" />
          <div className="h-32 w-full bg-white/5" />
        </div>
        
        <div className="flex flex-col gap-6 min-w-[320px] w-full md:w-auto">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="flex justify-between items-center pb-4 border-b border-white/5">
              <div className="h-4 w-20 bg-white/5" />
              <div className="h-4 w-32 bg-white/5" />
            </div>
          ))}
          <div className="h-12 w-full bg-white/5 mt-4" />
        </div>
      </div>
    </div>
  );
};
