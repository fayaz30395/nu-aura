import React from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import {TopBar} from './TopBar';

let granted: string[] = [];

vi.mock('@/lib/hooks/usePermissions', () => ({
  Permissions: {NOTIFICATION_VIEW: 'NOTIFICATION:VIEW', DASHBOARD_VIEW: 'DASHBOARD:VIEW', ANALYTICS_VIEW: 'ANALYTICS:VIEW'},
  usePermissions: () => ({isReady: true, hasPermission: (p: string) => granted.includes(p)}),
}));
vi.mock('@/lib/contexts/WebSocketContext', () => ({useWebSocket: () => ({isConnected: false, unreadCount: 0})}));
vi.mock('@/lib/hooks/queries/useNotifications', () => ({useUnreadNotificationCount: () => ({data: 0})}));
vi.mock('@/components/ui/ThemeToggle', () => ({ThemeToggle: () => <div/>}));
vi.mock('../NotificationDropdown', () => ({NotificationDropdown: () => null}));
vi.mock('../UserMenu', () => ({UserMenu: () => null}));

const crumbs = [{label: 'Dashboard', href: '/dashboard'}, {label: 'Contracts'}];

describe('TopBar breadcrumbs', () => {
  beforeEach(() => {
    granted = [];
  });

  it('points the Dashboard crumb at /me/dashboard when the user cannot open /dashboard', () => {
    render(<TopBar breadcrumbs={crumbs}/>);
    expect(screen.getByRole('link', {name: 'Dashboard'}).getAttribute('href')).toBe('/me/dashboard');
  });

  it('keeps /dashboard when the user holds DASHBOARD:VIEW and ANALYTICS:VIEW', () => {
    granted = ['DASHBOARD:VIEW', 'ANALYTICS:VIEW'];
    render(<TopBar breadcrumbs={crumbs}/>);
    expect(screen.getByRole('link', {name: 'Dashboard'}).getAttribute('href')).toBe('/dashboard');
  });
});
