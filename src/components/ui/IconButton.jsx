import React from "react";
import { cn } from "../../utils/cn";
import { motion } from "framer-motion";

const iconButtonVariants = {
  primary: "bg-accent text-white hover:bg-accent-hover hover:-translate-y-[1px]",
  secondary: "bg-transparent border border-border text-primary hover:border-divider hover:bg-surface hover:-translate-y-[1px]",
  ghost: "bg-transparent text-secondary hover:text-primary hover:bg-surface/50",
};

const iconButtonSizes = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};

export const IconButton = React.forwardRef(
  ({ className, variant = "ghost", size = "md", children, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.96 }}
        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "inline-flex items-center justify-center flex-shrink-0 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:opacity-50 disabled:pointer-events-none rounded-none",
          iconButtonSizes[size],
          iconButtonVariants[variant],
          className
        )}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);

IconButton.displayName = "IconButton";
