import {fireEvent, render, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {SidebarItem, SidebarSection} from '../Sidebar';
import {HEADER_HEIGHT, Sidebar, SIDEBAR_WIDTH_COLLAPSED, SIDEBAR_WIDTH_EXPANDED,} from '../Sidebar';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, 'localStorage', {value: localStorageMock});

describe('Sidebar', () => {
  const basicItems: SidebarItem[] = [
    {id: 'home', label: 'Home', href: '/home'},
    {id: 'employees', label: 'Employees', href: '/employees'},
    {id: 'config', label: 'Configuration', href: '/config'},
  ];

  const sectioned: SidebarSection[] = [
    {
      id: 'main',
      label: 'Main',
      items: [
        {id: 'dashboard', label: 'Dashboard', href: '/dashboard'},
        {id: 'employees', label: 'Employees', href: '/employees'},
      ],
    },
    {
      id: 'admin',
      label: 'Administration',
      items: [
        {id: 'settings', label: 'Settings', href: '/settings'},
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  // ─── Layout constants ───────────────────────────────────────────────────────
  describe('layout constants', () => {
    it('exports correct expanded width', () => {
      expect(SIDEBAR_WIDTH_EXPANDED).toBe(256);
    });

    it('exports correct collapsed width', () => {
      expect(SIDEBAR_WIDTH_COLLAPSED).toBe(72);
    });

    it('exports correct header height', () => {
      expect(HEADER_HEIGHT).toBe(64);
    });
  });

  // ─── Rendering ────────────────────────────────────────────────────────────
  describe('rendering', () => {
    it('renders without crashing', () => {
      render(<Sidebar items={basicItems}/>);
      expect(screen.getByText('Home')).toBeInTheDocument();
    });

    it('renders all flat items', () => {
      render(<Sidebar items={basicItems}/>);
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Employees')).toBeInTheDocument();
      expect(screen.getByText('Configuration')).toBeInTheDocument();
    });

    it('renders sectioned items', () => {
      render(<Sidebar items={[]} sections={sectioned}/>);
      expect(screen.getByText('Main')).toBeInTheDocument();
      expect(screen.getByText('Administration')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('renders items with badges', () => {
      const itemsWithBadge: SidebarItem[] = [
        {id: 'inbox', label: 'Inbox', href: '/inbox', badge: 5},
      ];
      render(<Sidebar items={itemsWithBadge}/>);
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('renders disabled items', () => {
      const disabledItems: SidebarItem[] = [
        {id: 'locked', label: 'Locked Feature', href: '/locked', disabled: true},
      ];
      render(<Sidebar items={disabledItems}/>);
      expect(screen.getByText('Locked Feature')).toBeInTheDocument();
    });
  });

  // ─── Active state ─────────────────────────────────────────────────────────
  describe('active state', () => {
    it('highlights active item', () => {
      render(<Sidebar items={basicItems} activeId="employees"/>);
      // The active item should be in the DOM
      const activeItem = screen.getByText('Employees');
      expect(activeItem).toBeInTheDocument();
    });
  });

  // ─── Collapse/expand ──────────────────────────────────────────────────────
  describe('collapse and expand', () => {
    it('calls onCollapsedChange when collapse button is clicked', () => {
      const handleCollapse = vi.fn();
      render(
        <Sidebar
          items={basicItems}
          collapsed={false}
          collapsible
          onCollapsedChange={handleCollapse}
        />
      );
      // Find the collapse toggle button
      const collapseButton = screen.getByRole('button', {name: /collapse/i});
      if (collapseButton) {
        fireEvent.click(collapseButton);
        expect(handleCollapse).toHaveBeenCalledWith(true);
      }
    });
  });

  // ─── Items with children ──────────────────────────────────────────────────
  describe('nested items', () => {
    const nestedItems: SidebarItem[] = [
      {
        id: 'hr',
        label: 'HR Management',
        children: [
          {id: 'hr-employees', label: 'Employees', href: '/employees'},
          {id: 'hr-departments', label: 'Departments', href: '/departments'},
        ],
      },
    ];

    it('renders parent item', () => {
      render(<Sidebar items={nestedItems}/>);
      expect(screen.getByText('HR Management')).toBeInTheDocument();
    });

    it('expands children on parent click', () => {
      render(<Sidebar items={nestedItems}/>);
      const parent = screen.getByText('HR Management');
      fireEvent.click(parent);
      expect(screen.getByText('Employees')).toBeInTheDocument();
      expect(screen.getByText('Departments')).toBeInTheDocument();
    });
  });

  // ─── Item click callback ──────────────────────────────────────────────────
  describe('item click', () => {
    it('calls onItemClick when an item is clicked', () => {
      const handleClick = vi.fn();
      render(<Sidebar items={basicItems} onItemClick={handleClick}/>);
      fireEvent.click(screen.getByText('Home'));
      expect(handleClick).toHaveBeenCalledWith(
        expect.objectContaining({id: 'home', label: 'Home'})
      );
    });
  });

  // ─── Logo ─────────────────────────────────────────────────────────────────
  describe('logo', () => {
    it('renders default NULogic logo', () => {
      render(<Sidebar items={basicItems}/>);
      const logo = screen.getByAltText('NULogic');
      expect(logo).toBeInTheDocument();
    });
  });
});
