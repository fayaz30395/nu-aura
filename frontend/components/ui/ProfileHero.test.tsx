import {describe, expect, it} from 'vitest';
import {render, screen} from '@/lib/test-utils';
import {ProfileHero, ProfileIdentity} from './ProfileHero';

describe('ProfileHero', () => {
  describe('default variant (page header)', () => {
    it('renders the name as an h1 by default', () => {
      render(<ProfileHero name="Arun T" subtitle="Software Engineer" />);
      const heading = screen.getByRole('heading', {level: 1, name: 'Arun T'});
      expect(heading).toBeInTheDocument();
    });

    it('renders subtitle, meta, status and actions slots', () => {
      render(
        <ProfileHero
          name="Arun T"
          subtitle="Software Engineer"
          meta={<span>EMP-0001</span>}
          status={<span data-testid="status">Active</span>}
          actions={<button type="button">Edit</button>}
        />,
      );
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
      expect(screen.getByText('EMP-0001')).toBeInTheDocument();
      expect(screen.getByTestId('status')).toBeInTheDocument();
      expect(screen.getByRole('button', {name: 'Edit'})).toBeInTheDocument();
    });
  });

  describe('headingLevel (accessibility — single h1 per screen)', () => {
    it('renders an h2 when headingLevel="h2"', () => {
      render(<ProfileHero name="Fiona Nance" headingLevel="h2" variant="compact" />);
      expect(screen.getByRole('heading', {level: 2, name: 'Fiona Nance'})).toBeInTheDocument();
      expect(screen.queryByRole('heading', {level: 1})).not.toBeInTheDocument();
    });

    it('renders an h3 when headingLevel="h3"', () => {
      render(<ProfileHero name="Priya K" headingLevel="h3" variant="compact" align="center" />);
      expect(screen.getByRole('heading', {level: 3, name: 'Priya K'})).toBeInTheDocument();
    });
  });

  describe('back affordance', () => {
    it('renders the back control when onBack is provided', () => {
      render(<ProfileHero name="Arun T" onBack={() => {}} backLabel="Back to directory" />);
      expect(screen.getByRole('button', {name: /back to directory/i})).toBeInTheDocument();
    });

    it('omits the back control by default', () => {
      render(<ProfileHero name="Arun T" />);
      expect(screen.queryByRole('button', {name: /back/i})).not.toBeInTheDocument();
    });
  });

  describe('topBand slot', () => {
    it('renders a cover/gradient band when provided', () => {
      render(<ProfileHero name="Arun T" topBand={<div data-testid="cover" />} />);
      expect(screen.getByTestId('cover')).toBeInTheDocument();
    });
  });
});

describe('ProfileIdentity (inline row)', () => {
  it('renders the name and secondary line', () => {
    render(<ProfileIdentity name="Bharath R" secondary="EMP-0007" />);
    expect(screen.getByText('Bharath R')).toBeInTheDocument();
    expect(screen.getByText('EMP-0007')).toBeInTheDocument();
  });

  it('omits the secondary line when not provided', () => {
    render(<ProfileIdentity name="Bharath R" />);
    expect(screen.getByText('Bharath R')).toBeInTheDocument();
    expect(screen.queryByText('EMP-0007')).not.toBeInTheDocument();
  });
});
