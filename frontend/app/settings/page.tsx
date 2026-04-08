'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/utils/logger';
import {

  Bell,
  Shield,
  Moon,
  Sun,
  Mail,
  Save,
  Check,
  AlertCircle,
  Calendar,
  Clock,
  DollarSign,
  Award,
  Megaphone,
  Gift,
  Heart,
  AlertTriangle,
  Smartphone,
  Globe,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useDarkMode } from '@/components/layout/DarkModeProvider';
// authApi removed — Google SSO only, no password change endpoint needed
import { useNotificationPreferences, useUpdateNotificationPreferences } from '@/lib/hooks/queries/useNotifications';


export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, hasHydrated } = useAuth();
  const { isAdmin } = usePermissions();
  const { isDark, toggleDarkMode } = useDarkMode();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
  }, []);
  const [activeNotificationTab, setActiveNotificationTab] = useState<'channels' | 'categories'>('channels');

  // React Query hooks for notification preferences
  const { data: prefsData } = useNotificationPreferences(hasHydrated && isAuthenticated);
  const updatePrefsMutation = useUpdateNotificationPreferences();

  // Local state for notification toggles (initialized from React Query data)
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [leaveNotifications, setLeaveNotifications] = useState(true);
  const [attendanceNotifications, setAttendanceNotifications] = useState(true);
  const [payrollNotifications, setPayrollNotifications] = useState(true);
  const [performanceNotifications, setPerformanceNotifications] = useState(true);
  const [announcementNotifications, setAnnouncementNotifications] = useState(true);
  const [birthdayNotifications, setBirthdayNotifications] = useState(true);
  const [anniversaryNotifications, setAnniversaryNotifications] = useState(true);
  const [systemAlertNotifications, setSystemAlertNotifications] = useState(true);

  // Sync React Query data to local state when preferences load
  React.useEffect(() => {
    if (prefsData) {
      setEmailNotifications(prefsData.emailEnabled ?? true);
      setPushNotifications(prefsData.pushEnabled ?? true);
      setSmsNotifications(prefsData.smsEnabled ?? false);
      setLeaveNotifications(prefsData.leaveNotifications ?? true);
      setAttendanceNotifications(prefsData.attendanceNotifications ?? true);
      setPayrollNotifications(prefsData.payrollNotifications ?? true);
      setPerformanceNotifications(prefsData.performanceNotifications ?? true);
      setAnnouncementNotifications(prefsData.announcementNotifications ?? true);
      setBirthdayNotifications(prefsData.birthdayNotifications ?? true);
      setAnniversaryNotifications(prefsData.anniversaryNotifications ?? true);
      setSystemAlertNotifications(prefsData.systemAlertNotifications ?? true);
    }
  }, [prefsData]);

  // Password Change removed — Google SSO handles auth for @nulogic.io domain

  React.useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, hasHydrated, router]);

  const handleNotificationSave = async () => {
    try {
      setError(null);

      await updatePrefsMutation.mutateAsync({
        emailEnabled: emailNotifications,
        emailNotifications,
        pushEnabled: pushNotifications,
        pushNotifications,
        smsEnabled: smsNotifications,
        smsNotifications,
        leaveNotifications,
        attendanceNotifications,
        payrollNotifications,
        performanceNotifications,
        announcementNotifications,
        birthdayNotifications,
        anniversaryNotifications,
        systemAlertNotifications,
      });

      setSuccess(true);
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      logger.error('Failed to save notification preferences:', err);
      const message = err instanceof Error
        ? (err as Error & { response?: { data?: { message?: string } } }).response?.data?.message ?? err.message
        : 'Failed to save preferences';
      setError(message);
    }
  };

  // Toggle switch component for reuse
  const ToggleSwitch = ({
    enabled,
    onChange,
    label,
    description,
    icon: Icon
  }: {
    enabled: boolean;
    onChange: (v: boolean) => void;
    label: string;
    description: string;
    icon?: React.ElementType;
  }) => (
    <div className="row-between py-4 border-b border-[var(--border-main)] last:border-b-0">
      <div className="flex items-center gap-4">
        {Icon && (
          <div className="p-2 bg-[var(--bg-surface)] rounded-lg">
            <Icon className="h-4 w-4 text-[var(--text-secondary)]" />
          </div>
        )}
        <div>
          <label className="text-sm font-medium text-[var(--text-primary)]">
            {label}
          </label>
          <p className="text-body-secondary mt-0.5">
            {description}
          </p>
        </div>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
          enabled ? 'bg-accent-700' : 'bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)]600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-[var(--bg-surface)] transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  return (
    <AppLayout activeMenuItem="settings">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold skeuo-emboss">Settings</h1>
          <p className="text-[var(--text-secondary)] mt-1 skeuo-deboss">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="flex items-center gap-2 p-4 bg-success-50 dark:bg-success-950/20 border border-success-200 dark:border-success-800 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
            <Check className="h-5 w-5 text-success-600" />
            <p className="text-success-800 dark:text-success-200 font-medium">
              Settings updated successfully!
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-danger-50 dark:bg-danger-950/20 border border-danger-200 dark:border-danger-800 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertCircle className="h-5 w-5 text-danger-600" />
            <p className="text-danger-800 dark:text-danger-200 font-medium">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Account Settings */}
          <Card className="skeuo-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 skeuo-emboss">
                <Mail className="h-5 w-5" />
                Account Information
              </CardTitle>
              <CardDescription>Your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">
                  Email Address
                </label>
                <p className="text-[var(--text-primary)] mt-1">{user?.email || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">
                  User ID
                </label>
                <p className="text-[var(--text-primary)] mt-1 font-mono text-sm">
                  {user?.id || 'N/A'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Appearance Settings */}
          <Card className="skeuo-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 skeuo-emboss">
                {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                Appearance
              </CardTitle>
              <CardDescription>Customize how the app looks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="row-between">
                <div>
                  <label className="text-sm font-medium text-[var(--text-primary)]">
                    Dark Mode
                  </label>
                  <p className="text-body-secondary mt-1">
                    Switch between light and dark theme
                  </p>
                </div>
                <button
                  onClick={toggleDarkMode}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                    isDark ? 'bg-accent-700' : 'bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)]600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-[var(--bg-surface)] transition-transform ${
                      isDark ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Authentication Info — Google SSO */}
          <Card className="lg:col-span-2 skeuo-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 skeuo-emboss">
                <Shield className="h-5 w-5" />
                Authentication
              </CardTitle>
              <CardDescription>Your account authentication method</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] skeuo-surface">
                <div className="h-10 w-10 rounded-lg bg-[var(--bg-card)] flex items-center justify-center shadow-[var(--shadow-card)]">
                  <svg viewBox="0 0 24 24" width="24" height="24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[var(--text-primary)]">Google SSO (Single Sign-On)</p>
                  <p className="text-body-muted">
                    Your account is authenticated via Google Workspace for your organisation&apos;s domain.
                    Password management is handled through your Google account.
                  </p>
                </div>
                <a
                  href="https://myaccount.google.com/security"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--bg-card)] border border-[var(--border-main)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-colors"
                >
                  Manage Google Account
                </a>
              </div>
            </CardContent>
          </Card>

          {/* SAML SSO Configuration — admin only */}
          {isAdmin && <Card className="lg:col-span-2 skeuo-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 skeuo-emboss">
                <Shield className="h-5 w-5" />
                SAML SSO Configuration
              </CardTitle>
              <CardDescription>Configure enterprise SAML 2.0 Single Sign-On</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="row-between p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] skeuo-surface">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-accent-100 dark:bg-accent-900/30 rounded-lg">
                    <Globe className="h-5 w-5 text-accent-700 dark:text-accent-400" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">SAML 2.0 Identity Provider</p>
                    <p className="text-body-muted mt-0.5">
                      Connect Okta, Azure AD, OneLogin, or any SAML 2.0 compatible IdP for enterprise SSO
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => router.push('/settings/sso')}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-accent-700 text-white hover:bg-accent-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                >
                  Configure SSO
                </button>
              </div>
            </CardContent>
          </Card>}

          {/* Notification Preferences */}
          <Card className="lg:col-span-2 skeuo-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 skeuo-emboss">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Choose how and when you want to receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tabs */}
              <div className="flex gap-2 border-b border-[var(--border-main)]">
                <button
                  onClick={() => setActiveNotificationTab('channels')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                    activeNotificationTab === 'channels'
                      ? 'border-accent-700 text-accent-700'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Delivery Channels
                  </div>
                </button>
                <button
                  onClick={() => setActiveNotificationTab('categories')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                    activeNotificationTab === 'categories'
                      ? 'border-accent-700 text-accent-700'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Notification Types
                  </div>
                </button>
              </div>

              {/* Channel Settings */}
              {activeNotificationTab === 'channels' && (
                <div className="space-y-1 pt-2">
                  <p className="text-body-muted mb-4">
                    Choose how you want to receive notifications
                  </p>
                  <ToggleSwitch
                    enabled={emailNotifications}
                    onChange={setEmailNotifications}
                    label="Email Notifications"
                    description="Receive email updates about important events"
                    icon={Mail}
                  />
                  <ToggleSwitch
                    enabled={pushNotifications}
                    onChange={setPushNotifications}
                    label="Push Notifications"
                    description="Receive push notifications in your browser"
                    icon={Globe}
                  />
                  <ToggleSwitch
                    enabled={smsNotifications}
                    onChange={setSmsNotifications}
                    label="SMS Notifications"
                    description="Receive SMS alerts for urgent updates"
                    icon={Smartphone}
                  />
                </div>
              )}

              {/* Category Settings */}
              {activeNotificationTab === 'categories' && (
                <div className="space-y-1 pt-2">
                  <p className="text-body-muted mb-4">
                    Choose which types of notifications you want to receive
                  </p>
                  <ToggleSwitch
                    enabled={leaveNotifications}
                    onChange={setLeaveNotifications}
                    label="Leave Notifications"
                    description="Leave requests, approvals, and rejections"
                    icon={Calendar}
                  />
                  <ToggleSwitch
                    enabled={attendanceNotifications}
                    onChange={setAttendanceNotifications}
                    label="Attendance Notifications"
                    description="Check-in/out reminders and alerts"
                    icon={Clock}
                  />
                  <ToggleSwitch
                    enabled={payrollNotifications}
                    onChange={setPayrollNotifications}
                    label="Payroll Notifications"
                    description="Salary processing and payment updates"
                    icon={DollarSign}
                  />
                  <ToggleSwitch
                    enabled={performanceNotifications}
                    onChange={setPerformanceNotifications}
                    label="Performance Notifications"
                    description="Reviews, goals, and feedback"
                    icon={Award}
                  />
                  <ToggleSwitch
                    enabled={announcementNotifications}
                    onChange={setAnnouncementNotifications}
                    label="Announcements"
                    description="Company-wide announcements and news"
                    icon={Megaphone}
                  />
                  <ToggleSwitch
                    enabled={birthdayNotifications}
                    onChange={setBirthdayNotifications}
                    label="Birthday Notifications"
                    description="Colleague birthday reminders"
                    icon={Gift}
                  />
                  <ToggleSwitch
                    enabled={anniversaryNotifications}
                    onChange={setAnniversaryNotifications}
                    label="Work Anniversary Notifications"
                    description="Work anniversary celebrations"
                    icon={Heart}
                  />
                  <ToggleSwitch
                    enabled={systemAlertNotifications}
                    onChange={setSystemAlertNotifications}
                    label="System Alerts"
                    description="Security and system-related alerts"
                    icon={AlertTriangle}
                  />
                </div>
              )}

              {/* Summary */}
              <div className="mt-4 p-4 bg-[var(--bg-surface)] rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-success-600" />
                  <span className="text-[var(--text-secondary)]">
                    {[emailNotifications, pushNotifications, smsNotifications].filter(Boolean).length} delivery channel(s) enabled,{' '}
                    {[leaveNotifications, attendanceNotifications, payrollNotifications, performanceNotifications,
                      announcementNotifications, birthdayNotifications, anniversaryNotifications, systemAlertNotifications
                    ].filter(Boolean).length} notification type(s) enabled
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-[var(--border-main)]">
                <button
                  onClick={handleNotificationSave}
                  disabled={updatePrefsMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-accent-700 text-white rounded-lg hover:bg-accent-800 transition-colors disabled:opacity-50 skeuo-button cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                >
                  {updatePrefsMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Preferences
                    </>
                  )}
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Security Information */}
          <Card className="lg:col-span-2 skeuo-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 skeuo-emboss">
                <Shield className="h-5 w-5" />
                Security
              </CardTitle>
              <CardDescription>Your account security information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="row-between p-4 bg-success-50 dark:bg-success-950/20 border border-success-200 dark:border-success-800 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-success-100 dark:bg-success-900/30 rounded-full">
                      <Shield className="h-5 w-5 text-success-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-success-900 dark:text-success-100">
                        Account Secure
                      </p>
                      <p className="text-xs text-success-700 dark:text-success-300 mt-1">
                        Your account is protected via Google SSO
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-body-secondary">
                  <p>
                    For additional security, we recommend:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
                    <li>Enable 2-Step Verification on your Google account</li>
                    <li>Review your Google account security settings regularly</li>
                    <li>Never share your login credentials with anyone</li>
                    <li>Log out when using shared devices</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
