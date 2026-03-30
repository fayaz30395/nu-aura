'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/lib/hooks/useAuth';
import { saveGoogleToken, GOOGLE_SSO_SCOPES } from '@/lib/utils/googleToken';
import { MfaVerification } from '@/components/auth/MfaVerification';
import {
  AlertCircle,
  Shield,
  Zap,
  Globe,
  ArrowRight,
  Users,
  ChevronDown,
  ChevronUp,
  LogIn,
} from 'lucide-react';
import { createLogger } from '@/lib/utils/logger';

const IS_DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

interface DemoAccount {
  name: string;
  email: string;
  role: string;
  department: string;
  level: string;
  color: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  { name: 'Fayaz M', email: 'fayaz.m@nulogic.io', role: 'SUPER_ADMIN', department: 'Executive', level: 'CEO', color: 'from-danger-500 to-rose-600' },
  { name: 'Sumit Kumar', email: 'sumit@nulogic.io', role: 'MANAGER', department: 'Engineering', level: 'Manager', color: 'from-accent-500 to-accent-600' },
  { name: 'Mani S', email: 'mani@nulogic.io', role: 'TEAM_LEAD', department: 'Engineering', level: 'Team Lead', color: 'from-accent-500 to-accent-600' },
  { name: 'Gokul R', email: 'gokul@nulogic.io', role: 'TEAM_LEAD', department: 'Engineering', level: 'Lead', color: 'from-accent-500 to-accent-600' },
  { name: 'Saran V', email: 'saran@nulogic.io', role: 'EMPLOYEE', department: 'Engineering', level: 'Employee', color: 'from-accent-600 to-accent-700' },
  { name: 'Jagadeesh N', email: 'jagadeesh@nulogic.io', role: 'HR_MANAGER', department: 'HR', level: 'HR Manager', color: 'from-accent-700 to-accent-800' },
  { name: 'Suresh M', email: 'suresh@nulogic.io', role: 'RECRUITMENT_ADMIN', department: 'Recruitment', level: 'Lead', color: 'from-accent-500 to-accent-600' },
  { name: 'Dhanush A', email: 'dhanush@nulogic.io', role: 'TEAM_LEAD', department: 'HR', level: 'HR Lead', color: 'from-accent-600 to-accent-700' },
];

// SEC-007: Demo password only used when NEXT_PUBLIC_DEMO_MODE=true (never in production)
const DEMO_PASSWORD = IS_DEMO_MODE ? 'Welcome@123' : '';

const log = createLogger('LoginPage');

/**
 * Validates a returnUrl to prevent open redirect attacks (SEC-F03).
 * Only allows relative paths starting with '/'. Rejects:
 * - Absolute URLs (https://evil.com)
 * - Protocol-relative URLs (//evil.com)
 * - javascript: URLs
 * - Data URLs
 * - Any URL containing backslashes (bypass via \evil.com)
 */
