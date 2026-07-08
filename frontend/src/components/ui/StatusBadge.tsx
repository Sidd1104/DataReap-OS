'use client';

import { clsx } from 'clsx';
import type { JobStatus, WorkerState, LogLevel } from '@/types';

interface StatusBadgeProps {
  status: JobStatus | WorkerState | LogLevel | string;
  size?: 'sm' | 'md';
  pulse?: boolean;
}

const statusConfig: Record<string, { color: string; dot: string; label: string }> = {
  // Job statuses
  pending:   { color: 'text-slate-300 bg-slate-800/60 border-slate-600/30',  dot: 'bg-slate-400', label: 'Pending' },
  running:   { color: 'text-cyan-300 bg-cyan-950/60 border-cyan-500/30',     dot: 'bg-cyan-400',  label: 'Running' },
  paused:    { color: 'text-amber-300 bg-amber-950/60 border-amber-500/30',  dot: 'bg-amber-400', label: 'Paused' },
  completed: { color: 'text-emerald-300 bg-emerald-950/60 border-emerald-500/30', dot: 'bg-emerald-400', label: 'Complete' },
  failed:    { color: 'text-red-300 bg-red-950/60 border-red-500/30',        dot: 'bg-red-400',   label: 'Failed' },
  cancelled: { color: 'text-slate-400 bg-slate-900/60 border-slate-700/30',  dot: 'bg-slate-500', label: 'Cancelled' },
  // Worker states
  idle:      { color: 'text-slate-300 bg-slate-800/60 border-slate-600/30',  dot: 'bg-slate-400', label: 'Idle' },
  stopped:   { color: 'text-slate-400 bg-slate-900/60 border-slate-700/30',  dot: 'bg-slate-500', label: 'Stopped' },
  crashed:   { color: 'text-red-300 bg-red-950/60 border-red-500/30',        dot: 'bg-red-400',   label: 'Crashed' },
  // Log levels
  INFO:      { color: 'text-cyan-300 bg-cyan-950/60 border-cyan-500/30',     dot: 'bg-cyan-400',  label: 'INFO' },
  WARNING:   { color: 'text-amber-300 bg-amber-950/60 border-amber-500/30',  dot: 'bg-amber-400', label: 'WARN' },
  ERROR:     { color: 'text-red-300 bg-red-950/60 border-red-500/30',        dot: 'bg-red-400',   label: 'ERROR' },
  DEBUG:     { color: 'text-slate-300 bg-slate-800/60 border-slate-600/30',  dot: 'bg-slate-400', label: 'DEBUG' },
  CRITICAL:  { color: 'text-red-200 bg-red-900/60 border-red-400/30',        dot: 'bg-red-300',   label: 'CRIT' },
};

export default function StatusBadge({ status, size = 'md', pulse = false }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    color: 'text-slate-300 bg-slate-800/60 border-slate-600/30',
    dot: 'bg-slate-400',
    label: status,
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        config.color
      )}
    >
      <span
        className={clsx(
          'status-dot',
          config.dot,
          pulse && status === 'running' && 'animate-pulse'
        )}
      />
      {config.label}
    </span>
  );
}
