'use client';

import { useCallback, useEffect, useState } from 'react';
import { workersApi, jobsApi } from '@/lib/api';
import type { Job, WorkerEngineStats, QueueStats } from '@/types';
import { REFRESH_INTERVALS } from '@/lib/constants';

export function useWorkers() {
  const [engineStats, setEngineStats] = useState<WorkerEngineStats | null>(null);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const [statusData, jobsData] = await Promise.all([
        workersApi.status(),
        jobsApi.list(),
      ]);
      setEngineStats(statusData.engine);
      setQueueStats(statusData.queue);
      setJobs(jobsData);
      setError(null);
    } catch (err) {
      setError('Failed to fetch worker status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, REFRESH_INTERVALS.WORKERS);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const pauseAll = useCallback(async () => {
    await workersApi.pauseAll();
    await fetchStatus();
  }, [fetchStatus]);

  const resumeAll = useCallback(async () => {
    await workersApi.resumeAll();
    await fetchStatus();
  }, [fetchStatus]);

  const scaleWorkers = useCallback(async (concurrency: number) => {
    await workersApi.scale(concurrency);
    await fetchStatus();
  }, [fetchStatus]);

  const activeJob = jobs.find(j => j.status === 'running') || jobs.find(j => j.status === 'paused');

  return {
    engineStats,
    queueStats,
    jobs,
    activeJob,
    loading,
    error,
    pauseAll,
    resumeAll,
    scaleWorkers,
    refresh: fetchStatus,
  };
}
