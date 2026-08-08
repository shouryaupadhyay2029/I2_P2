import React from "react";
import { cn } from "../../utils/cn";

export const Panel = React.forwardRef(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-surface border border-border p-8 md:p-12 rounded-none",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Panel.displayName = "Panel";
