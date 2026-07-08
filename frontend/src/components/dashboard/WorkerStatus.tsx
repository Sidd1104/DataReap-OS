'use client';

import { motion } from 'framer-motion';
import { Cpu, Zap, ZapOff } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import type { WorkerEngineStats, QueueStats } from '@/types';
import { clsx } from 'clsx';

interface WorkerStatusProps {
  engine: WorkerEngineStats | null;
  queue: QueueStats | null;
}

export default function WorkerStatus({ engine, queue }: WorkerStatusProps) {
  const workers = engine?.workers || [];

  return (
    <div className="space-y-3">
      {/* Summary row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu size={16} className="text-cyan-400" />
          <span className="text-sm text-slate-300">
            <span className="text-white font-semibold">{engine?.active_workers || 0}</span>
            <span className="text-slate-500"> / {engine?.concurrency || 0} workers</span>
          </span>
        </div>
        <div className={clsx(
          'flex items-center gap-1.5 text-xs px-2 py-1 rounded-full',
          engine?.running
            ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-500/20'
            : 'text-slate-500 bg-slate-800/40 border border-slate-600/20'
        )}>
          {engine?.running ? <Zap size={11} /> : <ZapOff size={11} />}
          {engine?.running ? 'Engine Running' : 'Engine Stopped'}
        </div>
      </div>

      {/* Queue stats */}
      {queue && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'In Queue', value: queue.queue_size, color: 'text-amber-400' },
            { label: 'Processed', value: queue.total_processed, color: 'text-emerald-400' },
            { label: 'Enqueued', value: queue.total_enqueued, color: 'text-cyan-400' },
          ].map(stat => (
            <div key={stat.label} className="bg-white/3 rounded-lg p-2 text-center">
              <p className={clsx('text-base font-bold', stat.color)}>{stat.value.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Worker list */}
      <div className="space-y-1.5 max-h-44 overflow-y-auto">
        {workers.length === 0 ? (
          <p className="text-xs text-slate-600 text-center py-3">No workers active</p>
        ) : (
          workers.map((w, i) => (
            <motion.div
              key={w.worker_id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/3"
            >
              <div className={clsx(
                'w-1.5 h-1.5 rounded-full flex-shrink-0',
                w.state === 'running' ? 'bg-emerald-400 animate-pulse' :
                w.state === 'idle' ? 'bg-slate-500' :
                w.state === 'paused' ? 'bg-amber-400' : 'bg-red-400'
              )} />
              <span className="text-xs text-slate-400 font-mono flex-1 truncate">
                {w.worker_id.split('-').slice(-2).join('-')}
              </span>
              <StatusBadge status={w.state} size="sm" />
              <span className="text-[10px] text-slate-600">
                {w.tasks_processed}✓
              </span>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
