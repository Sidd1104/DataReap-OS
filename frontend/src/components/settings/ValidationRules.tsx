'use client';

import { useState } from 'react';
import GlowButton from '@/components/ui/GlowButton';
import { Check, Shield } from 'lucide-react';

interface ValidationRulesProps {
  getSetting: (key: string) => string;
  updateSetting: (key: string, value: string, opts?: any) => Promise<void>;
  bulkUpdate: (updates: any[]) => Promise<void>;
  loading: boolean;
}

export default function ValidationRules({ getSetting, updateSetting, bulkUpdate }: ValidationRulesProps) {
  const [vals, setVals] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const get = (key: string) => vals[key] ?? getSetting(key);
  const getB = (key: string, def = 'true') => (vals[key] ?? getSetting(key) ?? def) !== 'false';
  const set = (key: string, val: string) => setVals(prev => ({ ...prev, [key]: val }));
  const toggle = (key: string, def = 'true') => set(key, getB(key, def) ? 'false' : 'true');

  const RULES = [
    { key: 'validate_email', label: 'Validate Email', desc: 'Check format and domain MX record', color: 'text-cyan-400' },
    { key: 'validate_phone', label: 'Validate Phone', desc: 'Normalize to E.164 format using phonenumbers', color: 'text-violet-400' },
    { key: 'validate_website', label: 'Validate Website', desc: 'Verify URL format', color: 'text-emerald-400' },
    { key: 'validate_linkedin', label: 'Validate LinkedIn', desc: 'Check for valid linkedin.com URL', color: 'text-blue-400' },
    { key: 'live_website_check', label: 'Live Website Check', desc: 'HTTP HEAD request to verify website is live (slower)', color: 'text-amber-400' },
  ];

  const save = async () => {
    setSaving(true);
    try {
      await bulkUpdate([
        ...RULES.map(r => ({ key: r.key, value: getB(r.key).toString(), category: 'validation' })),
        { key: 'confidence_threshold', value: get('confidence_threshold') || '0.7', category: 'validation' },
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
        <h2 className="text-lg font-bold text-white">Validation Rules</h2>
        <p className="text-xs text-slate-500 mt-0.5">Control what gets validated to ensure data quality</p>
      </div>

      <div className="space-y-3">
        {RULES.map(rule => (
          <div key={rule.key} className="flex items-center justify-between p-4 rounded-xl border border-white/8 hover:border-white/12 transition-all">
            <div>
              <p className={`text-sm font-medium ${rule.color}`}>{rule.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{rule.desc}</p>
            </div>
            <button
              onClick={() => toggle(rule.key)}
              className={`relative w-12 h-6 rounded-full transition-all ${getB(rule.key) ? 'bg-cyan-500' : 'bg-white/10'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${getB(rule.key) ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        ))}
      </div>

      <div>
        <label className="text-xs text-slate-400 block mb-1">
          Minimum Confidence Threshold
          <span className="ml-2 text-slate-600">(0.0 = accept all · 1.0 = perfect only)</span>
        </label>
        <div className="flex items-center gap-4">
          <input type="range" min={0} max={1} step={0.05}
            className="flex-1 accent-cyan-500"
            value={get('confidence_threshold') || '0.7'}
            onChange={e => set('confidence_threshold', e.target.value)} />
          <span className="text-sm font-bold text-cyan-400 w-10">
            {parseFloat(get('confidence_threshold') || '0.7').toFixed(2)}
          </span>
        </div>
      </div>

      <GlowButton color="cyan" loading={saving} icon={<Check size={14} />} onClick={save}>
        {saved ? 'Saved!' : 'Save Validation Rules'}
      </GlowButton>
    </div>
  );
}
