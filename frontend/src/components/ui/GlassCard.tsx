'use client';

import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import type { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  glow?: 'cyan' | 'violet' | 'emerald' | 'none';
  hover?: boolean;
  animate?: boolean;
  delay?: number;
  onClick?: () => void;
}

export default function GlassCard({
  children,
  className,
  glow = 'none',
  hover = false,
  animate = true,
  delay = 0,
  onClick,
}: GlassCardProps) {
  const glowClass = {
    cyan: 'glow-border-cyan',
    violet: 'glow-border-violet',
    emerald: 'glow-border-emerald',
    none: '',
  }[glow];

  const content = (
    <div
      className={clsx(
        'glass-card',
        glowClass,
        hover && 'glass-card-hover cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );

  if (!animate) return content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className={clsx(
        'glass-card',
        glowClass,
        hover && 'glass-card-hover cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}
