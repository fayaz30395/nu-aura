import {describe, expect, it} from 'vitest';
import {render, screen} from '@/lib/test-utils';
import {Callout} from './Callout';

describe('Callout', () => {
  describe('rendering', () => {
    it('renders title and children', () => {
      render(<Callout title="Heads up">Something happened</Callout>);
      expect(screen.getByText('Heads up')).toBeInTheDocument();
      expect(screen.getByText('Something happened')).toBeInTheDocument();
    });

    it('renders without a title', () => {
      render(<Callout>Body only</Callout>);
      expect(screen.getByText('Body only')).toBeInTheDocument();
    });

    it('renders action slot when provided', () => {
      render(
        <Callout title="With action" action={<button>Retry</button>}>
          Body
        </Callout>
      );
      expect(screen.getByRole('button', {name: /retry/i})).toBeInTheDocument();
    });

    it('hides icon when icon prop is null', () => {
      const {container} = render(
        <Callout icon={null} title="No icon">
          Body
        </Callout>
      );
      // No <svg> should be rendered when icon is suppressed
      expect(container.querySelector('svg')).not.toBeInTheDocument();
    });

    it('renders default tone icon when icon prop is not provided', () => {
      const {container} = render(<Callout title="Info">Body</Callout>);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('tone -> role mapping', () => {
    it('defaults to info tone with role="status"', () => {
      render(<Callout>Default tone</Callout>);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('danger tone produces role="alert"', () => {
      render(<Callout tone="danger">Bad</Callout>);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('warning tone produces role="alert"', () => {
      render(<Callout tone="warning">Heads up</Callout>);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('success tone produces role="status"', () => {
      render(<Callout tone="success">Good</Callout>);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('tone -> surface classes', () => {
    it('info tone applies bg-accent-50 + border-accent-200', () => {
      render(<Callout tone="info">Body</Callout>);
      const el = screen.getByRole('status');
      expect(el.className).toContain('bg-accent-50');
      expect(el.className).toContain('border-accent-200');
    });

    it('success tone applies bg-success-50 + border-success-200', () => {
      render(<Callout tone="success">Body</Callout>);
      const el = screen.getByRole('status');
      expect(el.className).toContain('bg-success-50');
      expect(el.className).toContain('border-success-200');
    });

    it('warning tone applies bg-warning-50 + border-warning-200', () => {
      render(<Callout tone="warning">Body</Callout>);
      const el = screen.getByRole('alert');
      expect(el.className).toContain('bg-warning-50');
      expect(el.className).toContain('border-warning-200');
    });

    it('danger tone applies bg-danger-50 + border-danger-200', () => {
      render(<Callout tone="danger">Body</Callout>);
      const el = screen.getByRole('alert');
      expect(el.className).toContain('bg-danger-50');
      expect(el.className).toContain('border-danger-200');
    });
  });
});
