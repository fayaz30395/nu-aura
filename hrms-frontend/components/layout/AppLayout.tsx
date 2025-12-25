'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Building2,
  Clock,
  FileText,
  BarChart3,
  Briefcase,
  DollarSign,
  GitBranch,
  User,
  CreditCard,
  CalendarCheck,
  Palmtree,
  Shield,
  Download,
  Megaphone,
  UsersRound,
  UserPlus,
  GraduationCap,
  Award,
  Heart,
  Gift,
  ClipboardList,
  TrendingUp,
  Settings,
  Receipt,
  BookOpen,
  Headphones,
  Target,
  MessageCircle,
  Calendar,
  MapPin,
  Network,
  Timer,
  Sliders,
  Package,
  UserMinus,
  Mail,
  HardDrive,
  Inbox,
  Plane,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sidebar, SidebarItem, SidebarSection, MobileBottomNav } from '@/components/ui';
import { Header } from './Header';
import type { HeaderProps } from './Header';
import { Breadcrumbs, type BreadcrumbItem } from './Breadcrumbs';
import { useAuth } from '@/lib/hooks/useAuth';

export interface AppLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  headerProps?: Partial<HeaderProps>;
  className?: string;
  showBreadcrumbs?: boolean;
  sidebarCollapsed?: boolean;
  onSidebarCollapsedChange?: (collapsed: boolean) => void;
  activeMenuItem?: string;
  onMenuItemClick?: (item: SidebarItem) => void;
}

