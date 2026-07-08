'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import GlowButton from '@/components/ui/GlowButton';
import { projectsApi } from '@/lib/api';
import type { Project } from '@/types';
import { Plus, Trash2, Edit3, Check, X, ChevronDown, ChevronUp } from 'lucide-react';

interface ProjectConfigProps {
  projects: Project[];
  onRefresh: () => void;
}

const DEFAULT_CONFIG = {
  project_id: '',
  name: '',
  description: '',
  input_columns: ['Name', 'Company'],
  target_columns: ['Email', 'Phone', 'Website', 'LinkedIn'],
  search_sources: ['google', 'linkedin'],
  llm_provider: 'gemini' as const,
  prompt_template: 'default',
  validation_rules: { email: true, phone: true, website: true, confidence_threshold: 0.7 },
  output: { format: 'excel' as const, filename: 'enriched_output.xlsx', include_metadata: true },
  concurrency: 5,
  retries: 3,
  timeout_seconds: 30,
};

const SOURCES = ['google', 'linkedin', 'crunchbase', 'sec', 'pdf'];

export default function ProjectConfig({ projects, onRefresh }: ProjectConfigProps) {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ ...DEFAULT_CONFIG });
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const update = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }));

  const save = async () => {
    setSaving(true);
    try {
      await projectsApi.create(form as any);
      setCreating(false);
      setForm({ ...DEFAULT_CONFIG });
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const deleteProject = async (id: string) => {
    await projectsApi.delete(id);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Project Configuration</h2>
          <p className="text-xs text-slate-500 mt-0.5">Configure datasets without editing code</p>
        </div>
        <GlowButton color="cyan" icon={<Plus size={14} />} onClick={() => setCreating(!creating)}>
          New Project
        </GlowButton>
      </div>

      {/* Create form */}
      {creating && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-cyan-500/20 rounded-xl p-5 bg-cyan-950/10 space-y-4"
        >
          <h3 className="text-sm font-semibold text-cyan-400">New Project</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Project Name *</label>
              <input className="input-glass w-full px-3 py-2 text-sm" placeholder="US Investors 2024"
                value={form.name} onChange={e => update('name', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Project ID (slug)</label>
              <input className="input-glass w-full px-3 py-2 text-sm font-mono" placeholder="us_investors"
                value={form.project_id} onChange={e => update('project_id', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Description</label>
            <input className="input-glass w-full px-3 py-2 text-sm"
              value={form.description} onChange={e => update('description', e.target.value)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Input Columns (comma-separated)</label>
              <input className="input-glass w-full px-3 py-2 text-sm font-mono"
                value={form.input_columns.join(', ')}
                onChange={e => update('input_columns', e.target.value.split(',').map(s => s.trim()))} />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Target Columns (comma-separated)</label>
              <input className="input-glass w-full px-3 py-2 text-sm font-mono"
                value={form.target_columns.join(', ')}
                onChange={e => update('target_columns', e.target.value.split(',').map(s => s.trim()))} />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-2">Search Sources</label>
            <div className="flex flex-wrap gap-2">
              {SOURCES.map(src => (
                <button
                  key={src}
                  onClick={() => {
                    const has = form.search_sources.includes(src);
                    update('search_sources', has ? form.search_sources.filter(s => s !== src) : [...form.search_sources, src]);
                  }}
                  className={`px-3 py-1 rounded-full text-xs border transition-all ${
                    form.search_sources.includes(src)
                      ? 'border-cyan-500/50 bg-cyan-950/40 text-cyan-400'
                      : 'border-white/10 text-slate-500 hover:border-white/20'
                  }`}
                >
                  {src}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Concurrency</label>
              <input type="number" min={1} max={20} className="input-glass w-full px-3 py-2 text-sm"
                value={form.concurrency} onChange={e => update('concurrency', parseInt(e.target.value))} />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Retries</label>
              <input type="number" min={0} max={10} className="input-glass w-full px-3 py-2 text-sm"
                value={form.retries} onChange={e => update('retries', parseInt(e.target.value))} />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Timeout (s)</label>
              <input type="number" min={10} max={300} className="input-glass w-full px-3 py-2 text-sm"
                value={form.timeout_seconds} onChange={e => update('timeout_seconds', parseInt(e.target.value))} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <GlowButton color="cyan" loading={saving} icon={<Check size={14} />} onClick={save}>Save Project</GlowButton>
            <GlowButton color="red" icon={<X size={14} />} onClick={() => setCreating(false)}>Cancel</GlowButton>
          </div>
        </motion.div>
      )}

      {/* Projects list */}
      <div className="space-y-3">
        {projects.length === 0 ? (
          <p className="text-sm text-slate-600 text-center py-8">No projects configured yet.</p>
        ) : (
          projects.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="border border-white/8 rounded-xl overflow-hidden"
            >
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/3 transition-all"
                onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
              >
                <div>
                  <p className="text-sm font-medium text-white">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.slug} · {p.config.llm_provider}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">{p.config.target_columns?.length || 0} target cols</span>
                  {expandedId === p.id ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                  <button onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }}
                    className="p-1.5 rounded-lg hover:bg-red-950/40 text-slate-600 hover:text-red-400 transition-all">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              {expandedId === p.id && (
                <div className="px-4 pb-4 border-t border-white/5 pt-3">
                  <pre className="text-[11px] text-slate-400 font-mono bg-black/20 rounded-lg p-3 overflow-auto max-h-48">
                    {JSON.stringify(p.config, null, 2)}
                  </pre>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
