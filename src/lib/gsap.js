import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger, useGSAP);

// Set default GSAP configuration
gsap.defaults({
  ease: "power3.out",
  duration: 1,
});

/**
 * Reusable reveal animation for GSAP
 */
export const revealAnimation = (element, trigger) => {
  return gsap.fromTo(
    element,
    { y: 50, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: 1.2,
      ease: "power4.out",
      scrollTrigger: {
        trigger: trigger || element,
        start: "top 85%",
        toggleActions: "play none none reverse",
      },
    }
  );
};

export { gsap, ScrollTrigger, useGSAP };
