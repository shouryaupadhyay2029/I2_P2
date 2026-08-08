import React from "react";

export const SectionDivider = ({ index, label }) => {
  return (
    <div className="w-full relative flex items-center justify-between border-t border-border/40 pt-4 pb-16">
      <div className="flex items-center gap-6">
        <span className="text-micro text-primary font-medium">
          INDEX {index}
        </span>
        <span className="text-micro">
          {label}
        </span>
      </div>
      <span className="text-micro">
        VOL. 01
      </span>
    </div>
  );
};
