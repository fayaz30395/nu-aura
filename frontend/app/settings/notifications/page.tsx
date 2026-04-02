'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/utils/logger';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Bell, Mail, MessageSquare, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '@/lib/hooks/queries/useNotifications';
import type { NotificationPreferences as NotificationPreferencesType } from '@/lib/types/core/notifications';

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
    label: 'Leave Requests',
    description: 'Notifications about leave applications and approvals',
    icon: <Bell className="h-5 w-5 text-accent-500" />,
    email: true,
    push: true,
    inApp: true,
  },
  {
    key: 'attendance',
    label: 'Attendance Alerts',
    description: 'Alerts for check-in reminders and missed punches',
    icon: <Bell className="h-5 w-5 text-success-500" />,
    email: true,
    push: false,
    inApp: true,
  },
  {
    key: 'approvals',
    label: 'Approval Workflows',
    description: 'Updates on pending approvals and workflow status',
    icon: <MessageSquare className="h-5 w-5 text-warning-500" />,
    email: true,
    push: true,
    inApp: true,
  },
  {
    key: 'announcements',
    label: 'Company Announcements',
    description: 'Organization-wide updates and news',
    icon: <Mail className="h-5 w-5 text-accent-700" />,
    email: true,
    push: false,
    inApp: true,
  },
];

export default function NotificationSettingsPage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreference[]>(preferenceCategories);
  const [saving, setSaving] = useState(false);

  // Fetch notification preferences from backend
  const { data: backendPreferences, isLoading } = useNotificationPreferences(
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
      p.key === key ? { ...p, [channel]: !p[channel] } : p
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
          <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
          <span className="ml-2 text-[var(--text-secondary)]">Loading preferences...</span>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground skeuo-emboss">Notification Settings</h1>
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
                <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                Saving preferences...
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
