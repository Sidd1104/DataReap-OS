'use client';

import { useState } from 'react';
import GlowButton from '@/components/ui/GlowButton';
import { Check, Eye, EyeOff } from 'lucide-react';

interface NotificationSettingsProps {
  getSetting: (key: string) => string;
  updateSetting: (key: string, value: string, opts?: any) => Promise<void>;
  bulkUpdate: (updates: any[]) => Promise<void>;
  loading: boolean;
}

const CHANNELS = [
  {
    id: 'email', label: 'Email (SMTP)', color: 'text-cyan-400',
    fields: [
      { key: 'smtp_host', label: 'SMTP Host', placeholder: 'smtp.gmail.com', secret: false },
      { key: 'smtp_port', label: 'SMTP Port', placeholder: '587', secret: false },
      { key: 'smtp_username', label: 'Email Username', placeholder: 'you@gmail.com', secret: false },
      { key: 'smtp_password', label: 'App Password', placeholder: 'xxxx xxxx xxxx xxxx', secret: true },
      { key: 'notify_email', label: 'Notify To', placeholder: 'recipient@email.com', secret: false },
    ],
  },
  {
    id: 'telegram', label: 'Telegram', color: 'text-blue-400',
    fields: [
      { key: 'telegram_bot_token', label: 'Bot Token', placeholder: '123456789:AAB...', secret: true },
      { key: 'telegram_chat_id', label: 'Chat ID', placeholder: '-1001234567890', secret: false },
    ],
  },
  {
    id: 'discord', label: 'Discord', color: 'text-violet-400',
    fields: [
      { key: 'discord_webhook_url', label: 'Webhook URL', placeholder: 'https://discord.com/api/webhooks/...', secret: true },
    ],
  },
  {
    id: 'slack', label: 'Slack', color: 'text-amber-400',
    fields: [
      { key: 'slack_bot_token', label: 'Bot Token', placeholder: 'xoxb-...', secret: true },
      { key: 'slack_channel', label: 'Channel', placeholder: '#enrichment-alerts', secret: false },
    ],
  },
];

export default function NotificationSettings({ getSetting, updateSetting, bulkUpdate }: NotificationSettingsProps) {
  const [vals, setVals] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const get = (key: string) => vals[key] ?? getSetting(key);
  const set = (key: string, val: string) => setVals(prev => ({ ...prev, [key]: val }));

  const saveAll = async () => {
    setSaving(true);
    try {
      const updates = CHANNELS.flatMap(ch => ch.fields.map(f => ({
        key: f.key, value: get(f.key) || '', is_encrypted: f.secret, category: 'notifications',
      })));
      await bulkUpdate(updates.filter(u => u.value));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">Notification Settings</h2>
        <p className="text-xs text-slate-500 mt-0.5">Configure alerts for job completion, failures, and more</p>
      </div>

      <div className="space-y-5">
        {CHANNELS.map(channel => (
          <div key={channel.id} className="border border-white/8 rounded-xl p-4 space-y-3">
            <h3 className={`text-sm font-semibold ${channel.color}`}>{channel.label}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {channel.fields.map(field => (
                <div key={field.key}>
                  <label className="text-xs text-slate-400 block mb-1">{field.label}</label>
                  <div className="relative">
                    <input
                      type={field.secret && !showSecrets[field.key] ? 'password' : 'text'}
                      className="input-glass w-full px-3 py-2 text-sm pr-9"
                      placeholder={field.placeholder}
                      value={get(field.key)}
                      onChange={e => set(field.key, e.target.value)}
                    />
                    {field.secret && (
                      <button
                        onClick={() => setShowSecrets(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      >
                        {showSecrets[field.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <GlowButton color="cyan" loading={saving} icon={<Check size={14} />} onClick={saveAll}>
        {saved ? 'Saved!' : 'Save Notification Settings'}
      </GlowButton>
    </div>
  );
}