const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  breadcrumbs = [],
  headerProps = {},
  className,
  showBreadcrumbs = true,
  sidebarCollapsed: initialCollapsed = false,
  onSidebarCollapsedChange,
  activeMenuItem = 'dashboard',
  onMenuItemClick,
}) => {
  const router = useRouter();
  const { logout, user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keyboard shortcut for toggling sidebar (Cmd/Ctrl + B)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setIsCollapsed(prev => {
          const newValue = !prev;
          onSidebarCollapsedChange?.(newValue);
          return newValue;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSidebarCollapsedChange]);

  const handleSidebarCollapsedChange = useCallback((collapsed: boolean) => {
    setIsCollapsed(collapsed);
    onSidebarCollapsedChange?.(collapsed);
  }, [onSidebarCollapsedChange]);

  const handleMenuItemClick = (item: SidebarItem) => {
    if (item.href) {
      router.push(item.href);
    }
    onMenuItemClick?.(item);
  };

  const handleProfile = () => {
    router.push('/me/profile');
  };

  const handleSettings = () => {
    router.push('/settings');
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
    router.push('/auth/login');
  };

  // Navigation sections for HRMS - organized into logical groups
  const menuSections: SidebarSection[] = [
    {
      id: 'main',
      label: 'Main',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: <LayoutDashboard className="h-5 w-5" />,
          href: '/dashboard',
        },
      ],
    },
    {
      id: 'dashboards',
      label: 'Dashboards',
      items: [
        {
          id: 'executive-dashboard',
          label: 'Executive',
          icon: <TrendingUp className="h-5 w-5" />,
          href: '/dashboards/executive',
        },
      ],
    },
    {
      id: 'nu-apps',
      label: 'Nu Apps',
      items: [
        {
          id: 'nu-drive',
          label: 'NU-Drive',
          icon: <HardDrive className="h-5 w-5" />,
          href: '/nu-drive',
        },
        {
          id: 'nu-mail',
          label: 'Nu-Mail',
          icon: <Inbox className="h-5 w-5" />,
          href: '/nu-mail',
        },
        {
          id: 'nu-calendar',
          label: 'NU-Calendar',
          icon: <Calendar className="h-5 w-5" />,
          href: '/nu-calendar',
        },
      ],
    },
    {
      id: 'self-service',
      label: 'Self Service',
      items: [
        {
          id: 'my-dashboard',
          label: 'My Dashboard',
          icon: <LayoutDashboard className="h-5 w-5" />,
          href: '/me/dashboard',
        },
        {
          id: 'profile',
          label: 'My Profile',
          icon: <User className="h-5 w-5" />,
          href: '/me/profile',
        },
        {
          id: 'payslips',
          label: 'My Payslips',
          icon: <CreditCard className="h-5 w-5" />,
          href: '/me/payslips',
        },
        {
          id: 'my-attendance',
          label: 'My Attendance',
          icon: <CalendarCheck className="h-5 w-5" />,
          href: '/me/attendance',
        },
        {
          id: 'leaves',
          label: 'My Leaves',
          icon: <Palmtree className="h-5 w-5" />,
          href: '/me/leaves',
        },
        {
          id: 'my-documents',
          label: 'My Documents',
          icon: <FileText className="h-5 w-5" />,
          href: '/me/documents',
        },
      ],
    },
    {
      id: 'company',
      label: 'Company',
      items: [
        {
          id: 'announcements',
          label: 'Announcements',
          icon: <Megaphone className="h-5 w-5" />,
          href: '/announcements',
        },
        {
          id: 'team-directory',
          label: 'Team Directory',
          icon: <UsersRound className="h-5 w-5" />,
          href: '/employees/directory',
        },
        {
          id: 'org-chart',
          label: 'Org Chart',
          icon: <GitBranch className="h-5 w-5" />,
          href: '/organization-chart',
        },
      ],
    },
    {
      id: 'hr-management',
      label: 'HR Management',
      items: [
        {
          id: 'employees',
          label: 'Employees',
          icon: <Users className="h-5 w-5" />,
          href: '/employees',
        },
        {
          id: 'departments',
          label: 'Departments',
          icon: <Building2 className="h-5 w-5" />,
          href: '/departments',
        },
        {
          id: 'attendance',
          label: 'Attendance',
          icon: <Clock className="h-5 w-5" />,
          href: '/attendance',
        },
        {
          id: 'leave',
          label: 'Leave Management',
          icon: <FileText className="h-5 w-5" />,
          href: '/leave',
        },
        {
          id: 'recruitment',
          label: 'Recruitment',
          icon: <UserPlus className="h-5 w-5" />,
          href: '/recruitment',
          children: [
            { id: 'jobs', label: 'Job Openings', href: '/recruitment/jobs' },
            { id: 'candidates', label: 'Candidates', href: '/recruitment/candidates' },
            { id: 'interviews', label: 'Interviews', href: '/recruitment/interviews' },
            { id: 'onboarding', label: 'Onboarding', href: '/onboarding' },
          ],
        },
        {
          id: 'offboarding',
          label: 'Offboarding',
          icon: <UserMinus className="h-5 w-5" />,
          href: '/offboarding',
        },
        {
          id: 'assets',
          label: 'Assets',
          icon: <Package className="h-5 w-5" />,
          href: '/assets',
        },
        {
          id: 'letters',
          label: 'Letters',
          icon: <Mail className="h-5 w-5" />,
          href: '/letters',
        },
      ],
    },
    {
      id: 'performance-growth',
      label: 'Performance & Growth',
      items: [
        {
          id: 'performance',
          label: 'Performance',
          icon: <BarChart3 className="h-5 w-5" />,
          href: '/performance',
        },
        {
          id: 'okr',
          label: 'OKR',
          icon: <Target className="h-5 w-5" />,
          href: '/performance/okr',
        },
        {
          id: 'feedback360',
          label: '360 Feedback',
          icon: <MessageCircle className="h-5 w-5" />,
          href: '/performance/360-feedback',
        },
        {
          id: 'training',
          label: 'Training',
          icon: <GraduationCap className="h-5 w-5" />,
          href: '/training',
        },
        {
          id: 'learning',
          label: 'Learning',
          icon: <BookOpen className="h-5 w-5" />,
          href: '/learning',
        },
        {
          id: 'projects',
          label: 'Projects',
          icon: <Briefcase className="h-5 w-5" />,
          href: '/projects',
        },
      ],
    },
    {
      id: 'resource-management',
      label: 'Resource Management',
      items: [
        {
          id: 'resources',
          label: 'Resources',
          icon: <Users className="h-5 w-5" />,
          href: '/resources',
        },
        {
          id: 'workload',
          label: 'Workload Dashboard',
          icon: <BarChart3 className="h-5 w-5" />,
          href: '/resources/workload',
        },
        {
          id: 'availability',
          label: 'Availability Calendar',
          icon: <Calendar className="h-5 w-5" />,
          href: '/resources/availability',
        },
        {
          id: 'allocations',
          label: 'Allocation Approvals',
          icon: <Clock className="h-5 w-5" />,
          href: '/resources/approvals',
        },
        {
          id: 'timesheets',
          label: 'Timesheets',
          icon: <Timer className="h-5 w-5" />,
          href: '/timesheets',
        },
      ],
    },
    {
      id: 'compensation-benefits',
      label: 'Compensation & Benefits',
      items: [
        {
          id: 'payroll',
          label: 'Payroll',
          icon: <DollarSign className="h-5 w-5" />,
          href: '/payroll',
        },
        {
          id: 'compensation',
          label: 'Compensation',
          icon: <TrendingUp className="h-5 w-5" />,
          href: '/compensation',
        },
        {
          id: 'benefits',
          label: 'Benefits',
          icon: <Gift className="h-5 w-5" />,
          href: '/benefits',
        },
        {
          id: 'expenses',
          label: 'Expenses',
          icon: <Receipt className="h-5 w-5" />,
          href: '/expenses',
        },
        {
          id: 'travel',
          label: 'Travel',
          icon: <Plane className="h-5 w-5" />,
          href: '/travel',
        },
      ],
    },
    {
      id: 'engagement-wellness',
      label: 'Engagement & Wellness',
      items: [
        {
          id: 'recognition',
          label: 'Recognition',
          icon: <Award className="h-5 w-5" />,
          href: '/recognition',
        },
        {
          id: 'surveys',
          label: 'Surveys',
          icon: <ClipboardList className="h-5 w-5" />,
          href: '/surveys',
        },
        {
          id: 'wellness',
          label: 'Wellness',
          icon: <Heart className="h-5 w-5" />,
          href: '/wellness',
        },
      ],
    },
    {
      id: 'reports-analytics',
      label: 'Reports',
      items: [
        {
          id: 'reports',
          label: 'Reports',
          icon: <Download className="h-5 w-5" />,
          href: '/reports',
        },
      ],
    },
    {
      id: 'settings',
      label: 'Settings',
      items: [
        {
          id: 'roles',
          label: 'Role Management',
          icon: <Shield className="h-5 w-5" />,
          href: '/admin/roles',
        },
        {
          id: 'permissions',
          label: 'Permissions',
          icon: <Shield className="h-5 w-5" />,
          href: '/admin/permissions',
        },
        {
          id: 'holidays',
          label: 'Holidays',
          icon: <Calendar className="h-5 w-5" />,
          href: '/admin/holidays',
        },
        {
          id: 'leave-types',
          label: 'Leave Types',
          icon: <Palmtree className="h-5 w-5" />,
          href: '/admin/leave-types',
        },
        {
          id: 'leave-requests',
          label: 'Leave Requests',
          icon: <FileText className="h-5 w-5" />,
          href: '/admin/leave-requests',
        },
        {
          id: 'shifts',
          label: 'Shifts',
          icon: <Timer className="h-5 w-5" />,
          href: '/admin/shifts',
        },
        {
          id: 'office-locations',
          label: 'Office Locations',
          icon: <MapPin className="h-5 w-5" />,
          href: '/admin/office-locations',
        },
        {
          id: 'org-hierarchy',
          label: 'Org Hierarchy',
          icon: <Network className="h-5 w-5" />,
          href: '/admin/org-hierarchy',
        },
        {
          id: 'custom-fields',
          label: 'Custom Fields',
          icon: <Sliders className="h-5 w-5" />,
          href: '/admin/custom-fields',
        },
        {
          id: 'helpdesk',
          label: 'Helpdesk',
          icon: <Headphones className="h-5 w-5" />,
          href: '/helpdesk/sla',
        },
        {
          id: 'admin-settings',
          label: 'Admin Settings',
          icon: <Settings className="h-5 w-5" />,
          href: '/admin/settings',
        },
        {
          id: 'settings',
          label: 'Settings',
          icon: <Settings className="h-5 w-5" />,
          href: '/settings',
        },
      ],
    },
  ];

  // Flatten sections to items for backward compatibility
  const menuItems: SidebarItem[] = menuSections.flatMap(section => section.items);

  return (
    <div className={cn('flex h-screen overflow-hidden bg-surface-50 dark:bg-surface-950', className)}>
      {/* Sidebar */}
      <aside className="hidden md:block">
        <Sidebar
          items={menuItems}
          sections={menuSections}
          activeId={activeMenuItem}
          collapsed={isCollapsed}
          onCollapsedChange={handleSidebarCollapsedChange}
          onItemClick={handleMenuItemClick}
          collapsible
          variant="default"
        />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <>
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden transition-opacity duration-300"
          />
          <aside
            className="fixed inset-y-0 left-0 z-40 w-72 md:hidden transform transition-transform duration-300 ease-out animate-slide-in-left"
          >
            <Sidebar
              items={menuItems}
              sections={menuSections}
              activeId={activeMenuItem}
              collapsed={false}
              onItemClick={(item) => {
                setIsMobileMenuOpen(false);
                handleMenuItemClick(item);
              }}
              collapsible={false}
              variant="default"
            />
          </aside>
        </>
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header
          onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          showMenuButton={true}
          onProfile={handleProfile}
          onSettings={handleSettings}
          onLogout={handleLogout}
          userName={user?.fullName || 'User'}
          userRole={user?.roles?.[0]?.name || 'Employee'}
          {...headerProps}
        />

        {/* Breadcrumbs */}
        {showBreadcrumbs && breadcrumbs.length > 0 && (
          <div className="border-b border-surface-200 bg-white/50 backdrop-blur-sm px-4 py-3 dark:border-surface-800 dark:bg-surface-900/50 sm:px-6">
            <Breadcrumbs items={breadcrumbs} />
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 overflow-auto bg-surface-50 dark:bg-surface-950">
          <div
            className={cn(
              'p-4 sm:p-6 lg:p-8 transition-all duration-300',
              // Add bottom padding for mobile bottom nav
              'pb-24 md:pb-4 lg:pb-8',
              mounted ? 'opacity-100' : 'opacity-0'
            )}
          >
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav
          onMoreClick={() => setIsMobileMenuOpen(true)}
        />
      </div>
    </div>
  );
};

export { AppLayout };