function sanitizeReturnUrl(url: string | null): string {
  const fallback = '/me/dashboard';
  if (!url) return fallback;
  const trimmed = url.trim();
  // Must start with exactly one forward slash (not //)
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return fallback;
  // Reject protocol schemes and backslash tricks
  if (/[:\\]/.test(trimmed.split('/')[1] || '')) return fallback;
  // Only allow path characters (letters, numbers, hyphens, slashes, dots, underscores, query, hash)
  if (!/^\/[\w\-./~?#&=%@]*$/.test(trimmed)) return fallback;
  return trimmed;
}

// Configurable via env — falls back to 'nulogic.io' for local dev.
// Set NEXT_PUBLIC_SSO_ALLOWED_DOMAIN in .env.production for each tenant deployment.
const ALLOWED_DOMAIN = process.env.NEXT_PUBLIC_SSO_ALLOWED_DOMAIN || 'nulogic.io';

// ─── CSS-only Ambient Background (theme-aware) ─────────────────────
function AnimatedBackground() {
  return (
    <div className="fixed inset-0" style={{ zIndex: 0 }}>
      {/* Base */}
      <div className="absolute inset-0 bg-[var(--bg-main)]" />
      {/* Light-mode: elegant blue gradient mesh */}
      <div className="absolute inset-0 dark:opacity-0 opacity-100 transition-opacity duration-500">
        <div className="absolute top-[-15%] left-[-8%] w-[700px] h-[700px] rounded-full blur-[140px]" style={{ background: 'rgba(58, 95, 217, 0.10)' }} />
        <div className="absolute bottom-[-15%] right-[-10%] w-[550px] h-[550px] rounded-full blur-[120px]" style={{ background: 'rgba(112, 146, 255, 0.08)' }} />
        <div className="absolute top-[35%] right-[15%] w-[350px] h-[350px] rounded-full blur-[90px]" style={{ background: 'rgba(42, 72, 179, 0.06)' }} />
      </div>
      {/* Dark-mode: deep navy mesh with subtle grid lines */}
      <div className="absolute inset-0 opacity-0 dark:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0" style={{ background: '#0B0F1A' }} />
        <div className="absolute top-[-12%] left-[-8%] w-[700px] h-[700px] rounded-full blur-[140px]" style={{ background: 'rgba(58, 95, 217, 0.12)' }} />
        <div className="absolute bottom-[-12%] right-[-8%] w-[550px] h-[550px] rounded-full blur-[120px]" style={{ background: 'rgba(112, 146, 255, 0.08)' }} />
        <div className="absolute top-[50%] left-[40%] w-[400px] h-[400px] rounded-full blur-[100px]" style={{ background: 'rgba(42, 72, 179, 0.06)' }} />
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>
    </div>
  );
}

// ─── Floating Feature Pills ────────────────────────────────────────
function FeaturePills() {
  const features = [
    { icon: Shield, label: 'Enterprise Security', delay: '0s' },
    { icon: Zap, label: 'Smart Workflows', delay: '0.2s' },
    { icon: Globe, label: 'Multi-Tenant SaaS', delay: '0.4s' },
  ];

  return (
    <div className="flex flex-wrap gap-4 justify-center mt-8">
      {features.map(({ icon: Icon, label, delay }) => (
        <div
          key={label}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--bg-surface)] border border-[var(--border-main)] text-[var(--text-primary)] text-xs font-medium"
          style={{
            animation: `fadeSlideUp 0.6s ease-out ${delay} both`,
          }}
        >
          <Icon className="w-3.5 h-3.5 text-accent-700 dark:text-accent-400" />
          {label}
        </div>
      ))}
    </div>
  );
}

// ─── Loading Fallback ────────────────────────────────────────────────
function LoginPageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-2 border-accent-300/30 border-t-accent-500 rounded-full animate-spin" />
        <p className="text-[var(--text-muted)] text-sm">Loading NU-AURA...</p>
      </div>
    </div>
  );
}

// ─── Page Wrapper ────────────────────────────────────────────────────
export default function LoginPageWrapper() {
  return (
    <Suspense fallback={<LoginPageLoading />}>
      <LoginPage />
    </Suspense>
  );
}

