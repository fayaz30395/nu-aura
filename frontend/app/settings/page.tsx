'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings as SettingsIcon,
  Bell,
  Shield,
  Moon,
  Sun,
  Mail,
  Lock,
  Eye,
  EyeOff,
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
import { useDarkMode } from '@/components/layout/DarkModeProvider';
import { authApi } from '@/lib/api/auth';
import { notificationsApi } from '@/lib/api/notifications';
import { NotificationPreferences } from '@/lib/types/notifications';

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, hasHydrated } = useAuth();
  const { isDark, toggleDarkMode } = useDarkMode();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // BUG-007 FIX: store timer ref to prevent setState on unmounted component
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
  }, []);
  const [activeNotificationTab, setActiveNotificationTab] = useState<'channels' | 'categories'>('channels');

  // Notification Channel Settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);

  // Notification Category Settings
  const [leaveNotifications, setLeaveNotifications] = useState(true);
  const [attendanceNotifications, setAttendanceNotifications] = useState(true);
  const [payrollNotifications, setPayrollNotifications] = useState(true);
  const [performanceNotifications, setPerformanceNotifications] = useState(true);
  const [announcementNotifications, setAnnouncementNotifications] = useState(true);
  const [birthdayNotifications, setBirthdayNotifications] = useState(true);
  const [anniversaryNotifications, setAnniversaryNotifications] = useState(true);
  const [systemAlertNotifications, setSystemAlertNotifications] = useState(true);

  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  // Password Change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  React.useEffect(() => {
    // Wait for hydration before checking authentication
    if (!hasHydrated) {
      return;
    }

    // Tokens are stored in httpOnly cookies — Zustand `isAuthenticated` is the
    // sole source of truth. Do NOT check localStorage for access/refresh tokens.
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, hasHydrated, router]);

  // Load notification preferences on mount
  React.useEffect(() => {
    if (!isAuthenticated || !hasHydrated) return;

    const loadPreferences = async () => {
      try {
        const prefs = await notificationsApi.getPreferences();
        // Channel settings
        setEmailNotifications(prefs.emailEnabled ?? prefs.emailNotifications ?? true);
        setPushNotifications(prefs.pushEnabled ?? prefs.pushNotifications ?? true);
        setSmsNotifications(prefs.smsEnabled ?? prefs.smsNotifications ?? false);
        // Category settings
        setLeaveNotifications(prefs.leaveNotifications ?? true);
        setAttendanceNotifications(prefs.attendanceNotifications ?? true);
        setPayrollNotifications(prefs.payrollNotifications ?? true);
        setPerformanceNotifications(prefs.performanceNotifications ?? true);
        setAnnouncementNotifications(prefs.announcementNotifications ?? true);
        setBirthdayNotifications(prefs.birthdayNotifications ?? true);
        setAnniversaryNotifications(prefs.anniversaryNotifications ?? true);
        setSystemAlertNotifications(prefs.systemAlertNotifications ?? true);
        setPreferencesLoaded(true);
      } catch (err) {
        console.error('Failed to load notification preferences:', err);
        setPreferencesLoaded(true);
      }
    };

    loadPreferences();
  }, [isAuthenticated, hasHydrated]);

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      await authApi.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      console.error('Failed to change password:', err);
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to change password');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotificationSave = async () => {
    try {
      setIsSavingNotifications(true);
      setError(null);

      await notificationsApi.updatePreferences({
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
      console.error('Failed to save notification preferences:', err);
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save preferences');
    } finally {
      setIsSavingNotifications(false);
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
    <div className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-700 last:border-b-0">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <Icon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </div>
        )}
        <div>
          <label className="text-sm font-medium text-slate-900 dark:text-slate-50">
            {label}
          </label>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            {description}
          </p>
        </div>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? 'bg-primary-600' : 'bg-surface-300 dark:bg-surface-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-surface-200 transition-transform ${
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
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Settings</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
            <Check className="h-5 w-5 text-green-600" />
            <p className="text-green-800 dark:text-green-200 font-medium">
              Settings updated successfully!
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-800 dark:text-red-200 font-medium">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Account Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Account Information
              </CardTitle>
              <CardDescription>Your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Email Address
                </label>
                <p className="text-slate-900 dark:text-slate-50 mt-1">{user?.email || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  User ID
                </label>
                <p className="text-slate-900 dark:text-slate-50 mt-1 font-mono text-sm">
                  {user?.id || 'N/A'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Appearance Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                Appearance
              </CardTitle>
              <CardDescription>Customize how the app looks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-slate-900 dark:text-slate-50">
                    Dark Mode
                  </label>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Switch between light and dark theme
                  </p>
                </div>
                <button
                  onClick={toggleDarkMode}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isDark ? 'bg-primary-600' : 'bg-surface-300 dark:bg-surface-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-surface-200 transition-transform ${
                      isDark ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Password Change */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>Update your password to keep your account secure</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Current Password
                  </label>
                  <div className="relative mt-1">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3 py-2 pr-10 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-surface-800 dark:text-surface-100"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    New Password
                  </label>
                  <div className="relative mt-1">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 pr-10 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-surface-800 dark:text-surface-100"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-surface-800 dark:text-surface-100"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handlePasswordChange}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Update Password
                    </>
                  )}
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Choose how and when you want to receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tabs */}
              <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setActiveNotificationTab('channels')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeNotificationTab === 'channels'
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Delivery Channels
                  </div>
                </button>
                <button
                  onClick={() => setActiveNotificationTab('categories')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeNotificationTab === 'categories'
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
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
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
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
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
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
              <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-slate-600 dark:text-slate-400">
                    {[emailNotifications, pushNotifications, smsNotifications].filter(Boolean).length} delivery channel(s) enabled,{' '}
                    {[leaveNotifications, attendanceNotifications, payrollNotifications, performanceNotifications,
                      announcementNotifications, birthdayNotifications, anniversaryNotifications, systemAlertNotifications
                    ].filter(Boolean).length} notification type(s) enabled
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={handleNotificationSave}
                  disabled={isSavingNotifications}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {isSavingNotifications ? (
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
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security
              </CardTitle>
              <CardDescription>Your account security information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                      <Shield className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-900 dark:text-green-100">
                        Account Secure
                      </p>
                      <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                        Your password meets security requirements
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  <p>
                    For additional security, we recommend:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
                    <li>Use a strong, unique password</li>
                    <li>Change your password regularly</li>
                    <li>Never share your password with anyone</li>
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
