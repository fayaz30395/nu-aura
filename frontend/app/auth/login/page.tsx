'use client';

import {Suspense, useEffect, useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {useGoogleLogin} from '@react-oauth/google';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {useAuth} from '@/lib/hooks/useAuth';
import {GOOGLE_SSO_SCOPES, saveGoogleToken} from '@/lib/utils/googleToken';
import {MfaVerification} from '@/components/auth/MfaVerification';
import {GoogleGLogo} from '@/components/ui/GoogleGLogo';
import {Button, Input} from '@/components/ui';
import {ThemeToggle} from '@/components/ui/ThemeToggle';
import {BrandPanel} from '../_components/BrandPanel';
import '../_components/auth-form.css';
import {safeSessionStorage, safeStorage} from '@/lib/utils/safeStorage';
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Lock,
  LogIn,
  Mail,
  Users,
} from 'lucide-react';
import {createLogger} from '@/lib/utils/logger';
import {isGoogleAuthEnabled} from '@/lib/config';

const emailPasswordSchema = z.object({
  email: z.string().email('Please enter a valid work email (e.g., name@nulogic.com)'),
  password: z.string().min(1, 'Please enter your password to sign in'),
});
type EmailPasswordForm = z.infer<typeof emailPasswordSchema>;

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const IS_DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

interface DemoAccount {
  name: string;
  email: string;
  role: string;
  department: string;
  level: string;
  color: string;
}

// HIGH-1: Demo accounts only included in bundle when NEXT_PUBLIC_DEMO_MODE=true.
// Tree-shaking removes the array entirely in production builds without the flag.
const DEMO_ACCOUNTS: DemoAccount[] = IS_DEMO_MODE
  ? [
    {
      name: 'Fayaz M',
      email: 'fayaz.m@nulogic.io',
      role: 'SUPER_ADMIN',
      department: 'Executive',
      level: 'CEO',
      color: 'from-danger-500 to-danger-600'
    },
    {
      name: 'Sumit Kumar',
      email: 'sumit@nulogic.io',
      role: 'MANAGER',
      department: 'Engineering',
      level: 'Manager',
      color: 'from-accent-500 to-accent-600'
    },
    {
      name: 'Mani S',
      email: 'mani@nulogic.io',
      role: 'TEAM_LEAD',
      department: 'Engineering',
      level: 'Team Lead',
      color: 'from-accent-500 to-accent-600'
    },
    {
      name: 'Gokul R',
      email: 'gokul@nulogic.io',
      role: 'TEAM_LEAD',
      department: 'Engineering',
      level: 'Lead',
      color: 'from-accent-500 to-accent-600'
    },
    {
      name: 'Saran V',
      email: 'saran@nulogic.io',
      role: 'EMPLOYEE',
      department: 'Engineering',
      level: 'Employee',
      color: 'from-accent-600 to-accent-700'
    },
    {
      name: 'Jagadeesh N',
      email: 'jagadeesh@nulogic.io',
      role: 'HR_MANAGER',
      department: 'HR',
      level: 'HR Manager',
      color: 'from-accent-700 to-accent-800'
    },
    {
      name: 'Suresh M',
      email: 'suresh@nulogic.io',
      role: 'RECRUITMENT_ADMIN',
      department: 'Recruitment',
      level: 'Lead',
      color: 'from-accent-500 to-accent-600'
    },
    {
      name: 'Dhanush A',
      email: 'dhanush@nulogic.io',
      role: 'TEAM_LEAD',
      department: 'HR',
      level: 'HR Lead',
      color: 'from-accent-600 to-accent-700'
    },
  ]
  : [];

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
  // MED-1: Only allow path characters — disallow @ to prevent user-info injection (user@host)
  if (!/^\/[\w\-./~?#&=%]*$/.test(trimmed)) return fallback;
  return trimmed;
}

// Configurable via env — falls back to 'nulogic.io' for local dev.
// Set NEXT_PUBLIC_SSO_ALLOWED_DOMAIN in .env.production for each tenant deployment.
const ALLOWED_DOMAIN = process.env.NEXT_PUBLIC_SSO_ALLOWED_DOMAIN || 'nulogic.io';

// reCAPTCHA v2 site key. Public by Google's design — safe to embed at build time.
// Empty in dev (NoOp CaptchaService is active server-side so the widget never renders).
// Set NEXT_PUBLIC_RECAPTCHA_SITE_KEY in .env.production after registering the domain
// at https://www.google.com/recaptcha/admin.
const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';

// Sentinel string the backend returns in `error.response.data.message` when the
// account has exceeded `app.security.captcha.threshold-attempts` failed logins
// and must solve a CAPTCHA before the next password attempt. Kept as a module
// constant so the contract is grep-able from a single place when the backend
// signal changes.
const CAPTCHA_REQUIRED_MESSAGE = 'captcha-required';

// Global window typing for the lazily-injected reCAPTCHA script. The script
// installs `window.grecaptcha` and calls our `onload` once `render()` is safe
// to use. We type-narrow inside the loader so the rest of the component does
// not have to deal with `any`.
declare global {
  interface Window {
    grecaptcha?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
          theme?: 'light' | 'dark';
          size?: 'normal' | 'compact';
        }
      ) => number;
      reset: (widgetId?: number) => void;
      getResponse: (widgetId?: number) => string;
    };
    __nuAuraRecaptchaOnLoad?: () => void;
  }
}

