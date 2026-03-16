/**
 * Static sidebar menu configuration.
 *
 * Extracted from AppLayout to avoid re-creating 90+ icon components on every
 * render / route change. The heavy JSX icons are allocated once at module
 * level and reused across navigations.
 */

import React from 'react';
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
  Briefcase,
  BarChart2,
  Landmark,
  FileCheck,
  UserCheck,
  ClipboardSignature,
  Newspaper,
  FolderKanban,
  Repeat,
  Send,
  FileStack,
  Banknote,
  Building,
  FileSpreadsheet,
  Scale,
  HardDrive,
  AlarmClock,
  PieChart,
  AlertTriangle,
  Cloud,
  Bell,
} from 'lucide-react';
import type { SidebarSection } from '@/components/ui';
import { Permissions } from '@/lib/hooks/usePermissions';

// ── Pre-allocated icon elements (created once at module level) ──────────────
const icon = {
  home: <Home className="h-5 w-5" />,
  dashboard: <LayoutDashboard className="h-5 w-5" />,
  trendingUp: <TrendingUp className="h-5 w-5" />,
  user: <User className="h-5 w-5" />,
  creditCard: <CreditCard className="h-5 w-5" />,
  calendarCheck: <CalendarCheck className="h-5 w-5" />,
  palmtree: <Palmtree className="h-5 w-5" />,
  fileText: <FileText className="h-5 w-5" />,
  users: <Users className="h-5 w-5" />,
  building2: <Building2 className="h-5 w-5" />,
  usersRound: <UsersRound className="h-5 w-5" />,
  gitBranch: <GitBranch className="h-5 w-5" />,
  megaphone: <Megaphone className="h-5 w-5" />,
  clipboardCheck: <ClipboardCheck className="h-5 w-5" />,
  clock: <Clock className="h-5 w-5" />,
  package: <Package className="h-5 w-5" />,
  mail: <Mail className="h-5 w-5" />,
  barChart3: <BarChart3 className="h-5 w-5" />,
  zap: <Zap className="h-5 w-5 text-yellow-500" />,
  target: <Target className="h-5 w-5" />,
  messageCircle: <MessageCircle className="h-5 w-5" />,
  graduationCap: <GraduationCap className="h-5 w-5" />,
  bookOpen: <BookOpen className="h-5 w-5" />,
  userPlus: <UserPlus className="h-5 w-5" />,
  userCheck: <UserCheck className="h-5 w-5" />,
  clipboardSignature: <ClipboardSignature className="h-5 w-5" />,
  userMinus: <UserMinus className="h-5 w-5" />,
  fileCheck: <FileCheck className="h-5 w-5" />,
  briefcase: <Briefcase className="h-5 w-5" />,
  award: <Award className="h-5 w-5" />,
  heart: <Heart className="h-5 w-5" />,
  clipboardList: <ClipboardList className="h-5 w-5" />,
  dollarSign: <DollarSign className="h-5 w-5" />,
  gift: <Gift className="h-5 w-5" />,
  receipt: <Receipt className="h-5 w-5" />,
  banknote: <Banknote className="h-5 w-5" />,
  plane: <Plane className="h-5 w-5" />,
  scale: <Scale className="h-5 w-5" />,
  fileSpreadsheet: <FileSpreadsheet className="h-5 w-5" />,
  folderKanban: <FolderKanban className="h-5 w-5" />,
  calendar: <Calendar className="h-5 w-5" />,
  hardDrive: <HardDrive className="h-5 w-5" />,
  download: <Download className="h-5 w-5" />,
  activity: <Activity className="h-5 w-5 text-primary-500" />,
  settings: <Settings className="h-5 w-5" />,
  building: <Building className="h-5 w-5" />,
  cloud: <Cloud className="h-5 w-5" />,
  headphones: <Headphones className="h-5 w-5" />,
  newspaper: <Newspaper className="h-5 w-5" />,
  fileStack: <FileStack className="h-5 w-5" />,
  shield: <Shield className="h-5 w-5" />,
} as const;

