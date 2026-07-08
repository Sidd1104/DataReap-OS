'use client';

import { motion } from 'framer-motion';
import { CheckCircle, Circle, ExternalLink, Key, Database, Cpu, Bell } from 'lucide-react';

interface OnboardingChecklistProps {
  getSetting: (key: string) => string;
}

const STEPS = [
  {
    id: 'db',
    title: 'Configure Database',
    icon: Database,
    color: 'text-cyan-400',
    description: 'Set your database connection string in the backend .env file.',
    steps: [
      'Copy backend/.env.example → backend/.env',
      'Set DATABASE_URL (default SQLite works out of the box)',
      'For PostgreSQL: postgresql+asyncpg://user:pass@host:5432/dbname',
    ],
    file: 'backend/.env',
    settingKey: 'database_url',
    settingLabel: 'DATABASE_URL',
  },
  {
    id: 'llm',
    title: 'Add AI Provider API Key',
    icon: Cpu,
    color: 'text-violet-400',
    description: 'Add at least one AI provider API key to enable enrichment.',
    steps: [
      'Go to Settings → AI Providers tab',
      'Enter your Gemini API key (recommended: get free at aistudio.google.com)',
      'Click "Test" to verify the connection',
      'Or enter OpenAI / Anthropic keys alternatively',
    ],
    file: 'backend/.env or Settings → AI Providers',
    settingKey: 'gemini_api_key',
    settingLabel: 'GEMINI_API_KEY',
  },
  {
    id: 'encryption',
    title: 'Set Encryption Key',
    icon: Key,
    color: 'text-amber-400',
    description: 'Generate and set a Fernet encryption key to securely store API keys in the database.',
    steps: [
      'Run: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"',
      'Copy the output to ENCRYPTION_KEY in backend/.env',
    ],
    file: 'backend/.env',
    settingKey: 'encryption_key',
    settingLabel: 'ENCRYPTION_KEY',
  },
  {
    id: 'google_search',
    title: 'Google Search API (Optional)',
    icon: ExternalLink,
    color: 'text-emerald-400',
    description: 'Enable Google Custom Search for better data gathering results.',
    steps: [
      'Go to console.developers.google.com',
      'Enable "Custom Search JSON API"',
      'Create API credentials → copy API Key',
      'Create a Custom Search Engine at cse.google.com → copy Engine ID',
      'Add both to backend/.env',
    ],
    file: 'backend/.env',
    settingKey: 'google_search_api_key',
    settingLabel: 'GOOGLE_SEARCH_API_KEY',
    optional: true,
  },
  {
    id: 'notifications',
    title: 'Configure Notifications (Optional)',
    icon: Bell,
    color: 'text-blue-400',
    description: 'Get alerted when jobs complete or fail.',
    steps: [
      'Go to Settings → Notifications tab',
      'Configure any channel: Email, Telegram, Discord, or Slack',
      'All channels are optional',
    ],
    file: 'Settings → Notifications',
    settingKey: '',
    settingLabel: '',
    optional: true,
  },
];

export default function OnboardingChecklist({ getSetting }: OnboardingChecklistProps) {
  const isConfigured = (step: typeof STEPS[0]) => {
    if (!step.settingKey) return false;
    const val = getSetting(step.settingKey);
    return !!val && val !== '' && val !== '***';
  };

  const completedCount = STEPS.filter(s => isConfigured(s) || s.optional).length;
  const requiredComplete = STEPS.filter(s => !s.optional && isConfigured(s)).length;
  const requiredTotal = STEPS.filter(s => !s.optional).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">Onboarding Checklist</h2>
        <p className="text-xs text-slate-500 mt-0.5">Complete these steps to get the platform running</p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 to-violet-950/20 border border-cyan-500/15">
        <div className="text-3xl font-bold text-white">{requiredComplete}/{requiredTotal}</div>
        <div>
          <p className="text-sm font-medium text-slate-300">Required steps complete</p>
          <div className="h-1.5 w-40 bg-white/10 rounded-full mt-1.5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(requiredComplete / requiredTotal) * 100}%` }}
              transition={{ duration: 1 }}
              className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full"
            />
          </div>
        </div>
        {requiredComplete === requiredTotal && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="ml-auto text-emerald-400 text-sm font-medium"
          >
            🎉 Ready to run!
          </motion.div>
        )}
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {STEPS.map((step, i) => {
          const done = isConfigured(step) || (step.optional && step.id === 'notifications');
          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`rounded-xl border p-4 space-y-2 transition-all ${
                done
                  ? 'border-emerald-500/20 bg-emerald-950/10'
                  : step.optional
                    ? 'border-white/8 bg-white/2'
                    : 'border-amber-500/20 bg-amber-950/10'
              }`}
            >
              <div className="flex items-center gap-3">
                {done ? (
                  <CheckCircle size={18} className="text-emerald-400 shrink-0" />
                ) : (
                  <Circle size={18} className={`${step.optional ? 'text-slate-600' : 'text-amber-400'} shrink-0`} />
                )}
                <step.icon size={15} className={step.color} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">
                    {step.title}
                    {step.optional && <span className="ml-2 text-[10px] text-slate-500 font-normal">optional</span>}
                  </p>
                  <p className="text-xs text-slate-500">{step.description}</p>
                </div>
              </div>

              <div className="ml-9 space-y-1">
                {step.steps.map((s, j) => (
                  <p key={j} className="text-xs text-slate-500 flex items-start gap-1.5">
                    <span className="text-slate-700 mt-0.5">{j + 1}.</span>
                    {s}
                  </p>
                ))}
                {step.settingLabel && (
                  <p className="text-xs font-mono text-cyan-400/80 bg-black/20 px-2 py-0.5 rounded mt-1 inline-block">
                    {step.settingLabel}={done ? '✓ configured' : 'NOT SET'}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Quick start note */}
      <div className="px-4 py-3 rounded-xl bg-blue-950/20 border border-blue-500/15 text-xs text-blue-300">
        <strong>Quick Start:</strong> The platform works immediately with SQLite + Gemini API key.
        Just set GEMINI_API_KEY in backend/.env, run <code className="font-mono">uvicorn main:app --reload</code>,
        then <code className="font-mono">npm run dev</code> in the frontend directory.
      </div>
    </div>
  );
}
