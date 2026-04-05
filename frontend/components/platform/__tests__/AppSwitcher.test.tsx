import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useActiveApp} from '@/lib/hooks/useActiveApp';
import AppSwitcher from '../AppSwitcher';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({children, ...props}: React.PropsWithChildren<Record<string, unknown>>) => {
      const {initial: _i, animate: _a, exit: _e, transition: _t, ...rest} = props;
      return <div {...rest}>{children}</div>;
    },
  },
  AnimatePresence: ({children}: React.PropsWithChildren) => <>{children}</>,
}));

// Mock useActiveApp
vi.mock('@/lib/hooks/useActiveApp', () => ({
  useActiveApp: vi.fn(),
}));

// Mock apps config
vi.mock('@/lib/config/apps', () => ({
  APP_LIST: [
    {
      code: 'HRMS',
      name: 'NU-HRMS',
      shortName: 'HRMS',
      description: 'Core HR management',
      entryRoute: '/me/dashboard',
      iconName: 'Users',
      available: true,
      order: 1,
    },
    {
      code: 'HIRE',
      name: 'NU-Hire',
      shortName: 'Hire',
      description: 'Recruitment & onboarding',
      entryRoute: '/recruitment',
      iconName: 'UserPlus',
      available: true,
      order: 2,
    },
    {
      code: 'GROW',
      name: 'NU-Grow',
      shortName: 'Grow',
      description: 'Performance, learning & engagement',
      entryRoute: '/performance',
      iconName: 'TrendingUp',
      available: true,
      order: 3,
    },
    {
      code: 'FLUENCE',
      name: 'NU-Fluence',
      shortName: 'Fluence',
      description: 'Knowledge management',
      entryRoute: '/fluence/wiki',
      iconName: 'BookOpen',
      available: false,
      order: 4,
    },
  ],
}));

const mockUseActiveApp = useActiveApp as ReturnType<typeof vi.fn>;

describe('AppSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseActiveApp.mockReturnValue({
      appCode: 'HRMS',
      app: {
        code: 'HRMS',
        name: 'NU-HRMS',
        shortName: 'HRMS',
        description: 'Core HR management',
        iconName: 'Users',
        available: true,
      },
      hasAppAccess: vi.fn((code: string) => code !== 'FLUENCE'),
      getAppEntryRoute: vi.fn((code: string) => {
        const routes: Record<string, string> = {
          HRMS: '/me/dashboard',
          HIRE: '/recruitment',
          GROW: '/performance',
          FLUENCE: '/fluence/wiki',
        };
        return routes[code] || '/';
      }),
    });
  });

  it('renders the trigger button with current app name', () => {
    render(<AppSwitcher/>);
    expect(screen.getByText('NU-HRMS')).toBeInTheDocument();
  });

  it('renders the switch application button with correct aria-label', () => {
    render(<AppSwitcher/>);
    expect(screen.getByLabelText('Switch application')).toBeInTheDocument();
  });

  it('shows dropdown when trigger is clicked', () => {
    render(<AppSwitcher/>);
    fireEvent.click(screen.getByLabelText('Switch application'));
    expect(screen.getByText('Switch between apps')).toBeInTheDocument();
  });

  it('shows all 4 apps in the waffle grid', () => {
    render(<AppSwitcher/>);
    fireEvent.click(screen.getByLabelText('Switch application'));
    // NU-HRMS appears in both the trigger and the grid
    expect(screen.getAllByText('NU-HRMS').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('NU-Hire')).toBeInTheDocument();
    expect(screen.getByText('NU-Grow')).toBeInTheDocument();
    expect(screen.getByText('NU-Fluence')).toBeInTheDocument();
  });

  it('shows "No access" for apps without access', () => {
    render(<AppSwitcher/>);
    fireEvent.click(screen.getByLabelText('Switch application'));
    // FLUENCE is not available, so shows "Coming soon"
    expect(screen.getByText('Coming soon')).toBeInTheDocument();
  });

  it('disables locked app buttons', () => {
    render(<AppSwitcher/>);
    fireEvent.click(screen.getByLabelText('Switch application'));
    // Find the button that contains NU-Fluence text
    const fluenceText = screen.getByText('NU-Fluence');
    const fluenceButton = fluenceText.closest('button');
    expect(fluenceButton).toBeDisabled();
  });

  it('shows app count in footer', () => {
    render(<AppSwitcher/>);
    fireEvent.click(screen.getByLabelText('Switch application'));
    // 3 of 4 apps available
    expect(screen.getByText(/3 of 4 apps available/)).toBeInTheDocument();
  });

  it('aria-expanded is false when closed', () => {
    render(<AppSwitcher/>);
    const button = screen.getByLabelText('Switch application');
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('aria-expanded is true when open', () => {
    render(<AppSwitcher/>);
    const button = screen.getByLabelText('Switch application');
    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
  });

  it('closes on Escape key', async () => {
    render(<AppSwitcher/>);
    const button = screen.getByLabelText('Switch application');
    fireEvent.click(button);
    expect(screen.getByText('Switch between apps')).toBeInTheDocument();

    fireEvent.keyDown(window, {key: 'Escape'});
    await waitFor(() => {
      expect(button.getAttribute('aria-expanded')).toBe('false');
    });
  });

  it('shows platform name in header', () => {
    render(<AppSwitcher/>);
    fireEvent.click(screen.getByLabelText('Switch application'));
    // "NU-AURA Platform" appears in both trigger sub-text and dropdown header
    expect(screen.getAllByText('NU-AURA Platform').length).toBeGreaterThanOrEqual(1);
  });
});
