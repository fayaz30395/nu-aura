'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Bell, Mail, MessageSquare, Smartphone } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';

interface NotificationPreference {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  email: boolean;
  push: boolean;
  inApp: boolean;
}

const defaultPreferences: NotificationPreference[] = [
  {
    key: 'leave',
    label: 'Leave Requests',
    description: 'Notifications about leave applications and approvals',
    icon: <Bell className="h-5 w-5 text-blue-500" />,
    email: true,
    push: true,
    inApp: true,
  },
  {
    key: 'attendance',
    label: 'Attendance Alerts',
    description: 'Alerts for check-in reminders and missed punches',
    icon: <Bell className="h-5 w-5 text-green-500" />,
    email: true,
    push: false,
    inApp: true,
  },
  {
    key: 'approvals',
    label: 'Approval Workflows',
    description: 'Updates on pending approvals and workflow status',
    icon: <MessageSquare className="h-5 w-5 text-orange-500" />,
    email: true,
    push: true,
    inApp: true,
  },
  {
    key: 'announcements',
    label: 'Company Announcements',
    description: 'Organization-wide updates and news',
    icon: <Mail className="h-5 w-5 text-purple-500" />,
    email: true,
    push: false,
    inApp: true,
  },
];

export default function NotificationSettingsPage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreference[]>(defaultPreferences);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, hasHydrated, router]);

  const togglePreference = (key: string, channel: 'email' | 'push' | 'inApp') => {
    setPreferences(prev =>
      prev.map(p =>
        p.key === key ? { ...p, [channel]: !p[channel] } : p
      )
    );
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notification Settings</h1>
          <p className="text-muted-foreground mt-1">
            Choose how and when you want to be notified
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>
              Configure notification channels for different event types
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {/* Header */}
              <div className="grid grid-cols-12 gap-4 pb-3 border-b text-sm font-medium text-muted-foreground">
                <div className="col-span-6">Category</div>
                <div className="col-span-2 text-center">Email</div>
                <div className="col-span-2 text-center">Push</div>
                <div className="col-span-2 text-center">In-App</div>
              </div>

              {/* Preference rows */}
              {preferences.map(pref => (
                <div key={pref.key} className="grid grid-cols-12 gap-4 py-4 border-b last:border-b-0 items-center">
                  <div className="col-span-6 flex items-start gap-3">
                    {pref.icon}
                    <div>
                      <p className="font-medium text-foreground">{pref.label}</p>
                      <p className="text-sm text-muted-foreground">{pref.description}</p>
                    </div>
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <button
                      onClick={() => togglePreference(pref.key, 'email')}
                      className={`w-10 h-6 rounded-full transition-colors ${pref.email ? 'bg-primary' : 'bg-gray-300'} relative`}
                    >
                      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${pref.email ? 'left-5' : 'left-1'}`} />
                    </button>
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <button
                      onClick={() => togglePreference(pref.key, 'push')}
                      className={`w-10 h-6 rounded-full transition-colors ${pref.push ? 'bg-primary' : 'bg-gray-300'} relative`}
                    >
                      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${pref.push ? 'left-5' : 'left-1'}`} />
                    </button>
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <button
                      onClick={() => togglePreference(pref.key, 'inApp')}
                      className={`w-10 h-6 rounded-full transition-colors ${pref.inApp ? 'bg-primary' : 'bg-gray-300'} relative`}
                    >
                      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${pref.inApp ? 'left-5' : 'left-1'}`} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Note: Notification preferences are saved locally. Backend integration for persistent preferences is coming soon.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
