import React from 'react';
import {describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import {MobileNavDrawer} from './MobileNavDrawer';
import type {SidebarSection} from '@/components/ui';

vi.mock('next/navigation', () => ({
  usePathname: () => '/hrms/dashboard',
}));

const sections: SidebarSection[] = [
  {
    id: 'main',
    label: 'Main',
    items: [
      {id: 'dashboard', label: 'Dashboard', href: '/hrms/dashboard'},
      {id: 'payslips', label: 'Payslips', href: '/me/payslips'},
    ],
  },
];

function renderDrawer(open = true) {
  return render(
    <MobileNavDrawer
      open={open}
      onClose={vi.fn()}
      activeApp="HRMS"
      sections={sections}
      activeId="dashboard"
    />
  );
}

describe('MobileNavDrawer', () => {
  it('exposes a named modal dialog', () => {
    renderDrawer();

    const dialog = screen.getByRole('dialog', {name: 'Navigation'});
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('marks the active entry with aria-current="page"', () => {
    renderDrawer();

    expect(screen.getByRole('link', {name: /Dashboard/})).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', {name: /Payslips/})).not.toHaveAttribute('aria-current');
  });

  it('renders a labelled close button', () => {
    renderDrawer();

    expect(screen.getByRole('button', {name: 'Close navigation'})).toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    renderDrawer(false);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