// Small icons for child items (4x4)
const sm = {
  dashboard: <LayoutDashboard className="h-4 w-4" />,
  users: <Users className="h-4 w-4" />,
  fileCheck: <FileCheck className="h-4 w-4" />,
  alarmClock: <AlarmClock className="h-4 w-4" />,
  repeat: <Repeat className="h-4 w-4" />,
  barChart2: <BarChart2 className="h-4 w-4" />,
  user: <User className="h-4 w-4" />,
  send: <Send className="h-4 w-4" />,
  clipboardCheck: <ClipboardCheck className="h-4 w-4" />,
  calendar: <Calendar className="h-4 w-4" />,
  fileText: <FileText className="h-4 w-4" />,
  landmark: <Landmark className="h-4 w-4" />,
  briefcase: <Briefcase className="h-4 w-4" />,
  messageCircle: <MessageCircle className="h-4 w-4" />,
  folderKanban: <FolderKanban className="h-4 w-4" />,
  newspaper: <Newspaper className="h-4 w-4" />,
  fileStack: <FileStack className="h-4 w-4" />,
  userPlus: <UserPlus className="h-4 w-4" />,
  clock: <Clock className="h-4 w-4" />,
  receipt: <Receipt className="h-4 w-4" />,
  plane: <Plane className="h-4 w-4" />,
  pieChart: <PieChart className="h-4 w-4" />,
  calendarCheck: <CalendarCheck className="h-4 w-4" />,
  barChart3: <BarChart3 className="h-4 w-4" />,
  palmtree: <Palmtree className="h-4 w-4" />,
  dollarSign: <DollarSign className="h-4 w-4" />,
  trendingUp: <TrendingUp className="h-4 w-4" />,
  sliders: <Sliders className="h-4 w-4" />,
  shield: <Shield className="h-4 w-4" />,
  settings: <Settings className="h-4 w-4" />,
  timer: <Timer className="h-4 w-4" />,
  mapPin: <MapPin className="h-4 w-4" />,
  network: <Network className="h-4 w-4" />,
  alertTriangle: <AlertTriangle className="h-4 w-4" />,
  bookOpen: <BookOpen className="h-4 w-4" />,
  bell: <Bell className="h-4 w-4" />,
} as const;

/**
 * Build the full sidebar menu sections.
 *
 * `pendingApprovalCount` is the only dynamic value (badge on Approvals).
 * Everything else is static and the returned array keeps the same references
 * when the count hasn't changed.
 */
