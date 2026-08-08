import React from 'react';

export const FormDivider = ({ text = "OR" }) => {
  return (
    <div className="relative my-8">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border"></div>
      </div>
      <div className="relative flex justify-center">
        <span className="bg-background px-4 text-caption text-secondary uppercase tracking-[0.1em]">
          {text}
        </span>
      </div>
    </div>
  );
};
