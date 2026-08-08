import React from "react";
import { cn } from "../../utils/cn";

export const SectionWrapper = ({
  children,
  className,
  id,
  as: Component = "section",
  spacing = "lg", // "sm" | "md" | "lg" | "none"
}) => {
  const spacingClasses = {
    none: "py-0",
    sm: "py-12 md:py-16",
    md: "py-16 md:py-24",
    lg: "py-24 md:py-32 lg:py-40",
  };

  return (
    <Component
      id={id}
      className={cn(
        "w-full relative z-10 flex flex-col",
        spacingClasses[spacing],
        className
      )}
    >
      {children}
    </Component>
  );
};
