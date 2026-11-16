import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {Progress} from './Progress';

describe('Progress', () => {
  it('exposes an accessible progressbar and clamps the value', () => {
    render(<Progress value={140} label="Course progress"/>);
    const bar = screen.getByRole('progressbar', {name: 'Course progress'});
    expect(bar).toHaveAttribute('aria-valuenow', '100');
  });

  it('treats NaN as 0', () => {
    render(<Progress value={Number.NaN} label="Empty"/>);
    expect(screen.getByRole('progressbar', {name: 'Empty'})).toHaveAttribute('aria-valuenow', '0');
  });
});
