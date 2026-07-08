'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Play, Pause, Square, RefreshCw, Download,
  RotateCcw, ChevronDown, Loader2
} from 'lucide-react';
import GlowButton from '@/components/ui/GlowButton';
import { jobsApi } from '@/lib/api';
import type { Job } from '@/types';
import { clsx } from 'clsx';

interface ControlPanelProps {
  activeJob: Job | null;
  onAction: () => void;
}

export default function ControlPanel({ activeJob, onAction }: ControlPanelProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<'excel' | 'csv' | 'json'>('excel');

  const doAction = async (action: string, fn: () => Promise<any>) => {
    setLoading(action);
    try {
      await fn();
      onAction();
    } catch (err) {
      console.error(action, err);
    } finally {
      setLoading(null);
    }
  };

  if (!activeJob) {
    return (
      <div className="text-center py-8 text-slate-600">
        <Play size={28} className="mx-auto mb-2 opacity-30" />
        <p className="text-sm">No active job</p>
        <p className="text-xs mt-1">Upload a dataset to start</p>
      </div>
    );
  }

  const isRunning = activeJob.status === 'running';
  const isPaused = activeJob.status === 'paused';

  return (
    <div className="space-y-4">
      {/* Active job info */}
      <div className="px-3 py-2.5 rounded-xl bg-white/3 border border-white/5">
        <p className="text-xs text-slate-400">Active Job</p>
        <p className="text-sm font-medium text-white mt-0.5 truncate">{activeJob.project_name}</p>
        <p className="text-xs text-slate-500 truncate">{activeJob.filename}</p>

        {/* Progress bar */}
        <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${activeJob.progress_pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full"
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-500 mt-1">
          <span>{activeJob.progress_pct.toFixed(1)}% complete</span>
          <span>{activeJob.processed_rows}/{activeJob.total_rows} rows</span>
        </div>

        {/* ETA */}
        {activeJob.estimated_seconds_remaining !== null && isRunning && (
          <p className="text-[10px] text-cyan-400 mt-1">
            ≈ {formatETA(activeJob.estimated_seconds_remaining)} remaining
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2">
        {isRunning ? (
          <GlowButton
            color="amber"
            icon={<Pause size={14} />}
            loading={loading === 'pause'}
            onClick={() => doAction('pause', () => jobsApi.pause(activeJob.id))}
          >
            Pause
          </GlowButton>
        ) : isPaused ? (
          <GlowButton
            color="cyan"
            icon={<Play size={14} />}
            loading={loading === 'resume'}
            onClick={() => doAction('resume', () => jobsApi.resume(activeJob.id))}
          >
            Resume
          </GlowButton>
        ) : (
          <GlowButton color="cyan" icon={<Play size={14} />} disabled>
            Start
          </GlowButton>
        )}

        <GlowButton
          color="red"
          icon={<Square size={14} />}
          loading={loading === 'stop'}
          onClick={() => doAction('stop', () => jobsApi.stop(activeJob.id))}
          disabled={activeJob.status === 'completed' || activeJob.status === 'cancelled'}
        >
          Stop
        </GlowButton>

        <GlowButton
          color="violet"
          icon={<RotateCcw size={14} />}
          loading={loading === 'retry'}
          onClick={() => doAction('retry', () => jobsApi.retryFailed(activeJob.id))}
          disabled={activeJob.failed_rows === 0}
        >
          Retry Failed ({activeJob.failed_rows})
        </GlowButton>

        <div className="relative flex gap-1">
          <GlowButton
            color="emerald"
            icon={<Download size={14} />}
            loading={loading === 'download'}
            onClick={() => {
              const url = jobsApi.downloadUrl(activeJob.id, downloadFormat);
              window.open(url, '_blank');
            }}
            className="flex-1"
          >
            Download
          </GlowButton>
          <select
            value={downloadFormat}
            onChange={e => setDownloadFormat(e.target.value as any)}
            className="text-[10px] bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 rounded-lg px-1 outline-none cursor-pointer"
          >
            <option value="excel">XLSX</option>
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function formatETA(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}
