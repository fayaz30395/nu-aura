'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid,
  Users,
  UserPlus,
  TrendingUp,
  BookOpen,
  Lock,
  Check,
} from 'lucide-react';
import { APP_LIST, type AppCode, type NuApp } from '@/lib/config/apps';
import { useActiveApp } from '@/lib/hooks/useActiveApp';

// ─── Icon Mapping ────────────────────────────────────────────────────────────

const APP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Users,
  UserPlus,
  TrendingUp,
  BookOpen,
};

function getAppIcon(iconName: string): React.ComponentType<{ className?: string }> {
  return APP_ICONS[iconName] || Users;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AppSwitcher() {
  const router = useRouter();
  const { appCode, app, hasAppAccess, getAppEntryRoute } = useActiveApp();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen]);

  const handleAppClick = (targetApp: NuApp) => {
    // Already on this app
    if (targetApp.code === appCode) {
      setIsOpen(false);
      return;
    }

    // Locked (no access or not available)
    if (!targetApp.available || !hasAppAccess(targetApp.code)) {
      return;
    }

    router.push(getAppEntryRoute(targetApp.code));
    setIsOpen(false);
  };

  const CurrentIcon = getAppIcon(app.iconName);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger — shows current app icon + 9-dot waffle grid */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Switch application"
        aria-expanded={isOpen}
        className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 border border-surface-200 dark:border-surface-700 transition-all duration-200 shadow-sm hover:shadow-md"
      >
        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${app.gradient} flex items-center justify-center shadow-sm`}>
          <CurrentIcon className="w-5 h-5 text-white" />
        </div>
        <div className="hidden sm:flex flex-col items-start">
          <span className="text-sm font-semibold text-surface-800 dark:text-surface-100">
            {app.name}
          </span>
          <span className="text-[10px] text-surface-500 dark:text-surface-400 -mt-0.5">
            NU-AURA Platform
          </span>
        </div>
        {/* Waffle grid icon (9 dots) */}
        <LayoutGrid className="w-4 h-4 text-surface-500 dark:text-surface-400" />
      </button>

      {/* Waffle Grid Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute top-full left-0 mt-2 w-[320px] bg-white dark:bg-surface-900 rounded-2xl shadow-xl border border-surface-200 dark:border-surface-700 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-primary-50 to-surface-50 dark:from-primary-900/20 dark:to-surface-800/50 border-b border-surface-200 dark:border-surface-700">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-sm">
                  <LayoutGrid className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-surface-800 dark:text-surface-100">
                    NU-AURA Platform
                  </p>
                  <p className="text-[10px] text-surface-500 dark:text-surface-400">
                    Switch between apps
                  </p>
                </div>
              </div>
            </div>

            {/* 2×2 Waffle Grid */}
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3">
                {APP_LIST.map((targetApp, index) => {
                  const Icon = getAppIcon(targetApp.iconName);
                  const isActive = targetApp.code === appCode;
                  const isLocked = !targetApp.available || !hasAppAccess(targetApp.code);

                  return (
                    <motion.div
                      key={targetApp.code}
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{
                        duration: 0.3,
                        delay: index * 0.08,
                        ease: 'easeOut',
                      }}
                    >
                      <button
                        onClick={() => handleAppClick(targetApp)}
                        disabled={isLocked}
                        className={`
                          relative flex flex-col items-center gap-2.5 p-4 rounded-xl
                          transition-all duration-200 group w-full h-full
                          ${isActive
                            ? 'bg-primary-50 dark:bg-primary-900/30 border-2 border-primary-300 dark:border-primary-600 shadow-sm'
                            : isLocked
                              ? 'bg-surface-50 dark:bg-surface-800/50 border-2 border-surface-200 dark:border-surface-700 opacity-60 cursor-not-allowed'
                              : 'bg-surface-50 dark:bg-surface-800/50 border-2 border-transparent hover:border-surface-300 dark:hover:border-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800 hover:shadow-md cursor-pointer'
                          }
                        `}
                      >
                        {/* App Icon */}
                        <motion.div
                          className={`
                            relative w-14 h-14 rounded-2xl bg-gradient-to-br ${targetApp.gradient}
                            flex items-center justify-center shadow-md
                          `}
                          whileHover={!isLocked ? { scale: 1.05 } : {}}
                          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        >
                          <Icon className="w-7 h-7 text-white" />

                          {/* Lock overlay for unauthorized apps */}
                          {isLocked && (
                            <motion.div
                              className="absolute inset-0 rounded-2xl bg-surface-900/40 flex items-center justify-center"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.3 }}
                            >
                              <motion.div
                                animate={{ x: [0, 2, 0] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              >
                                <Lock className="w-5 h-5 text-white/90" />
                              </motion.div>
                            </motion.div>
                          )}

                          {/* Active check badge with pulse glow */}
                          {isActive && (
                            <motion.div
                              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary-500 border-2 border-white dark:border-surface-900 flex items-center justify-center shadow-sm"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            >
                              <motion.div
                                animate={{ boxShadow: ['0 0 0 0 rgba(139, 92, 246, 0.7)', '0 0 0 8px rgba(139, 92, 246, 0)'] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute inset-0 rounded-full"
                              />
                              <Check className="w-3 h-3 text-white relative z-10" />
                            </motion.div>
                          )}
                        </motion.div>

                        {/* App Name */}
                        <div className="text-center">
                          <p className={`text-sm font-semibold leading-tight ${
                            isActive
                              ? 'text-primary-700 dark:text-primary-300'
                              : isLocked
                                ? 'text-surface-400 dark:text-surface-500'
                                : 'text-surface-700 dark:text-surface-200'
                          }`}>
                            {targetApp.name}
                          </p>
                          <p className={`text-[10px] mt-0.5 ${
                            isLocked
                              ? 'text-surface-400 dark:text-surface-600'
                              : 'text-surface-500 dark:text-surface-400'
                          }`}>
                            {isLocked && !targetApp.available
                              ? 'Coming soon'
                              : isLocked
                                ? 'No access'
                                : targetApp.description}
                          </p>
                        </div>
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-surface-50 dark:bg-surface-800/50 border-t border-surface-200 dark:border-surface-700">
              <p className="text-[10px] text-surface-400 dark:text-surface-500 text-center">
                {APP_LIST.filter((a) => a.available).length} of {APP_LIST.length} apps available
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
