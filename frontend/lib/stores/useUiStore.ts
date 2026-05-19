'use client';

/**
 * Cross-route UI state (sidebar, mobile nav, command palette).
 *
 * Convention: slice-per-file, `useXxxStore` naming. See `./README.md`.
 *
 * `sidebarCollapsed` is persisted to localStorage. To preserve state for
 * existing users, we keep writing the legacy raw-boolean format under the
 * legacy key (`sidebar-collapsed`) via a custom storage adapter, while using
 * `nu-aura-ui` as the logical Zustand persist namespace.
 *
 * `mobileNavOpen` and `commandPaletteOpen` are intentionally ephemeral — they
 * should reset on a hard reload.
 */

import {create} from 'zustand';
import {persist, type PersistStorage} from 'zustand/middleware';
import {safeStorage} from '@/lib/utils/safeStorage';

const LEGACY_SIDEBAR_KEY = 'sidebar-collapsed';

interface UiState {
  // Persisted
  sidebarCollapsed: boolean;
  // Ephemeral
  mobileNavOpen: boolean;
  commandPaletteOpen: boolean;
  // Actions
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setMobileNavOpen: (open: boolean) => void;
  toggleMobileNav: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
}

type PersistedUiState = { sidebarCollapsed: boolean };

/**
 * Custom PersistStorage that bridges the Zustand persist envelope onto the
 * legacy raw-boolean localStorage key (`sidebar-collapsed`). This keeps
 * existing user state intact while letting us evolve the slice through
 * the standard `persist` middleware.
 *
 * Only `sidebarCollapsed` round-trips through storage — other fields stay
 * ephemeral because `partialize` below filters them out.
 */
const legacySidebarStorage: PersistStorage<PersistedUiState> = {
  getItem: (_name) => {
    const raw = safeStorage.get(LEGACY_SIDEBAR_KEY);
    if (raw === null) return null;
    return {
      state: {sidebarCollapsed: raw === 'true'},
      version: 0,
    };
  },
  setItem: (_name, value) => {
    const collapsed = value?.state?.sidebarCollapsed;
    if (typeof collapsed === 'boolean') {
      safeStorage.set(LEGACY_SIDEBAR_KEY, String(collapsed));
    }
  },
  removeItem: (_name) => {
    safeStorage.remove(LEGACY_SIDEBAR_KEY);
  },
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      mobileNavOpen: false,
      commandPaletteOpen: false,

      setSidebarCollapsed: (collapsed) => set({sidebarCollapsed: collapsed}),
      toggleSidebar: () =>
        set((s) => ({sidebarCollapsed: !s.sidebarCollapsed})),

      setMobileNavOpen: (open) => set({mobileNavOpen: open}),
      toggleMobileNav: () => set((s) => ({mobileNavOpen: !s.mobileNavOpen})),

      setCommandPaletteOpen: (open) => set({commandPaletteOpen: open}),
      toggleCommandPalette: () =>
        set((s) => ({commandPaletteOpen: !s.commandPaletteOpen})),
    }),
    {
      // Logical namespace for this slice. Actual storage of `sidebarCollapsed`
      // is bridged onto the legacy `sidebar-collapsed` key for back-compat.
      name: 'nu-aura-ui',
      storage: legacySidebarStorage,
      // Only the sidebar collapse state is persisted — nav and palette are
      // intentionally ephemeral.
      partialize: (state): PersistedUiState => ({
        sidebarCollapsed: state.sidebarCollapsed,
      }),
      version: 0,
    }
  )
);
