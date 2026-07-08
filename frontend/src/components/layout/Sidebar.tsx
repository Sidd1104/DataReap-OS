'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Settings,
  Zap,
  Database,
  Activity,
  ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';

const NAV_ITEMS = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

const QUICK_STATS = [
  { label: 'Engine', value: 'Online', color: 'text-accent-emerald' },
  { label: 'DB', value: 'SQLite', color: 'text-accent-cyan' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.aside
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      animate={{ width: isHovered ? 260 : 76 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="shrink-0 flex flex-col h-screen sticky top-0 z-30 bg-[#06070d]/35 backdrop-blur-2xl border-r border-white/10 shadow-2xl shadow-black/50 overflow-hidden"
    >
      {/* Logo Section */}
      <div className="p-4 border-b border-white/5 flex items-center justify-start h-[72px] shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-cyan to-accent-violet flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Zap size={18} className="text-white animate-pulse" />
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-accent-emerald rounded-full border-2 border-bg-deep" />
          </div>
          
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <h1 className="text-sm font-bold text-white tracking-wide leading-none">AI OS</h1>
                <p className="text-[10px] text-slate-500 mt-0.5">Control Center v1.0</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation Section */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-hidden">
        <AnimatePresence mode="wait">
          {isHovered ? (
            <motion.p
              key="nav-header"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2 whitespace-nowrap"
            >
              Navigation
            </motion.p>
          ) : (
            <div key="nav-spacer" className="h-4" />
          )}
        </AnimatePresence>

        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'sidebar-nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer relative',
                isActive
                  ? 'text-accent-cyan bg-accent-cyan/5 border border-accent-cyan/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              )}
            >
              <Icon size={16} className="shrink-0" />
              
              <AnimatePresence>
                {isHovered && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm font-medium whitespace-nowrap overflow-hidden"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>

              {isActive && isHovered && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="ml-auto shrink-0"
                >
                  <ChevronRight size={14} className="text-accent-cyan" />
                </motion.div>
              )}
            </Link>
          );
        })}

        {/* Divider */}
        <div className="border-t border-white/5 my-4" />

        {/* Resources Section */}
        <AnimatePresence>
          {isHovered && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2 whitespace-nowrap"
            >
              Resources
            </motion.p>
          )}
        </AnimatePresence>

        <a
          href="http://localhost:8000/api/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="sidebar-nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-transparent transition-all text-xs"
        >
          <Activity size={15} className="shrink-0" />
          <AnimatePresence>
            {isHovered && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="whitespace-nowrap overflow-hidden"
              >
                API Docs
              </motion.span>
            )}
          </AnimatePresence>
        </a>

        <a
          href="http://localhost:8000/health"
          target="_blank"
          rel="noopener noreferrer"
          className="sidebar-nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-transparent transition-all text-xs"
        >
          <Database size={15} className="shrink-0" />
          <AnimatePresence>
            {isHovered && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="whitespace-nowrap overflow-hidden"
              >
                Health Check
              </motion.span>
            )}
          </AnimatePresence>
        </a>
      </nav>

      {/* System Stats Section */}
      <div className="p-4 border-t border-white/5 shrink-0 bg-black/10">
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="space-y-2"
            >
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">System Status</p>
              {QUICK_STATS.map(stat => (
                <div key={stat.label} className="flex justify-between items-center py-0.5">
                  <span className="text-xs text-slate-400">{stat.label}</span>
                  <span className={clsx('text-xs font-semibold', stat.color)}>{stat.value}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-3 pt-3 border-t border-white/5">
          <p className="text-[10px] text-slate-500 text-center whitespace-nowrap">
            {isHovered ? '© 2026 AI Data Enrichment' : '⚡'}
          </p>
        </div>
      </div>
    </motion.aside>
  );
}
