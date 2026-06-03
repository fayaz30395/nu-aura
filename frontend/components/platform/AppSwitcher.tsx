'use client';

import {useEffect, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import {AnimatePresence, motion} from 'framer-motion';
import {BookOpen, Check, LayoutGrid, Loader2, Lock, TrendingUp, UserPlus, Users,} from 'lucide-react';
import {APP_LIST, type NuApp} from '@/lib/config/apps';
import {useActiveApp} from '@/lib/hooks/useActiveApp';

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
  const {appCode, app, hasAppAccess, getAppEntryRoute} = useActiveApp();
  const [isOpen, setIsOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

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

  const handleAppClick = async (targetApp: NuApp) => {
    // Already on this app
    if (targetApp.code === appCode) {
      setIsOpen(false);
      return;
    }

    // Locked (no access or not available)
    if (!targetApp.available || !hasAppAccess(targetApp.code)) {
      return;
    }

    const targetRoute = getAppEntryRoute(targetApp.code);
    setIsOpen(false);
    setIsNavigating(true);

    // Use router.push with a URL-check fallback. router.push() resolves its
    // promise when navigation *starts*, not when the page finishes compiling.
    // So instead of relying on the promise, we check if the URL actually
    // changed after a timeout. If not, fall back to hard navigation.
    try {
      router.push(targetRoute);
    } catch {
      // router.push threw synchronously — fall back immediately
      window.location.href = targetRoute;
      return;
    }

    // Check after 3s if the URL actually changed
    setTimeout(() => {
      const currentPath = window.location.pathname;
      if (currentPath !== targetRoute && !currentPath.startsWith(targetRoute + '/')) {
        window.location.href = targetRoute;
      }
      setIsNavigating(false);
    }, 3000);
  };

  const CurrentIcon = getAppIcon(app.iconName);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger — shows current app icon + waffle grid */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Switch application"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        data-hydrated={isHydrated ? 'true' : 'false'}
        className="flex items-center gap-4 px-4 py-2 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-card)] border border-[var(--border)] transition-colors duration-150 shadow-[var(--sh-card)] hover-lift focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)]"
      >
        <div className="w-9 h-9 rounded-lg bg-[var(--accent)] flex items-center justify-center">
          <CurrentIcon className="w-5 h-5 text-white"/>
        </div>
        <div className="hidden sm:flex flex-col items-start">
          <span className="text-sm font-semibold text-[var(--text-1)]">
            {app.name}
          </span>
          <span className="text-caption text-[var(--text-2)]">
            NU-AURA Platform
          </span>
        </div>
        {/* Waffle grid icon */}
        <LayoutGrid className="w-4 h-4 text-[var(--text-2)]"/>
      </button>

      {/* Waffle Grid Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{opacity: 0, y: -4}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, y: -4}}
            transition={{duration: 0.15, ease: [0.4, 0, 0.2, 1]}}
            className="absolute top-full left-0 mt-2 w-[320px] bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden shadow-[var(--sh-dropdown)] z-50"
            role="menu"
            aria-label="App switcher menu"
            data-testid="app-switcher-menu"
          >
            {/* Header */}
            <div className="px-6 py-4 bg-[var(--bg-surface)] border-b border-[var(--border)]">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center">
                  <LayoutGrid className="w-4 h-4 text-white"/>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-1)]">
                    NU-AURA Platform
                  </p>
                  <p className="text-xs text-[var(--text-2)]">
                    Switch between apps
                  </p>
                </div>
              </div>
            </div>

            {/* 2×2 Waffle Grid */}
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4">
                {APP_LIST.map((targetApp, index) => {
                  const Icon = getAppIcon(targetApp.iconName);
                  const isActive = targetApp.code === appCode;
                  const isLocked = !targetApp.available || !hasAppAccess(targetApp.code);

                  return (
                    <motion.div
                      key={targetApp.code}
                      initial={{opacity: 0, y: 4}}
                      animate={{opacity: 1, y: 0}}
                      transition={{
                        duration: 0.15,
                        delay: index * 0.03,
                        ease: [0.4, 0, 0.2, 1],
                      }}
                    >
                      <button
                        onClick={() => handleAppClick(targetApp)}
                        disabled={isLocked}
                        role="menuitem"
                        aria-label={targetApp.name}
                        className={`
                          relative flex flex-col items-center gap-4 p-4 rounded-lg
                          transition-all duration-150 group w-full h-full hover-lift
                          ${isActive
                          ? 'bg-[var(--accent-soft)] border border-[var(--accent-bd)] ring-1 ring-[var(--accent)]/20'
                          : isLocked
                            ? 'bg-[var(--bg-surface)] border border-[var(--border)] opacity-50 cursor-not-allowed'
                            : 'bg-[var(--bg-surface)] border border-transparent hover:border-[var(--border)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)]'
                        }
                        `}
                      >
                        {/* App Icon */}
                        <div
                          className={`
                            relative w-12 h-12 rounded-lg bg-[var(--accent)]
                            flex items-center justify-center
                            ${!isLocked && !isActive ? 'group-hover:scale-105' : ''}
                            transition-transform duration-150
                          `}
                        >
                          <Icon className="w-6 h-6 text-white"/>

                          {/* Lock overlay */}
                          {isLocked && (
                            <div className="absolute inset-0 rounded-lg bg-black/40 flex items-center justify-center">
                              <Lock className="w-4 h-4 text-white"/>
                            </div>
                          )}

                          {/* Active check badge */}
                          {isActive && (
                            <div
                              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--accent)] border-2 border-[var(--bg-card)] flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 text-white"/>
                            </div>
                          )}
                        </div>

                        {/* App Name */}
                        <div className="text-center w-full">
                          <p className={`text-sm font-semibold leading-tight ${
                            isActive
                              ? 'text-[var(--accent-text)]'
                              : isLocked
                                ? 'text-[var(--text-2)]'
                                : 'text-[var(--text-1)]'
                          }`}>
                            {targetApp.name}
                          </p>
                          <p className={`text-xs mt-1 ${
                            isLocked
                              ? 'text-[var(--text-2)]'
                              : 'text-[var(--text-2)]'
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
            <div className="px-6 py-4 bg-[var(--bg-surface)] border-t border-[var(--border)]">
              {isNavigating ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-[var(--accent)] animate-spin"/>
                  <p className="text-xs text-[var(--accent-text)] font-medium">Switching app...</p>
                </div>
              ) : (
                <p className="text-caption text-center text-[var(--text-2)] tabular-nums">
                  {APP_LIST.filter((a) => a.available).length} of {APP_LIST.length} apps available
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
