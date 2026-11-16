import React from 'react';
import {describe, expect, it, vi, beforeEach} from 'vitest';
import {render, screen} from '@testing-library/react';
import type {ShellPageConfig} from './shell/ShellContext';

let mockPathname = '/me/dashboard';
const frameMounts = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

vi.mock('./shell/ShellFrame', async () => {
  const {useEffect} = await import('react');
  return {
    ShellFrame: ({config, children}: {config: ShellPageConfig; children: React.ReactNode}) => {
      useEffect(() => {
        frameMounts();
      }, []);
      return (
        <div data-testid="frame" data-active={config.activeMenuItem ?? ''}>
          <span data-testid="crumbs">{config.breadcrumbs.map((b) => b.label).join('/')}</span>
          {children}
        </div>
      );
    },
  };
});

import {PersistentShell} from './PersistentShell';
import {AppLayout} from './AppLayout';
import {ShellSkeleton} from './ShellSkeleton';

function Page({label}: {label: string}) {
  return (
    <AppLayout activeMenuItem={label} breadcrumbs={[{label: 'Home', href: '/'}, {label}]}>
      <p>{label} content</p>
    </AppLayout>
  );
}

describe('PersistentShell + AppLayout', () => {
  beforeEach(() => {
    mockPathname = '/me/dashboard';
    frameMounts.mockClear();
  });

  it('renders page content once inside a single shell frame with the page config', () => {
    render(<PersistentShell><Page label="leaves"/></PersistentShell>);
    expect(screen.getAllByTestId('frame')).toHaveLength(1);
    expect(screen.getByText('leaves content')).toBeTruthy();
    expect(screen.getByTestId('crumbs').textContent).toBe('Home/leaves');
    expect(screen.getByTestId('frame').dataset.active).toBe('leaves');
  });

  it('keeps the frame mounted across page changes and swaps the config', () => {
    const {rerender} = render(<PersistentShell><Page label="leaves"/></PersistentShell>);
    mockPathname = '/employees';
    rerender(<PersistentShell><Page label="employees"/></PersistentShell>);
    expect(frameMounts).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('crumbs').textContent).toBe('Home/employees');
  });

  it('resets the config when the next page renders no AppLayout', () => {
    const {rerender} = render(<PersistentShell><Page label="leaves"/></PersistentShell>);
    mockPathname = '/fluence/chat';
    rerender(<PersistentShell><p>bare</p></PersistentShell>);
    expect(screen.getByTestId('crumbs').textContent).toBe('');
  });

  it.each(['/admin', '/admin/roles', '/auth/login', '/', '/pricing', '/preboarding/portal/tok'])(
    'opts %s out of the shell',
    (path) => {
      mockPathname = path;
      render(<PersistentShell><p>x content</p></PersistentShell>);
      expect(screen.queryByTestId('frame')).toBeNull();
      expect(screen.getByText('x content')).toBeTruthy();
    }
  );

  it('draws a standalone frame when AppLayout renders outside the shell', async () => {
    render(<Page label="denied"/>);
    expect(await screen.findAllByTestId('frame')).toHaveLength(1);
  });

  it('is a plain pass-through inside the /admin console', () => {
    mockPathname = '/admin/roles';
    render(<Page label="admin"/>);
    expect(screen.queryByTestId('frame')).toBeNull();
    expect(screen.getByText('admin content')).toBeTruthy();
  });
});

describe('ShellSkeleton', () => {
  it('announces session restore for assistive tech and E2E text probes', () => {
    render(<ShellSkeleton/>);
    expect(screen.getByRole('status').textContent).toContain('Session restoring');
  });

  it('renders no chrome placeholders when chrome is off', () => {
    const {container} = render(<ShellSkeleton chrome={false}/>);
    expect(screen.getByRole('status')).toBeTruthy();
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(0);
  });
});
