'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, RefreshCw, Wifi, WifiOff, Search, Cpu, Users, ChevronDown, Check, Sun, Moon
} from 'lucide-react';
import { healthApi, projectsApi, workersApi } from '@/lib/api';
import type { Project } from '@/types';
import { clsx } from 'clsx';

export default function TopBar() {
  const pathname = usePathname();
  const [backendOnline, setBackendOnline] = useState(false);
  const [checking, setChecking] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projOpen, setProjOpen] = useState(false);
  const [workerCount, setWorkerCount] = useState(0);
  const [activeLLM, setActiveLLM] = useState('Gemini 1.5 Pro');
  const [time, setTime] = useState('');

  const checkHealth = async () => {
    setChecking(true);
    try {
      await healthApi.check();
      setBackendOnline(true);
    } catch {
      setBackendOnline(false);
    } finally {
      setChecking(false);
    }
  };

  const fetchStatus = async () => {
    try {
      const data = await workersApi.status();
      setWorkerCount(data.engine.active_workers || 0);
    } catch {}
  };

  useEffect(() => {
    checkHealth();
    fetchStatus();

    projectsApi.list().then(p => {
      setProjects(p);
      if (p.length > 0) setSelectedProject(p[0]);
    }).catch(() => {});

    // Clock update
    const updateClock = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
    };
    updateClock();
    const clockInterval = setInterval(updateClock, 1000);

    const healthInterval = setInterval(() => {
      checkHealth();
      fetchStatus();
    }, 15000);

    return () => {
      clearInterval(clockInterval);
      clearInterval(healthInterval);
    };
  }, []);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full h-[72px] px-6 flex items-center justify-between border-b border-white/10 bg-[#06070d]/20 backdrop-blur-xl relative z-20"
    >
      {/* Left Area: Project Selector & Search */}
      <div className="flex items-center gap-4">
        {/* Project Selector */}
        <div className="relative">
          <button
            onClick={() => setProjOpen(!projOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/5 bg-white/3 hover:bg-white/5 text-xs font-semibold text-white transition-all cursor-pointer select-none"
          >
            <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse" />
            {selectedProject ? selectedProject.name : 'System Core'}
            <ChevronDown size={12} className={clsx('text-slate-500 transition-transform', projOpen && 'rotate-180')} />
          </button>

          <AnimatePresence>
            {projOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute left-0 mt-1.5 w-56 glass-card border border-white/10 p-1 shadow-2xl z-50 overflow-hidden"
              >
                {projects.length === 0 ? (
                  <p className="px-3 py-2 text-[11px] text-slate-500">No active projects</p>
                ) : (
                  projects.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedProject(p); setProjOpen(false); }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-white/5 text-xs text-slate-300 hover:text-white transition-all"
                    >
                      <span>{p.name}</span>
                      {selectedProject?.id === p.id && <Check size={12} className="text-accent-cyan" />}
                    </button>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Search Input */}
        <div className="relative hidden lg:block">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            className="input-glass pl-8 pr-3 py-1.5 text-xs w-[180px] focus:w-[240px] focus:border-accent-cyan/40 transition-all placeholder-slate-600 text-slate-200"
            placeholder="Search OS configs..."
          />
        </div>
      </div>

      {/* Right Area: System Diagnostics, Worker Count, Profile & Clock */}
      <div className="flex items-center gap-3">
        {/* Active AI Provider Status */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/5 bg-white/3 text-xs font-semibold text-slate-300">
          <Cpu size={13} className="text-accent-violet animate-pulse" />
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">AI Provider:</span>
          <span className="text-accent-cyan">{activeLLM}</span>
        </div>

        {/* Active Worker Count */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/5 bg-white/3 text-xs font-semibold text-slate-300">
          <Users size={13} className="text-accent-cyan" />
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Workers:</span>
          <span className="text-accent-cyan font-mono">{workerCount} active</span>
        </div>

        {/* Backend Online Indicator */}
        <motion.button
          whileHover={{ scale: 1.04, boxShadow: backendOnline ? '0 0 15px rgba(0, 229, 255, 0.25)' : '0 0 15px rgba(255, 77, 109, 0.25)' }}
          whileTap={{ scale: 0.96 }}
          onClick={checkHealth}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer',
            backendOnline
              ? 'border-accent-cyan/30 bg-accent-cyan/5 text-accent-cyan shadow-sm shadow-accent-cyan/5'
              : 'border-accent-pink/30 bg-accent-pink/5 text-accent-pink shadow-sm shadow-accent-pink/5'
          )}
        >
          {checking ? (
            <RefreshCw size={12} className="animate-spin" />
          ) : backendOnline ? (
            <Wifi size={12} className="animate-pulse" />
          ) : (
            <WifiOff size={12} />
          )}
          <span className="hidden md:inline">{backendOnline ? 'AI OS Online' : 'System Offline'}</span>
        </motion.button>

        {/* Theme Toggle (Aesthetic Only) */}
        <motion.button
          whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
          whileTap={{ scale: 0.95 }}
          className="relative p-2 rounded-xl border border-white/5 text-slate-400 hover:text-slate-200 cursor-pointer"
        >
          <Sun size={14} className="text-accent-amber animate-spin-slow" />
        </motion.button>

        {/* Notifications */}
        <motion.button
          whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
          whileTap={{ scale: 0.95 }}
          className="relative p-2 rounded-xl border border-white/5 text-slate-400 hover:text-slate-200 cursor-pointer"
        >
          <Bell size={14} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-accent-pink rounded-full" />
        </motion.button>

        {/* Profile Avatar */}
        <div className="relative shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-cyan to-accent-violet flex items-center justify-center text-white text-[11px] font-bold shadow-md shadow-cyan-500/10 cursor-pointer border border-white/10 hover:border-accent-cyan/50 transition-colors">
            AI
          </div>
        </div>

        {/* Digital Clock */}
        <div className="text-xs text-slate-400 font-mono bg-white/3 border border-white/5 px-2.5 py-1.5 rounded-xl hidden md:block">
          {time}
        </div>
      </div>
    </motion.header>
  );
}
