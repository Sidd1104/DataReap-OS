/**
 * API client — all HTTP calls to the FastAPI backend.
 */
import axios, { AxiosError } from 'axios';
import type {
  Job,
  Project,
  ProjectConfig,
  LogEntry,
  DashboardSummary,
  ThroughputPoint,
  ConfidenceDistribution,
  ProjectBreakdown,
  AppSetting,
  UploadResponse,
  WorkerEngineStats,
  QueueStats,
} from '@/types';

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Error handling ─────────────────────────────────────────

export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    return error.response?.data?.detail || error.message;
  }
  if (error instanceof Error) return error.message;
  return 'An unknown error occurred';
}

// ── Projects ───────────────────────────────────────────────

export const projectsApi = {
  list: () => apiClient.get<Project[]>('/api/projects/').then(r => r.data),
  get: (id: string) => apiClient.get<Project>(`/api/projects/${id}`).then(r => r.data),
  create: (config: ProjectConfig) =>
    apiClient.post<{ id: string; slug: string }>('/api/projects/', { name: config.name, config }).then(r => r.data),
  update: (id: string, data: Partial<ProjectConfig>) =>
    apiClient.put(`/api/projects/${id}`, data).then(r => r.data),
  delete: (id: string) => apiClient.delete(`/api/projects/${id}`).then(r => r.data),
  templates: () => apiClient.get('/api/projects/templates/list').then(r => r.data),
};

// ── Jobs ───────────────────────────────────────────────────

export const jobsApi = {
  list: (status?: string) =>
    apiClient.get<Job[]>('/api/jobs/', { params: { status } }).then(r => r.data),
  get: (id: string) => apiClient.get<Job>(`/api/jobs/${id}`).then(r => r.data),
  stats: () => apiClient.get('/api/jobs/stats').then(r => r.data),

  upload: (file: File, projectId: string, projectName: string, config: object) => {
    const form = new FormData();
    form.append('file', file);
    form.append('project_id', projectId);
    form.append('project_name', projectName);
    form.append('config', JSON.stringify(config));
    return apiClient
      .post<UploadResponse>('/api/jobs/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(r => r.data);
  },

  pause: (id: string) => apiClient.post(`/api/jobs/${id}/pause`).then(r => r.data),
  resume: (id: string) => apiClient.post(`/api/jobs/${id}/resume`).then(r => r.data),
  stop: (id: string) => apiClient.post(`/api/jobs/${id}/stop`).then(r => r.data),
  retryFailed: (id: string) =>
    apiClient.post(`/api/jobs/${id}/retry-failed`).then(r => r.data),
  downloadUrl: (id: string, format = 'excel') =>
    `${API_BASE}/api/jobs/${id}/download?format=${format}`,
};

// ── Workers ────────────────────────────────────────────────

export const workersApi = {
  status: () =>
    apiClient
      .get<{ engine: WorkerEngineStats; queue: QueueStats }>('/api/workers/status')
      .then(r => r.data),
  pauseAll: () => apiClient.post('/api/workers/pause-all').then(r => r.data),
  resumeAll: () => apiClient.post('/api/workers/resume-all').then(r => r.data),
  scale: (concurrency: number) =>
    apiClient.post('/api/workers/scale', null, { params: { concurrency } }).then(r => r.data),
};

// ── Logs ───────────────────────────────────────────────────

export const logsApi = {
  list: (jobId?: string, limit = 100) =>
    apiClient
      .get<LogEntry[]>('/api/logs/', { params: { job_id: jobId, limit } })
      .then(r => r.data),
  since: (since: string, limit = 100) =>
    apiClient.get<LogEntry[]>('/api/logs/since', { params: { since, limit } }).then(r => r.data),
};

// ── Analytics ──────────────────────────────────────────────

export const analyticsApi = {
  summary: () => apiClient.get<DashboardSummary>('/api/analytics/summary').then(r => r.data),
  throughput: (days = 7) =>
    apiClient.get<ThroughputPoint[]>('/api/analytics/throughput', { params: { days } }).then(r => r.data),
  confidence: () =>
    apiClient.get<ConfidenceDistribution>('/api/analytics/confidence-distribution').then(r => r.data),
  projectBreakdown: () =>
    apiClient.get<ProjectBreakdown[]>('/api/analytics/project-breakdown').then(r => r.data),
};

// ── Settings ───────────────────────────────────────────────

export const settingsApi = {
  list: () => apiClient.get<AppSetting[]>('/api/settings/').then(r => r.data),
  get: (key: string) => apiClient.get<{ key: string; value: string }>(`/api/settings/${key}`).then(r => r.data),
  upsert: (key: string, value: string, options?: { isEncrypted?: boolean; category?: string; description?: string }) =>
    apiClient
      .put(`/api/settings/${key}`, {
        key,
        value,
        is_encrypted: options?.isEncrypted || false,
        category: options?.category || 'general',
        description: options?.description,
      })
      .then(r => r.data),
  bulk: (settings: Array<{ key: string; value: string; is_encrypted?: boolean; category?: string }>) =>
    apiClient.post('/api/settings/bulk', { settings }).then(r => r.data),
  testProvider: (provider: string, apiKey?: string) =>
    apiClient
      .post('/api/settings/meta/test-provider', null, { params: { provider_name: provider, api_key: apiKey } })
      .then(r => r.data),
  listSources: () => apiClient.get('/api/settings/meta/sources').then(r => r.data),
  listProviders: () => apiClient.get('/api/settings/meta/providers').then(r => r.data),
  listPromptTemplates: () => apiClient.get('/api/settings/meta/prompt-templates').then(r => r.data),
  validatePrompt: (template: string) =>
    apiClient.post('/api/settings/meta/validate-prompt', null, { params: { template } }).then(r => r.data),
};

// ── Health ─────────────────────────────────────────────────

export const healthApi = {
  check: () => apiClient.get('/health').then(r => r.data),
};
