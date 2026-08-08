import React from "react";
import { cn } from "../../utils/cn";

export const PageContainer = ({ 
  children, 
  className,
  width = "1400px" // "1200px" | "1400px" | "full"
}) => {
  // Lenis initialization handled globally in Layout, but this container manages widths
  
  const widthClasses = {
    "1200px": "max-w-[1200px]",
    "1400px": "max-w-[1400px]",
    "full": "w-full",
  };

  return (
    <main 
      className={cn(
        "w-full mx-auto px-6 md:px-10 flex-grow flex flex-col relative z-10 pt-[72px]",
        widthClasses[width],
        className
      )}
    >
      {children}
    </main>
  );
};
