'use client';

/**
 * Theme preference (light / dark / system) — cross-route UI state.
 *
 * Persisted under the legacy raw-string key `nu-aura-theme` so that the
 * pre-hydration FOUC script in `frontend/lib/theme/theme-script.ts` (which
 * reads `localStorage.getItem('nu-aura-theme')` directly, before React
 * hydrates) keeps working without modification.
 *
 * Only `mode` is persisted. `resolvedTheme` is derived at runtime from
 * `mode` plus the OS `prefers-color-scheme` query, and stays in component
 * state on the provider.
 */

import {create} from 'zustand';
import {persist, type PersistStorage} from 'zustand/middleware';
import {safeStorage} from '@/lib/utils/safeStorage';

export type ThemeMode = 'light' | 'dark' | 'system';

const LEGACY_THEME_KEY = 'nu-aura-theme';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

type PersistedThemeState = { mode: ThemeMode };

/**
 * Bridge Zustand persist onto the raw-string key shape that the FOUC
 * inline script depends on:  `localStorage['nu-aura-theme'] = 'dark'`.
 *
 * Without this adapter Zustand would write a JSON envelope, breaking the
 * pre-hydration theme application and causing a flash of the wrong theme
 * on first paint after deploy.
 */
const legacyThemeStorage: PersistStorage<PersistedThemeState> = {
  getItem: (_name) => {
    const raw = safeStorage.get(LEGACY_THEME_KEY);
    if (raw !== 'light' && raw !== 'dark' && raw !== 'system') return null;
    return {state: {mode: raw}, version: 0};
  },
  setItem: (_name, value) => {
    const mode = value?.state?.mode;
    if (mode === 'light' || mode === 'dark' || mode === 'system') {
      safeStorage.set(LEGACY_THEME_KEY, mode);
    }
  },
  removeItem: (_name) => {
    safeStorage.remove(LEGACY_THEME_KEY);
  },
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      // Default mirrors DarkModeProvider's previous default: 'system' if
      // nothing is stored.
      mode: 'system',
      setMode: (mode) => set({mode}),
    }),
    {
      name: 'nu-aura-theme-store',
      storage: legacyThemeStorage,
      partialize: (state): PersistedThemeState => ({mode: state.mode}),
      version: 0,
    }
  )
);
