'use client';

import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import type { ReactNode, ButtonHTMLAttributes } from 'react';

type GlowColor = 'cyan' | 'violet' | 'emerald' | 'red' | 'amber';

interface GlowButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  color?: GlowColor;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}

const colorMap: Record<GlowColor, string> = {
  cyan: 'btn-glow-cyan',
  violet: 'btn-glow-violet',
  emerald: 'btn-glow-emerald',
  red: 'btn-glow-red',
  amber: 'btn-glow-amber',
};

const sizeMap = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export default function GlowButton({
  children,
  color = 'cyan',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  className,
  disabled,
  ...props
}: GlowButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      className={clsx(
        colorMap[color],
        sizeMap[size],
        'rounded-xl font-medium flex items-center gap-2 justify-center',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none',
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || loading}
      {...(props as any)}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Processing...
        </>
      ) : (
        <>
          {icon && <span className="flex-shrink-0">{icon}</span>}
          {children}
        </>
      )}
    </motion.button>
  );
}
