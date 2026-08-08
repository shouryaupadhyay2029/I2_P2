import React from "react";
import { cn } from "../../utils/cn";

export const Surface = React.forwardRef(
  ({ className, elevated = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "border border-border rounded-none",
          elevated ? "bg-elevated" : "bg-surface",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Surface.displayName = "Surface";