export function buildMenuSections(pendingApprovalCount: number): SidebarSection[] {
  return [
    // ─── 1. HOME ────────────────────────────────────────────────────
    {
      id: 'home',
      label: 'Home',
      items: [
        { id: 'home', label: 'Home', icon: icon.home, href: '/me/dashboard' },
        { id: 'dashboard', label: 'Dashboard', icon: icon.dashboard, href: '/dashboard', requiredPermission: Permissions.DASHBOARD_VIEW },
        { id: 'executive-dashboard', label: 'Executive', icon: icon.trendingUp, href: '/dashboards/executive', requiredPermission: Permissions.DASHBOARD_EXECUTIVE },
      ],
    },
    // ─── 2. MY SPACE (Self-Service) ─────────────────────────────────
    {
      id: 'my-space',
      label: 'My Space',
      items: [
        { id: 'my-dashboard', label: 'My Dashboard', icon: icon.dashboard, href: '/me/dashboard', requiredPermission: Permissions.DASHBOARD_EMPLOYEE },
        { id: 'profile', label: 'My Profile', icon: icon.user, href: '/me/profile', requiredPermission: Permissions.SELF_SERVICE_PROFILE_UPDATE },
        { id: 'payslips', label: 'My Payslips', icon: icon.creditCard, href: '/me/payslips', requiredPermission: Permissions.SELF_SERVICE_VIEW_PAYSLIP },
        { id: 'my-attendance', label: 'My Attendance', icon: icon.calendarCheck, href: '/me/attendance', requiredPermission: Permissions.ATTENDANCE_VIEW_SELF },
        { id: 'leaves', label: 'My Leaves', icon: icon.palmtree, href: '/me/leaves', requiredPermission: Permissions.LEAVE_VIEW_SELF },
        { id: 'my-documents', label: 'My Documents', icon: icon.fileText, href: '/me/documents', requiredPermission: Permissions.DOCUMENT_VIEW },
      ],
    },
    // ─── 3. PEOPLE & ORGANIZATION ───────────────────────────────────
    {
      id: 'people',
      label: 'People',
      items: [
        { id: 'employees', label: 'Employees', icon: icon.users, href: '/employees', requiredPermission: Permissions.EMPLOYEE_VIEW_ALL },
        { id: 'departments', label: 'Departments', icon: icon.building2, href: '/departments', requiredPermission: Permissions.DEPARTMENT_VIEW },
        { id: 'team-directory', label: 'Team Directory', icon: icon.usersRound, href: '/employees/directory', requiredPermission: Permissions.EMPLOYEE_READ },
        { id: 'org-chart', label: 'Org Chart', icon: icon.gitBranch, href: '/org-chart', requiredPermission: Permissions.ORG_STRUCTURE_VIEW },
        { id: 'announcements', label: 'Announcements', icon: icon.megaphone, href: '/announcements', requiredPermission: Permissions.ANNOUNCEMENT_VIEW },
        { id: 'approvals', label: 'Approvals', icon: icon.clipboardCheck, href: '/approvals/inbox', badge: pendingApprovalCount > 0 ? pendingApprovalCount : undefined, requiredPermission: Permissions.WORKFLOW_VIEW },
      ],
    },
    // ─── 4. HR OPERATIONS ───────────────────────────────────────────
    {
      id: 'hr-ops',
      label: 'HR Operations',
      items: [
        {
          id: 'attendance', label: 'Attendance', icon: icon.clock, href: '/attendance', requiredPermission: Permissions.ATTENDANCE_VIEW_ALL,
          children: [
            { id: 'attendance-overview', label: 'Overview', href: '/attendance', icon: sm.barChart2, requiredPermission: Permissions.ATTENDANCE_VIEW_ALL },
            { id: 'attendance-team', label: 'Team Attendance', href: '/attendance/team', icon: sm.users, requiredPermission: Permissions.ATTENDANCE_VIEW_ALL },
            { id: 'attendance-regularization', label: 'Regularization', href: '/attendance/regularization', icon: sm.fileCheck, requiredPermission: Permissions.ATTENDANCE_VIEW_ALL },
            { id: 'attendance-comp-off', label: 'Comp-Off', href: '/attendance/comp-off', icon: sm.alarmClock, requiredPermission: Permissions.ATTENDANCE_VIEW_ALL },
            { id: 'attendance-shift-swap', label: 'Shift Swap', href: '/attendance/shift-swap', icon: sm.repeat, requiredPermission: Permissions.ATTENDANCE_VIEW_ALL },
          ],
        },
        {
          id: 'leave', label: 'Leave Management', icon: icon.palmtree, href: '/leave', requiredPermission: Permissions.LEAVE_VIEW_ALL,
          children: [
            { id: 'leave-overview', label: 'Overview', href: '/leave', icon: sm.dashboard, requiredPermission: Permissions.LEAVE_VIEW_ALL },
            { id: 'leave-my-leaves', label: 'My Leaves', href: '/leave/my-leaves', icon: sm.user, requiredPermission: Permissions.LEAVE_VIEW_SELF },
            { id: 'leave-apply', label: 'Apply Leave', href: '/leave/apply', icon: sm.send, requiredPermission: Permissions.LEAVE_APPLY },
            { id: 'leave-approvals', label: 'Leave Approvals', href: '/leave/approvals', icon: sm.clipboardCheck, requiredPermission: Permissions.LEAVE_APPROVE },
            { id: 'leave-calendar', label: 'Leave Calendar', href: '/leave/calendar', icon: sm.calendar, requiredPermission: Permissions.LEAVE_VIEW_ALL },
          ],
        },
        { id: 'assets', label: 'Assets', icon: icon.package, href: '/assets', requiredPermission: Permissions.ASSET_VIEW },
        { id: 'letters', label: 'Letters', icon: icon.mail, href: '/letters', requiredPermission: Permissions.LETTER_TEMPLATE_VIEW },
        { id: 'contracts', label: 'Contracts', icon: icon.fileText, href: '/contracts', requiredPermission: Permissions.CONTRACT_VIEW },
      ],
    },
    // ─── 5. PERFORMANCE & GROWTH ────────────────────────────────────
    {
      id: 'performance',
      label: 'Performance',
      items: [
        { id: 'performance', label: 'Performance Hub', icon: icon.barChart3, href: '/performance', requiredPermission: Permissions.REVIEW_VIEW },
        { id: 'performance-revolution', label: 'Revolution', icon: icon.zap, href: '/performance/revolution', requiredPermission: Permissions.REVIEW_VIEW },
        { id: 'okr', label: 'OKR', icon: icon.target, href: '/performance/okr', requiredPermission: Permissions.OKR_VIEW },
        { id: 'feedback360', label: '360 Feedback', icon: icon.messageCircle, href: '/performance/360-feedback', requiredPermission: Permissions.FEEDBACK_360_VIEW },
        { id: 'training', label: 'Training', icon: icon.graduationCap, href: '/training', requiredPermission: Permissions.TRAINING_VIEW },
        { id: 'learning', label: 'Learning', icon: icon.bookOpen, href: '/learning', requiredPermission: Permissions.LMS_COURSE_VIEW },
      ],
    },
    // ─── NU-Hire Hub ────────────────────────────────────────────────
    {
      id: 'hire-hub',
      label: 'NU-Hire',
      items: [
        {
          id: 'recruitment', label: 'Recruitment', icon: icon.userPlus, href: '/recruitment', requiredPermission: Permissions.RECRUITMENT_VIEW,
          children: [
            { id: 'recruitment-overview', label: 'Overview', href: '/recruitment', icon: sm.dashboard, requiredPermission: Permissions.RECRUITMENT_VIEW },
            { id: 'jobs', label: 'Job Openings', href: '/recruitment/jobs', icon: sm.briefcase, requiredPermission: Permissions.RECRUITMENT_VIEW },
            { id: 'candidates', label: 'Candidates', href: '/recruitment/candidates', icon: sm.users, requiredPermission: Permissions.CANDIDATE_VIEW },
            { id: 'recruitment-pipeline', label: 'Pipeline', href: '/recruitment/pipeline', icon: sm.folderKanban, requiredPermission: Permissions.RECRUITMENT_VIEW },
            { id: 'interviews', label: 'Interviews', href: '/recruitment/interviews', icon: sm.messageCircle, requiredPermission: Permissions.RECRUITMENT_VIEW },
            { id: 'job-boards', label: 'Job Boards', href: '/recruitment/job-boards', icon: sm.newspaper, requiredPermission: Permissions.RECRUITMENT_VIEW },
          ],
        },
        {
          id: 'onboarding-hire', label: 'Onboarding', icon: icon.userCheck, href: '/onboarding', requiredPermission: Permissions.ONBOARDING_VIEW,
          children: [
            { id: 'onboarding-overview-hire', label: 'Overview', href: '/onboarding', icon: sm.dashboard, requiredPermission: Permissions.ONBOARDING_VIEW },
            { id: 'onboarding-templates-hire', label: 'Templates', href: '/onboarding/templates', icon: sm.fileStack, requiredPermission: Permissions.ONBOARDING_VIEW },
            { id: 'onboarding-new-hire', label: 'New Onboarding', href: '/onboarding/new', icon: sm.userPlus, requiredPermission: Permissions.ONBOARDING_CREATE },
          ],
        },
        { id: 'preboarding-hire', label: 'Preboarding', icon: icon.clipboardSignature, href: '/preboarding', requiredPermission: Permissions.ONBOARDING_VIEW },
        { id: 'offboarding-hire', label: 'Offboarding', icon: icon.userMinus, href: '/offboarding', requiredPermission: Permissions.EXIT_VIEW },
        { id: 'offer-portal-hire', label: 'Offer Portal', icon: icon.fileCheck, href: '/offer-portal', requiredPermission: Permissions.RECRUITMENT_VIEW },
        { id: 'careers-hire', label: 'Careers Page', icon: icon.briefcase, href: '/careers', requiredPermission: Permissions.RECRUITMENT_VIEW },
      ],
    },
    // ─── NU-Grow Hub ────────────────────────────────────────────────
    {
      id: 'grow-hub',
      label: 'NU-Grow',
      items: [
        { id: 'performance-grow', label: 'Performance Hub', icon: icon.barChart3, href: '/performance', requiredPermission: Permissions.REVIEW_VIEW },
        { id: 'performance-revolution-grow', label: 'Revolution', icon: icon.zap, href: '/performance/revolution', requiredPermission: Permissions.REVIEW_VIEW },
        { id: 'okr-grow', label: 'OKR', icon: icon.target, href: '/performance/okr', requiredPermission: Permissions.OKR_VIEW },
        { id: 'feedback360-grow', label: '360 Feedback', icon: icon.messageCircle, href: '/performance/360-feedback', requiredPermission: Permissions.FEEDBACK_360_VIEW },
        { id: 'training-grow', label: 'Training', icon: icon.graduationCap, href: '/training', requiredPermission: Permissions.TRAINING_VIEW },
        { id: 'learning-grow', label: 'Learning (LMS)', icon: icon.bookOpen, href: '/learning', requiredPermission: Permissions.LMS_COURSE_VIEW },
        { id: 'recognition-grow', label: 'Recognition', icon: icon.award, href: '/recognition', requiredPermission: Permissions.RECOGNITION_VIEW },
        { id: 'surveys-grow', label: 'Surveys', icon: icon.clipboardList, href: '/surveys', requiredPermission: Permissions.SURVEY_VIEW },
        { id: 'wellness-grow', label: 'Wellness', icon: icon.heart, href: '/wellness', requiredPermission: Permissions.WELLNESS_VIEW },
      ],
    },
    // ─── NU-Fluence Hub (Knowledge Management) ──────────────────────
    {
      id: 'fluence-hub',
      label: 'NU-Fluence',
      items: [
        { id: 'fluence-wiki', label: 'Wiki', icon: icon.bookOpen, href: '/fluence/wiki', requiredPermission: Permissions.WIKI_VIEW },
        { id: 'fluence-blogs', label: 'Articles', icon: icon.newspaper, href: '/fluence/blogs', requiredPermission: Permissions.BLOG_VIEW },
        { id: 'fluence-my-content', label: 'My Content', icon: icon.user, href: '/fluence/my-content', requiredPermission: Permissions.KNOWLEDGE_VIEW },
        { id: 'fluence-templates', label: 'Templates', icon: icon.fileStack, href: '/fluence/templates', requiredPermission: Permissions.KNOWLEDGE_VIEW },
        { id: 'fluence-drive', label: 'Drive', icon: icon.hardDrive, href: '/fluence/drive', requiredPermission: Permissions.KNOWLEDGE_VIEW },
        { id: 'fluence-search', label: 'Search', icon: icon.target, href: '/fluence/search', requiredPermission: Permissions.KNOWLEDGE_VIEW },
      ],
    },
    // ─── 6. PAY & FINANCE ───────────────────────────────────────────
    {
      id: 'finance',
      label: 'Pay & Finance',
      items: [
        {
          id: 'payroll', label: 'Payroll', icon: icon.dollarSign, href: '/payroll', requiredPermission: Permissions.PAYROLL_VIEW,
          children: [
            { id: 'payroll-overview', label: 'Overview', href: '/payroll', icon: sm.dashboard, requiredPermission: Permissions.PAYROLL_VIEW },
            { id: 'payroll-payslips', label: 'Payslips', href: '/payroll/payslips', icon: sm.fileText, requiredPermission: Permissions.PAYROLL_VIEW },
            { id: 'payroll-statutory', label: 'Statutory', href: '/payroll/statutory', icon: sm.landmark, requiredPermission: Permissions.PAYROLL_VIEW },
          ],
        },
        { id: 'compensation', label: 'Compensation', icon: icon.trendingUp, href: '/compensation', requiredPermission: Permissions.COMPENSATION_VIEW },
        { id: 'benefits', label: 'Benefits', icon: icon.gift, href: '/benefits', requiredPermission: Permissions.BENEFIT_VIEW },
        { id: 'expenses', label: 'Expenses', icon: icon.receipt, href: '/expenses', requiredPermission: Permissions.EXPENSE_VIEW },
        { id: 'payments', label: 'Payments', icon: icon.creditCard, href: '/payments', requiredPermission: Permissions.PAYMENT_VIEW },
        {
          id: 'loans', label: 'Loans', icon: icon.banknote, href: '/loans', requiredPermission: Permissions.LOAN_VIEW,
          children: [
            { id: 'loans-overview', label: 'Overview', href: '/loans', icon: sm.dashboard, requiredPermission: Permissions.LOAN_VIEW },
            { id: 'loans-new', label: 'New Loan', href: '/loans/new', icon: sm.fileText, requiredPermission: Permissions.LOAN_CREATE },
          ],
        },
        {
          id: 'travel', label: 'Travel', icon: icon.plane, href: '/travel', requiredPermission: Permissions.TRAVEL_VIEW,
          children: [
            { id: 'travel-overview', label: 'Overview', href: '/travel', icon: sm.dashboard, requiredPermission: Permissions.TRAVEL_VIEW },
            { id: 'travel-new', label: 'New Travel Request', href: '/travel/new', icon: sm.plane, requiredPermission: Permissions.TRAVEL_CREATE },
          ],
        },
        { id: 'statutory', label: 'Statutory', icon: icon.scale, href: '/statutory', requiredPermission: Permissions.STATUTORY_VIEW },
        {
          id: 'tax', label: 'Tax', icon: icon.fileSpreadsheet, href: '/tax', requiredPermission: Permissions.TAX_VIEW,
          children: [
            { id: 'tax-overview', label: 'Overview', href: '/tax', icon: sm.dashboard, requiredPermission: Permissions.TAX_VIEW },
            { id: 'tax-declarations', label: 'Declarations', href: '/tax/declarations', icon: sm.fileCheck, requiredPermission: Permissions.TAX_VIEW },
          ],
        },
      ],
    },
    // ─── 7. PROJECTS & WORKSPACE ────────────────────────────────────
    {
      id: 'projects-workspace',
      label: 'Projects & Work',
      items: [
        { id: 'timesheets', label: 'Timesheets', icon: icon.clock, href: '/timesheets', requiredPermission: Permissions.TIMESHEET_VIEW },
        {
          id: 'projects', label: 'Projects', icon: icon.folderKanban, href: '/projects', requiredPermission: Permissions.PROJECT_VIEW,
          children: [
            { id: 'projects-overview', label: 'Overview', href: '/projects', icon: sm.dashboard, requiredPermission: Permissions.PROJECT_VIEW },
            { id: 'projects-calendar', label: 'Calendar', href: '/projects/calendar', icon: sm.calendar, requiredPermission: Permissions.PROJECT_VIEW },
            { id: 'resource-conflicts', label: 'Resource Conflicts', href: '/projects/resource-conflicts', icon: sm.alertTriangle },
          ],
        },
        {
          id: 'psa', label: 'PSA', icon: icon.briefcase, href: '/psa', requiredPermission: Permissions.PSA_VIEW,
          children: [
            { id: 'psa-overview', label: 'Overview', href: '/psa', icon: sm.dashboard, requiredPermission: Permissions.PSA_VIEW },
            { id: 'psa-projects', label: 'Projects', href: '/psa/projects', icon: sm.folderKanban, requiredPermission: Permissions.PSA_VIEW },
            { id: 'psa-timesheets', label: 'Timesheets', href: '/psa/timesheets', icon: sm.clock, requiredPermission: Permissions.PSA_VIEW },
            { id: 'psa-invoices', label: 'Invoices', href: '/psa/invoices', icon: sm.receipt, requiredPermission: Permissions.PSA_VIEW },
          ],
        },
        {
          id: 'resources', label: 'Resources', icon: icon.users, href: '/resources', requiredPermission: Permissions.RESOURCE_VIEW,
          children: [
            { id: 'resources-overview', label: 'Overview', href: '/resources', icon: sm.dashboard, requiredPermission: Permissions.RESOURCE_VIEW },
            { id: 'resources-capacity', label: 'Capacity', href: '/resources/capacity', icon: sm.pieChart, requiredPermission: Permissions.RESOURCE_VIEW },
            { id: 'resources-availability', label: 'Availability', href: '/resources/availability', icon: sm.calendarCheck, requiredPermission: Permissions.RESOURCE_VIEW },
            { id: 'resources-workload', label: 'Workload', href: '/resources/workload', icon: sm.barChart3, requiredPermission: Permissions.RESOURCE_VIEW },
            { id: 'resources-pool', label: 'Resource Pool', href: '/resources/pool', icon: sm.users, requiredPermission: Permissions.RESOURCE_VIEW },
          ],
        },
        { id: 'nu-calendar', label: 'Calendar', icon: icon.calendar, href: '/nu-calendar', requiredPermission: Permissions.CALENDAR_VIEW },
        { id: 'nu-drive', label: 'NU-Drive', icon: icon.hardDrive, href: '/nu-drive', requiredPermission: Permissions.DOCUMENT_VIEW },
        { id: 'nu-mail', label: 'NU-Mail', icon: icon.mail, href: '/nu-mail', requiredPermission: Permissions.EMAIL_VIEW },
      ],
    },
    // ─── 8. REPORTS & ANALYTICS ─────────────────────────────────────
    {
      id: 'reports-analytics',
      label: 'Reports & Insights',
      items: [
        {
          id: 'reports', label: 'Reports', icon: icon.download, href: '/reports', requiredPermission: Permissions.REPORT_VIEW,
          children: [
            { id: 'reports-overview', label: 'Overview', href: '/reports', icon: sm.dashboard, requiredPermission: Permissions.REPORT_VIEW },
            { id: 'reports-headcount', label: 'Headcount', href: '/reports/headcount', icon: sm.users, requiredPermission: Permissions.REPORT_VIEW },
            { id: 'reports-attrition', label: 'Attrition', href: '/reports/attrition', icon: sm.trendingUp, requiredPermission: Permissions.REPORT_VIEW },
            { id: 'reports-leave', label: 'Leave', href: '/reports/leave', icon: sm.palmtree, requiredPermission: Permissions.REPORT_VIEW },
            { id: 'reports-performance', label: 'Performance', href: '/reports/performance', icon: sm.barChart3, requiredPermission: Permissions.REPORT_VIEW },
            { id: 'reports-payroll', label: 'Payroll', href: '/reports/payroll', icon: sm.dollarSign, requiredPermission: Permissions.REPORT_VIEW },
            { id: 'reports-utilization', label: 'Utilization', href: '/reports/utilization', icon: sm.pieChart, requiredPermission: Permissions.REPORT_VIEW },
            { id: 'reports-builder', label: 'Report Builder', href: '/reports/builder', icon: sm.sliders, requiredPermission: Permissions.REPORT_CREATE },
            { id: 'reports-scheduled', label: 'Scheduled Reports', href: '/reports/scheduled', icon: sm.clock, requiredPermission: Permissions.REPORT_VIEW },
          ],
        },
        { id: 'analytics', label: 'Analytics', icon: icon.barChart3, href: '/analytics', requiredPermission: Permissions.ANALYTICS_VIEW },
        { id: 'org-health', label: 'Org Health', icon: icon.activity, href: '/analytics/org-health', requiredPermission: Permissions.ANALYTICS_VIEW },
      ],
    },
    // ─── 9. ADMIN & SETTINGS ────────────────────────────────────────
    {
      id: 'admin',
      label: 'Admin',
      items: [
        {
          id: 'admin-page', label: 'System Admin', icon: icon.settings, href: '/admin', requiredPermission: Permissions.SETTINGS_VIEW,
          children: [
            { id: 'admin-overview', label: 'Overview', href: '/admin', icon: sm.dashboard, requiredPermission: Permissions.SETTINGS_VIEW },
            { id: 'admin-roles', label: 'Roles & Access', href: '/admin/roles', icon: sm.shield, requiredPermission: Permissions.ROLE_MANAGE },
            { id: 'admin-permissions', label: 'Permissions', href: '/admin/permissions', icon: sm.shield, requiredPermission: Permissions.PERMISSION_MANAGE },
            { id: 'admin-system', label: 'System Settings', href: '/admin/system', icon: sm.settings, requiredPermission: Permissions.SETTINGS_VIEW },
          ],
        },
        {
          id: 'org-setup', label: 'Organization Setup', icon: icon.building, requiredPermission: Permissions.SETTINGS_VIEW,
          children: [
            { id: 'holidays', label: 'Holidays', href: '/admin/holidays', icon: sm.calendar, requiredPermission: Permissions.SETTINGS_VIEW },
            { id: 'shifts', label: 'Shifts', href: '/admin/shifts', icon: sm.timer, requiredPermission: Permissions.SETTINGS_VIEW },
            { id: 'office-locations', label: 'Office Locations', href: '/admin/office-locations', icon: sm.mapPin, requiredPermission: Permissions.OFFICE_LOCATION_VIEW },
            { id: 'org-hierarchy', label: 'Org Hierarchy', href: '/admin/org-hierarchy', icon: sm.network, requiredPermission: Permissions.ORG_STRUCTURE_MANAGE },
            { id: 'custom-fields', label: 'Custom Fields', href: '/admin/custom-fields', icon: sm.sliders, requiredPermission: Permissions.CUSTOM_FIELD_VIEW },
          ],
        },
        {
          id: 'leave-setup', label: 'Leave Setup', icon: icon.palmtree, requiredPermission: Permissions.LEAVE_TYPE_VIEW,
          children: [
            { id: 'leave-types', label: 'Leave Types', href: '/admin/leave-types', icon: sm.palmtree, requiredPermission: Permissions.LEAVE_TYPE_VIEW },
            { id: 'leave-requests-admin', label: 'Leave Requests', href: '/admin/leave-requests', icon: sm.fileText, requiredPermission: Permissions.LEAVE_VIEW_ALL },
          ],
        },
        { id: 'integrations', label: 'Integrations', icon: icon.cloud, href: '/admin/integrations', requiredPermission: Permissions.INTEGRATION_VIEW },
        {
          id: 'helpdesk-setup', label: 'Helpdesk', icon: icon.headphones, href: '/helpdesk', requiredPermission: Permissions.HELPDESK_SLA_MANAGE,
          children: [
            { id: 'helpdesk-sla', label: 'SLA', href: '/helpdesk/sla', icon: sm.clock, requiredPermission: Permissions.HELPDESK_SLA_MANAGE },
            { id: 'helpdesk-kb', label: 'Knowledge Base', href: '/helpdesk/knowledge-base', icon: sm.bookOpen, requiredPermission: Permissions.HELPDESK_KB_VIEW },
          ],
        },
        {
          id: 'settings', label: 'Settings', icon: icon.settings, href: '/settings', requiredPermission: Permissions.SETTINGS_VIEW,
          children: [
            { id: 'settings-profile', label: 'Profile', href: '/settings/profile', icon: sm.user },
            { id: 'settings-security', label: 'Security', href: '/settings/security', icon: sm.shield },
            { id: 'settings-notifications', label: 'Notifications', href: '/settings/notifications', icon: sm.bell },
          ],
        },
      ],
    },
  ];
}
