'use client';

import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, PauseCircle, Layers } from 'lucide-react';
import AnimatedCounter from '@/components/ui/AnimatedCounter';

interface QueueStatusProps {
  byStatus: Record<string, number>;
  totalEnriched: number;
}

const STATUS_CONFIG = [
  { key: 'running',   label: 'Running',  icon: Clock,         color: 'text-cyan-400',    bg: 'bg-cyan-950/40' },
  { key: 'completed', label: 'Success',  icon: CheckCircle,   color: 'text-emerald-400', bg: 'bg-emerald-950/40' },
  { key: 'failed',    label: 'Failed',   icon: XCircle,       color: 'text-red-400',     bg: 'bg-red-950/40' },
  { key: 'paused',    label: 'Paused',   icon: PauseCircle,   color: 'text-amber-400',   bg: 'bg-amber-950/40' },
];

export default function QueueStatus({ byStatus, totalEnriched }: QueueStatusProps) {
  return (
    <div className="space-y-3">
      {/* Total enriched */}
      <div className="text-center py-2">
        <AnimatedCounter
          value={totalEnriched}
          className="text-3xl font-bold gradient-text"
        />
        <p className="text-xs text-slate-500 mt-1">Total Rows Enriched</p>
      </div>

      {/* Status grid */}
      <div className="grid grid-cols-2 gap-2">
        {STATUS_CONFIG.map(({ key, label, icon: Icon, color, bg }, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`${bg} rounded-xl p-3 border border-white/5`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Icon size={13} className={color} />
              <span className="text-[11px] text-slate-400">{label}</span>
            </div>
            <AnimatedCounter
              value={byStatus[key] || 0}
              className={`text-xl font-bold ${color}`}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
