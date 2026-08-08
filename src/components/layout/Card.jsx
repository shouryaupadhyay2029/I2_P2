import React from "react";
import { cn } from "../../utils/cn";
import { Surface } from "./Surface";

export const Card = React.forwardRef(
  ({ className, children, ...props }, ref) => {
    return (
      <Surface
        ref={ref}
        className={cn("p-6 md:p-8 flex flex-col gap-4", className)}
        {...props}
      >
        {children}
      </Surface>
    );
  }
);

Card.displayName = "Card";
