'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
import ProjectConfig from '@/components/settings/ProjectConfig';
import PromptEditor from '@/components/settings/PromptEditor';
import LLMSettings from '@/components/settings/LLMSettings';
import DatabaseSettings from '@/components/settings/DatabaseSettings';
import NotificationSettings from '@/components/settings/NotificationSettings';
import SchedulerSettings from '@/components/settings/SchedulerSettings';
import ValidationRules from '@/components/settings/ValidationRules';
import OnboardingChecklist from '@/components/onboarding/OnboardingChecklist';
import { useSettings } from '@/hooks/useSettings';
import {
  Folder, MessageSquare, Cpu, Database, Bell,
  Calendar, Shield, CheckSquare, Settings
} from 'lucide-react';
import { clsx } from 'clsx';

const TABS = [
  { id: 'onboarding',  label: 'Onboarding',    icon: CheckSquare, color: 'text-accent-emerald', glow: 'rgba(0, 255, 179, 0.2)' },
  { id: 'project',     label: 'Project Settings', icon: Folder,      color: 'text-accent-cyan', glow: 'rgba(0, 229, 255, 0.2)' },
  { id: 'prompt',      label: 'Prompt Templates', icon: MessageSquare, color: 'text-accent-violet', glow: 'rgba(124, 77, 255, 0.2)' },
  { id: 'llm',         label: 'AI Providers',   icon: Cpu,         color: 'text-accent-amber', glow: 'rgba(255, 200, 87, 0.2)' },
  { id: 'database',    label: 'System Database', icon: Database,    color: 'text-accent-cyan', glow: 'rgba(0, 229, 255, 0.2)' },
  { id: 'validation',  label: 'Data Integrity',  icon: Shield,      color: 'text-accent-pink', glow: 'rgba(255, 77, 109, 0.2)' },
  { id: 'scheduler',   label: 'Scheduler Engine', icon: Calendar,    color: 'text-accent-violet', glow: 'rgba(124, 77, 255, 0.2)' },
  { id: 'notifications', label: 'Alert Center',    icon: Bell,       color: 'text-accent-amber', glow: 'rgba(255, 200, 87, 0.2)' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('onboarding');
  const { settings, projects, loading, getSetting, updateSetting, bulkUpdate, refresh } = useSettings();

  const sharedProps = { getSetting, updateSetting, bulkUpdate, loading };

  const renderTab = () => {
    switch (activeTab) {
      case 'onboarding':    return <OnboardingChecklist getSetting={getSetting} />;
      case 'project':       return <ProjectConfig projects={projects} onRefresh={refresh} />;
      case 'prompt':        return <PromptEditor getSetting={getSetting} updateSetting={updateSetting} />;
      case 'llm':           return <LLMSettings {...sharedProps} />;
      case 'database':      return <DatabaseSettings {...sharedProps} />;
      case 'validation':    return <ValidationRules {...sharedProps} />;
      case 'scheduler':     return <SchedulerSettings {...sharedProps} />;
      case 'notifications': return <NotificationSettings {...sharedProps} />;
      default:              return null;
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-screen-2xl mx-auto pb-16">
      {/* Settings Title Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-accent-cyan/10 border border-accent-cyan/20">
          <Settings size={18} className="text-accent-cyan animate-spin-slow" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-none">System Settings</h2>
          <p className="text-[11px] text-slate-500 mt-1">Configure your enterprise AI operating system configurations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[250px_1fr] gap-6">

        {/* Tab Sidebar Selector */}
        <GlassCard animate={false} className="p-3.5 h-fit sticky top-24 border border-white/10 shadow-2xl shadow-black/30">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-3">Settings Categories</p>
          <nav className="space-y-1">
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer border',
                    isActive
                      ? `${tab.color} bg-white/5 border-white/10 shadow-md`
                      : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/3'
                  )}
                  style={{
                    boxShadow: isActive ? `0 0 15px ${tab.glow}` : undefined
                  }}
                >
                  <tab.icon size={14} className="shrink-0" />
                  <span className="flex-1">{tab.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="settings-indicator"
                      className="w-1.5 h-1.5 rounded-full bg-current shrink-0"
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </GlassCard>

        {/* Tab Content Canvas */}
        <GlassCard animate={false} className="p-6 min-h-[640px] border border-white/10 shadow-2xl shadow-black/30 relative">
          {/* Subtle reflection overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.005] to-white/0 pointer-events-none rounded-2xl" />
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {renderTab()}
            </motion.div>
          </AnimatePresence>
        </GlassCard>
      </div>
    </div>
  );
}
