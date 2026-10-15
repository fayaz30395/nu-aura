import {afterEach, describe, expect, it, vi} from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  delete (window as unknown as { grecaptcha?: unknown }).grecaptcha;
});

describe('getRecaptchaToken', () => {
  it('returns undefined and loads nothing when the site key is empty', async () => {
    vi.stubEnv('NEXT_PUBLIC_RECAPTCHA_SITE_KEY', '');
    const {getRecaptchaToken} = await import('../recaptcha');
    await expect(getRecaptchaToken('careers_apply')).resolves.toBeUndefined();
    expect(document.getElementById('nu-aura-recaptcha-v3-script')).toBeNull();
  });

  it('executes v3 with the site key and action when configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_RECAPTCHA_SITE_KEY', 'site-key');
    const execute = vi.fn().mockResolvedValue('tok-123');
    (window as unknown as { grecaptcha: unknown }).grecaptcha = {ready: (cb: () => void) => cb(), execute};
    const {getRecaptchaToken} = await import('../recaptcha');
    await expect(getRecaptchaToken('offer_accept')).resolves.toBe('tok-123');
    expect(execute).toHaveBeenCalledWith('site-key', {action: 'offer_accept'});
  });
});
