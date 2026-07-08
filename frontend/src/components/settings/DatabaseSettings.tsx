'use client';

import { useState } from 'react';
import GlowButton from '@/components/ui/GlowButton';
import { Check, Database } from 'lucide-react';

interface DatabaseSettingsProps {
  getSetting: (key: string) => string;
  updateSetting: (key: string, value: string, opts?: any) => Promise<void>;
  bulkUpdate: (updates: any[]) => Promise<void>;
  loading: boolean;
}

const DB_PRESETS = [
  { label: 'SQLite (Local)', value: 'sqlite+aiosqlite:///./data/enrichment.db', color: 'text-cyan-400' },
  { label: 'PostgreSQL', value: 'postgresql+asyncpg://user:password@localhost:5432/enrichment_db', color: 'text-blue-400' },
  { label: 'MySQL', value: 'mysql+aiomysql://user:password@localhost:3306/enrichment_db', color: 'text-amber-400' },
];

export default function DatabaseSettings({ getSetting, updateSetting, loading }: DatabaseSettingsProps) {
  const [dbUrl, setDbUrl] = useState(getSetting('database_url') || 'sqlite+aiosqlite:///./data/enrichment.db');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateSetting('database_url', dbUrl, { category: 'database', isEncrypted: false });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">Database Settings</h2>
        <p className="text-xs text-slate-500 mt-0.5">Switch between SQLite, PostgreSQL, and MySQL without code changes</p>
      </div>

      <div>
        <label className="text-xs text-slate-400 block mb-2">Quick Select</label>
        <div className="flex flex-col gap-2">
          {DB_PRESETS.map(preset => (
            <button
              key={preset.value}
              onClick={() => setDbUrl(preset.value)}
              className={`text-left px-4 py-3 rounded-xl border transition-all ${
                dbUrl === preset.value
                  ? 'border-cyan-500/30 bg-cyan-950/20'
                  : 'border-white/8 hover:border-white/15'
              }`}
            >
              <p className={`text-sm font-medium ${dbUrl === preset.value ? preset.color : 'text-slate-300'}`}>{preset.label}</p>
              <p className="text-xs text-slate-600 font-mono mt-0.5">{preset.value.split('://')[0]}://...</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-slate-400 block mb-1">Connection String</label>
        <p className="text-[10px] text-slate-600 mb-2">⚠️ Changing this requires a backend restart to take effect.</p>
        <input
          className="input-glass w-full px-4 py-3 text-sm font-mono"
          value={dbUrl}
          onChange={e => setDbUrl(e.target.value)}
          placeholder="database connection string..."
        />
      </div>

      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-950/20 border border-amber-500/20">
        <Database size={16} className="text-amber-400 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-300">
          The platform auto-creates all tables on startup. No migrations needed for SQLite.
          For PostgreSQL/MySQL, create the database first, then restart the backend.
        </p>
      </div>

      <GlowButton color="cyan" loading={saving} icon={<Check size={14} />} onClick={save}>
        {saved ? 'Saved!' : 'Save Database Settings'}
      </GlowButton>
    </div>
  );
}
