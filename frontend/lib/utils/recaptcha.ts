// reCAPTCHA v3 token helper for unauthenticated public forms (careers apply, offer
// accept/decline, preboarding portal). Site key is public by Google's design; when
// NEXT_PUBLIC_RECAPTCHA_SITE_KEY is empty (dev) no token is requested and the backend's
// NoOp CaptchaService accepts the submit. Must be a v3 key (the login widget uses its own flow).

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';
const SCRIPT_ID = 'nu-aura-recaptcha-v3-script';

interface RecaptchaV3 {
  ready: (cb: () => void) => void;
  execute: (siteKey: string, opts: { action: string }) => Promise<string>;
}

const getGrecaptcha = () =>
  (typeof window === 'undefined' ? undefined : (window as unknown as { grecaptcha?: RecaptchaV3 }).grecaptcha);

function loadScript(): Promise<void> {
  if (getGrecaptcha()?.execute) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID);
    const script = existing ?? document.createElement('script');
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () => reject(new Error('reCAPTCHA failed to load')));
    if (!existing) {
      script.id = SCRIPT_ID;
      (script as HTMLScriptElement).src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(SITE_KEY)}`;
      (script as HTMLScriptElement).async = true;
      document.head.appendChild(script);
    }
  });
}

/** Returns a v3 token for `action`, or undefined when no site key is configured. */
export async function getRecaptchaToken(action: string): Promise<string | undefined> {
  if (!SITE_KEY || typeof window === 'undefined') return undefined;
  await loadScript();
  const g = getGrecaptcha();
  if (!g) throw new Error('reCAPTCHA unavailable');
  await new Promise<void>((resolve) => g.ready(resolve));
  return g.execute(SITE_KEY, {action});
}
