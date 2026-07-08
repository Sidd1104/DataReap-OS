/**
 * Application-wide constants.
 */

export const ROUTES = {
  DASHBOARD: '/',
  SETTINGS: '/settings',
} as const;

export const LOG_LEVEL_COLORS: Record<string, string> = {
  DEBUG: 'text-slate-400',
  INFO: 'text-cyan-400',
  WARNING: 'text-amber-400',
  ERROR: 'text-red-400',
  CRITICAL: 'text-red-600',
};

export const JOB_STATUS_COLORS: Record<string, string> = {
  pending: 'text-slate-400',
  running: 'text-cyan-400',
  paused: 'text-amber-400',
  completed: 'text-emerald-400',
  failed: 'text-red-400',
  cancelled: 'text-slate-500',
};

export const JOB_STATUS_BG: Record<string, string> = {
  pending: 'bg-slate-800/60 border-slate-600/30',
  running: 'bg-cyan-950/60 border-cyan-500/30',
  paused: 'bg-amber-950/60 border-amber-500/30',
  completed: 'bg-emerald-950/60 border-emerald-500/30',
  failed: 'bg-red-950/60 border-red-500/30',
  cancelled: 'bg-slate-900/60 border-slate-700/30',
};

export const LLM_PROVIDERS = ['gemini', 'openai', 'anthropic'] as const;

export const DATA_SOURCES = [
  'google',
  'linkedin',
  'crunchbase',
  'sec',
  'pdf',
] as const;

export const EXPORT_FORMATS = ['excel', 'csv', 'json'] as const;

export const REFRESH_INTERVALS = {
  WORKERS: 3000,   // 3s
  JOBS: 5000,      // 5s
  ANALYTICS: 15000, // 15s
  LOGS: 2000,       // 2s
} as const;
