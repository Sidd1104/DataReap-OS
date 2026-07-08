/**
 * TypeScript type definitions for the entire platform.
 */

// ── Job & Worker Types ────────────────────────────────────────

export type JobStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface Job {
  id: string;
  project_id: string;
  project_name: string;
  filename: string;
  status: JobStatus;
  total_rows: number;
  processed_rows: number;
  success_rows: number;
  failed_rows: number;
  progress_pct: number;
  estimated_seconds_remaining: number | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  output_path: string | null;
}

export type WorkerState = 'idle' | 'running' | 'paused' | 'stopped' | 'crashed';

export interface WorkerInfo {
  worker_id: string;
  state: WorkerState;
  current_job_id: string | null;
  tasks_processed: number;
  tasks_failed: number;
  last_activity: string | null;
}

export interface WorkerEngineStats {
  running: boolean;
  concurrency: number;
  active_workers: number;
  workers: WorkerInfo[];
}

export interface QueueStats {
  queue_size: number;
  is_paused: boolean;
  total_enqueued: number;
  total_processed: number;
  cancelled_jobs: number;
}

// ── Project Types ─────────────────────────────────────────────

export interface ValidationRules {
  email?: boolean;
  phone?: boolean;
  website?: boolean;
  confidence_threshold?: number;
}

export interface OutputConfig {
  format: 'excel' | 'csv' | 'json';
  filename: string;
  include_metadata: boolean;
}

export interface ProjectConfig {
  project_id: string;
  name: string;
  description?: string;
  input_columns: string[];
  target_columns: string[];
  search_sources: string[];
  llm_provider: 'gemini' | 'openai' | 'anthropic';
  prompt_template: string;
  validation_rules: ValidationRules;
  output: OutputConfig;
  concurrency: number;
  retries: number;
  timeout_seconds: number;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  description: string;
  config: ProjectConfig;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

// ── Log Types ─────────────────────────────────────────────────

export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface LogEntry {
  id: string;
  level: LogLevel;
  message: string;
  source: string | null;
  job_id: string | null;
  worker_id?: string | null;
  extra?: Record<string, unknown> | null;
  created_at: string;
}

// ── Analytics Types ───────────────────────────────────────────

export interface DashboardSummary {
  total_jobs: number;
  by_status: Record<string, number>;
  total_enriched_rows: number;
  queue_size: number;
  active_workers: number;
  is_paused: boolean;
}

export interface ThroughputPoint {
  date: string;
  success: number;
  failed: number;
  jobs: number;
}

export interface ConfidenceBucket {
  range: string;
  count: number;
}

export interface ConfidenceDistribution {
  buckets: ConfidenceBucket[];
  total: number;
  avg: number;
}

export interface ProjectBreakdown {
  project: string;
  success: number;
  failed: number;
  jobs: number;
}

// ── Settings Types ────────────────────────────────────────────

export interface AppSetting {
  key: string;
  value: string;
  is_encrypted: boolean;
  description: string | null;
  category: string;
  updated_at: string;
}

// ── API Response Types ────────────────────────────────────────

export interface UploadResponse {
  job_id: string;
  filename: string;
  total_rows: number;
  status: string;
  message: string;
}

export interface ApiError {
  detail: string;
}

// ── UI State Types ────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}
