import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {LeaveBalanceSummary} from './LeaveBalanceSummary';

describe('LeaveBalanceSummary', () => {
  it('exposes the available balance and flags a request above it', () => {
    render(<LeaveBalanceSummary balance={{available: 2, used: 0, pending: 0}} requestedDays={3} />);
    expect(screen.getByTestId('leave-available').textContent).toContain('2d available');
    expect(screen.getByText('Requesting 3d exceeds 2d available')).toBeTruthy();
  });
});
