'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
import UploadDataset from '@/components/dashboard/UploadDataset';
import WorkerStatus from '@/components/dashboard/WorkerStatus';
import QueueStatus from '@/components/dashboard/QueueStatus';
import ProgressRing from '@/components/dashboard/ProgressRing';
import LiveLogs from '@/components/dashboard/LiveLogs';
import AnalyticsCharts from '@/components/dashboard/AnalyticsCharts';
import RecentActivity from '@/components/dashboard/RecentActivity';
import ControlPanel from '@/components/dashboard/ControlPanel';
import AnimatedCounter from '@/components/ui/AnimatedCounter';
import { SkeletonCard } from '@/components/ui/SkeletonLoader';
import { useWorkers } from '@/hooks/useWorkers';
import { projectsApi, analyticsApi } from '@/lib/api';
import type { Project, DashboardSummary } from '@/types';
import {
  Database, Layers, CheckCircle, XCircle, TrendingUp, Clock, Terminal, Activity, BarChart2, ShieldAlert
} from 'lucide-react';

export default function DashboardPage() {
  const { engineStats, queueStats, jobs, activeJob, loading, refresh } = useWorkers();
  const [projects, setProjects] = useState<Project[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [activeJobId, setActiveJobId] = useState<string | undefined>();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [p, s] = await Promise.all([projectsApi.list(), analyticsApi.summary()]);
        setProjects(p);
        setSummary(s);
      } catch {
      } finally {
        setSummaryLoading(false);
      }
    };
    loadData();
    const interval = setInterval(() => analyticsApi.summary().then(setSummary).catch(() => {}), 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeJob) setActiveJobId(activeJob.id);
  }, [activeJob]);

  const statsCards = [
    {
      label: 'Total Jobs',
      value: summary?.total_jobs || 0,
      icon: Layers,
      color: 'text-accent-cyan',
      bg: 'from-accent-cyan/10 to-transparent',
      glow: 'cyan' as const,
    },
    {
      label: 'Enriched Rows',
      value: summary?.total_enriched_rows || 0,
      icon: CheckCircle,
      color: 'text-accent-emerald',
      bg: 'from-accent-emerald/10 to-transparent',
      glow: 'emerald' as const,
    },
    {
      label: 'Failed Records',
      value: summary?.by_status?.['failed'] || 0,
      icon: XCircle,
      color: 'text-accent-pink',
      bg: 'from-accent-pink/10 to-transparent',
      glow: 'none' as const,
    },
    {
      label: 'Active Workers',
      value: summary?.active_workers || 0,
      icon: Database,
      color: 'text-accent-violet',
      bg: 'from-accent-violet/10 to-transparent',
      glow: 'violet' as const,
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-8 max-w-screen-2xl mx-auto pb-16">

      {/* Row 1: Statistics */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-accent-cyan px-2 py-0.5 rounded bg-accent-cyan/10 border border-accent-cyan/20">01</span>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Primary Metrics</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryLoading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : statsCards.map((card, i) => (
                <GlassCard key={card.label} glow={card.glow} hover={true} delay={i * 0.08} className="p-5 relative overflow-hidden group">
                  {/* Subtle background glow dot */}
                  <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-white/1 blur-xl group-hover:bg-accent-cyan/5 transition-colors" />
                  
                  <div className={`inline-flex items-center justify-center p-2 rounded-xl bg-gradient-to-br ${card.bg} mb-3 border border-white/5`}>
                    <card.icon size={18} className={card.color} />
                  </div>
                  <AnimatedCounter
                    value={card.value}
                    className={`text-2xl font-black block tracking-tight ${card.color}`}
                  />
                  <p className="text-xs text-slate-400 font-semibold mt-1">{card.label}</p>
                </GlassCard>
              ))
          }
        </div>
      </div>

      {/* Row 2: Ingestion Control (Upload + Quick Actions) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-accent-violet px-2 py-0.5 rounded bg-accent-violet/10 border border-accent-violet/20">02</span>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ingestion & Operations Control</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Upload Widget (2 cols) */}
          <GlassCard glow="cyan" className="p-5 lg:col-span-2">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-gradient-to-b from-accent-cyan to-accent-violet rounded-full" />
              Upload Ingestion Dataset
            </h3>
            <UploadDataset
              projects={projects}
              onJobStarted={(id) => { setActiveJobId(id); refresh(); }}
            />
          </GlassCard>

          {/* Quick Actions (1 col) */}
          <GlassCard className="p-5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-gradient-to-b from-accent-violet to-accent-pink rounded-full" />
              Operation Controls
            </h3>
            <ControlPanel activeJob={activeJob || null} onAction={refresh} />
          </GlassCard>
        </div>
      </div>

      {/* Row 3: Pipeline Telemetry (Progress + Recent Activity) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-accent-emerald px-2 py-0.5 rounded bg-accent-emerald/10 border border-accent-emerald/20">03</span>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pipeline Telemetry</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Progress Ring (2 cols) */}
          <GlassCard glow="violet" className="p-5 lg:col-span-2 flex flex-col justify-between">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-gradient-to-b from-accent-violet to-accent-cyan rounded-full" />
              Process Metrics
            </h3>
            <div className="flex-1 flex flex-col sm:flex-row items-center gap-6 justify-center py-2">
              <ProgressRing
                progress={activeJob?.progress_pct || 0}
                color="#00E5FF"
                label={`${(activeJob?.progress_pct || 0).toFixed(0)}%`}
                sublabel="complete"
              />
              <div className="space-y-2.5 w-full sm:w-auto">
                {[
                  { label: 'Processed', value: activeJob?.processed_rows || 0, color: 'text-slate-200' },
                  { label: 'Succeeded', value: activeJob?.success_rows || 0, color: 'text-accent-emerald' },
                  { label: 'Failed', value: activeJob?.failed_rows || 0, color: 'text-accent-pink' },
                  { label: 'Total rows', value: activeJob?.total_rows || 0, color: 'text-slate-500' },
                ].map(stat => (
                  <div key={stat.label} className="flex items-center justify-between gap-6 border-b border-white/3 pb-1">
                    <span className="text-xs text-slate-400 font-medium">{stat.label}</span>
                    <AnimatedCounter value={stat.value} className={`text-sm font-bold ${stat.color}`} />
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>

          {/* Recent Activity (3 cols) */}
          <GlassCard className="p-5 lg:col-span-3">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-gradient-to-b from-accent-cyan to-accent-emerald rounded-full" />
              Recent Jobs Activity
            </h3>
            <RecentActivity jobs={jobs} />
          </GlassCard>
        </div>
      </div>

      {/* Row 4: Performance Charts */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-accent-amber px-2 py-0.5 rounded bg-accent-amber/10 border border-accent-amber/20">04</span>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Performance Historicals</h2>
        </div>
        <GlassCard className="p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-gradient-to-b from-accent-amber to-accent-pink rounded-full" />
            Ingestion Performance Analytics
          </h3>
          <AnalyticsCharts />
        </GlassCard>
      </div>

      {/* Row 5: Glass System Terminal Logs */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-accent-cyan px-2 py-0.5 rounded bg-accent-cyan/10 border border-accent-cyan/20">05</span>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">System Console logs</h2>
        </div>
        <GlassCard glow="cyan" className="p-5 flex flex-col min-h-[360px]">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-gradient-to-b from-accent-cyan to-accent-emerald rounded-full animate-pulse" />
              Real-time Ingestion Stream
            </div>
            <Terminal size={14} className="text-accent-cyan" />
          </h3>
          <div className="flex-1 flex flex-col">
            <LiveLogs jobId={activeJobId} />
          </div>
        </GlassCard>
      </div>

      {/* Row 6: Worker Activity */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-accent-violet px-2 py-0.5 rounded bg-accent-violet/10 border border-accent-violet/20">06</span>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Worker Pool Configurations</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Worker Status (1 col) */}
          <GlassCard glow="emerald" className="p-5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-gradient-to-b from-accent-emerald to-accent-cyan rounded-full" />
              Worker Pool Status
            </h3>
            <WorkerStatus engine={engineStats} queue={queueStats} />
          </GlassCard>

          {/* Queue Status (1 col) */}
          <GlassCard className="p-5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-gradient-to-b from-accent-cyan to-accent-pink rounded-full" />
              Queue Buffers
            </h3>
            <QueueStatus
              byStatus={summary?.by_status || {}}
              totalEnriched={summary?.total_enriched_rows || 0}
            />
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
