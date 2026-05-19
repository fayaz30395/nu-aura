'use client';

/**
 * Cross-route UI state (sidebar, admin sidebar, mobile nav, command palette).
 *
 * Convention: slice-per-file, `useXxxStore` naming. See `./README.md`.
 *
 * Two sidebar collapse fields exist because the user app shell
 * (`AppLayout`) and the admin shell (`AdminLayoutInner`) are independent
 * UI surfaces — toggling one should not affect the other. Both are
 * persisted, each bridged onto its own legacy localStorage key so existing
 * user state survives the migration:
 *   - `sidebarCollapsed`       → legacy key `sidebar-collapsed`
 *   - `adminSidebarCollapsed`  → legacy key `admin-sidebar-collapsed`
 *
 * `mobileNavOpen` and `commandPaletteOpen` are intentionally ephemeral — they
 * should reset on a hard reload.
 */

import {create} from 'zustand';
import {persist, type PersistStorage} from 'zustand/middleware';
import {safeStorage} from '@/lib/utils/safeStorage';

const LEGACY_SIDEBAR_KEY = 'sidebar-collapsed';
const LEGACY_ADMIN_SIDEBAR_KEY = 'admin-sidebar-collapsed';

interface UiState {
  // Persisted
  sidebarCollapsed: boolean;
  adminSidebarCollapsed: boolean;
  // Ephemeral
  mobileNavOpen: boolean;
  commandPaletteOpen: boolean;
  // Actions
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setAdminSidebarCollapsed: (collapsed: boolean) => void;
  toggleAdminSidebar: () => void;
  setMobileNavOpen: (open: boolean) => void;
  toggleMobileNav: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
}

type PersistedUiState = {
  sidebarCollapsed: boolean;
  adminSidebarCollapsed: boolean;
};

/**
 * Custom PersistStorage that bridges the Zustand persist envelope onto the
 * two legacy raw-boolean localStorage keys. This keeps existing user state
 * intact while letting us evolve the slice through the standard `persist`
 * middleware.
 *
 * Only the two sidebar booleans round-trip through storage — other fields
 * stay ephemeral because `partialize` below filters them out.
 */
const legacySidebarStorage: PersistStorage<PersistedUiState> = {
  getItem: (_name) => {
    const rawMain = safeStorage.get(LEGACY_SIDEBAR_KEY);
    const rawAdmin = safeStorage.get(LEGACY_ADMIN_SIDEBAR_KEY);
    if (rawMain === null && rawAdmin === null) return null;
    return {
      state: {
        sidebarCollapsed: rawMain === 'true',
        adminSidebarCollapsed: rawAdmin === 'true',
      },
      version: 0,
    };
  },
  setItem: (_name, value) => {
    const main = value?.state?.sidebarCollapsed;
    const admin = value?.state?.adminSidebarCollapsed;
    if (typeof main === 'boolean') {
      safeStorage.set(LEGACY_SIDEBAR_KEY, String(main));
    }
    if (typeof admin === 'boolean') {
      safeStorage.set(LEGACY_ADMIN_SIDEBAR_KEY, String(admin));
    }
  },
  removeItem: (_name) => {
    safeStorage.remove(LEGACY_SIDEBAR_KEY);
    safeStorage.remove(LEGACY_ADMIN_SIDEBAR_KEY);
  },
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      adminSidebarCollapsed: false,
      mobileNavOpen: false,
      commandPaletteOpen: false,

      setSidebarCollapsed: (collapsed) => set({sidebarCollapsed: collapsed}),
      toggleSidebar: () =>
        set((s) => ({sidebarCollapsed: !s.sidebarCollapsed})),

      setAdminSidebarCollapsed: (collapsed) =>
        set({adminSidebarCollapsed: collapsed}),
      toggleAdminSidebar: () =>
        set((s) => ({adminSidebarCollapsed: !s.adminSidebarCollapsed})),

      setMobileNavOpen: (open) => set({mobileNavOpen: open}),
      toggleMobileNav: () => set((s) => ({mobileNavOpen: !s.mobileNavOpen})),

      setCommandPaletteOpen: (open) => set({commandPaletteOpen: open}),
      toggleCommandPalette: () =>
        set((s) => ({commandPaletteOpen: !s.commandPaletteOpen})),
    }),
    {
      // Logical namespace for this slice. Actual storage of sidebar fields is
      // bridged onto the two legacy keys for back-compat.
      name: 'nu-aura-ui',
      storage: legacySidebarStorage,
      // Only the sidebar collapse states are persisted — nav and palette are
      // intentionally ephemeral.
      partialize: (state): PersistedUiState => ({
        sidebarCollapsed: state.sidebarCollapsed,
        adminSidebarCollapsed: state.adminSidebarCollapsed,
      }),
      version: 0,
    }
  )
);
