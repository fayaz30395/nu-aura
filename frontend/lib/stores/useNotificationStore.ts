'use client';

/**
 * Cross-route notification panel UI state.
 *
 * Today the notification *data* lives in React Query (see `useNotifications`)
 * and stays there — this slice only owns the *panel open/close* UI state so
 * any header / shortcut / quick-action can toggle the same panel without
 * threading props through layout components.
 *
 * No persistence: the panel should reset on reload.
 *
 * TBD: once a notification panel component lands in the header, wire it up
 * here and migrate any `useState` toggles. As of 2026-05-20 no production
 * component owns this state yet, so this slice ships as a forward-looking
 * placeholder following the slice-per-file convention.
 */

import {create} from 'zustand';

interface NotificationUiState {
  panelOpen: boolean;
  unreadBadgeDismissed: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  setUnreadBadgeDismissed: (dismissed: boolean) => void;
}

export const useNotificationStore = create<NotificationUiState>()((set) => ({
  panelOpen: false,
  unreadBadgeDismissed: false,
  openPanel: () => set({panelOpen: true}),
  closePanel: () => set({panelOpen: false}),
  togglePanel: () => set((s) => ({panelOpen: !s.panelOpen})),
  setUnreadBadgeDismissed: (dismissed) =>
    set({unreadBadgeDismissed: dismissed}),
}));
