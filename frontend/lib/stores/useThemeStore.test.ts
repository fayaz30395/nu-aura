import {beforeEach, describe, expect, it, vi} from 'vitest';

// Wait for Zustand persist middleware to finish hydration / write-through.
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

const {memStore} = vi.hoisted(() => {
  return {memStore: new Map<string, string>()};
});

vi.mock('@/lib/utils/safeStorage', () => ({
  safeStorage: {
    get: (k: string) => memStore.get(k) ?? null,
    set: (k: string, v: string) => {
      memStore.set(k, v);
      return true;
    },
    remove: (k: string) => {
      memStore.delete(k);
    },
  },
  safeSessionStorage: {
    get: () => null,
    set: () => true,
    remove: () => {
    },
  },
}));

const LEGACY_THEME_KEY = 'nu-aura-theme';

beforeEach(() => {
  memStore.clear();
  vi.resetModules();
});

describe('useThemeStore', () => {
  it("defaults to 'system' when nothing is persisted", async () => {
    const {useThemeStore} = await import('./useThemeStore');
    expect(useThemeStore.getState().mode).toBe('system');
  });

  it('setMode updates state and writes through to the legacy raw-string key', async () => {
    const {useThemeStore} = await import('./useThemeStore');
    await flush();

    useThemeStore.getState().setMode('dark');
    expect(useThemeStore.getState().mode).toBe('dark');
    await flush();
    // Bridge must preserve the raw-string shape (not a JSON envelope) so
    // the pre-hydration FOUC script can read it directly.
    expect(memStore.get(LEGACY_THEME_KEY)).toBe('dark');

    useThemeStore.getState().setMode('light');
    await flush();
    expect(memStore.get(LEGACY_THEME_KEY)).toBe('light');

    useThemeStore.getState().setMode('system');
    await flush();
    expect(memStore.get(LEGACY_THEME_KEY)).toBe('system');
  });

  it('rehydrates from the legacy storage key', async () => {
    memStore.set(LEGACY_THEME_KEY, 'dark');

    const {useThemeStore} = await import('./useThemeStore');
    await flush();
    expect(useThemeStore.getState().mode).toBe('dark');
  });

  it('ignores invalid persisted values and keeps the default', async () => {
    memStore.set(LEGACY_THEME_KEY, 'not-a-theme');

    const {useThemeStore} = await import('./useThemeStore');
    await flush();
    expect(useThemeStore.getState().mode).toBe('system');
  });
});
