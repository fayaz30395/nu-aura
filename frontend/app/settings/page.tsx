'use client';

import React, {useEffect, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import {logger} from '@/lib/utils/logger';
import {
  AlertCircle,
  AlertTriangle,
  Award,
  Bell,
  Calendar,
  Check,
  Clock,
  DollarSign,
  Gift,
  Globe,
  Heart,
  KeyRound,
  Mail,
  Megaphone,
  Moon,
  Save,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sun,
} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {PageTransition, Reveal, Stagger, StaggerItem} from '@/components/motion';
import {Button} from '@/components/ui/Button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {Badge} from '@/components/ui/Badge';
import {Switch} from '@/components/ui/Switch';
import {Tabs} from '@/components/ui/Tabs';
import {GoogleGLogo} from '@/components/ui/GoogleGLogo';
import {useAuth} from '@/lib/hooks/useAuth';
import {usePermissions} from '@/lib/hooks/usePermissions';
import {useDarkMode} from '@/components/layout/DarkModeProvider';
// authApi removed — Google SSO only, no password change endpoint needed
import {useNotificationPreferences, useUpdateNotificationPreferences} from '@/lib/hooks/queries/useNotifications';

/**
 * Section nav model for the Aura settings shell (sticky left rail). Each entry
 * is a real, data-backed section of the page; the prototype's mock-only
 * "Roles & permissions / Integrations / Billing" tabs are intentionally not
 * fabricated — we surface only what this production route actually owns.
 */
type SettingsSectionId = 'general' | 'authentication' | 'notifications' | 'security';

const SETTINGS_NAV: ReadonlyArray<{
  id: SettingsSectionId;
  label: string;
  icon: React.ElementType;
}> = [
  {id: 'general', label: 'General', icon: SlidersHorizontal},
  {id: 'authentication', label: 'Authentication', icon: ShieldCheck},
  {id: 'notifications', label: 'Notifications', icon: Bell},
  {id: 'security', label: 'Security', icon: Shield},
];

export default function SettingsPage() {
  const router = useRouter();
  const {user, isAuthenticated, hasHydrated} = useAuth();
  const {isAdmin} = usePermissions();
  const {isDark, toggleDarkMode} = useDarkMode();
  const [section, setSection] = useState<SettingsSectionId>('general');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);
  const [activeNotificationTab, setActiveNotificationTab] = useState<'channels' | 'categories'>('channels');

  // React Query hooks for notification preferences
  const {data: prefsData} = useNotificationPreferences(hasHydrated && isAuthenticated);
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
      router.replace('/auth/login');
    }
  }, [isAuthenticated, hasHydrated, router]);

  const handleNotificationSave = async () => {
    try {
      setError(null);

      await updatePrefsMutation.mutateAsync({
        emailEnabled: emailNotifications,
        pushEnabled: pushNotifications,
        smsEnabled: smsNotifications,
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

  // Aura toggle row — icon tile + label/description + Switch primitive.
  // Presentation only; the on/off contract is unchanged from the prior build.
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
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-[var(--border-soft)] last:border-b-0">
      <div className="flex items-center gap-3.5">
        {Icon && (
          <div
            className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[11px] border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-2)]">
            <Icon className="h-[18px] w-[18px]"/>
          </div>
        )}
        <div>
          <label className="text-sm font-semibold text-[var(--text-1)]">
            {label}
          </label>
          <p className="mt-0.5 text-[12.5px] leading-snug text-[var(--text-3)]">
            {description}
          </p>
        </div>
      </div>
      <Switch checked={enabled} onChange={onChange} label={label}/>
    </div>
  );

  return (
    <AppLayout activeMenuItem="settings" breadcrumbs={[{label: 'NU-HRMS'}, {label: 'Settings'}]}>
      <PageTransition className="space-y-6">
        {/* Page head */}
        <Reveal>
          <h1 className="text-aura-title">Settings</h1>
          <p className="mt-1 text-sm text-[var(--text-3)]">
            Workspace configuration and personal preferences
          </p>
        </Reveal>

        {/* Success Message */}
        {success && (
          <div
            className="flex items-center gap-2 rounded-[var(--r-md)] border border-[var(--ok-bd)] bg-[var(--ok-bg)] px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <Check className="h-5 w-5 text-[var(--ok-fg)]"/>
            <p className="text-sm font-medium text-[var(--ok-fg)]">
              Settings updated successfully!
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div
            className="flex items-center gap-2 rounded-[var(--r-md)] border border-[var(--err-bd)] bg-[var(--err-bg)] px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertCircle className="h-5 w-5 text-[var(--err-fg)]"/>
            <p className="text-sm font-medium text-[var(--err-fg)]">{error}</p>
          </div>
        )}

        {/* 2-col: sticky section nav + section body */}
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[212px_minmax(0,1fr)]">
          {/* Section nav */}
          <Reveal>
            <Card padding="sm" className="lg:sticky lg:top-4">
              <nav aria-label="Settings sections" className="flex flex-col gap-[2px]">
                {SETTINGS_NAV.map((s) => {
                  const Icon = s.icon;
                  const isActive = section === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => setSection(s.id)}
                      className={`flex items-center gap-2.5 rounded-[var(--r-control)] px-2.5 py-2.5 text-sm outline-none transition-colors duration-[var(--t-fast)] ease-[var(--ease)] focus-visible:shadow-[var(--sh-focus)] ${
                        isActive
                          ? 'bg-[var(--accent-soft)] font-semibold text-[var(--accent-text)]'
                          : 'font-medium text-[var(--text-2)] hover:bg-[var(--surface-hover)]'
                      }`}
                    >
                      <span className="grid h-[17px] w-[17px] shrink-0 place-items-center">
                        <Icon className={`h-[17px] w-[17px] ${isActive ? 'text-[var(--accent-text)]' : 'text-[var(--text-3)]'}`}/>
                      </span>
                      <span className="flex-1 text-left">{s.label}</span>
                    </button>
                  );
                })}
              </nav>
            </Card>
          </Reveal>

          {/* Section body */}
          <div className="min-w-0">
            {section === 'general' && (
              <Stagger className="space-y-5">
                {/* Account Information */}
                <StaggerItem>
                  <Card className="skeuo-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-[var(--text-2)]"/>
                        Account Information
                      </CardTitle>
                      <CardDescription>Your account details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">
                          Email Address
                        </label>
                        <p className="mt-1 text-sm text-[var(--text-1)]">{user?.email || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">
                          User ID
                        </label>
                        <p className="num mt-1 text-sm text-[var(--text-1)]">
                          {user?.id || 'N/A'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </StaggerItem>

                {/* Appearance */}
                <StaggerItem>
                  <Card className="skeuo-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {isDark ? <Moon className="h-5 w-5 text-[var(--text-2)]"/> : <Sun className="h-5 w-5 text-[var(--text-2)]"/>}
                        Appearance
                      </CardTitle>
                      <CardDescription>Customize how the app looks</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <label className="text-sm font-semibold text-[var(--text-1)]">
                            Dark Mode
                          </label>
                          <p className="mt-0.5 text-[12.5px] text-[var(--text-3)]">
                            Switch between light and dark theme
                          </p>
                        </div>
                        <Switch checked={isDark} onChange={toggleDarkMode} label="Dark mode"/>
                      </div>
                    </CardContent>
                  </Card>
                </StaggerItem>
              </Stagger>
            )}

            {section === 'authentication' && (
              <Stagger className="space-y-5">
                {/* Authentication — Google SSO */}
                <StaggerItem>
                  <Card className="skeuo-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-[var(--text-2)]"/>
                        Authentication
                      </CardTitle>
                      <CardDescription>Your account authentication method</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div
                        className="flex flex-wrap items-center gap-4 rounded-[var(--r-lg)] border border-[var(--border-soft)] bg-[var(--surface-2)] p-4 skeuo-surface">
                        <div
                          className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--r-control)] bg-[var(--surface)] shadow-[var(--sh-xs)]">
                          <GoogleGLogo className="h-6 w-6"/>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[var(--text-1)]">Google SSO (Single Sign-On)</p>
                          <p className="mt-0.5 text-[12.5px] leading-snug text-[var(--text-3)]">
                            Your account is authenticated via Google Workspace for your organisation&apos;s domain.
                            Password management is handled through your Google account.
                          </p>
                        </div>
                        <Button
                          asChild
                          variant="secondary"
                          size="sm"
                        >
                          <a
                            href="https://myaccount.google.com/security"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Manage Google Account
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </StaggerItem>

                {/* SAML SSO Configuration — admin only */}
                {isAdmin && (
                  <StaggerItem>
                    <Card className="skeuo-card">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Shield className="h-5 w-5 text-[var(--text-2)]"/>
                          SAML SSO Configuration
                        </CardTitle>
                        <CardDescription>Configure enterprise SAML 2.0 Single Sign-On</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div
                          className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--r-lg)] border border-[var(--border-soft)] bg-[var(--surface-2)] p-4 skeuo-surface">
                          <div className="flex items-center gap-4">
                            <div className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[var(--r-control)] bg-[var(--accent-soft)]">
                              <Globe className="h-5 w-5 text-[var(--accent-text)]"/>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-[var(--text-1)]">SAML 2.0 Identity Provider</p>
                              <p className="mt-0.5 text-[12.5px] leading-snug text-[var(--text-3)]">
                                Connect Okta, Azure AD, OneLogin, or any SAML 2.0 compatible IdP for enterprise SSO
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="primary"
                            size="sm"
                            leftIcon={<KeyRound className="h-4 w-4"/>}
                            onClick={() => router.push('/settings/sso')}
                          >
                            Configure SSO
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </StaggerItem>
                )}
              </Stagger>
            )}

            {section === 'notifications' && (
              <Reveal>
                <Card className="skeuo-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5 text-[var(--text-2)]"/>
                      Notification Preferences
                    </CardTitle>
                    <CardDescription>Choose how and when you want to receive notifications</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Tabs */}
                    <Tabs
                      aria-label="Notification preference groups"
                      value={activeNotificationTab}
                      onChange={setActiveNotificationTab}
                      tabs={[
                        {id: 'channels', label: 'Delivery Channels', icon: <Globe className="h-[15px] w-[15px]"/>},
                        {id: 'categories', label: 'Notification Types', icon: <Bell className="h-[15px] w-[15px]"/>},
                      ]}
                    />

                    {/* Channel Settings */}
                    {activeNotificationTab === 'channels' && (
                      <div className="space-y-0.5 pt-1">
                        <p className="mb-2 text-[12.5px] text-[var(--text-3)]">
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
                      <div className="space-y-0.5 pt-1">
                        <p className="mb-2 text-[12.5px] text-[var(--text-3)]">
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
                    <div className="rounded-[var(--r-md)] bg-[var(--surface-2)] px-4 py-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 shrink-0 text-[var(--ok-fg)]"/>
                        <span className="text-[var(--text-2)]">
                          <span className="num">{[emailNotifications, pushNotifications, smsNotifications].filter(Boolean).length}</span> delivery channel(s) enabled,{' '}
                          <span className="num">{[leaveNotifications, attendanceNotifications, payrollNotifications, performanceNotifications,
                            announcementNotifications, birthdayNotifications, anniversaryNotifications, systemAlertNotifications
                          ].filter(Boolean).length}</span> notification type(s) enabled
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-end border-t border-[var(--border-soft)] pt-4">
                      <Button
                        variant="primary"
                        onClick={handleNotificationSave}
                        isLoading={updatePrefsMutation.isPending}
                        loadingText="Saving..."
                        leftIcon={<Save className="h-4 w-4"/>}
                      >
                        Save Preferences
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Reveal>
            )}

            {section === 'security' && (
              <Reveal>
                <Card className="skeuo-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-[var(--text-2)]"/>
                      Security
                    </CardTitle>
                    <CardDescription>Your account security information</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div
                        className="flex items-center justify-between gap-4 rounded-[var(--r-lg)] border border-[var(--ok-bd)] bg-[var(--ok-bg)] p-4">
                        <div className="flex items-center gap-4">
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--surface)] shadow-[var(--sh-xs)]">
                            <Shield className="h-5 w-5 text-[var(--ok-fg)]"/>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[var(--ok-fg)]">
                              Account Secure
                            </p>
                            <p className="mt-0.5 text-xs text-[var(--ok-fg)]">
                              Your account is protected via Google SSO
                            </p>
                          </div>
                        </div>
                        <Badge variant="success" dot dotColor="success" className="hidden sm:inline-flex">Protected</Badge>
                      </div>
                      <div className="text-sm text-[var(--text-2)]">
                        <p>
                          For additional security, we recommend:
                        </p>
                        <ul className="ml-2 mt-2 list-inside list-disc space-y-1 text-[var(--text-3)]">
                          <li>Enable 2-Step Verification on your Google account</li>
                          <li>Review your Google account security settings regularly</li>
                          <li>Never share your login credentials with anyone</li>
                          <li>Log out when using shared devices</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Reveal>
            )}
          </div>
        </div>
      </PageTransition>
    </AppLayout>
  );
}
