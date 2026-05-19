import {beforeEach, describe, expect, it, vi} from 'vitest';

// Wait for Zustand persist middleware to finish hydration / write-through.
// Both rehydrate-from-storage and post-set persistence are scheduled on the
// microtask queue, so a single `setTimeout(0)` flush is enough.
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// Hoisted shared map so the safeStorage mock and the test body see the same
// in-memory backing store. vi.mock is hoisted to the top of the file, so we
// can't close over a top-level `const Map` here — use vi.hoisted.
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

const LEGACY_SIDEBAR_KEY = 'sidebar-collapsed';
const LEGACY_ADMIN_SIDEBAR_KEY = 'admin-sidebar-collapsed';

beforeEach(() => {
  memStore.clear();
  vi.resetModules();
});

describe('useUiStore', () => {
  it('exposes sensible defaults when nothing is persisted', async () => {
    const {useUiStore} = await import('./useUiStore');
    const s = useUiStore.getState();
    expect(s.sidebarCollapsed).toBe(false);
    expect(s.adminSidebarCollapsed).toBe(false);
    expect(s.mobileNavOpen).toBe(false);
    expect(s.commandPaletteOpen).toBe(false);
  });

  it('setSidebarCollapsed and toggleSidebar update state and persist', async () => {
    const {useUiStore} = await import('./useUiStore');
    await flush();

    useUiStore.getState().setSidebarCollapsed(true);
    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
    await flush();
    // Persist middleware writes through to the legacy raw-boolean key.
    expect(memStore.get(LEGACY_SIDEBAR_KEY)).toBe('true');

    useUiStore.getState().toggleSidebar();
    expect(useUiStore.getState().sidebarCollapsed).toBe(false);
    await flush();
    expect(memStore.get(LEGACY_SIDEBAR_KEY)).toBe('false');
  });

  it('setAdminSidebarCollapsed and toggleAdminSidebar update state and persist independently', async () => {
    const {useUiStore} = await import('./useUiStore');
    await flush();

    // Admin slice is independent of the user-app slice.
    useUiStore.getState().setAdminSidebarCollapsed(true);
    expect(useUiStore.getState().adminSidebarCollapsed).toBe(true);
    expect(useUiStore.getState().sidebarCollapsed).toBe(false);
    await flush();
    // Persists under its own legacy key.
    expect(memStore.get(LEGACY_ADMIN_SIDEBAR_KEY)).toBe('true');

    useUiStore.getState().toggleAdminSidebar();
    expect(useUiStore.getState().adminSidebarCollapsed).toBe(false);
    await flush();
    expect(memStore.get(LEGACY_ADMIN_SIDEBAR_KEY)).toBe('false');
  });

  it('mobileNavOpen and commandPaletteOpen toggle without persisting', async () => {
    const {useUiStore} = await import('./useUiStore');
    await flush();

    useUiStore.getState().toggleMobileNav();
    expect(useUiStore.getState().mobileNavOpen).toBe(true);

    useUiStore.getState().setCommandPaletteOpen(true);
    expect(useUiStore.getState().commandPaletteOpen).toBe(true);
    await flush();

    // Neither field should have touched the legacy sidebar keys. The persist
    // middleware will write the partialized sidebar slice, which still maps
    // to the legacy keys — but no new state from these ephemeral fields.
    const legacy = memStore.get(LEGACY_SIDEBAR_KEY);
    expect(legacy === undefined || legacy === 'false').toBe(true);
    const legacyAdmin = memStore.get(LEGACY_ADMIN_SIDEBAR_KEY);
    expect(legacyAdmin === undefined || legacyAdmin === 'false').toBe(true);
  });

  it('rehydrates sidebarCollapsed from the legacy storage key', async () => {
    // Seed legacy storage BEFORE importing the store so rehydration sees it.
    memStore.set(LEGACY_SIDEBAR_KEY, 'true');

    const {useUiStore} = await import('./useUiStore');
    // Persist middleware hydrates on a microtask — wait one tick.
    await flush();
    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
  });

  it('rehydrates adminSidebarCollapsed from the legacy storage key', async () => {
    memStore.set(LEGACY_ADMIN_SIDEBAR_KEY, 'true');

    const {useUiStore} = await import('./useUiStore');
    await flush();
    expect(useUiStore.getState().adminSidebarCollapsed).toBe(true);
    // User-app slice unaffected.
    expect(useUiStore.getState().sidebarCollapsed).toBe(false);
  });
});