// ─── Demo Login Panel ────────────────────────────────────────────────
function DemoLoginPanel({
  onLogin,
  isLoading,
}: {
  onLogin: (email: string) => void;
  isLoading: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);

  const handleClick = (email: string) => {
    setLoadingEmail(email);
    onLogin(email);
  };

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800/40 text-warning-700 dark:text-warning-300 text-sm font-medium transition-colors hover:bg-warning-100 dark:hover:bg-warning-900/30"
      >
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          <span>Demo Accounts</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-warning-200/60 dark:bg-warning-800/40 text-warning-800 dark:text-warning-200">
            {DEMO_ACCOUNTS.length} roles
          </span>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {isExpanded && (
        <div
          className="mt-3 space-y-2 max-h-[320px] overflow-y-auto pr-1"
          style={{ animation: 'fadeSlideUp 0.3s ease-out' }}
        >
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              disabled={isLoading}
              onClick={() => handleClick(account.email)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-main)] hover:border-[var(--border-strong)] transition-all duration-200 group text-left hover:translate-x-0.5"
            >
              <div
                className={`w-9 h-9 rounded-lg bg-gradient-to-br ${account.color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm`}
              >
                {account.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {account.name}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 font-medium flex-shrink-0">
                    {account.role.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="text-xs text-[var(--text-muted)] truncate">
                  {account.department} &middot; {account.level}
                </div>
              </div>
              <LogIn className="w-4 h-4 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              {isLoading && loadingEmail === account.email && (
                <div className="w-4 h-4 border-2 border-accent-300 border-t-accent-700 rounded-full animate-spin flex-shrink-0" />
              )}
            </button>
          ))}
          <p className="text-[10px] text-[var(--text-muted)] text-center pt-1">
            Password for all accounts: <code className="px-1 py-0.5 bg-[var(--bg-elevated)] rounded text-[var(--text-secondary)]">Welcome@123</code>
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Login Page ─────────────────────────────────────────────────
function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, googleLogin, user, isAuthenticated, hasHydrated, setUser } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaUserId, setMfaUserId] = useState<string | null>(null);
  // setLoginAttempts is called by the lockout timer and resetLoginAttempts;
  // the read value is intentionally unused (lockout state is persisted to localStorage).
  const [, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [didFreshLogin, setDidFreshLogin] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Restore rate-limit state from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedAttempts = localStorage.getItem('loginAttempts');
      const storedLockout = localStorage.getItem('lockoutUntil');
      if (storedAttempts) setLoginAttempts(parseInt(storedAttempts, 10));
      if (storedLockout) {
        const lockoutTime = parseInt(storedLockout, 10);
        if (lockoutTime > Date.now()) {
          setLockoutUntil(lockoutTime);
        } else {
          localStorage.removeItem('loginAttempts');
          localStorage.removeItem('lockoutUntil');
        }
      }
    }
  }, []);

  // Clear stale auth on mount — if Zustand rehydrates with isAuthenticated=true
  // from a previous session but cookies are expired, we need to reset client state
  // so the user can log in fresh.
  useEffect(() => {
    if (!hasHydrated) return;
    if (isAuthenticated && user && !didFreshLogin) {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('auth-storage');
        sessionStorage.removeItem('user');
        localStorage.removeItem('tenantId');
      }
      setUser(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated]);

  // Redirect after fresh login
  useEffect(() => {
    if (!hasHydrated || !didFreshLogin) return;
    if (isAuthenticated && user && !mfaRequired) {
      router.push(sanitizeReturnUrl(searchParams.get('returnUrl')));
    }
  }, [hasHydrated, isAuthenticated, user, didFreshLogin, router, searchParams, mfaRequired]);

  // Lockout timer — clears expired lockout once the window expires
  useEffect(() => {
    if (lockoutUntil) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, lockoutUntil - Date.now());
        if (remaining === 0) {
          setLockoutUntil(null);
          setLoginAttempts(0);
          localStorage.removeItem('loginAttempts');
          localStorage.removeItem('lockoutUntil');
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [lockoutUntil]);

  const resetLoginAttempts = () => {
    setLoginAttempts(0);
    setLockoutUntil(null);
    localStorage.removeItem('loginAttempts');
    localStorage.removeItem('lockoutUntil');
  };

  const handleMfaSuccess = (_token: string) => {
    resetLoginAttempts();
    setDidFreshLogin(true);
    router.push(sanitizeReturnUrl(searchParams.get('returnUrl')));
  };

  const handleMfaCancel = () => {
    setMfaRequired(false);
    setMfaUserId(null);
    setError(null);
  };

  // Demo account quick-login
  const handleDemoLogin = async (email: string) => {
    setIsDemoLoading(true);
    setError(null);
    try {
      await login({ email, password: DEMO_PASSWORD });
      setDidFreshLogin(true);
      router.push(sanitizeReturnUrl(searchParams.get('returnUrl')));
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'Demo login failed. Is the backend running?';
      setError(message);
    } finally {
      setIsDemoLoading(false);
    }
  };

  // Google SSO (primary auth path)
  const handleGoogleSSO = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsGoogleLoading(true);
      setError(null);
      try {
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        if (!userInfoResponse.ok) throw new Error('Failed to get user info');
        const userInfo = await userInfoResponse.json();
        const domain = userInfo.hd || userInfo.email.split('@')[1];
        if (domain !== ALLOWED_DOMAIN) {
          setError(`Only @${ALLOWED_DOMAIN} accounts are allowed to sign in.`);
          setIsGoogleLoading(false);
          return;
        }
        if (!userInfo.email.endsWith(`@${ALLOWED_DOMAIN}`)) {
          setError(`Only @${ALLOWED_DOMAIN} accounts are allowed to sign in.`);
          setIsGoogleLoading(false);
          return;
        }
        saveGoogleToken(tokenResponse.access_token, tokenResponse.expires_in || 3600);
        await googleLogin({ credential: tokenResponse.access_token, accessToken: true });
        setDidFreshLogin(true);
        router.push(sanitizeReturnUrl(searchParams.get('returnUrl')));
      } catch (err: unknown) {
        setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Google sign-in failed. Please try again.');
      } finally {
        setIsGoogleLoading(false);
      }
    },
    onError: (errorResponse) => {
      log.error('[Google SSO] Error callback triggered:', errorResponse);
      setError('Google sign-in failed. Please ensure popups are allowed and third-party cookies are enabled.');
    },
    scope: GOOGLE_SSO_SCOPES + ' openid email profile',
    flow: 'implicit',
    prompt: 'select_account',
  });

  // MFA screen
  if (mfaRequired && mfaUserId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)] py-12 px-4">
        <AnimatedBackground />
        <div className="relative z-10 max-w-md w-full">
          <MfaVerification
            userId={mfaUserId}
            onSuccess={handleMfaSuccess}
            onCancel={handleMfaCancel}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Global keyframe animations */}
      <style jsx global>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.9); opacity: 0.6; }
          50% { transform: scale(1.05); opacity: 0.3; }
          100% { transform: scale(0.9); opacity: 0.6; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .animate-fade-in {
          animation: fadeIn 0.8s ease-out;
        }
        .animate-slide-up {
          animation: fadeSlideUp 0.6s ease-out;
        }
        .btn-shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
          background-size: 200% 100%;
          animation: shimmer 3s ease-in-out infinite;
        }
      `}</style>

      <div className="min-h-screen flex relative overflow-hidden">
        <AnimatedBackground />

        {/* ─── Left Panel: Branding ─────────────────────────── */}
        <div className="hidden lg:flex lg:w-[55%] relative z-10 flex-col justify-center items-center px-16">
          <div
            className="max-w-lg"
            style={{ animation: 'fadeSlideUp 0.8s ease-out 0.1s both' }}
          >
            {/* Platform badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-100/60 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-800/40 mb-8">
              <div className="w-2 h-2 rounded-full bg-success-600 dark:bg-success-400 animate-pulse" />
              <span className="text-accent-700 dark:text-accent-300 text-xs font-medium tracking-wider uppercase">
                NU-AURA Platform v1.0
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl font-extrabold text-[var(--text-primary)] leading-tight mb-6 tracking-tight">
              Your People.
              <br />
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #3a5fd9 0%, #7092ff 50%, #2a48b3 100%)' }}>
                Amplified.
              </span>
            </h1>

            <p className="text-lg text-[var(--text-secondary)] leading-relaxed mb-8">
              One platform for HR, Recruitment, Performance, and Knowledge
              Management. Built for teams that move fast.
            </p>

            {/* App icons row — refined with consistent accent-based palette */}
            <div className="flex gap-5 mb-8">
              {[
                { name: 'HRMS', bg: 'linear-gradient(135deg, #3a5fd9, #2a48b3)', icon: '👥' },
                { name: 'Hire', bg: 'linear-gradient(135deg, #7092ff, #3a5fd9)', icon: '🎯' },
                { name: 'Grow', bg: 'linear-gradient(135deg, #F59E0B, #D97706)', icon: '📈' },
                { name: 'Fluence', bg: 'linear-gradient(135deg, #3a5fd9, #2a48b3)', icon: '💡' },
              ].map((app, i) => (
                <div
                  key={app.name}
                  className="group flex flex-col items-center gap-2.5"
                  style={{ animation: `fadeSlideUp 0.5s ease-out ${0.3 + i * 0.1}s both` }}
                >
                  <div
                    className="w-14 h-14 rounded-lg flex items-center justify-center text-2xl group-hover:scale-110 group-hover:shadow-xl transition-all duration-300"
                    style={{
                      background: app.bg,
                      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
                      animation: `float ${3 + i * 0.5}s ease-in-out infinite`,
                    }}
                  >
                    {app.icon}
                  </div>
                  <span className="text-[var(--text-secondary)] text-xs font-semibold tracking-wide">
                    NU-{app.name}
                  </span>
                </div>
              ))}
            </div>

            <FeaturePills />
          </div>
        </div>

        {/* ─── Right Panel: Login Card ───────────────────────── */}
        <div className="w-full lg:w-[45%] relative z-10 flex items-center justify-center px-6 py-12">
          <div
            className="w-full max-w-[420px]"
            style={{ animation: mounted ? 'fadeSlideUp 0.6s ease-out 0.2s both' : 'none' }}
          >
            {/* Logo */}
            <div className="flex justify-center mb-10 lg:mb-8">
              <div className="relative">
                <div
                  className="absolute -inset-4 rounded-full bg-accent-500/10 blur-xl"
                  style={{ animation: 'pulse-ring 4s ease-in-out infinite' }}
                />
                <Image
                  src="/images/logo.png"
                  alt="NuLogic"
                  width={180}
                  height={54}
                  className="h-14 w-auto object-contain relative dark:brightness-0 dark:invert"
                  priority
                />
              </div>
            </div>

            {/* Mobile-only tagline */}
            <div className="lg:hidden text-center mb-8">
              <h2 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss mb-2">
                Welcome to <span className="text-accent-700 dark:text-accent-400 font-extrabold">NU-AURA</span>
              </h2>
              <p className="text-[var(--text-secondary)] text-sm">
                Your unified people platform
              </p>
            </div>

            {/* Card */}
            <div className="rounded-lg bg-[var(--bg-card)] border border-[var(--border-main)] p-8" style={{ boxShadow: 'var(--shadow-elevated), 0 0 0 1px var(--border-subtle)' }}>
              <div className="text-center mb-7">
                <h3 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight mb-2">
                  Sign In
                </h3>
                <p className="text-[var(--text-secondary)] text-sm">
                  Access your workspace with Google SSO
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <div
                  className="flex items-start gap-4 p-4 mb-6 rounded-xl bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800"
                  style={{ animation: 'fadeSlideUp 0.3s ease-out' }}
                >
                  <AlertCircle className="w-5 h-5 text-danger-600 dark:text-danger-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-danger-700 dark:text-danger-300">
                      Authentication Failed
                    </p>
                    <p className="text-sm text-danger-600 dark:text-danger-400 mt-0.5">
                      {error}
                    </p>
                  </div>
                </div>
              )}

              {/* Google SSO Button */}
              <button
                type="button"
                className="w-full relative group flex items-center justify-center gap-4 px-6 py-3.5 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] border border-[var(--border-main)] font-semibold text-sm transition-all duration-300 hover:shadow-card-hover active:scale-[0.98]"
                onClick={() => { handleGoogleSSO(); }}
                disabled={isGoogleLoading}
              >
                {isGoogleLoading ? (
                  <div className="w-5 h-5 border-2 border-[var(--border-main)] border-t-accent-700 rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                <span>Continue with Google</span>
                <ArrowRight className="w-4 h-4 ml-auto opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
              </button>

              {/* Domain notice */}
              <p className="text-center text-[var(--text-secondary)] text-xs mt-4 leading-relaxed">
                Restricted to <span className="text-accent-700 dark:text-accent-400 font-semibold">@{ALLOWED_DOMAIN}</span> accounts.
                <br />
                <span className="text-[var(--text-muted)]">Includes NU-Drive and NU-Mail access.</span>
              </p>

              {/* Demo Login Panel — only shown when NEXT_PUBLIC_DEMO_MODE=true */}
              {IS_DEMO_MODE && (
                <DemoLoginPanel onLogin={handleDemoLogin} isLoading={isDemoLoading} />
              )}

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[var(--border-subtle)]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-[var(--bg-card)] text-[var(--text-secondary)] font-medium uppercase tracking-wide">
                    secure enterprise SSO
                  </span>
                </div>
              </div>

              {/* Trust badges */}
              <div className="flex items-center justify-center gap-6 text-[var(--text-secondary)] text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-accent-700 dark:text-accent-400" />
                  <span>SOC 2</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-[var(--border-main)]" />
                <div className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-accent-700 dark:text-accent-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span>Encrypted</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-[var(--border-main)]" />
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-accent-700 dark:text-accent-400" />
                  <span>GDPR</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-8 space-y-2">
              <p className="text-xs text-[var(--text-secondary)]">
                By signing in, you agree to our{' '}
                <Link href="/terms" className="text-accent-700 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 transition-colors font-medium">
                  Terms
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-accent-700 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 transition-colors font-medium">
                  Privacy Policy
                </Link>
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                NuLogic &copy; {new Date().getFullYear()} &middot; NU-AURA Platform
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
