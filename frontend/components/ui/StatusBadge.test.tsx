import {describe, expect, it} from 'vitest';
import {render, screen} from '@/lib/test-utils';
import {StatusBadge} from './StatusBadge';
import {LEAVE_STATUS} from '@/lib/status/vocabulary';
import {CheckCircle} from 'lucide-react';

describe('StatusBadge', () => {
  describe('rendering with domain lookup', () => {
    it('renders the canonical label for a known status', () => {
      render(<StatusBadge status="APPROVED" domain={LEAVE_STATUS} />);
      expect(screen.getByText('Approved')).toBeInTheDocument();
    });

    it('renders an icon by default from the domain map', () => {
      const {container} = render(
        <StatusBadge status="APPROVED" domain={LEAVE_STATUS} />
      );
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('applies the success tone class for an approved status', () => {
      render(<StatusBadge status="APPROVED" domain={LEAVE_STATUS} />);
      const el = screen.getByRole('status');
      expect(el.className).toContain('status-success');
    });

    it('applies the warning tone class for a pending status', () => {
      render(<StatusBadge status="PENDING" domain={LEAVE_STATUS} />);
      const el = screen.getByRole('status');
      expect(el.className).toContain('status-warning');
    });
  });

  describe('unknown / fallback handling', () => {
    it('falls back to a title-cased label + neutral tone for unknown enum keys', () => {
      render(<StatusBadge status="MYSTERY_STATE" domain={LEAVE_STATUS} />);
      // titleCase('MYSTERY_STATE') -> 'Mystery State'
      expect(screen.getByText('Mystery State')).toBeInTheDocument();
      expect(screen.getByRole('status').className).toContain('status-neutral');
    });

    it('renders "Unknown" with neutral tone when no status + no domain provided', () => {
      render(<StatusBadge />);
      expect(screen.getByText('Unknown')).toBeInTheDocument();
      expect(screen.getByRole('status').className).toContain('status-neutral');
    });
  });

  describe('prop overrides', () => {
    it('hides the icon when iconHidden is true', () => {
      const {container} = render(
        <StatusBadge status="APPROVED" domain={LEAVE_STATUS} iconHidden />
      );
      expect(container.querySelector('svg')).not.toBeInTheDocument();
    });

    it('compact mode applies the text-2xs class', () => {
      render(<StatusBadge status="APPROVED" domain={LEAVE_STATUS} compact />);
      expect(screen.getByRole('status').className).toContain('text-2xs');
    });

    it('accepts a pre-resolved meta prop', () => {
      render(
        <StatusBadge
          meta={{label: 'Custom Label', tone: 'info', icon: CheckCircle}}
        />
      );
      expect(screen.getByText('Custom Label')).toBeInTheDocument();
      expect(screen.getByRole('status').className).toContain('status-info');
    });
  });
});
