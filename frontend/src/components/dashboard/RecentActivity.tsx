'use client';

import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import StatusBadge from '@/components/ui/StatusBadge';
import type { Job } from '@/types';
import { Clock, FileText } from 'lucide-react';

interface RecentActivityProps {
  jobs: Job[];
}

export default function RecentActivity({ jobs }: RecentActivityProps) {
  if (jobs.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-slate-600 text-sm">
        <div className="text-center">
          <FileText size={28} className="mx-auto mb-2 opacity-30" />
          <p>No recent jobs</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {jobs.slice(0, 8).map((job, i) => (
        <motion.div
          key={job.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06 }}
          className="relative overflow-hidden flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/3 hover:bg-white/5 transition-all border border-white/3 hover:border-white/8 group"
        >
          {/* Progress bar bg */}
          <div className="absolute bottom-0 left-0 h-0.5 bg-white/5 w-full rounded-b-xl">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-b-xl transition-all"
              style={{ width: `${job.progress_pct}%` }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{job.project_name}</p>
            <p className="text-[10px] text-slate-500 truncate">{job.filename}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-400 font-medium">
                {job.success_rows}/{job.total_rows}
              </p>
              <div className="flex items-center gap-1 text-[10px] text-slate-600">
                <Clock size={9} />
                {job.created_at
                  ? format(parseISO(job.created_at), 'MMM d, HH:mm')
                  : '—'
                }
              </div>
            </div>
            <StatusBadge status={job.status} size="sm" pulse={job.status === 'running'} />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
