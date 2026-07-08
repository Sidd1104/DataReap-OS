'use client';

import { useState } from 'react';
import GlowButton from '@/components/ui/GlowButton';
import { settingsApi } from '@/lib/api';
import { Check, Eye, EyeOff, Wifi } from 'lucide-react';
import { clsx } from 'clsx';

interface LLMSettingsProps {
  getSetting: (key: string) => string;
  updateSetting: (key: string, value: string, opts?: any) => Promise<void>;
  bulkUpdate: (updates: any[]) => Promise<void>;
  loading: boolean;
}

const PROVIDERS = [
  { id: 'gemini', name: 'Google Gemini', defaultModel: 'gemini-1.5-pro', color: 'text-cyan-400', models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash-exp'] },
  { id: 'openai', name: 'OpenAI', defaultModel: 'gpt-4o', color: 'text-emerald-400', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'] },
  { id: 'anthropic', name: 'Anthropic', defaultModel: 'claude-3-5-sonnet-20241022', color: 'text-amber-400', models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'] },
];

export default function LLMSettings({ getSetting, updateSetting, bulkUpdate, loading }: LLMSettingsProps) {
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, boolean | null>>({});
  const [saving, setSaving] = useState(false);
  const [vals, setVals] = useState<Record<string, string>>({});

  const get = (key: string) => vals[key] ?? getSetting(key);
  const set = (key: string, val: string) => setVals(prev => ({ ...prev, [key]: val }));

  const testProvider = async (providerId: string) => {
    setTesting(providerId);
    const keyField = `${providerId}_api_key`;
    const apiKey = get(keyField);
    try {
      const result = await settingsApi.testProvider(providerId, apiKey);
      setTestResults(prev => ({ ...prev, [providerId]: result.connected }));
    } catch {
      setTestResults(prev => ({ ...prev, [providerId]: false }));
    } finally {
      setTesting(null);
    }
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(vals).map(([key, value]) => ({
        key,
        value,
        is_encrypted: key.includes('api_key'),
        category: 'llm',
      }));
      await bulkUpdate(updates);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">AI Provider Settings</h2>
        <p className="text-xs text-slate-500 mt-0.5">Configure API keys and models — keys are encrypted at rest</p>
      </div>

      {/* Default provider */}
      <div>
        <label className="text-xs text-slate-400 block mb-2">Default Provider</label>
        <div className="flex gap-2">
          {PROVIDERS.map(p => (
            <button
              key={p.id}
              onClick={() => set('default_llm_provider', p.id)}
              className={clsx(
                'px-4 py-2 rounded-xl text-sm border transition-all font-medium',
                get('default_llm_provider') === p.id || (!get('default_llm_provider') && p.id === 'gemini')
                  ? `${p.color} border-current bg-white/5`
                  : 'text-slate-500 border-white/10 hover:border-white/20'
              )}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Per-provider settings */}
      <div className="space-y-4">
        {PROVIDERS.map(provider => (
          <div key={provider.id} className="border border-white/8 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-semibold ${provider.color}`}>{provider.name}</h3>
              <div className="flex items-center gap-2">
                {testResults[provider.id] !== undefined && (
                  <span className={clsx('text-xs px-2 py-0.5 rounded-full border',
                    testResults[provider.id]
                      ? 'text-emerald-400 border-emerald-500/30 bg-emerald-950/30'
                      : 'text-red-400 border-red-500/30 bg-red-950/30'
                  )}>
                    {testResults[provider.id] ? '✓ Connected' : '✗ Failed'}
                  </span>
                )}
                <GlowButton
                  color="cyan"
                  size="sm"
                  loading={testing === provider.id}
                  icon={<Wifi size={12} />}
                  onClick={() => testProvider(provider.id)}
                >
                  Test
                </GlowButton>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">API Key</label>
                <div className="relative">
                  <input
                    type={showKeys[provider.id] ? 'text' : 'password'}
                    className="input-glass w-full px-3 py-2 text-sm pr-9 font-mono"
                    placeholder={`sk-... or AIza...`}
                    value={get(`${provider.id}_api_key`)}
                    onChange={e => set(`${provider.id}_api_key`, e.target.value)}
                  />
                  <button
                    onClick={() => setShowKeys(prev => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showKeys[provider.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Model</label>
                <select
                  className="input-glass w-full px-3 py-2 text-sm"
                  value={get(`${provider.id}_model`) || provider.defaultModel}
                  onChange={e => set(`${provider.id}_model`, e.target.value)}
                >
                  {provider.models.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>

      <GlowButton color="cyan" loading={saving} icon={<Check size={14} />} onClick={saveAll}>
        Save All API Settings
      </GlowButton>
    </div>
  );
}
