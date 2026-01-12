'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid,
  Users,
  BarChart3,
  Settings,
  Building2,
  MessageCircle,
  FileText,
  DollarSign,
  FolderKanban,
  HardDrive,
  Mail,
  Calendar,
  Check
} from 'lucide-react';
export interface UserAppAccess {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  applicationCode: string;
  applicationName: string;
  baseUrl?: string;
  status: string;
  grantedAt: string;
  roleCodes: string[];
  permissions: string[];
}

const DEFAULT_APPS: UserAppAccess[] = [
  {
    id: '1',
    userId: '',
    userEmail: '',
    userName: '',
    applicationCode: 'HRMS',
    applicationName: 'NU-HRMS',
    baseUrl: '/dashboard',
    status: 'ACTIVE',
    grantedAt: new Date().toISOString(),
    roleCodes: ['USER'],
    permissions: [],
  },
  {
    id: '2',
    userId: '',
    userEmail: '',
    userName: '',
    applicationCode: 'PROJECTS',
    applicationName: 'NU-ProjectsAndAllocations',
    baseUrl: '/projects',
    status: 'ACTIVE',
    grantedAt: new Date().toISOString(),
    roleCodes: ['USER'],
    permissions: [],
  },
  {
    id: '3',
    userId: '',
    userEmail: '',
    userName: '',
    applicationCode: 'NUDRIVE',
    applicationName: 'NU-Drive',
    baseUrl: '/nu-drive',
    status: 'ACTIVE',
    grantedAt: new Date().toISOString(),
    roleCodes: ['USER'],
    permissions: [],
  },
  {
    id: '4',
    userId: '',
    userEmail: '',
    userName: '',
    applicationCode: 'NUMAIL',
    applicationName: 'NU-Mail',
    baseUrl: '/nu-mail',
    status: 'ACTIVE',
    grantedAt: new Date().toISOString(),
    roleCodes: ['USER'],
    permissions: [],
  },
  {
    id: '5',
    userId: '',
    userEmail: '',
    userName: '',
    applicationCode: 'NUCALENDAR',
    applicationName: 'NU-Calendar',
    baseUrl: '/nu-calendar',
    status: 'ACTIVE',
    grantedAt: new Date().toISOString(),
    roleCodes: ['USER'],
    permissions: [],
  },
];

interface AppSwitcherProps {
  currentAppCode?: string;
  onAppSwitch?: (appCode: string, baseUrl?: string) => void;
}

// App icon mapping
const getAppIcon = (code: string) => {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    HRMS: Users,
    PROJECTS: FolderKanban,
    NUDRIVE: HardDrive,
    NUMAIL: Mail,
    NUCALENDAR: Calendar,
    CRM: MessageCircle,
    FLUENCE: BarChart3,
    FINANCE: DollarSign,
    DOCS: FileText,
    SETTINGS: Settings,
  };
  return icons[code] || Building2;
};

// App color mapping - NuLogic Theme
const getAppColor = (code: string) => {
  const colors: Record<string, string> = {
    HRMS: 'from-primary-500 to-primary-600',      // NuLogic Blue
    PROJECTS: 'from-amber-500 to-amber-600',      // Projects Amber
    NUDRIVE: 'from-sky-500 to-sky-600',           // Drive Blue
    NUMAIL: 'from-rose-500 to-rose-600',          // Mail Red
    NUCALENDAR: 'from-indigo-500 to-indigo-600',  // Calendar Indigo
    CRM: 'from-accent-500 to-accent-600',         // NuLogic Pink/Magenta
    FLUENCE: 'from-navy-500 to-navy-600',         // NuLogic Navy
    FINANCE: 'from-teal-500 to-teal-600',         // Teal for Finance
    DOCS: 'from-primary-400 to-primary-500',      // Lighter Blue
    SETTINGS: 'from-surface-500 to-surface-600',  // Neutral Gray
  };
  return colors[code] || 'from-primary-500 to-primary-600';
};

export default function AppSwitcher({ currentAppCode = 'HRMS', onAppSwitch }: AppSwitcherProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [apps, setApps] = useState<UserAppAccess[]>(DEFAULT_APPS);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // static apps for now since platform service was removed
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAppClick = (app: UserAppAccess) => {
    if (app.applicationCode === currentAppCode) {
      setIsOpen(false);
      return;
    }

    if (onAppSwitch) {
      onAppSwitch(app.applicationCode, app.baseUrl);
    } else if (app.baseUrl) {
      router.push(app.baseUrl);
    }
    setIsOpen(false);
  };

  const currentApp = apps.find(a => a.applicationCode === currentAppCode) || {
    applicationCode: currentAppCode,
    applicationName: `NU-${currentAppCode}`
  };

  const CurrentIcon = getAppIcon(currentAppCode);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 border border-surface-200 dark:border-surface-700 transition-all duration-200 shadow-sm hover:shadow-md"
      >
        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${getAppColor(currentAppCode)} flex items-center justify-center shadow-sm`}>
          <CurrentIcon className="w-5 h-5 text-white" />
        </div>
        <div className="hidden sm:flex flex-col items-start">
          <span className="text-sm font-semibold text-surface-800 dark:text-surface-100">
            {currentApp.applicationName || `NU-${currentAppCode}`}
          </span>
          <span className="text-[10px] text-surface-500 dark:text-surface-400 -mt-0.5">
            NuLogic Platform
          </span>
        </div>
        <LayoutGrid className="w-4 h-4 text-surface-500 dark:text-surface-400" />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-surface-900 rounded-xl shadow-soft-lg border border-surface-200 dark:border-surface-700 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-primary-50 to-surface-100 dark:from-primary-900/20 dark:to-surface-800 border-b border-surface-200 dark:border-surface-700">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                  <LayoutGrid className="w-3.5 h-3.5 text-white" />
                </div>
                <p className="text-sm font-semibold text-primary-700 dark:text-primary-300">
                  NuLogic Platform
                </p>
              </div>
            </div>

            {/* App List */}
            <div className="p-2 max-h-80 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500" />
                </div>
              ) : apps.length === 0 ? (
                <div className="text-center py-8 text-surface-500">
                  <LayoutGrid className="w-10 h-10 mx-auto mb-2 text-surface-400" />
                  <p className="text-sm">No applications available</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {apps.map((app) => {
                    const Icon = getAppIcon(app.applicationCode);
                    const isActive = app.applicationCode === currentAppCode;

                    return (
                      <button
                        key={app.id}
                        onClick={() => handleAppClick(app)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${isActive
                          ? 'bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700 shadow-sm'
                          : 'hover:bg-surface-100 dark:hover:bg-surface-800 border border-transparent'
                          }`}
                      >
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${getAppColor(app.applicationCode)} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className={`font-semibold ${isActive ? 'text-primary-700 dark:text-primary-300' : 'text-surface-800 dark:text-surface-200'}`}>
                            {app.applicationName}
                          </p>
                          <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                            {app.roleCodes.length > 0
                              ? app.roleCodes.join(', ')
                              : 'No roles assigned'}
                          </p>
                        </div>
                        {isActive && (
                          <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {apps.length > 0 && (
              <div className="px-4 py-3 bg-surface-50 dark:bg-surface-800 border-t border-surface-200 dark:border-surface-700">
                <p className="text-xs text-surface-500 dark:text-surface-400 text-center">
                  {apps.length} app{apps.length !== 1 ? 's' : ''} available in your workspace
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