// ─── CSS-only Ambient Background (theme-aware) ─────────────────────
function AnimatedBackground() {
  return (
    <div className="fixed inset-0 z-0" suppressHydrationWarning>
      <div className="absolute inset-0 bg-[var(--bg-main)]"/>
      <div
        className="absolute inset-0 opacity-[0.045] dark:opacity-0 transition-opacity duration-500"
        style={{
          backgroundImage:
            'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div
        className="absolute inset-0 dark:opacity-100 opacity-0 transition-opacity duration-500"
      />
    </div>
  );
}

// ─── Loading Fallback ────────────────────────────────────────────────
function LoginPageLoading() {
  return (
    <div className="auth-shell motion-rise">
      <div className="w-full max-w-xs flex flex-col items-center gap-4 motion-rise">
        <div className="w-12 h-12 border-2 border-accent-300/30 border-t-accent-500 rounded-full animate-spin"/>
        <p className="text-[var(--text-muted)] text-sm">Loading NU-AURA...</p>
      </div>
    </div>
  );
}

// ─── Page Wrapper ────────────────────────────────────────────────────
export default function LoginPageWrapper() {
  return (
    <Suspense fallback={<LoginPageLoading/>}>
      <LoginPage/>
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
        className="w-full row-between px-4 py-2.5 rounded-lg bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800/40 text-warning-700 dark:text-warning-300 text-sm font-medium transition-colors hover:bg-warning-100 dark:hover:bg-warning-900/30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
      >
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4"/>
          <span>Demo Accounts</span>
          <span
            className="text-xs px-1.5 py-0.5 rounded bg-warning-200/60 dark:bg-warning-800/40 text-warning-800 dark:text-warning-200">
            {DEMO_ACCOUNTS.length} roles
          </span>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
      </button>

      {isExpanded && (
        <div
          className="mt-3 space-y-2 max-h-[300px] overflow-y-auto pr-1 motion-rise"
        >
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              disabled={isLoading}
              onClick={() => handleClick(account.email)}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-main)] hover:border-[var(--border-strong)] transition-colors group text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
            >
              <div
                className={`w-9 h-9 rounded-lg bg-gradient-to-br ${account.color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-[var(--shadow-card)]`}
              >
                {account.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {account.name}
                  </span>
                  <span
                    className="text-[0.6875rem] px-1.5 py-0.5 rounded-full bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 font-medium flex-shrink-0">
                    {account.role?.replace(/_/g, ' ') ?? '-'}
                  </span>
                </div>
                <div className="text-caption truncate">
                  {account.department} &middot; {account.level}
                </div>
              </div>
              <LogIn
                className="w-4 h-4 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"/>
              {isLoading && loadingEmail === account.email && (
                <div
                  className="w-4 h-4 border-2 border-accent-300 border-t-accent-700 rounded-full animate-spin flex-shrink-0"/>
              )}
            </button>
          ))}
          <p className="text-[0.6875rem] text-[var(--text-muted)] text-center pt-1">
            Password for all accounts: <code
            className="px-1 py-0.5 bg-[var(--bg-elevated)] rounded text-[var(--text-secondary)]">Welcome@123</code>
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
  const {login, googleLogin, user, isAuthenticated, hasHydrated, setUser} = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaUserId, setMfaUserId] = useState<string | null>(null);
  // setLoginAttempts is called by the lockout timer and resetLoginAttempts;
  // the read value is intentionally unused (lockout state is persisted to localStorage).
  const [, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(true);
  const [didFreshLogin, setDidFreshLogin] = useState(false);
  // Presentation-only "Remember me" toggle (Aura spec). Auth session lifetime is
  // governed server-side by httpOnly cookies; this is a UI affordance only.
  const [remember, setRemember] = useState(true);

  // Wave-10 P2-3: CAPTCHA gate after 3 failed login attempts. The widget is
  // only rendered after the backend signals `captcha-required`, so the
  // happy-path UX is unchanged. `captchaToken` holds the latest token the
  // widget callback gave us; it is sent with the next login attempt and
  // cleared after submit (Google issues single-use tokens).
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaWidgetId, setCaptchaWidgetId] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    formState: {errors: emailErrors},
  } = useForm<EmailPasswordForm>({resolver: zodResolver(emailPasswordSchema)});

  // Restore rate-limit state from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedAttempts = safeStorage.get('loginAttempts');
      const storedLockout = safeStorage.get('lockoutUntil');
      if (storedAttempts) setLoginAttempts(parseInt(storedAttempts, 10));
      if (storedLockout) {
        const lockoutTime = parseInt(storedLockout, 10);
        if (lockoutTime > Date.now()) {
          setLockoutUntil(lockoutTime);
        } else {
          safeStorage.remove('loginAttempts');
          safeStorage.remove('lockoutUntil');
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
        safeSessionStorage.remove('auth-storage');
        safeSessionStorage.remove('user');
        safeStorage.remove('tenantId');
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

  // Lazy-load Google reCAPTCHA when the backend has gated the user behind a
  // CAPTCHA. We use the script-tag injection approach (rather than pulling in
  // `react-google-recaptcha`) so the runtime dep change is zero — no new
  // package, no SSR concerns, and the script is only fetched when the gate
  // actually triggers. The render is "explicit" so we control widget mount
  // timing (otherwise Google would auto-bind to any g-recaptcha div on first
  // paint, which we don't want during the happy path).
  useEffect(() => {
    if (!captchaRequired) return;
    if (!RECAPTCHA_SITE_KEY) {
      log.warn('Backend requested CAPTCHA but NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not configured');
      return;
    }
    if (typeof window === 'undefined') return;

    const SCRIPT_ID = 'nu-aura-recaptcha-script';
    const CONTAINER_ID = 'nu-aura-recaptcha-container';

    // Helper that actually renders the widget into our placeholder div.
    // Guarded with the widgetId state so we never double-render on re-mount
    // (Google's API throws if you call render() twice on the same container).
    const tryRender = () => {
      const container = document.getElementById(CONTAINER_ID);
      if (!container || !window.grecaptcha) return;
      if (captchaWidgetId !== null) return;
      try {
        const id = window.grecaptcha.render(container, {
          sitekey: RECAPTCHA_SITE_KEY,
          callback: (token: string) => setCaptchaToken(token),
          'expired-callback': () => setCaptchaToken(null),
          'error-callback': () => setCaptchaToken(null),
        });
        setCaptchaWidgetId(id);
      } catch (renderErr) {
        log.error('reCAPTCHA render failed', renderErr);
      }
    };

    // If the script is already on the page (e.g. user triggered CAPTCHA twice
    // in one session) just re-render into the (now empty) container.
    if (window.grecaptcha) {
      tryRender();
      return;
    }
    // Otherwise inject the script once and let its onload handler call us.
    if (document.getElementById(SCRIPT_ID)) {
      // Script element exists but window.grecaptcha not yet populated — the
      // onload fires `__nuAuraRecaptchaOnLoad`, which we re-install below.
      window.__nuAuraRecaptchaOnLoad = tryRender;
      return;
    }
    window.__nuAuraRecaptchaOnLoad = tryRender;
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = 'https://www.google.com/recaptcha/api.js?onload=__nuAuraRecaptchaOnLoad&render=explicit';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    // Intentionally no cleanup — the script is a one-shot global resource and
    // ripping it out on unmount would defeat the cache when the user toggles
    // the email form open/closed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captchaRequired]);

  // Lockout timer — clears expired lockout once the window expires
  useEffect(() => {
    if (lockoutUntil) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, lockoutUntil - Date.now());
        if (remaining === 0) {
          setLockoutUntil(null);
          setLoginAttempts(0);
          safeStorage.remove('loginAttempts');
          safeStorage.remove('lockoutUntil');
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [lockoutUntil]);

  const resetLoginAttempts = () => {
    setLoginAttempts(0);
    setLockoutUntil(null);
    safeStorage.remove('loginAttempts');
    safeStorage.remove('lockoutUntil');
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

  // Inspect a login failure for the backend's captcha-required signal. When
  // matched, flip the gate on and clear the stale token so the user sees a
  // fresh widget; returns true so the caller can render a tailored message
  // instead of the generic "Invalid email or password" string.
  const isCaptchaRequiredError = (err: unknown): boolean => {
    const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
    if (message === CAPTCHA_REQUIRED_MESSAGE) {
      setCaptchaRequired(true);
      setCaptchaToken(null);
      // Reset any already-rendered widget so the next render() lands in a
      // freshly-cleared challenge state.
      if (captchaWidgetId !== null && typeof window !== 'undefined' && window.grecaptcha) {
        try {
          window.grecaptcha.reset(captchaWidgetId);
        } catch { /* widget may have been re-mounted */
        }
      }
      return true;
    }
    return false;
  };

  // Local widening of the shared LoginRequest type to allow the optional
  // captchaToken field. The shared type stays unchanged (out of scope for
  // this Wave-10 P2-3 change) — axios serialises any object property and the
  // backend's LoginRequest DTO already accepts the extra field, so the cast
  // is safe at runtime and we recover compile-time safety inside this page.
  type LoginPayload = Parameters<typeof login>[0] & { captchaToken?: string };

  // Demo account quick-login
  const handleDemoLogin = async (email: string) => {
    setIsDemoLoading(true);
    setError(null);
    try {
      const payload: LoginPayload = {
        email,
        password: DEMO_PASSWORD,
        ...(captchaToken ? {captchaToken} : {}),
      };
      await login(payload);
      setCaptchaRequired(false);
      setCaptchaToken(null);
      setDidFreshLogin(true);
      router.push(sanitizeReturnUrl(searchParams.get('returnUrl')));
    } catch (err: unknown) {
      if (isCaptchaRequiredError(err)) {
        setError('Please complete the CAPTCHA challenge to continue.');
      } else {
        const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
          || 'Service temporarily unavailable. Please try again in a moment.';
        setError(message);
      }
    } finally {
      setIsDemoLoading(false);
    }
  };

  // Email + password login (Bug #3 FIX)
  const handleEmailLogin = async (data: EmailPasswordForm) => {
    // Once the gate is on, require a token before we even hit the network.
    // Avoids a wasted round-trip and a confusing flicker if the user submits
    // before solving the widget.
    if (captchaRequired && !captchaToken) {
      setError('Please complete the CAPTCHA challenge to continue.');
      return;
    }
    setIsEmailLoading(true);
    setError(null);
    try {
      const payload: LoginPayload = {
        email: data.email,
        password: data.password,
        ...(captchaToken ? {captchaToken} : {}),
      };
      await login(payload);
      setCaptchaRequired(false);
      setCaptchaToken(null);
      setDidFreshLogin(true);
      router.push(sanitizeReturnUrl(searchParams.get('returnUrl')));
    } catch (err: unknown) {
      if (isCaptchaRequiredError(err)) {
        setError('Please complete the CAPTCHA challenge to continue.');
      } else {
        const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
          || 'Invalid email or password';
        setError(message);
      }
    } finally {
      setIsEmailLoading(false);
    }
  };

  // Google SSO (primary auth path)
  const handleGoogleSSO = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsGoogleLoading(true);
      setError(null);
      try {
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {Authorization: `Bearer ${tokenResponse.access_token}`},
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
        await googleLogin({credential: tokenResponse.access_token, accessToken: true});
        setDidFreshLogin(true);
        router.push(sanitizeReturnUrl(searchParams.get('returnUrl')));
      } catch (err: unknown) {
        setError((err as {
          response?: { data?: { message?: string } }
        })?.response?.data?.message || 'Google sign-in failed. Please try again.');
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
      <div className="auth-shell relative overflow-hidden motion-rise">
        <AnimatedBackground/>
        <div className="aura-auth-theme">
          <ThemeToggle compact/>
        </div>
        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr] lg:items-center">
            <BrandPanel showHighlights/>
            <div className="aura-auth-col">
              <div className="aura-auth-form motion-rise">
                <MfaVerification
                  userId={mfaUserId}
                  onSuccess={handleMfaSuccess}
                  onCancel={handleMfaCancel}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell relative overflow-hidden motion-rise">
      <AnimatedBackground/>

      {/* Floating theme toggle, top-right */}
      <div className="aura-auth-theme">
        <ThemeToggle compact/>
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr] lg:items-center">
          {/* ─── Left — dark gradient brand panel ─────────────── */}
          <BrandPanel showHighlights/>

          {/* ─── Right — sign-in form ─────────────────────────── */}
          <div className="aura-auth-col">
            <div className="aura-auth-form motion-rise">
              {/* Mobile-only logo */}
              <div className="lg:hidden flex justify-center mb-7">
                <Image
                  src="/images/nulogic-logo.svg"
                  alt="NULogic"
                  width={156}
                  height={46}
                  className="h-11 w-auto object-contain dark:hidden"
                  priority
                  fetchPriority="high"
                />
                <Image
                  src="/images/nulogic-logo-white.svg"
                  alt="NULogic"
                  width={156}
                  height={46}
                  className="h-11 w-auto object-contain hidden dark:block"
                  priority
                  fetchPriority="high"
                />
              </div>

              <h2 className="aura-auth-form__h">Sign In to NU-AURA</h2>
              <p className="aura-auth-form__sub">
                {isGoogleAuthEnabled
                  ? 'Sign in to your NULogic workspace with Google SSO.'
                  : 'Sign in to your NULogic workspace.'}
              </p>

              {/* Error Alert */}
              {error && (
                <div className="auth-error-banner flex items-start gap-2 p-4 mt-6 motion-rise">
                  <AlertCircle className="w-5 h-5 text-danger-600 dark:text-danger-400 flex-shrink-0 mt-0.5"/>
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

              {/* Email / Password login */}
              <div className="mt-6">
                {!showEmailForm && (
                  <button
                    type="button"
                    onClick={() => setShowEmailForm(true)}
                    aria-expanded={showEmailForm}
                    className="w-full row-between px-4 py-2.5 rounded-[var(--r-control)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-2)] text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                  >
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4"/>
                      <span>Email and password</span>
                    </div>
                    <ChevronDown className="w-4 h-4"/>
                  </button>
                )}

                {showEmailForm && (
                  <form
                    onSubmit={handleSubmit(handleEmailLogin)}
                    className="flex flex-col gap-4 motion-rise"
                    aria-label="Email and password sign-in"
                  >
                    <Input
                      id="login-email"
                      label="Work email"
                      {...register('email')}
                      type="email"
                      required
                      placeholder="you@company.com"
                      autoComplete="email"
                      aria-invalid={!!emailErrors.email}
                      icon={<Mail className="w-4 h-4" aria-hidden="true"/>}
                      error={emailErrors.email?.message}
                    />

                    <Input
                      id="login-password"
                      label="Password"
                      {...register('password')}
                      type="password"
                      required
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      aria-invalid={!!emailErrors.password}
                      icon={<Lock className="w-4 h-4" aria-hidden="true"/>}
                      error={emailErrors.password?.message}
                    />

                    {/* Remember me + forgot password */}
                    <div className="aura-auth-row">
                      <button
                        type="button"
                        onClick={() => setRemember((r) => !r)}
                        aria-pressed={remember}
                        className="aura-auth-check focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                      >
                        <span className="aura-auth-check__box" data-on={remember}>
                          <Check className="w-3 h-3" strokeWidth={3} aria-hidden="true"/>
                        </span>
                        Remember me
                      </button>
                      <Link
                        href="/auth/forgot-password"
                        className="text-xs font-medium text-accent-600 hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] rounded"
                      >
                        Forgot password?
                      </Link>
                    </div>

                    {/* Wave-10 P2-3: CAPTCHA placeholder. Stays in the DOM (display:none)
                        until the backend signals captcha-required so the script-injection
                        useEffect always has a stable target to call grecaptcha.render()
                        on without React tearing the node out from under it. */}
                    <div
                      id="nu-aura-recaptcha-container"
                      role={captchaRequired ? 'region' : undefined}
                      aria-label={captchaRequired ? 'CAPTCHA challenge' : undefined}
                      className={captchaRequired ? 'flex justify-center pt-1' : 'hidden'}
                    />
                    {captchaRequired && !RECAPTCHA_SITE_KEY && (
                      <p className="text-xs text-danger-500 -mt-2">
                        CAPTCHA challenge required, but the site key is not configured. Contact your administrator.
                      </p>
                    )}

                    <Button
                      type="submit"
                      disabled={isEmailLoading || (captchaRequired && !captchaToken)}
                      variant="primary"
                      size="lg"
                      isLoading={isEmailLoading}
                      loadingText="Signing in..."
                      aria-busy={isEmailLoading}
                      className="w-full disabled:pointer-events-none disabled:opacity-50"
                      rightIcon={<ArrowRight className="w-4 h-4"/>}
                    >
                      Sign in
                    </Button>
                    {isEmailLoading && (
                      <p role="status" className="text-xs text-[var(--text-secondary)] text-center">
                        Checking credentials...
                      </p>
                    )}
                  </form>
                )}
              </div>

              {/* or continue with */}
              <div className="aura-auth-or"><span>or continue with</span></div>

              {/* SSO providers — prototype order: SSO · Google · Microsoft */}
              <div className="aura-auth-sso">
                <Button type="button" variant="ghost" className="w-full" disabled>SSO</Button>
                {isGoogleAuthEnabled ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => handleGoogleSSO()}
                    disabled={isGoogleLoading}
                    isLoading={isGoogleLoading}
                    leftIcon={!isGoogleLoading ? <GoogleGLogo className="w-4 h-4"/> : undefined}
                  >
                    Google
                  </Button>
                ) : (
                  <Button type="button" variant="ghost" className="w-full" disabled>
                    Google
                  </Button>
                )}
                <Button type="button" variant="ghost" className="w-full" disabled>Microsoft</Button>
              </div>

              {isGoogleAuthEnabled && (
                <p className="text-center text-[var(--text-3)] text-xs mt-3 leading-relaxed">
                  Restricted to{' '}
                  <span className="text-accent-700 dark:text-accent-400 font-semibold">@{ALLOWED_DOMAIN}</span>{' '}
                  accounts.
                </p>
              )}

              {/* Demo Login Panel — only shown when NEXT_PUBLIC_DEMO_MODE=true */}
              {IS_DEMO_MODE && (
                <DemoLoginPanel onLogin={handleDemoLogin} isLoading={isDemoLoading}/>
              )}

              <p className="aura-auth-foot">
                New to NULogic? <span className="text-[var(--text-2)]">Contact your administrator</span>
              </p>

              <p className="mt-4 text-center text-xs text-[var(--text-muted)]">
                Secure session with httpOnly cookies and CSRF protection.
              </p>

              {/* Legal / terms */}
              <div className="aura-auth-legal space-y-1.5">
                <p>
                  By signing in, you agree to our{' '}
                  <Link href="/terms" className="text-accent-700 dark:text-accent-400 hover:underline font-medium">Terms</Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-accent-700 dark:text-accent-400 hover:underline font-medium">Privacy Policy</Link>
                </p>
                <p>© {new Date().getFullYear()} NULogic Technologies · Enterprise SSO secured</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
