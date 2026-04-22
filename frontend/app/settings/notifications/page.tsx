'use client';

import React, {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {logger} from '@/lib/utils/logger';
import {AppLayout} from '@/components/layout';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {Bell, BookOpen, DollarSign, Gift, Loader2, Mail, MessageSquare, UserPlus} from 'lucide-react';
import {useAuth} from '@/lib/hooks/useAuth';
import {useNotificationPreferences, useUpdateNotificationPreferences} from '@/lib/hooks/queries/useNotifications';
import type {NotificationPreferences as NotificationPreferencesType} from '@/lib/types/core/notifications';

interface NotificationPreference {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  email: boolean;
  push: boolean;
  inApp: boolean;
}

const preferenceCategories: NotificationPreference[] = [
  {
    key: 'leave',
    label: 'Leave & Attendance',
    description: 'Leave applications, approvals, check-in reminders, and missed punches',
    icon: <Bell className='h-5 w-5 text-accent'/>,
    email: true,
    push: true,
    inApp: true,
  },
  {
    key: 'approvals',
    label: 'Approvals & Workflows',
    description: 'Pending approvals, escalations, and workflow status updates',
    icon: <MessageSquare className='h-5 w-5 text-status-warning-text'/>,
    email: true,
    push: true,
    inApp: true,
  },
  {
    key: 'payroll',
    label: 'Payroll & Expenses',
    description: 'Payslip availability, salary credits, and expense approvals',
    icon: <DollarSign className='h-5 w-5 text-status-success-text'/>,
    email: true,
    push: false,
    inApp: true,
  },
  {
    key: 'performance',
    label: 'Performance & Training',
    description: 'Review cycles, goal updates, training assignments, and feedback',
    icon: <BookOpen className='h-5 w-5 text-accent'/>,
    email: true,
    push: false,
    inApp: true,
  },
  {
    key: 'recruitment',
    label: 'Recruitment & Onboarding',
    description: 'Application updates, interview schedules, and onboarding tasks',
    icon: <UserPlus className='h-5 w-5 text-accent'/>,
    email: true,
    push: false,
    inApp: true,
  },
  {
    key: 'celebrations',
    label: 'Celebrations',
    description: 'Birthdays, work anniversaries, and team milestones',
    icon: <Gift className='h-5 w-5 text-accent'/>,
    email: false,
    push: false,
    inApp: true,
  },
  {
    key: 'announcements',
    label: 'System & Announcements',
    description: 'Organization-wide updates, policy changes, and system alerts',
    icon: <Mail className='h-5 w-5 text-accent'/>,
    email: true,
    push: false,
    inApp: true,
  },
];

export default function NotificationSettingsPage() {
  const router = useRouter();
  const {isAuthenticated, hasHydrated} = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreference[]>(preferenceCategories);
  const [saving, setSaving] = useState(false);

  // Fetch notification preferences from backend
  const {data: backendPreferences, isLoading} = useNotificationPreferences(
    isAuthenticated && hasHydrated
  );

  const updatePreferencesMutation = useUpdateNotificationPreferences();

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, hasHydrated, router]);

  // Update local state when backend preferences are loaded
  useEffect(() => {
    if (backendPreferences) {
      const updatedPreferences = preferenceCategories.map((pref) => {
        const prefs = backendPreferences as unknown as Record<string, boolean>;
        return {
          ...pref,
          email: prefs[`${pref.key}_email`] ?? (pref.key === 'leave' || pref.key === 'approvals' ? backendPreferences.emailEnabled : pref.email),
          push: prefs[`${pref.key}_push`] ?? (pref.key === 'leave' || pref.key === 'approvals' ? backendPreferences.pushEnabled : pref.push),
          inApp: prefs[`${pref.key}_inApp`] ?? true,
        };
      });
      setPreferences(updatedPreferences);
    }
  }, [backendPreferences]);

  const togglePreference = async (key: string, channel: 'email' | 'push' | 'inApp') => {
    const updatedPreferences = preferences.map((p) =>
      p.key === key ? {...p, [channel]: !p[channel]} : p
    );
    setPreferences(updatedPreferences);

    // Save to backend
    setSaving(true);
    try {
      const prefsToSave: Partial<NotificationPreferencesType> = {};
      updatedPreferences.forEach((pref) => {
        const typeKey = `${pref.key}Notifications` as keyof NotificationPreferencesType;
        (prefsToSave as Record<string, unknown>)[typeKey] = pref.email || pref.push || pref.inApp;
      });
      await updatePreferencesMutation.mutateAsync(prefsToSave);
    } catch (error) {
      logger.error('Error saving preferences:', error);
      // Revert on error
      setPreferences(preferences);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className='h-8 w-8 animate-spin text-accent'/>
          <span className="ml-2 text-[var(--text-secondary)]">Loading preferences...</span>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground skeuo-emboss">Notification Settings</h1>
          <p className="text-muted-foreground mt-1 skeuo-deboss">
            Choose how and when you want to be notified
          </p>
        </div>

        <Card className="skeuo-card">
          <CardHeader>
            <CardTitle className="skeuo-emboss">Notification Preferences</CardTitle>
            <CardDescription>
              Configure notification channels for different event types
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {/* Header */}
              <div className="grid grid-cols-12 gap-4 pb-4 border-b text-sm font-medium text-muted-foreground">
                <div className="col-span-6">Category</div>
                <div className="col-span-2 text-center">Email</div>
                <div className="col-span-2 text-center">Push</div>
                <div className="col-span-2 text-center">In-App</div>
              </div>

              {/* Preference rows */}
              {preferences.map((pref) => (
                <div
                  key={pref.key}
                  className="grid grid-cols-12 gap-4 py-4 border-b last:border-b-0 items-center"
                >
                  <div className="col-span-6 flex items-start gap-4">
                    {pref.icon}
                    <div>
                      <p className="font-medium text-foreground">{pref.label}</p>
                      <p className="text-sm text-muted-foreground">{pref.description}</p>
                    </div>
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <button
                      onClick={() => togglePreference(pref.key, 'email')}
                      disabled={saving}
                      className={`w-10 h-6 rounded-full transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                        pref.email ? 'bg-accent-700' : 'bg-[var(--border-main)]'
                      } relative disabled:opacity-50`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-[var(--bg-card)] transition-transform ${
                          pref.email ? 'left-5' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <button
                      onClick={() => togglePreference(pref.key, 'push')}
                      disabled={saving}
                      className={`w-10 h-6 rounded-full transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                        pref.push ? 'bg-accent-700' : 'bg-[var(--border-main)]'
                      } relative disabled:opacity-50`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-[var(--bg-card)] transition-transform ${
                          pref.push ? 'left-5' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <button
                      onClick={() => togglePreference(pref.key, 'inApp')}
                      disabled={saving}
                      className={`w-10 h-6 rounded-full transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                        pref.inApp ? 'bg-accent-700' : 'bg-[var(--border-main)]'
                      } relative disabled:opacity-50`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-[var(--bg-card)] transition-transform ${
                          pref.inApp ? 'left-5' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {saving && (
              <p className="text-xs text-muted-foreground mt-4">
                <Loader2 className="h-3 w-3 animate-spin inline mr-1"/>
                Saving preferences...
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
