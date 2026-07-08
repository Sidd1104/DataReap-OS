'use client';

import { useCallback, useEffect, useState } from 'react';
import { settingsApi, projectsApi } from '@/lib/api';
import type { AppSetting, Project } from '@/types';

export function useSettings() {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([settingsApi.list(), projectsApi.list()]);
      setSettings(s);
      setProjects(p);
    } catch (e) {
      console.error('Failed to load settings', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const getSetting = useCallback(
    (key: string) => settings.find(s => s.key === key)?.value ?? '',
    [settings]
  );

  const updateSetting = useCallback(
    async (key: string, value: string, options?: { isEncrypted?: boolean; category?: string }) => {
      await settingsApi.upsert(key, value, options);
      await fetchAll();
    },
    [fetchAll]
  );

  const bulkUpdate = useCallback(
    async (updates: Array<{ key: string; value: string; is_encrypted?: boolean; category?: string }>) => {
      await settingsApi.bulk(updates);
      await fetchAll();
    },
    [fetchAll]
  );

  return { settings, projects, loading, getSetting, updateSetting, bulkUpdate, refresh: fetchAll };
}
