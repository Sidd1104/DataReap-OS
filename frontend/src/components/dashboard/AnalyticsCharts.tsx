'use client';

import { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import { analyticsApi } from '@/lib/api';
import type { ThroughputPoint, ProjectBreakdown } from '@/types';
import { SkeletonCard } from '@/components/ui/SkeletonLoader';

const COLORS = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-3 py-2 text-xs">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value?.toLocaleString()}</p>
      ))}
    </div>
  );
};

export default function AnalyticsCharts() {
  const [throughput, setThroughput] = useState<ThroughputPoint[]>([]);
  const [breakdown, setBreakdown] = useState<ProjectBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [t, b] = await Promise.all([
          analyticsApi.throughput(7),
          analyticsApi.projectBreakdown(),
        ]);
        setThroughput(t);
        setBreakdown(b);
      } catch {
        // silently fail — charts just stay empty
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Throughput Area Chart */}
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">7-Day Throughput</p>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={throughput} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="successGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="failedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.06)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="success" name="Success" stroke="#10b981" fill="url(#successGrad)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="failed" name="Failed" stroke="#ef4444" fill="url(#failedGrad)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Project Breakdown */}
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">Project Breakdown</p>
        {breakdown.length === 0 ? (
          <div className="h-[180px] flex items-center justify-center text-slate-600 text-xs">
            No project data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={breakdown.slice(0, 6)} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.06)" />
              <XAxis dataKey="project" tick={{ fontSize: 9, fill: '#475569' }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="success" name="Success" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="failed" name="Failed" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
