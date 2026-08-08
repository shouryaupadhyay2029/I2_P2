import React, { useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

export const LivingBackground = () => {
  // Normalize screen coordinates (-1 to 1) from center
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Heavy fluid spring for the grain layer (creates sloshing liquid delay, max 6px)
  const grainX = useSpring(mouseX, { mass: 3, damping: 150, stiffness: 80 });
  const grainY = useSpring(mouseY, { mass: 3, damping: 150, stiffness: 80 });

  // Light tracking spring (slightly faster to catch the eye, max 40px)
  const lightX = useSpring(mouseX, { mass: 1.5, damping: 70, stiffness: 120 });
  const lightY = useSpring(mouseY, { mass: 1.5, damping: 70, stiffness: 120 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      mouseX.set(x);
      mouseY.set(y);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  // Map mouse positions to absolute offsets
  const grainOffsetX = useTransform(grainX, [-1, 1], [-6, 6]);
  const grainOffsetY = useTransform(grainY, [-1, 1], [-6, 6]);

  const lightOffsetX = useTransform(lightX, [-1, 1], [-40, 40]);
  const lightOffsetY = useTransform(lightY, [-1, 1], [-40, 40]);

  return (
    <div className="fixed inset-0 w-full h-full z-0 overflow-hidden pointer-events-none bg-[#070707]">
      
      {/* Layer 1: Cursor Light Catch (The Glint source behind the grain) */}
      <motion.div 
        className="absolute w-[120vw] h-[120vh] -top-[10vh] -left-[10vw] mix-blend-screen"
        style={{ x: lightOffsetX, y: lightOffsetY }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,107,0,0.06)_0%,rgba(255,255,255,0.02)_20%,transparent_55%)] blur-[30px]" />
      </motion.div>

      {/* Layer 2: Heavy Fluid Grain Layer with Slow GPU-Accelerated Drift & Parallax */}
      <motion.div 
        className="absolute w-[120vw] h-[120vh] -top-[10vh] -left-[10vw] mix-blend-screen opacity-[0.14] pointer-events-none"
        style={{ 
          x: grainOffsetX, 
          y: grainOffsetY,
        }}
      >
        <motion.div
          className="w-full h-full will-change-transform [backface-visibility:hidden]"
          style={{ 
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 250 250' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='sandNoise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='1' result='noise'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 1   0 0 0 0 1   0 0 0 0 1   1 0 0 0 -0.55'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23sandNoise)'/%3E%3C/svg%3E")`
          }}
          animate={{
            x: [0, 20, -10, 0],
            y: [0, -15, 10, 0]
          }}
          transition={{
            duration: 60,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </motion.div>
    </div>
  );
};
