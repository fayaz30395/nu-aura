import React from 'react';
import {describe, expect, it, vi} from 'vitest';
import {MantineProvider} from '@mantine/core';
import {fireEvent, render, screen} from '@testing-library/react';
import {PAGE_ERROR_TITLE, RouteErrorFallback} from './PageErrorFallback';
import LeaveError from '@/app/leave/error';
import RootError from '@/app/error';

vi.mock('@/lib/utils/error-handler', () => ({handleError: vi.fn()}));

const secret = 'SQLException: relation "employees" at com.nulogic.Foo.bar(Foo.java:42)';

function renderBoundary(ui: React.ReactElement) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

describe('PageErrorFallback', () => {
  it('keeps the e2e heading and hides the raw error message and stack', () => {
    const error = Object.assign(new Error(secret), {digest: 'abc123'});
    renderBoundary(<RouteErrorFallback error={error} reset={vi.fn()}/>);

    expect(screen.getByRole('heading', {name: PAGE_ERROR_TITLE})).toBeInTheDocument();
    expect(PAGE_ERROR_TITLE).toBe('Something went wrong');
    expect(screen.queryByText(/SQLException/)).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain('Foo.java');
    expect(screen.getByText('abc123')).toBeInTheDocument();
  });

  it('retries via reset and links back to the dashboard', () => {
    const reset = vi.fn();
    renderBoundary(<RouteErrorFallback error={new Error(secret)} reset={reset}/>);

    fireEvent.click(screen.getByRole('button', {name: /retry/i}));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', {name: /go to dashboard/i})).toHaveAttribute('href', '/me/dashboard');
  });

  it('is the body of module and root error.tsx boundaries', () => {
    const {unmount} = renderBoundary(<LeaveError error={new Error(secret)} reset={vi.fn()}/>);
    expect(screen.getByRole('heading', {name: PAGE_ERROR_TITLE})).toBeInTheDocument();
    unmount();

    renderBoundary(<RootError error={new Error(secret)} reset={vi.fn()}/>);
    expect(screen.getByRole('heading', {name: PAGE_ERROR_TITLE})).toBeInTheDocument();
    expect(screen.queryByText(/SQLException/)).not.toBeInTheDocument();
  });
});
