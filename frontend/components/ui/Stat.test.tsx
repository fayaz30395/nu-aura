import {describe, expect, it} from 'vitest';
import {render, screen} from '@/lib/test-utils';
import {Stat} from './Stat';

describe('Stat', () => {
  describe('rendering', () => {
    it('renders label and value', () => {
      render(<Stat label="Total Users" value="1,234" />);
      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('1,234')).toBeInTheDocument();
    });

    it('renders caption slot when provided', () => {
      render(<Stat label="Revenue" value="$10k" caption="+12% vs last month" />);
      expect(screen.getByText('+12% vs last month')).toBeInTheDocument();
    });

    it('does not render caption when not provided', () => {
      render(<Stat label="Revenue" value="$10k" />);
      expect(screen.queryByText('+12% vs last month')).not.toBeInTheDocument();
    });

    it('renders icon slot when provided', () => {
      render(
        <Stat label="Users" value="42" icon={<svg data-testid="stat-icon" />} />
      );
      expect(screen.getByTestId('stat-icon')).toBeInTheDocument();
    });

    it('applies custom className to root', () => {
      const {container} = render(
        <Stat label="X" value="1" className="custom-stat" />
      );
      expect(container.firstChild).toHaveClass('custom-stat');
    });
  });

  describe('tones', () => {
    it('default tone applies text-primary CSS variable color class', () => {
      render(<Stat label="L" value="V" />);
      const value = screen.getByText('V');
      expect(value.className).toContain('text-[var(--text-primary)]');
    });

    it('accent tone applies the accent-primary token color class', () => {
      render(<Stat label="L" value="V" tone="accent" />);
      const value = screen.getByText('V');
      expect(value.className).toContain('text-[var(--accent-primary)]');
    });

    it('success tone applies the ok-fg token color class', () => {
      render(<Stat label="L" value="V" tone="success" />);
      expect(screen.getByText('V').className).toContain('text-[var(--ok-fg)]');
    });

    it('danger tone applies the err-fg token color class', () => {
      render(<Stat label="L" value="V" tone="danger" />);
      expect(screen.getByText('V').className).toContain('text-[var(--err-fg)]');
    });
  });

  describe('sizes', () => {
    // The value div composes font-size utilities via cn(). twMerge collapses
    // competing text-* utilities, so we assert the observable label-class
    // contract instead. Compact == smaller label.
    it('default size applies text-xs label class', () => {
      render(<Stat label="L" value="V" />);
      const label = screen.getByText('L').parentElement!;
      expect(label.className).toContain('text-xs');
      expect(label.className).not.toContain('text-2xs');
    });

    it('compact size applies text-2xs label class', () => {
      render(<Stat label="L" value="V" size="compact" />);
      const label = screen.getByText('L').parentElement!;
      expect(label.className).toContain('text-2xs');
    });
  });
});
