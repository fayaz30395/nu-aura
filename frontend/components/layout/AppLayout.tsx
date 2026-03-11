'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/auth/AuthGuard';
import {
  LayoutDashboard,
  Users,
  Building2,
  Clock,
  FileText,
  BarChart3,
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
  Plane,
  Zap,
  Activity,
  Home,
  ClipboardCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sidebar, SidebarItem, SidebarSection, MobileBottomNav } from '@/components/ui';
import { Header } from './Header';
import type { HeaderProps } from './Header';
import { Breadcrumbs, type BreadcrumbItem } from './Breadcrumbs';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePermissions, Permissions, Roles } from '@/lib/hooks/usePermissions';
import { useApprovalInboxCount } from '@/lib/hooks/queries/useApprovals';

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

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  breadcrumbs = [],
  headerProps = {},
  className,
  showBreadcrumbs = true,
  sidebarCollapsed: initialCollapsed,
  onSidebarCollapsedChange,
  activeMenuItem = 'dashboard',
  onMenuItemClick,
}) => {
  const router = useRouter();
  const { logout, user, hasHydrated } = useAuth();
  const { permissions, roles, hasPermission, isReady } = usePermissions();
  const isSuperAdmin = useMemo(
    () => roles.includes(Roles.SUPER_ADMIN),
    [roles]
  );

  // Approval inbox count for sidebar badge (polls every 30s)
  const { data: inboxCounts } = useApprovalInboxCount();
  const pendingApprovalCount = inboxCounts?.pending ?? 0;

  // Initialize from localStorage to persist across page refreshes
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (saved !== null) {
        return saved === 'true';
      }
    }
    return initialCollapsed ?? false;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Sync sidebar collapsed state from localStorage on client hydration
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (saved !== null) {
      setIsCollapsed(saved === 'true');
    }
  }, []);

  // Keyboard shortcut for toggling sidebar (Cmd/Ctrl + B)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setIsCollapsed(prev => {
          const newValue = !prev;
          onSidebarCollapsedChange?.(newValue);
          // Persist to localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newValue));
          }
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
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    }
  }, [onSidebarCollapsedChange]);

  const handleMenuItemClick = useCallback((item: SidebarItem) => {
    // Link handles navigation, just notify parent
    onMenuItemClick?.(item);
  }, [onMenuItemClick]);

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
  // Each item carries a requiredPermission so the sidebar is filtered
  // based on the current user's permissions (SuperAdmin sees everything).
  const menuSections: SidebarSection[] = [
    {
      id: 'main',
      label: 'Main',
      items: [
        {
          id: 'home',
          label: 'Home',
          icon: <Home className="h-5 w-5" />,
          href: '/home',
          // Home is visible to all authenticated users — no requiredPermission
        },
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: <LayoutDashboard className="h-5 w-5" />,
          href: '/dashboard',
          requiredPermission: Permissions.DASHBOARD_VIEW,
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
          requiredPermission: Permissions.DASHBOARD_EXECUTIVE,
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
          requiredPermission: Permissions.DASHBOARD_EMPLOYEE,
        },
        {
          id: 'profile',
          label: 'My Profile',
          icon: <User className="h-5 w-5" />,
          href: '/me/profile',
          requiredPermission: Permissions.SELF_SERVICE_PROFILE_UPDATE,
        },
        {
          id: 'payslips',
          label: 'My Payslips',
          icon: <CreditCard className="h-5 w-5" />,
          href: '/me/payslips',
          requiredPermission: Permissions.SELF_SERVICE_VIEW_PAYSLIP,
        },
        {
          id: 'my-attendance',
          label: 'My Attendance',
          icon: <CalendarCheck className="h-5 w-5" />,
          href: '/me/attendance',
          requiredPermission: Permissions.ATTENDANCE_VIEW_SELF,
        },
        {
          id: 'leaves',
          label: 'My Leaves',
          icon: <Palmtree className="h-5 w-5" />,
          href: '/me/leaves',
          requiredPermission: Permissions.LEAVE_VIEW_SELF,
        },
        {
          id: 'my-documents',
          label: 'My Documents',
          icon: <FileText className="h-5 w-5" />,
          href: '/me/documents',
          requiredPermission: Permissions.DOCUMENT_VIEW,
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
          requiredPermission: Permissions.ANNOUNCEMENT_VIEW,
        },
        {
          id: 'team-directory',
          label: 'Team Directory',
          icon: <UsersRound className="h-5 w-5" />,
          href: '/employees/directory',
          requiredPermission: Permissions.EMPLOYEE_READ,
        },
        {
          id: 'org-chart',
          label: 'Org Chart',
          icon: <GitBranch className="h-5 w-5" />,
          href: '/org-chart',
          requiredPermission: Permissions.ORG_STRUCTURE_VIEW,
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
          requiredPermission: Permissions.EMPLOYEE_VIEW_ALL,
        },
        {
          id: 'departments',
          label: 'Departments',
          icon: <Building2 className="h-5 w-5" />,
          href: '/departments',
          requiredPermission: Permissions.DEPARTMENT_VIEW,
        },
        {
          id: 'attendance',
          label: 'Attendance',
          icon: <Clock className="h-5 w-5" />,
          href: '/attendance',
          requiredPermission: Permissions.ATTENDANCE_VIEW_ALL,
        },
        {
          id: 'leave',
          label: 'Leave Management',
          icon: <FileText className="h-5 w-5" />,
          href: '/leave',
          requiredPermission: Permissions.LEAVE_VIEW_ALL,
        },
        {
          id: 'approvals',
          label: 'Approvals',
          icon: <ClipboardCheck className="h-5 w-5" />,
          href: '/approvals/inbox',
          badge: pendingApprovalCount > 0 ? pendingApprovalCount : undefined,
          requiredPermission: Permissions.WORKFLOW_VIEW,
        },
        {
          id: 'recruitment',
          label: 'Recruitment',
          icon: <UserPlus className="h-5 w-5" />,
          href: '/recruitment',
          requiredPermission: Permissions.RECRUITMENT_VIEW,
          children: [
            { id: 'jobs', label: 'Job Openings', href: '/recruitment/jobs', requiredPermission: Permissions.RECRUITMENT_VIEW },
            { id: 'candidates', label: 'Candidates', href: '/recruitment/candidates', requiredPermission: Permissions.CANDIDATE_VIEW },
            { id: 'interviews', label: 'Interviews', href: '/recruitment/interviews', requiredPermission: Permissions.RECRUITMENT_VIEW },
            { id: 'onboarding', label: 'Onboarding', href: '/onboarding', requiredPermission: Permissions.ONBOARDING_VIEW },
          ],
        },
        {
          id: 'offboarding',
          label: 'Offboarding',
          icon: <UserMinus className="h-5 w-5" />,
          href: '/offboarding',
          requiredPermission: Permissions.EXIT_VIEW,
        },
        {
          id: 'assets',
          label: 'Assets',
          icon: <Package className="h-5 w-5" />,
          href: '/assets',
          requiredPermission: Permissions.ASSET_VIEW,
        },
        {
          id: 'letters',
          label: 'Letters',
          icon: <Mail className="h-5 w-5" />,
          href: '/letters',
          requiredPermission: Permissions.LETTER_TEMPLATE_VIEW,
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
          requiredPermission: Permissions.REVIEW_VIEW,
        },
        {
          id: 'performance-revolution',
          label: 'Revolution',
          icon: <Zap className="h-5 w-5 text-yellow-500" />,
          href: '/performance/revolution',
          requiredPermission: Permissions.REVIEW_VIEW,
        },
        {
          id: 'okr',
          label: 'OKR',
          icon: <Target className="h-5 w-5" />,
          href: '/performance/okr',
          requiredPermission: Permissions.OKR_VIEW,
        },
        {
          id: 'feedback360',
          label: '360 Feedback',
          icon: <MessageCircle className="h-5 w-5" />,
          href: '/performance/360-feedback',
          requiredPermission: Permissions.FEEDBACK_360_VIEW,
        },
        {
          id: 'training',
          label: 'Training',
          icon: <GraduationCap className="h-5 w-5" />,
          href: '/training',
          requiredPermission: Permissions.TRAINING_VIEW,
        },
        {
          id: 'learning',
          label: 'Learning',
          icon: <BookOpen className="h-5 w-5" />,
          href: '/learning',
          requiredPermission: Permissions.LMS_COURSE_VIEW,
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
          requiredPermission: Permissions.PAYROLL_VIEW,
        },
        {
          id: 'compensation',
          label: 'Compensation',
          icon: <TrendingUp className="h-5 w-5" />,
          href: '/compensation',
          requiredPermission: Permissions.COMPENSATION_VIEW,
        },
        {
          id: 'benefits',
          label: 'Benefits',
          icon: <Gift className="h-5 w-5" />,
          href: '/benefits',
          requiredPermission: Permissions.BENEFIT_VIEW,
        },
        {
          id: 'expenses',
          label: 'Expenses',
          icon: <Receipt className="h-5 w-5" />,
          href: '/expenses',
          requiredPermission: Permissions.EXPENSE_VIEW,
        },
        {
          id: 'travel',
          label: 'Travel',
          icon: <Plane className="h-5 w-5" />,
          href: '/travel',
          requiredPermission: Permissions.TRAVEL_VIEW,
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
          requiredPermission: Permissions.RECOGNITION_VIEW,
        },
        {
          id: 'surveys',
          label: 'Surveys',
          icon: <ClipboardList className="h-5 w-5" />,
          href: '/surveys',
          requiredPermission: Permissions.SURVEY_VIEW,
        },
        {
          id: 'wellness',
          label: 'Wellness',
          icon: <Heart className="h-5 w-5" />,
          href: '/wellness',
          requiredPermission: Permissions.WELLNESS_VIEW,
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
          requiredPermission: Permissions.REPORT_VIEW,
        },
        {
          id: 'org-health',
          label: 'Org Health',
          icon: <Activity className="h-5 w-5 text-primary-500" />,
          href: '/analytics/org-health',
          requiredPermission: Permissions.ANALYTICS_VIEW,
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
          requiredPermission: Permissions.ROLE_MANAGE,
        },
        {
          id: 'permissions',
          label: 'Permissions',
          icon: <Shield className="h-5 w-5" />,
          href: '/admin/permissions',
          requiredPermission: Permissions.PERMISSION_MANAGE,
        },
        {
          id: 'holidays',
          label: 'Holidays',
          icon: <Calendar className="h-5 w-5" />,
          href: '/admin/holidays',
          requiredPermission: Permissions.SETTINGS_VIEW,
        },
        {
          id: 'leave-types',
          label: 'Leave Types',
          icon: <Palmtree className="h-5 w-5" />,
          href: '/admin/leave-types',
          requiredPermission: Permissions.LEAVE_TYPE_VIEW,
        },
        {
          id: 'leave-requests',
          label: 'Leave Requests',
          icon: <FileText className="h-5 w-5" />,
          href: '/admin/leave-requests',
          requiredPermission: Permissions.LEAVE_VIEW_ALL,
        },
        {
          id: 'shifts',
          label: 'Shifts',
          icon: <Timer className="h-5 w-5" />,
          href: '/admin/shifts',
          requiredPermission: Permissions.SETTINGS_VIEW,
        },
        {
          id: 'office-locations',
          label: 'Office Locations',
          icon: <MapPin className="h-5 w-5" />,
          href: '/admin/office-locations',
          requiredPermission: Permissions.OFFICE_LOCATION_VIEW,
        },
        {
          id: 'org-hierarchy',
          label: 'Org Hierarchy',
          icon: <Network className="h-5 w-5" />,
          href: '/admin/org-hierarchy',
          requiredPermission: Permissions.ORG_STRUCTURE_MANAGE,
        },
        {
          id: 'custom-fields',
          label: 'Custom Fields',
          icon: <Sliders className="h-5 w-5" />,
          href: '/admin/custom-fields',
          requiredPermission: Permissions.CUSTOM_FIELD_VIEW,
        },
        {
          id: 'helpdesk',
          label: 'Helpdesk',
          icon: <Headphones className="h-5 w-5" />,
          href: '/helpdesk/sla',
          requiredPermission: Permissions.HELPDESK_SLA_MANAGE,
        },
        {
          id: 'admin-settings',
          label: 'Admin Settings',
          icon: <Settings className="h-5 w-5" />,
          href: '/admin/settings',
          requiredPermission: Permissions.SETTINGS_VIEW,
        },
        {
          id: 'settings',
          label: 'Settings',
          icon: <Settings className="h-5 w-5" />,
          href: '/settings',
          requiredPermission: Permissions.SETTINGS_VIEW,
        },
      ],
    },
  ];

  // ── Permission-based sidebar filtering ──────────────────────────────
  // SuperAdmin users see every item; other users only see items whose
  // requiredPermission they possess. Items without a requiredPermission
  // are always visible (e.g. Home).
  const filterSidebarItems = (items: SidebarItem[]): SidebarItem[] => {
    if (!isReady) {
      // During hydration, show the raw menu to avoid flicker
      return items;
    }

    const filterItem = (item: SidebarItem): SidebarItem | null => {
      if (!isSuperAdmin) {
        if (item.requiredPermission && !hasPermission(item.requiredPermission)) {
          return null;
        }
      }

      if (item.children && item.children.length > 0) {
        const visibleChildren = item.children
          .map((child) => filterItem(child))
          .filter((child): child is SidebarItem => child !== null);

        if (visibleChildren.length === 0 && !item.href) {
          return null;
        }

        return { ...item, children: visibleChildren };
      }

      return item;
    };

    return items
      .map((item) => filterItem(item))
      .filter((item): item is SidebarItem => item !== null);
  };

  // Filter each section's items, then drop empty sections
  const filteredSections: SidebarSection[] = useMemo(() => {
    return menuSections
      .map((section) => ({
        ...section,
        items: filterSidebarItems(section.items),
      }))
      .filter((section) => section.items.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(permissions), JSON.stringify(roles), isReady]);

  // Flatten sections to items for backward compatibility (memoized)
  const menuItems: SidebarItem[] = useMemo(() =>
    filteredSections.flatMap(section => section.items),
    [filteredSections]
  );

  return (
    <div className={cn('flex h-screen overflow-hidden bg-surface-50 dark:bg-surface-950', className)}>
      {/* Sidebar */}
      <aside className="hidden md:block">
        <Sidebar
          items={menuItems}
          sections={filteredSections}
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
              sections={filteredSections}
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
          userAvatar={user?.profilePictureUrl}
          userRole={user?.roles?.[0]?.name || 'Employee'}
          {...headerProps}
        />

        {/* Breadcrumbs */}
        {showBreadcrumbs && breadcrumbs.length > 0 && (
          <div className="border-b border-surface-200 bg-white/50 backdrop-blur-sm px-4 py-3 dark:border-surface-800 dark:bg-surface-900/50 sm:px-6">
            <Breadcrumbs items={breadcrumbs} />
          </div>
        )}

        {/* Content Area - Wrapped in AuthGuard for route-level permission enforcement */}
        <main className="flex-1 overflow-auto bg-surface-50 dark:bg-surface-950">
          <AuthGuard>
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
          </AuthGuard>
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
