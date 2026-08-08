import React from "react";
import { cn } from "../../utils/cn";

export const Divider = ({ className, orientation = "horizontal" }) => {
  return (
    <div
      role="separator"
      className={cn(
        "bg-divider",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className
      )}
    />
  );
};
