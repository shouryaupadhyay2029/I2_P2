import React from "react";

export const GridOverlay = () => {
  return (
    <div className="pointer-events-none fixed inset-0 z-[1] w-full h-full flex items-center justify-center">
      {/* Central microscopic crosshair instead of dominant grid */}
      <div className="relative w-8 h-8 opacity-[0.03]">
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-primary -translate-y-1/2" />
        <div className="absolute top-0 left-1/2 w-[1px] h-full bg-primary -translate-x-1/2" />
      </div>
    </div>
  );
};
