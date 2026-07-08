'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Wifi, WifiOff, Trash2, Download } from 'lucide-react';
import { useSSE } from '@/hooks/useSSE';
import { LOG_LEVEL_COLORS } from '@/lib/constants';
import type { LogEntry } from '@/types';
import { clsx } from 'clsx';

interface LiveLogsProps {
  jobId?: string;
}

export default function LiveLogs({ jobId }: LiveLogsProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');

  const { logs, connected, error, clearLogs } = useSSE({ jobId, maxEntries: 500 });

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const filteredLogs = filter === 'ALL' ? logs : logs.filter(l => l.level === filter);

  const downloadLogs = () => {
    const text = filteredLogs
      .map(l => `[${l.created_at}] [${l.level}] ${l.source ? `[${l.source}] ` : ''}${l.message}`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `enrichment-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal size={16} className="text-cyan-400" />
          <span className="text-sm font-medium text-slate-300">Live Logs</span>
          <span className="text-xs text-slate-600">({filteredLogs.length})</span>
          {connected ? (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <Wifi size={10} /> Live
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-red-400 bg-red-950/40 px-2 py-0.5 rounded-full border border-red-500/20">
              <WifiOff size={10} /> {error ? 'Reconnecting' : 'Disconnected'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Filter */}
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-slate-400 outline-none"
          >
            {['ALL', 'DEBUG', 'INFO', 'WARNING', 'ERROR'].map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>

          {/* Auto-scroll toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={clsx(
              'text-xs px-2 py-1 rounded-lg border transition-all',
              autoScroll
                ? 'border-cyan-500/30 bg-cyan-950/30 text-cyan-400'
                : 'border-white/10 text-slate-500'
            )}
          >
            Auto-scroll
          </button>

          <button onClick={downloadLogs} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-all">
            <Download size={14} />
          </button>
          <button onClick={clearLogs} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-red-400 transition-all">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Log terminal */}
      <div
        className="flex-1 overflow-y-auto terminal bg-black/30 rounded-xl border border-white/5 p-4 scanline"
        style={{ minHeight: '240px', maxHeight: '400px' }}
        onScroll={() => {}}
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-slate-600">
              <Terminal size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-xs">Waiting for log events...</p>
            </div>
          </div>
        ) : (
          filteredLogs.map((log, i) => (
            <LogLine key={log.id || i} log={log} />
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function LogLine({ log }: { log: LogEntry }) {
  const levelColor = LOG_LEVEL_COLORS[log.level] || 'text-slate-400';
  const time = new Date(log.created_at).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15 }}
      className="flex gap-2 text-[11px] leading-5 hover:bg-white/3 px-1 rounded transition-colors group"
    >
      <span className="text-slate-600 shrink-0">{time}</span>
      <span className={clsx('font-semibold w-14 shrink-0', levelColor)}>[{log.level}]</span>
      {log.source && (
        <span className="text-violet-400 shrink-0">[{log.source}]</span>
      )}
      <span className="text-slate-300 break-all">{log.message}</span>
    </motion.div>
  );
}
