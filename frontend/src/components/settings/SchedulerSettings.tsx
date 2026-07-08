'use client';

import { useState } from 'react';
import GlowButton from '@/components/ui/GlowButton';
import { Check, Clock } from 'lucide-react';

interface SchedulerSettingsProps {
  getSetting: (key: string) => string;
  updateSetting: (key: string, value: string, opts?: any) => Promise<void>;
  bulkUpdate: (updates: any[]) => Promise<void>;
  loading: boolean;
}

const TIMEZONES = ['UTC', 'US/Eastern', 'US/Pacific', 'US/Central', 'Europe/London', 'Asia/Kolkata', 'Asia/Singapore'];

export default function SchedulerSettings({ getSetting, updateSetting, bulkUpdate }: SchedulerSettingsProps) {
  const [vals, setVals] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const get = (key: string) => vals[key] ?? getSetting(key);
  const set = (key: string, val: string) => setVals(prev => ({ ...prev, [key]: val }));

  const save = async () => {
    setSaving(true);
    try {
      await bulkUpdate([
        { key: 'scheduler_enabled', value: get('scheduler_enabled') || 'true', category: 'scheduler' },
        { key: 'watch_folder', value: get('watch_folder') || './uploads', category: 'scheduler' },
        { key: 'scheduler_timezone', value: get('scheduler_timezone') || 'UTC', category: 'scheduler' },
        { key: 'default_concurrency', value: get('default_concurrency') || '5', category: 'workers' },
        { key: 'default_retries', value: get('default_retries') || '3', category: 'workers' },
        { key: 'default_timeout_seconds', value: get('default_timeout_seconds') || '30', category: 'workers' },
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">Scheduler & Worker Settings</h2>
        <p className="text-xs text-slate-500 mt-0.5">Configure automatic scheduling and worker behavior</p>
      </div>

      {/* Scheduler */}
      <div className="border border-white/8 rounded-xl p-4 space-y-4">
        <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-2"><Clock size={15} /> Scheduler</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-300">Enable Auto-Scheduler</p>
            <p className="text-xs text-slate-500">Watch for new files and resume interrupted jobs on startup</p>
          </div>
          <button
            onClick={() => set('scheduler_enabled', get('scheduler_enabled') === 'false' ? 'true' : 'false')}
            className={`relative w-12 h-6 rounded-full transition-all ${
              get('scheduler_enabled') !== 'false' ? 'bg-cyan-500' : 'bg-white/10'
            }`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
              get('scheduler_enabled') !== 'false' ? 'left-7' : 'left-1'
            }`} />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Watch Folder</label>
            <input className="input-glass w-full px-3 py-2 text-sm font-mono"
              value={get('watch_folder') || './uploads'}
              onChange={e => set('watch_folder', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Timezone</label>
            <select className="input-glass w-full px-3 py-2 text-sm"
              value={get('scheduler_timezone') || 'UTC'}
              onChange={e => set('scheduler_timezone', e.target.value)}>
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Workers */}
      <div className="border border-white/8 rounded-xl p-4 space-y-4">
        <h3 className="text-sm font-semibold text-violet-400">Default Worker Config</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { key: 'default_concurrency', label: 'Concurrency', min: 1, max: 20, placeholder: '5' },
            { key: 'default_retries', label: 'Max Retries', min: 0, max: 10, placeholder: '3' },
            { key: 'default_timeout_seconds', label: 'Timeout (s)', min: 10, max: 300, placeholder: '30' },
          ].map(field => (
            <div key={field.key}>
              <label className="text-xs text-slate-400 block mb-1">{field.label}</label>
              <input type="number" min={field.min} max={field.max}
                className="input-glass w-full px-3 py-2 text-sm"
                placeholder={field.placeholder}
                value={get(field.key)}
                onChange={e => set(field.key, e.target.value)} />
            </div>
          ))}
        </div>
      </div>

      <GlowButton color="cyan" loading={saving} icon={<Check size={14} />} onClick={save}>
        {saved ? 'Saved!' : 'Save Scheduler Settings'}
      </GlowButton>
    </div>
  );
}
