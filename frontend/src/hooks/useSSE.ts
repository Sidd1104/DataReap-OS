'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { API_BASE } from '@/lib/api';
import type { LogEntry } from '@/types';

interface UseSSEOptions {
  jobId?: string;
  onLog?: (entry: LogEntry) => void;
  maxEntries?: number;
}

export function useSSE({ jobId, onLog, maxEntries = 500 }: UseSSEOptions = {}) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
    }

    const url = new URL(`${API_BASE}/api/stream/logs`);
    if (jobId) url.searchParams.set('job_id', jobId);

    const es = new EventSource(url.toString());
    esRef.current = es;

    es.addEventListener('connected', () => {
      setConnected(true);
      setError(null);
    });

    es.addEventListener('log', (event) => {
      try {
        const entry: LogEntry = JSON.parse(event.data);
        setLogs((prev) => {
          const updated = [...prev, entry];
          return updated.slice(-maxEntries); // Keep last N entries
        });
        onLog?.(entry);
      } catch {
        // ignore parse errors
      }
    });

    es.addEventListener('error', () => {
      setConnected(false);
      setError('Stream disconnected. Reconnecting...');
      // Auto-reconnect after 3s
      setTimeout(connect, 3000);
    });

    es.addEventListener('disconnected', () => {
      setConnected(false);
    });
  }, [jobId, onLog, maxEntries]);

  useEffect(() => {
    connect();
    return () => {
      esRef.current?.close();
    };
  }, [connect]);

  const clearLogs = useCallback(() => setLogs([]), []);

  return { logs, connected, error, clearLogs };
}

// Status stream hook
export function useStatusStream() {
  const [status, setStatus] = useState<{ engine?: object; queue?: object } | null>(null);

  useEffect(() => {
    const es = new EventSource(`${API_BASE}/api/stream/status`);

    es.addEventListener('status', (event) => {
      try {
        setStatus(JSON.parse(event.data));
      } catch { /* ignore */ }
    });

    return () => es.close();
  }, []);

  return status;
}
