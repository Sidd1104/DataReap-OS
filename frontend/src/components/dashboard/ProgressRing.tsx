'use client';

import { motion } from 'framer-motion';

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  sublabel?: string;
}

export default function ProgressRing({
  progress,
  size = 140,
  strokeWidth = 6,
  color = '#00E5FF',
  label,
  sublabel,
}: ProgressRingProps) {
  const radius = (size - 30) / 2; // Leave padding for outer decorations
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  // Calculate position of the glowing head dot
  const angle = (progress / 100) * 360 - 90;
  const rad = (angle * Math.PI) / 180;
  const dotX = size / 2 + radius * Math.cos(rad);
  const dotY = size / 2 + radius * Math.sin(rad);

  return (
    <div className="relative flex items-center justify-center select-none" style={{ width: size, height: size }}>
      
      {/* Outer rotating telemetry dashed ring */}
      <svg width={size} height={size} className="absolute inset-0 rotate-[45deg] animate-spin-slow pointer-events-none">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius + 8}
          fill="none"
          stroke="rgba(0, 229, 255, 0.15)"
          strokeWidth="1"
          strokeDasharray="6, 8"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius + 12}
          fill="none"
          stroke="rgba(124, 77, 255, 0.08)"
          strokeWidth="1.5"
          strokeDasharray="40, 180"
        />
      </svg>

      {/* Main Core SVG */}
      <svg width={size} height={size} className="rotate-[-90deg]">
        {/* Shadow glow underlay */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`${color}10`}
          strokeWidth={strokeWidth + 4}
        />
        
        {/* Background track ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.03)"
          strokeWidth={strokeWidth}
        />
        
        {/* Progress ring */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          style={{
            filter: `drop-shadow(0 0 8px ${color}bf)`,
          }}
        />

        {/* Orbiting tip glowing dot */}
        {progress > 0 && (
          <circle
            cx={dotX}
            cy={dotY}
            r="4"
            fill="#ffffff"
            style={{
              filter: `drop-shadow(0 0 10px #ffffff) drop-shadow(0 0 5px ${color})`,
            }}
          />
        )}
      </svg>

      {/* Center core glass sphere */}
      <div 
        className="absolute rounded-full flex flex-col items-center justify-center bg-gradient-to-b from-white/5 to-white/0 border border-white/5 shadow-inner" 
        style={{ width: (radius * 2) - 10, height: (radius * 2) - 10 }}
      >
        {label && (
          <motion.span
            key={label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-lg font-black text-white leading-none tracking-tight font-mono text-shadow-glow"
          >
            {label}
          </motion.span>
        )}
        {sublabel && (
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">{sublabel}</span>
        )}
      </div>
    </div>
  );
}
