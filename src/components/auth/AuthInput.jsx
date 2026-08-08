import React from 'react';
import { cn } from '../../utils/cn';

export const AuthInput = React.forwardRef(({ className, type = 'text', placeholder, icon: Icon, rightElement, ...props }, ref) => {
  return (
    <div className="relative w-full group/input flex items-center">
      {Icon && (
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within/input:text-white/40 transition-colors z-10 pointer-events-none flex items-center justify-center">
          <Icon className="w-3.5 h-3.5" strokeWidth={1.25} />
        </span>
      )}
      <input
        type={type}
        placeholder={placeholder}
        className={cn(
          "w-full h-[52px] bg-black border border-white/[0.045] rounded-[6px] font-ui text-[13px] text-primary transition-all duration-200",
          "shadow-[inset_0_1.5px_4px_rgba(0,0,0,0.95)] pr-12",
          "placeholder:text-white/15 focus:outline-none focus:border-accent/30 focus:ring-0 focus:shadow-[inset_0_1.5px_4px_rgba(0,0,0,0.95)]",
          Icon ? "pl-12" : "px-4",
          className
        )}
        ref={ref}
        {...props}
      />
      {rightElement && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center">
          {rightElement}
        </div>
      )}
    </div>
  );
});

AuthInput.displayName = 'AuthInput';
