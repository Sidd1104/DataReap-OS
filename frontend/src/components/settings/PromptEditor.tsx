'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import GlowButton from '@/components/ui/GlowButton';
import { settingsApi } from '@/lib/api';
import { Check, Eye, AlertCircle } from 'lucide-react';

interface PromptEditorProps {
  getSetting: (key: string) => string;
  updateSetting: (key: string, value: string, opts?: any) => Promise<void>;
}

const BUILT_IN_TEMPLATES = [
  'default',
  'us_investors_v1',
  'indian_investors_v1',
  'startup_v1',
];

export default function PromptEditor({ getSetting, updateSetting }: PromptEditorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState('us_investors_v1');
  const [templateContent, setTemplateContent] = useState('');
  const [previewData, setPreviewData] = useState('{"Name": "John Doe", "Company": "Acme VC"}');
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [validation, setValidation] = useState<{ valid: boolean; variables: string[]; error?: string } | null>(null);

  // Load template content
  useEffect(() => {
    const saved = getSetting(`prompt_template_${selectedTemplate}`);
    setTemplateContent(saved || '');
    setPreview(null);
    setValidation(null);
  }, [selectedTemplate, getSetting]);

  const validateTemplate = async () => {
    if (!templateContent) return;
    try {
      const result = await settingsApi.validatePrompt(templateContent);
      setValidation(result);
    } catch {
      setValidation({ valid: false, variables: [], error: 'Validation failed' });
    }
  };

  const previewTemplate = () => {
    try {
      // Simple client-side preview
      let rendered = templateContent;
      const data = JSON.parse(previewData);
      for (const [k, v] of Object.entries(data)) {
        rendered = rendered.replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'g'), String(v));
      }
      setPreview(rendered);
    } catch (e) {
      setPreview('Error: Invalid sample data JSON');
    }
  };

  const saveTemplate = async () => {
    setSaving(true);
    try {
      await updateSetting(`prompt_template_${selectedTemplate}`, templateContent, { category: 'prompts' });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">Prompt Manager</h2>
        <p className="text-xs text-slate-500 mt-0.5">Edit and preview Jinja2 prompt templates</p>
      </div>

      {/* Template selector */}
      <div>
        <label className="text-xs text-slate-400 block mb-2">Template</label>
        <div className="flex flex-wrap gap-2">
          {BUILT_IN_TEMPLATES.map(t => (
            <button
              key={t}
              onClick={() => setSelectedTemplate(t)}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-all font-mono ${
                selectedTemplate === t
                  ? 'border-violet-500/50 bg-violet-950/40 text-violet-400'
                  : 'border-white/10 text-slate-500 hover:border-white/20'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div>
        <label className="text-xs text-slate-400 block mb-2">
          Template Content
          <span className="ml-2 text-slate-600">Jinja2 · Variables: {'{{ Name }}'}, {'{{ Company }}'}, etc.</span>
        </label>
        <textarea
          rows={14}
          className="input-glass w-full px-4 py-3 text-xs font-mono resize-none leading-6"
          placeholder="Enter your Jinja2 prompt template here..."
          value={templateContent}
          onChange={e => setTemplateContent(e.target.value)}
        />
      </div>

      {/* Validation result */}
      {validation && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`px-4 py-3 rounded-xl border text-xs ${
            validation.valid
              ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-400'
              : 'border-red-500/30 bg-red-950/20 text-red-400'
          }`}
        >
          {validation.valid ? (
            <>✓ Valid template · Variables: {validation.variables.join(', ') || 'none'}</>
          ) : (
            <>{validation.error}</>
          )}
        </motion.div>
      )}

      {/* Preview */}
      {preview && (
        <div>
          <p className="text-xs text-slate-400 mb-2">Preview Output</p>
          <pre className="text-xs bg-black/30 rounded-xl p-4 text-slate-300 font-mono overflow-auto max-h-48 border border-white/5">
            {preview}
          </pre>
        </div>
      )}

      {/* Sample data */}
      <div>
        <label className="text-xs text-slate-400 block mb-2">Sample Data for Preview (JSON)</label>
        <textarea
          rows={3}
          className="input-glass w-full px-3 py-2 text-xs font-mono"
          value={previewData}
          onChange={e => setPreviewData(e.target.value)}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <GlowButton color="violet" icon={<Eye size={14} />} onClick={previewTemplate}>
          Preview
        </GlowButton>
        <GlowButton color="cyan" icon={<Check size={14} />} onClick={validateTemplate}>
          Validate
        </GlowButton>
        <GlowButton
          color={saved ? 'emerald' : 'violet'}
          loading={saving}
          icon={<Check size={14} />}
          onClick={saveTemplate}
        >
          {saved ? 'Saved!' : 'Save Template'}
        </GlowButton>
      </div>
    </div>
  );
}
