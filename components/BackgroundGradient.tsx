"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BackgroundGradientProps {
  videoId: string;
  currentLineIndex?: number;
  isPlaying?: boolean;
}

// Particle interface
interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
}

export default function BackgroundGradient({
  videoId,
  currentLineIndex = -1,
  isPlaying = false
}: BackgroundGradientProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const prevLineIndexRef = useRef(currentLineIndex);

  // Generate particles continuously when playing
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isPlaying) {
      interval = setInterval(() => {
        setParticles(prev => {
          // Limit max particles to avoid performance issues
          if (prev.length > 30) return prev.slice(1);

          // Generate 1 new particle at a time for smooth stream
          const rand = Math.random();
          let color;
          if (rand < 0.4) color = "#8b5cf6"; // Violet (40%)
          else if (rand < 0.7) color = "#22d3ee"; // Cyan (30%)
          else if (rand < 0.9) color = "#4c1d95"; // Deep Purple (20%)
          else color = "#ffffff"; // White accents (10%)

          const newParticle: Particle = {
            id: Date.now(),
            x: Math.random() * 100,
            y: 110, // Always start from bottom
            size: Math.random() * 12 + 2, // 2px to 14px
            color,
            duration: Math.random() * 4 + 3, // 3-7s - Slow and floaty
            delay: 0
          };

          return [...prev, newParticle];
        });
      }, 300); // New particle every 300ms
    }

    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-[#030303]">
      {/* Base Gradient Orbs (Slower, Ambient) */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] rounded-full mix-blend-screen blur-[120px]"
        style={{ backgroundColor: "#4c1d95" }} // Darker Violet
      />

      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vw] rounded-full mix-blend-screen blur-[120px]"
        style={{ backgroundColor: "#0e7490" }} // Darker Cyan
      />

      {/* Reactive Pulse Orb (Center) - Keeps pulsing on line change */}
      <motion.div
        key={currentLineIndex}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: [1, 1.2], opacity: [0.3, 0] }} // Subtler pulse
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] rounded-full mix-blend-overlay blur-[90px]"
        style={{ backgroundColor: currentLineIndex % 2 === 0 ? "#8b5cf6" : "#22d3ee" }}
      />

      {/* Floating Particles - Continuous Stream */}
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{ y: "110vh", x: `${particle.x}vw`, opacity: 0, scale: 0 }}
            animate={{
              y: "-10vh",
              x: `${particle.x + (Math.random() * 20 - 10)}vw`, // Drift
              opacity: [0, 0.8, 0], // Smooth fade in/out
              scale: [0.5, 1, 0.5]
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: particle.duration, ease: "linear" }}
            onAnimationComplete={() => setParticles(prev => prev.filter(p => p.id !== particle.id))}
            className="absolute rounded-full mix-blend-screen"
            style={{
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
              boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`
            }}
          />
        ))}
      </AnimatePresence>

      {/* Noise Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />

      {/* Darkening Overlay */}
      <div className="absolute inset-0 bg-black/50" />
    </div>
  );
}
