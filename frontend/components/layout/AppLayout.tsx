'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
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
  Folder,
  Inbox,
  Briefcase,
  BarChart2,
  Landmark,
  FileCheck,
  UserCheck,
  ClipboardSignature,
  Newspaper,
  FolderKanban,
  GanttChart,
  Repeat,
  Send,
  FileStack,
  Banknote,
  Building,
  FileSpreadsheet,
  Scale,
  HardDrive,
  Folders,
  AlarmClock,
  PieChart,
  Wallet,
  AlertTriangle,
  Cloud,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sidebar, SidebarItem, SidebarSection, MobileBottomNav } from '@/components/ui';
import { Header } from './Header';
import type { HeaderProps } from './Header';
import { Breadcrumbs, type BreadcrumbItem } from './Breadcrumbs';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePermissions, Permissions, Roles } from '@/lib/hooks/usePermissions';
import { useApprovalInboxCount } from '@/lib/hooks/queries/useApprovals';
import { useActiveApp } from '@/lib/hooks/useActiveApp';
import { APP_SIDEBAR_SECTIONS } from '@/lib/config/apps';

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

  const { appCode } = useActiveApp();

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

  // ── Sidebar Navigation ─────────────────────────────────────────────
  // Consolidated into 8 logical sections (down from 12) for cleaner navigation.
  // Each item carries a requiredPermission so the sidebar is filtered
  // based on the current user's permissions (SuperAdmin sees everything).
  const menuSections: SidebarSection[] = [
    // ─── 1. HOME ────────────────────────────────────────────────────
    {
      id: 'home',
      label: 'Home',
      items: [
        { id: 'home', label: 'Home', icon: <Home className="h-5 w-5" />, href: '/home' },
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" />, href: '/dashboard', requiredPermission: Permissions.DASHBOARD_VIEW },
        { id: 'executive-dashboard', label: 'Executive', icon: <TrendingUp className="h-5 w-5" />, href: '/dashboards/executive', requiredPermission: Permissions.DASHBOARD_EXECUTIVE },
      ],
    },
    // ─── 2. MY SPACE (Self-Service) ─────────────────────────────────
    {
      id: 'my-space',
      label: 'My Space',
      items: [
        { id: 'my-dashboard', label: 'My Dashboard', icon: <LayoutDashboard className="h-5 w-5" />, href: '/me/dashboard', requiredPermission: Permissions.DASHBOARD_EMPLOYEE },
        { id: 'profile', label: 'My Profile', icon: <User className="h-5 w-5" />, href: '/me/profile', requiredPermission: Permissions.SELF_SERVICE_PROFILE_UPDATE },
        { id: 'payslips', label: 'My Payslips', icon: <CreditCard className="h-5 w-5" />, href: '/me/payslips', requiredPermission: Permissions.SELF_SERVICE_VIEW_PAYSLIP },
        { id: 'my-attendance', label: 'My Attendance', icon: <CalendarCheck className="h-5 w-5" />, href: '/me/attendance', requiredPermission: Permissions.ATTENDANCE_VIEW_SELF },
        { id: 'leaves', label: 'My Leaves', icon: <Palmtree className="h-5 w-5" />, href: '/me/leaves', requiredPermission: Permissions.LEAVE_VIEW_SELF },
        { id: 'my-documents', label: 'My Documents', icon: <FileText className="h-5 w-5" />, href: '/me/documents', requiredPermission: Permissions.DOCUMENT_VIEW },
      ],
    },
    // ─── 3. PEOPLE & ORGANIZATION ───────────────────────────────────
    {
      id: 'people',
      label: 'People',
      items: [
        { id: 'employees', label: 'Employees', icon: <Users className="h-5 w-5" />, href: '/employees', requiredPermission: Permissions.EMPLOYEE_VIEW_ALL },
        { id: 'departments', label: 'Departments', icon: <Building2 className="h-5 w-5" />, href: '/departments', requiredPermission: Permissions.DEPARTMENT_VIEW },
        { id: 'team-directory', label: 'Team Directory', icon: <UsersRound className="h-5 w-5" />, href: '/employees/directory', requiredPermission: Permissions.EMPLOYEE_READ },
        { id: 'org-chart', label: 'Org Chart', icon: <GitBranch className="h-5 w-5" />, href: '/org-chart', requiredPermission: Permissions.ORG_STRUCTURE_VIEW },
        { id: 'announcements', label: 'Announcements', icon: <Megaphone className="h-5 w-5" />, href: '/announcements', requiredPermission: Permissions.ANNOUNCEMENT_VIEW },
        { id: 'approvals', label: 'Approvals', icon: <ClipboardCheck className="h-5 w-5" />, href: '/approvals/inbox', badge: pendingApprovalCount > 0 ? pendingApprovalCount : undefined, requiredPermission: Permissions.WORKFLOW_VIEW },
      ],
    },
    // ─── 4. HR OPERATIONS ───────────────────────────────────────────
    {
      id: 'hr-ops',
      label: 'HR Operations',
      items: [
        {
          id: 'attendance', label: 'Attendance', icon: <Clock className="h-5 w-5" />, href: '/attendance', requiredPermission: Permissions.ATTENDANCE_VIEW_ALL,
          children: [
            { id: 'attendance-overview', label: 'Overview', href: '/attendance', icon: <BarChart2 className="h-4 w-4" />, requiredPermission: Permissions.ATTENDANCE_VIEW_ALL },
            { id: 'attendance-team', label: 'Team Attendance', href: '/attendance/team', icon: <Users className="h-4 w-4" />, requiredPermission: Permissions.ATTENDANCE_VIEW_ALL },
            { id: 'attendance-regularization', label: 'Regularization', href: '/attendance/regularization', icon: <FileCheck className="h-4 w-4" />, requiredPermission: Permissions.ATTENDANCE_VIEW_ALL },
            { id: 'attendance-comp-off', label: 'Comp-Off', href: '/attendance/comp-off', icon: <AlarmClock className="h-4 w-4" />, requiredPermission: Permissions.ATTENDANCE_VIEW_ALL },
            { id: 'attendance-shift-swap', label: 'Shift Swap', href: '/attendance/shift-swap', icon: <Repeat className="h-4 w-4" />, requiredPermission: Permissions.ATTENDANCE_VIEW_ALL },
          ],
        },
        {
          id: 'leave', label: 'Leave Management', icon: <Palmtree className="h-5 w-5" />, href: '/leave', requiredPermission: Permissions.LEAVE_VIEW_ALL,
          children: [
            { id: 'leave-overview', label: 'Overview', href: '/leave', icon: <LayoutDashboard className="h-4 w-4" />, requiredPermission: Permissions.LEAVE_VIEW_ALL },
            { id: 'leave-my-leaves', label: 'My Leaves', href: '/leave/my-leaves', icon: <User className="h-4 w-4" />, requiredPermission: Permissions.LEAVE_VIEW_SELF },
            { id: 'leave-apply', label: 'Apply Leave', href: '/leave/apply', icon: <Send className="h-4 w-4" />, requiredPermission: Permissions.LEAVE_APPLY },
            { id: 'leave-approvals', label: 'Leave Approvals', href: '/leave/approvals', icon: <ClipboardCheck className="h-4 w-4" />, requiredPermission: Permissions.LEAVE_APPROVE },
            { id: 'leave-calendar', label: 'Leave Calendar', href: '/leave/calendar', icon: <Calendar className="h-4 w-4" />, requiredPermission: Permissions.LEAVE_VIEW_ALL },
          ],
        },
        { id: 'assets', label: 'Assets', icon: <Package className="h-5 w-5" />, href: '/assets', requiredPermission: Permissions.ASSET_VIEW },
        { id: 'letters', label: 'Letters', icon: <Mail className="h-5 w-5" />, href: '/letters', requiredPermission: Permissions.LETTER_TEMPLATE_VIEW },
        { id: 'contracts', label: 'Contracts', icon: <FileText className="h-5 w-5" />, href: '/contracts', requiredPermission: Permissions.CONTRACT_VIEW },
      ],
    },
    // ─── 5. PERFORMANCE & GROWTH (shown in HRMS sidebar) ───────────
    {
      id: 'performance',
      label: 'Performance',
      items: [
        { id: 'performance', label: 'Performance Hub', icon: <BarChart3 className="h-5 w-5" />, href: '/performance', requiredPermission: Permissions.REVIEW_VIEW },
        { id: 'performance-revolution', label: 'Revolution', icon: <Zap className="h-5 w-5 text-yellow-500" />, href: '/performance/revolution', requiredPermission: Permissions.REVIEW_VIEW },
        { id: 'okr', label: 'OKR', icon: <Target className="h-5 w-5" />, href: '/performance/okr', requiredPermission: Permissions.OKR_VIEW },
        { id: 'feedback360', label: '360 Feedback', icon: <MessageCircle className="h-5 w-5" />, href: '/performance/360-feedback', requiredPermission: Permissions.FEEDBACK_360_VIEW },
        { id: 'training', label: 'Training', icon: <GraduationCap className="h-5 w-5" />, href: '/training', requiredPermission: Permissions.TRAINING_VIEW },
        { id: 'learning', label: 'Learning', icon: <BookOpen className="h-5 w-5" />, href: '/learning', requiredPermission: Permissions.LMS_COURSE_VIEW },
      ],
    },
    // ─── NU-Hire Hub (shown when user is in the Hire app) ─────────
    {
      id: 'hire-hub',
      label: 'NU-Hire',
      items: [
        {
          id: 'recruitment', label: 'Recruitment', icon: <UserPlus className="h-5 w-5" />, href: '/recruitment', requiredPermission: Permissions.RECRUITMENT_VIEW,
          children: [
            { id: 'recruitment-overview', label: 'Overview', href: '/recruitment', icon: <LayoutDashboard className="h-4 w-4" />, requiredPermission: Permissions.RECRUITMENT_VIEW },
            { id: 'jobs', label: 'Job Openings', href: '/recruitment/jobs', icon: <Briefcase className="h-4 w-4" />, requiredPermission: Permissions.RECRUITMENT_VIEW },
            { id: 'candidates', label: 'Candidates', href: '/recruitment/candidates', icon: <Users className="h-4 w-4" />, requiredPermission: Permissions.CANDIDATE_VIEW },
            { id: 'recruitment-pipeline', label: 'Pipeline', href: '/recruitment/pipeline', icon: <FolderKanban className="h-4 w-4" />, requiredPermission: Permissions.RECRUITMENT_VIEW },
            { id: 'interviews', label: 'Interviews', href: '/recruitment/interviews', icon: <MessageCircle className="h-4 w-4" />, requiredPermission: Permissions.RECRUITMENT_VIEW },
            { id: 'job-boards', label: 'Job Boards', href: '/recruitment/job-boards', icon: <Newspaper className="h-4 w-4" />, requiredPermission: Permissions.RECRUITMENT_VIEW },
          ],
        },
        {
          id: 'onboarding-hire', label: 'Onboarding', icon: <UserCheck className="h-5 w-5" />, href: '/onboarding', requiredPermission: Permissions.ONBOARDING_VIEW,
          children: [
            { id: 'onboarding-overview-hire', label: 'Overview', href: '/onboarding', icon: <LayoutDashboard className="h-4 w-4" />, requiredPermission: Permissions.ONBOARDING_VIEW },
            { id: 'onboarding-templates-hire', label: 'Templates', href: '/onboarding/templates', icon: <FileStack className="h-4 w-4" />, requiredPermission: Permissions.ONBOARDING_VIEW },
            { id: 'onboarding-new-hire', label: 'New Onboarding', href: '/onboarding/new', icon: <UserPlus className="h-4 w-4" />, requiredPermission: Permissions.ONBOARDING_CREATE },
          ],
        },
        { id: 'preboarding-hire', label: 'Preboarding', icon: <ClipboardSignature className="h-5 w-5" />, href: '/preboarding', requiredPermission: Permissions.ONBOARDING_VIEW },
        { id: 'offboarding-hire', label: 'Offboarding', icon: <UserMinus className="h-5 w-5" />, href: '/offboarding', requiredPermission: Permissions.EXIT_VIEW },
        { id: 'offer-portal-hire', label: 'Offer Portal', icon: <FileCheck className="h-5 w-5" />, href: '/offer-portal', requiredPermission: Permissions.RECRUITMENT_VIEW },
        { id: 'careers-hire', label: 'Careers Page', icon: <Briefcase className="h-5 w-5" />, href: '/careers', requiredPermission: Permissions.RECRUITMENT_VIEW },
      ],
    },
    // ─── NU-Grow Hub (shown when user is in the Grow app) ─────────
    {
      id: 'grow-hub',
      label: 'NU-Grow',
      items: [
        { id: 'performance-grow', label: 'Performance Hub', icon: <BarChart3 className="h-5 w-5" />, href: '/performance', requiredPermission: Permissions.REVIEW_VIEW },
        { id: 'performance-revolution-grow', label: 'Revolution', icon: <Zap className="h-5 w-5 text-yellow-500" />, href: '/performance/revolution', requiredPermission: Permissions.REVIEW_VIEW },
        { id: 'okr-grow', label: 'OKR', icon: <Target className="h-5 w-5" />, href: '/performance/okr', requiredPermission: Permissions.OKR_VIEW },
        { id: 'feedback360-grow', label: '360 Feedback', icon: <MessageCircle className="h-5 w-5" />, href: '/performance/360-feedback', requiredPermission: Permissions.FEEDBACK_360_VIEW },
        { id: 'training-grow', label: 'Training', icon: <GraduationCap className="h-5 w-5" />, href: '/training', requiredPermission: Permissions.TRAINING_VIEW },
        { id: 'learning-grow', label: 'Learning (LMS)', icon: <BookOpen className="h-5 w-5" />, href: '/learning', requiredPermission: Permissions.LMS_COURSE_VIEW },
        { id: 'recognition-grow', label: 'Recognition', icon: <Award className="h-5 w-5" />, href: '/recognition', requiredPermission: Permissions.RECOGNITION_VIEW },
        { id: 'surveys-grow', label: 'Surveys', icon: <ClipboardList className="h-5 w-5" />, href: '/surveys', requiredPermission: Permissions.SURVEY_VIEW },
        { id: 'wellness-grow', label: 'Wellness', icon: <Heart className="h-5 w-5" />, href: '/wellness', requiredPermission: Permissions.WELLNESS_VIEW },
      ],
    },
    // ─── NU-Fluence Hub (Phase 2 — placeholder) ──────────────────
    {
      id: 'fluence-hub',
      label: 'NU-Fluence',
      items: [
        { id: 'fluence-wiki', label: 'Wiki Pages', icon: <BookOpen className="h-5 w-5" />, href: '/fluence/wiki' },
        { id: 'fluence-blogs', label: 'Blogs', icon: <Newspaper className="h-5 w-5" />, href: '/fluence/blogs' },
        { id: 'fluence-templates', label: 'Templates', icon: <FileStack className="h-5 w-5" />, href: '/fluence/templates' },
        { id: 'fluence-drive', label: 'Drive', icon: <HardDrive className="h-5 w-5" />, href: '/fluence/drive' },
      ],
    },
    // ─── 6. PAY & FINANCE ───────────────────────────────────────────
    {
      id: 'finance',
      label: 'Pay & Finance',
      items: [
        {
          id: 'payroll', label: 'Payroll', icon: <DollarSign className="h-5 w-5" />, href: '/payroll', requiredPermission: Permissions.PAYROLL_VIEW,
          children: [
            { id: 'payroll-overview', label: 'Overview', href: '/payroll', icon: <LayoutDashboard className="h-4 w-4" />, requiredPermission: Permissions.PAYROLL_VIEW },
            { id: 'payroll-payslips', label: 'Payslips', href: '/payroll/payslips', icon: <FileText className="h-4 w-4" />, requiredPermission: Permissions.PAYROLL_VIEW },
            { id: 'payroll-statutory', label: 'Statutory', href: '/payroll/statutory', icon: <Landmark className="h-4 w-4" />, requiredPermission: Permissions.PAYROLL_VIEW },
          ],
        },
        { id: 'compensation', label: 'Compensation', icon: <TrendingUp className="h-5 w-5" />, href: '/compensation', requiredPermission: Permissions.COMPENSATION_VIEW },
        { id: 'benefits', label: 'Benefits', icon: <Gift className="h-5 w-5" />, href: '/benefits', requiredPermission: Permissions.BENEFIT_VIEW },
        { id: 'expenses', label: 'Expenses', icon: <Receipt className="h-5 w-5" />, href: '/expenses', requiredPermission: Permissions.EXPENSE_VIEW },
        {
          id: 'loans', label: 'Loans', icon: <Banknote className="h-5 w-5" />, href: '/loans', requiredPermission: Permissions.LOAN_VIEW,
          children: [
            { id: 'loans-overview', label: 'Overview', href: '/loans', icon: <LayoutDashboard className="h-4 w-4" />, requiredPermission: Permissions.LOAN_VIEW },
            { id: 'loans-new', label: 'New Loan', href: '/loans/new', icon: <FileText className="h-4 w-4" />, requiredPermission: Permissions.LOAN_CREATE },
          ],
        },
        {
          id: 'travel', label: 'Travel', icon: <Plane className="h-5 w-5" />, href: '/travel', requiredPermission: Permissions.TRAVEL_VIEW,
          children: [
            { id: 'travel-overview', label: 'Overview', href: '/travel', icon: <LayoutDashboard className="h-4 w-4" />, requiredPermission: Permissions.TRAVEL_VIEW },
            { id: 'travel-new', label: 'New Travel Request', href: '/travel/new', icon: <Plane className="h-4 w-4" />, requiredPermission: Permissions.TRAVEL_CREATE },
          ],
        },
        { id: 'statutory', label: 'Statutory', icon: <Scale className="h-5 w-5" />, href: '/statutory', requiredPermission: Permissions.STATUTORY_VIEW },
        {
          id: 'tax', label: 'Tax', icon: <FileSpreadsheet className="h-5 w-5" />, href: '/tax', requiredPermission: Permissions.TAX_VIEW,
          children: [
            { id: 'tax-overview', label: 'Overview', href: '/tax', icon: <LayoutDashboard className="h-4 w-4" />, requiredPermission: Permissions.TAX_VIEW },
            { id: 'tax-declarations', label: 'Declarations', href: '/tax/declarations', icon: <FileCheck className="h-4 w-4" />, requiredPermission: Permissions.TAX_VIEW },
          ],
        },
      ],
    },
    // ─── 7. PROJECTS & WORKSPACE ────────────────────────────────────
    {
      id: 'projects-workspace',
      label: 'Projects & Work',
      items: [
        { id: 'timesheets', label: 'Timesheets', icon: <Clock className="h-5 w-5" />, href: '/timesheets', requiredPermission: Permissions.TIMESHEET_VIEW },
        {
          id: 'projects', label: 'Projects', icon: <FolderKanban className="h-5 w-5" />, href: '/projects', requiredPermission: Permissions.PROJECT_VIEW,
          children: [
            { id: 'projects-overview', label: 'Overview', href: '/projects', icon: <LayoutDashboard className="h-4 w-4" />, requiredPermission: Permissions.PROJECT_VIEW },
            { id: 'projects-calendar', label: 'Calendar', href: '/projects/calendar', icon: <Calendar className="h-4 w-4" />, requiredPermission: Permissions.PROJECT_VIEW },
            { id: 'resource-conflicts', label: 'Resource Conflicts', href: '/projects/resource-conflicts', icon: <AlertTriangle className="h-4 w-4" /> },
          ],
        },
        {
          id: 'psa', label: 'PSA', icon: <Briefcase className="h-5 w-5" />, href: '/psa', requiredPermission: Permissions.PSA_VIEW,
          children: [
            { id: 'psa-overview', label: 'Overview', href: '/psa', icon: <LayoutDashboard className="h-4 w-4" />, requiredPermission: Permissions.PSA_VIEW },
            { id: 'psa-projects', label: 'Projects', href: '/psa/projects', icon: <FolderKanban className="h-4 w-4" />, requiredPermission: Permissions.PSA_VIEW },
            { id: 'psa-timesheets', label: 'Timesheets', href: '/psa/timesheets', icon: <Clock className="h-4 w-4" />, requiredPermission: Permissions.PSA_VIEW },
            { id: 'psa-invoices', label: 'Invoices', href: '/psa/invoices', icon: <Receipt className="h-4 w-4" />, requiredPermission: Permissions.PSA_VIEW },
          ],
        },
        {
          id: 'resources', label: 'Resources', icon: <Users className="h-5 w-5" />, href: '/resources', requiredPermission: Permissions.RESOURCE_VIEW,
          children: [
            { id: 'resources-overview', label: 'Overview', href: '/resources', icon: <LayoutDashboard className="h-4 w-4" />, requiredPermission: Permissions.RESOURCE_VIEW },
            { id: 'resources-capacity', label: 'Capacity', href: '/resources/capacity', icon: <PieChart className="h-4 w-4" />, requiredPermission: Permissions.RESOURCE_VIEW },
            { id: 'resources-availability', label: 'Availability', href: '/resources/availability', icon: <CalendarCheck className="h-4 w-4" />, requiredPermission: Permissions.RESOURCE_VIEW },
            { id: 'resources-workload', label: 'Workload', href: '/resources/workload', icon: <BarChart3 className="h-4 w-4" />, requiredPermission: Permissions.RESOURCE_VIEW },
            { id: 'resources-pool', label: 'Resource Pool', href: '/resources/pool', icon: <Users className="h-4 w-4" />, requiredPermission: Permissions.RESOURCE_VIEW },
          ],
        },
        { id: 'nu-calendar', label: 'Calendar', icon: <Calendar className="h-5 w-5" />, href: '/nu-calendar', requiredPermission: Permissions.CALENDAR_VIEW },
        { id: 'nu-drive', label: 'NU-Drive', icon: <HardDrive className="h-5 w-5" />, href: '/nu-drive', requiredPermission: Permissions.DOCUMENT_VIEW },
        { id: 'nu-mail', label: 'NU-Mail', icon: <Mail className="h-5 w-5" />, href: '/nu-mail', requiredPermission: Permissions.EMAIL_VIEW },
      ],
    },
    // ─── 8. REPORTS & ANALYTICS (HRMS) ──────────────────────────────
    {
      id: 'reports-analytics',
      label: 'Reports & Insights',
      items: [
        {
          id: 'reports', label: 'Reports', icon: <Download className="h-5 w-5" />, href: '/reports', requiredPermission: Permissions.REPORT_VIEW,
          children: [
            { id: 'reports-overview', label: 'Overview', href: '/reports', icon: <LayoutDashboard className="h-4 w-4" />, requiredPermission: Permissions.REPORT_VIEW },
            { id: 'reports-headcount', label: 'Headcount', href: '/reports/headcount', icon: <Users className="h-4 w-4" />, requiredPermission: Permissions.REPORT_VIEW },
            { id: 'reports-attrition', label: 'Attrition', href: '/reports/attrition', icon: <TrendingUp className="h-4 w-4" />, requiredPermission: Permissions.REPORT_VIEW },
            { id: 'reports-leave', label: 'Leave', href: '/reports/leave', icon: <Palmtree className="h-4 w-4" />, requiredPermission: Permissions.REPORT_VIEW },
            { id: 'reports-performance', label: 'Performance', href: '/reports/performance', icon: <BarChart3 className="h-4 w-4" />, requiredPermission: Permissions.REPORT_VIEW },
            { id: 'reports-payroll', label: 'Payroll', href: '/reports/payroll', icon: <DollarSign className="h-4 w-4" />, requiredPermission: Permissions.REPORT_VIEW },
            { id: 'reports-utilization', label: 'Utilization', href: '/reports/utilization', icon: <PieChart className="h-4 w-4" />, requiredPermission: Permissions.REPORT_VIEW },
            { id: 'reports-builder', label: 'Report Builder', href: '/reports/builder', icon: <Sliders className="h-4 w-4" />, requiredPermission: Permissions.REPORT_CREATE },
            { id: 'reports-scheduled', label: 'Scheduled Reports', href: '/reports/scheduled', icon: <Clock className="h-4 w-4" />, requiredPermission: Permissions.REPORT_VIEW },
          ],
        },
        { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-5 w-5" />, href: '/analytics', requiredPermission: Permissions.ANALYTICS_VIEW },
        { id: 'org-health', label: 'Org Health', icon: <Activity className="h-5 w-5 text-primary-500" />, href: '/analytics/org-health', requiredPermission: Permissions.ANALYTICS_VIEW },
      ],
    },
    // ─── 9. ADMIN & SETTINGS ────────────────────────────────────────
    {
      id: 'admin',
      label: 'Admin',
      items: [
        {
          id: 'admin-page', label: 'System Admin', icon: <Settings className="h-5 w-5" />, href: '/admin', requiredPermission: Permissions.SETTINGS_VIEW,
          children: [
            { id: 'admin-overview', label: 'Overview', href: '/admin', icon: <LayoutDashboard className="h-4 w-4" />, requiredPermission: Permissions.SETTINGS_VIEW },
            { id: 'admin-roles', label: 'Roles & Access', href: '/admin/roles', icon: <Shield className="h-4 w-4" />, requiredPermission: Permissions.ROLE_MANAGE },
            { id: 'admin-permissions', label: 'Permissions', href: '/admin/permissions', icon: <Shield className="h-4 w-4" />, requiredPermission: Permissions.PERMISSION_MANAGE },
            { id: 'admin-system', label: 'System Settings', href: '/admin/system', icon: <Settings className="h-4 w-4" />, requiredPermission: Permissions.SETTINGS_VIEW },
          ],
        },
        {
          id: 'org-setup', label: 'Organization Setup', icon: <Building className="h-5 w-5" />, requiredPermission: Permissions.SETTINGS_VIEW,
          children: [
            { id: 'holidays', label: 'Holidays', href: '/admin/holidays', icon: <Calendar className="h-4 w-4" />, requiredPermission: Permissions.SETTINGS_VIEW },
            { id: 'shifts', label: 'Shifts', href: '/admin/shifts', icon: <Timer className="h-4 w-4" />, requiredPermission: Permissions.SETTINGS_VIEW },
            { id: 'office-locations', label: 'Office Locations', href: '/admin/office-locations', icon: <MapPin className="h-4 w-4" />, requiredPermission: Permissions.OFFICE_LOCATION_VIEW },
            { id: 'org-hierarchy', label: 'Org Hierarchy', href: '/admin/org-hierarchy', icon: <Network className="h-4 w-4" />, requiredPermission: Permissions.ORG_STRUCTURE_MANAGE },
            { id: 'custom-fields', label: 'Custom Fields', href: '/admin/custom-fields', icon: <Sliders className="h-4 w-4" />, requiredPermission: Permissions.CUSTOM_FIELD_VIEW },
          ],
        },
        {
          id: 'leave-setup', label: 'Leave Setup', icon: <Palmtree className="h-5 w-5" />, requiredPermission: Permissions.LEAVE_TYPE_VIEW,
          children: [
            { id: 'leave-types', label: 'Leave Types', href: '/admin/leave-types', icon: <Palmtree className="h-4 w-4" />, requiredPermission: Permissions.LEAVE_TYPE_VIEW },
            { id: 'leave-requests-admin', label: 'Leave Requests', href: '/admin/leave-requests', icon: <FileText className="h-4 w-4" />, requiredPermission: Permissions.LEAVE_VIEW_ALL },
          ],
        },
        { id: 'integrations', label: 'Integrations', icon: <Cloud className="h-5 w-5" />, href: '/admin/integrations', requiredPermission: Permissions.INTEGRATION_VIEW },
        {
          id: 'helpdesk-setup', label: 'Helpdesk', icon: <Headphones className="h-5 w-5" />, href: '/helpdesk', requiredPermission: Permissions.HELPDESK_SLA_MANAGE,
          children: [
            { id: 'helpdesk-sla', label: 'SLA', href: '/helpdesk/sla', icon: <Clock className="h-4 w-4" />, requiredPermission: Permissions.HELPDESK_SLA_MANAGE },
            { id: 'helpdesk-kb', label: 'Knowledge Base', href: '/helpdesk/knowledge-base', icon: <BookOpen className="h-4 w-4" />, requiredPermission: Permissions.HELPDESK_KB_VIEW },
          ],
        },
        {
          id: 'settings', label: 'Settings', icon: <Settings className="h-5 w-5" />, href: '/settings', requiredPermission: Permissions.SETTINGS_VIEW,
          children: [
            { id: 'settings-profile', label: 'Profile', href: '/settings/profile', icon: <User className="h-4 w-4" /> },
            { id: 'settings-security', label: 'Security', href: '/settings/security', icon: <Shield className="h-4 w-4" /> },
            { id: 'settings-notifications', label: 'Notifications', href: '/settings/notifications', icon: <Bell className="h-4 w-4" /> },
          ],
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

    // Safety net: if user is authenticated but permissions are empty (JWT/migration issue),
    // show all items rather than hiding everything except Home.
    // SuperAdmin always sees everything regardless.
    if (!isSuperAdmin && permissions.length === 0 && user) {
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

  // Filter sections by active app, then by RBAC permissions, then drop empty sections
  const allowedSectionIds = APP_SIDEBAR_SECTIONS[appCode] || APP_SIDEBAR_SECTIONS.HRMS;
  const filteredSections: SidebarSection[] = useMemo(() => {
    return menuSections
      // Show only sections that belong to the active app
      .filter((section) => allowedSectionIds.includes(section.id))
      .map((section) => ({
        ...section,
        items: filterSidebarItems(section.items),
      }))
      .filter((section) => section.items.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(permissions), JSON.stringify(roles), isReady, !!user, appCode]);

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
            <motion.div
              key={appCode}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={cn(
                'p-4 sm:p-6 lg:p-8',
                // Add bottom padding for mobile bottom nav
                'pb-24 md:pb-4 lg:pb-8'
              )}
            >
              {children}
            </motion.div>
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
