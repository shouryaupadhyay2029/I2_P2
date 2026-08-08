import React, { forwardRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { ValidationMessage } from './ValidationMessage';

export const FormField = forwardRef(({
  label,
  id,
  type = 'text',
  error,
  helperText,
  className,
  containerClassName,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = props.value || props.defaultValue;
  const isFloating = isFocused || hasValue;

  return (
    <div className={cn("relative w-full mb-5 flex flex-col gap-2", containerClassName)}>
      {label && (
        <label
          htmlFor={id}
          className={cn(
            "text-[10px] font-technical uppercase tracking-widest text-white/40",
            error ? "text-red-400" : isFocused ? "text-white/60" : ""
          )}
        >
          {label}
        </label>
      )}
      
      <div 
        className={cn(
          "relative bg-[#0a0a0a] border border-white/10 rounded-[8px] transition-all duration-200 overflow-hidden",
          isFocused ? "border-white ring-1 ring-white/10" : "hover:border-white/20",
          error && "border-red-500/50 focus-within:border-red-500"
        )}
      >
        <input
          ref={ref}
          id={id}
          type={type}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          className={cn(
            "w-full bg-transparent px-4 py-3 text-sm text-white/90 outline-none placeholder-white/20",
            "font-sans selection:bg-white/20",
            className
          )}
          {...props}
        />
      </div>

      <ValidationMessage message={error} type="error" />
      {!error && helperText && <ValidationMessage message={helperText} type="helper" />}
    </div>
  );
});

FormField.displayName = 'FormField';
