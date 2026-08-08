import React from 'react';

export const AuthDivider = ({ text = "or" }) => {
  return (
    <div className="relative my-6 flex items-center justify-center">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-white/[0.06]"></div>
      </div>
      <div className="relative flex justify-center">
        <span className="bg-[#121212] px-4 text-[0.65rem] font-technical uppercase tracking-[0.2em] text-white/35">
          {text}
        </span>
      </div>
    </div>
  );
};
