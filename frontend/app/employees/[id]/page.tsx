'use client';

import { useState, useMemo } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { notFound } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Mail,
  Phone,
  MapPin,
  IdCard,
  ChevronLeft,
  Pencil,
  Trash2,
  Users,
  Briefcase,
  Star,
  Search,
  FolderOpen,
  FileText,
  Shield,
  Award,
  MessageSquare,
  CheckCircle2,
  Laptop,
  Package,
  AlertTriangle,
} from 'lucide-react';
import CustomFieldsSection from '@/components/custom-fields/CustomFieldsSection';
import { EntityType } from '@/lib/types/custom-fields';
import { AppLayout } from '@/components/layout';
import TalentJourneyTab from '@/components/employee/talent-profiles/TalentJourneyTab';
import {
  useEmployee,
  useDeleteEmployee,
  useDottedLineReports,
  useSubordinates,
} from '@/lib/hooks/queries/useEmployees';
import { useAssetsByEmployee } from '@/lib/hooks/queries/useAssets';
import { useToast } from '@/components/notifications/ToastProvider';
import { createLogger } from '@/lib/utils/logger';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';
import { Card, CardContent } from '@/components/ui/Card';
import { Asset } from '@/lib/types/asset';

const log = createLogger('EmployeePage');

// ─── Tab configuration ───────────────────────────────────────────────
type MainTab = 'about' | 'profile' | 'job' | 'documents' | 'assets';
type AboutSubTab = 'summary' | 'timeline' | 'wall';
type AssetSubTab = 'assigned' | 'requests' | 'damages';

const MAIN_TABS: { key: MainTab; label: string }[] = [
  { key: 'about', label: 'About' },
  { key: 'profile', label: 'Profile' },
  { key: 'job', label: 'Job' },
  { key: 'documents', label: 'Documents' },
  { key: 'assets', label: 'Assets' },
];

const ABOUT_SUB_TABS: { key: AboutSubTab; label: string }[] = [
  { key: 'summary', label: 'Summary' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'wall', label: 'Wall Activity' },
];

const ASSET_SUB_TABS: { key: AssetSubTab; label: string }[] = [
  { key: 'assigned', label: 'Assigned Assets' },
  { key: 'requests', label: 'Asset Requests' },
  { key: 'damages', label: 'Damage Charges' },
];

// ─── Document categories ─────────────────────────────────────────────
const DOCUMENT_CATEGORIES = [
  { name: 'Performance Reviews', icon: Star, count: 0 },
  { name: 'Previous Experience', icon: Briefcase, count: 0 },
  { name: 'Form 16', icon: FileText, count: 0 },
  { name: 'Identity', icon: Shield, count: 0 },
  { name: 'Employee Letters', icon: Mail, count: 0 },
  { name: 'Degrees & Certificates', icon: Award, count: 0 },
  { name: 'Course Certificates', icon: CheckCircle2, count: 0 },
  { name: 'Resume', icon: FileText, count: 0 },
  { name: 'Roles & Responsibilities', icon: Users, count: 0 },
];

// ─── Helpers ─────────────────────────────────────────────────────────
function getStatusBadgeColor(status: string) {
  switch (status) {
    case 'ACTIVE':
      return 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-400';
    case 'ON_LEAVE':
      return 'bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-400';
    case 'ON_NOTICE':
      return 'bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-400';
    case 'TERMINATED':
      return 'bg-danger-100 text-danger-800 dark:bg-danger-900/30 dark:text-danger-400';
    default:
      return 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]';
  }
}

function formatDate(date?: string) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatEnumValue(value?: string) {
  if (!value) return '-';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

// ─── Reusable UI pieces ──────────────────────────────────────────────
function InfoField({ label, value }: { label: string; value: string | undefined | null }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
      <p className="text-sm text-[var(--text-primary)]">{value || '-'}</p>
    </div>
  );
}

function SectionCard({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-4 uppercase tracking-wider">
          {title}
        </h4>
        {children}
      </CardContent>
    </Card>
  );
}

function AvatarInitials({
  name,
  size = 'md',
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const sizeMap = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-16 w-16 text-xl',
    xl: 'h-20 w-20 text-2xl',
  };
  const initials = name
    .split(' ')
    .map((n) => n.charAt(0))
    .join('')
    .slice(0, 2);

  return (
    <div
      className={`${sizeMap[size]} bg-accent-100 dark:bg-accent-900/30 rounded-full flex items-center justify-center flex-shrink-0`}
    >
      <span className="font-medium text-accent-700 dark:text-accent-400">{initials}</span>
    </div>
  );
}

// ─── Active tab underline style ──────────────────────────────────────
function tabClass(active: boolean) {
  return `py-4 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 rounded-t-sm ${
    active
      ? 'border-accent-500 text-accent-700 dark:border-accent-400 dark:text-accent-400'
      : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--border-main)]'
  }`;
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export default function EmployeeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const toast = useToast();
  const employeeId = params.id as string;

  // URL-addressable tabs
  const initialTab = (searchParams.get('tab') as MainTab) || 'about';
  const initialSubTab = (searchParams.get('sub') as AboutSubTab | AssetSubTab) || 'summary';

  const [currentTab, setCurrentTab] = useState<MainTab>(
    MAIN_TABS.some((t) => t.key === initialTab) ? initialTab : 'about'
  );
  const [aboutSubTab, setAboutSubTab] = useState<AboutSubTab>(
    ABOUT_SUB_TABS.some((t) => t.key === initialSubTab) ? (initialSubTab as AboutSubTab) : 'summary'
  );
  const [assetSubTab, setAssetSubTab] = useState<AssetSubTab>(
    ASSET_SUB_TABS.some((t) => t.key === initialSubTab) ? (initialSubTab as AssetSubTab) : 'assigned'
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [docSearch, setDocSearch] = useState('');

  // React Query hooks
  const { data: employee, isLoading: loading, error: queryError } = useEmployee(employeeId);
  const { data: dottedReports = [] } = useDottedLineReports(employeeId);
  const { data: subordinates = [] } = useSubordinates(employeeId);
  const { data: employeeAssets = [] } = useAssetsByEmployee(employeeId);
  const deleteEmployeeMutation = useDeleteEmployee();

  const error = queryError
    ? (queryError as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      'Failed to load employee'
    : null;

  // Update URL when tab changes
  const navigateTab = (tab: MainTab, sub?: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    if (sub) url.searchParams.set('sub', sub);
    else url.searchParams.delete('sub');
    window.history.replaceState({}, '', url.toString());
  };

  const handleMainTab = (tab: MainTab) => {
    setCurrentTab(tab);
    navigateTab(tab);
  };

  const handleAboutSubTab = (sub: AboutSubTab) => {
    setAboutSubTab(sub);
    navigateTab('about', sub);
  };

  const handleAssetSubTab = (sub: AssetSubTab) => {
    setAssetSubTab(sub);
    navigateTab('assets', sub);
  };

  const handleDelete = async () => {
    try {
      await deleteEmployeeMutation.mutateAsync(employeeId);
      toast.success('Employee Deleted', 'The employee has been deleted successfully.');
      router.push('/employees');
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to delete employee';
      toast.error('Error', errorMsg);
      log.error('Error deleting employee:', err);
      setShowDeleteModal(false);
    }
  };

  // Filter document categories by search
  const filteredDocCategories = useMemo(
    () =>
      DOCUMENT_CATEGORIES.filter((c) =>
        c.name.toLowerCase().includes(docSearch.toLowerCase())
      ),
    [docSearch]
  );

  // ─── Loading state ──────────────────────────────────────────────────
  if (loading) {
    return (
      <AppLayout activeMenuItem="employees">
        <div className="min-h-screen bg-[var(--bg-secondary)] flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-accent-700" />
            <p className="mt-4 text-[var(--text-secondary)]">Loading employee details...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!loading && !queryError && !employee) {
    notFound();
  }

  if (error || !employee) {
    return (
      <AppLayout activeMenuItem="employees">
        <div className="min-h-screen bg-[var(--bg-secondary)]">
          <nav className="bg-[var(--bg-card)] dark:bg-[var(--bg-secondary)] shadow-sm border-b border-[var(--border-main)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => router.push('/employees')}
                    aria-label="Back to employees list"
                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 rounded-md"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <h1 className="text-xl font-bold text-[var(--text-primary)]">Employee Details</h1>
                </div>
              </div>
            </div>
          </nav>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-md p-4">
              <p className="text-sm text-danger-600 dark:text-danger-400">
                {error || 'Employee not found'}
              </p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <AppLayout activeMenuItem="employees">
      <div className="min-h-screen bg-[var(--bg-secondary)]">
        {/* ── HERO BANNER ──────────────────────────────────────────── */}
        <div className="relative bg-gradient-to-r from-slate-900 via-accent-950 to-slate-900 border-b border-[var(--border-main)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Back + Actions row */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => router.push('/employees')}
                aria-label="Back to employees list"
                className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 rounded-md"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="text-sm">Employees</span>
              </button>
              <div className="flex gap-4">
                <PermissionGate permission={Permissions.EMPLOYEE_UPDATE}>
                  <button
                    onClick={() => router.push(`/employees/${employeeId}/edit`)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent-700 hover:bg-accent-800 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                </PermissionGate>
                <PermissionGate permission={Permissions.EMPLOYEE_DELETE}>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-danger-600 hover:bg-danger-700 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-danger-500 focus-visible:ring-offset-2"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </PermissionGate>
              </div>
            </div>

            {/* Avatar + Name + Badge */}
            <div className="flex items-center gap-6">
              {employee.profilePhotoUrl ? (
                <img
                  src={employee.profilePhotoUrl}
                  alt={employee.fullName}
                  className="h-20 w-20 rounded-full object-cover border-2 border-accent-500/30"
                />
              ) : (
                <AvatarInitials name={employee.fullName} size="xl" />
              )}
              <div>
                <div className="flex items-center gap-4">
                  <h1 className="text-2xl font-bold text-white">{employee.fullName}</h1>
                  <span
                    className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${getStatusBadgeColor(employee.status)}`}
                  >
                    {formatEnumValue(employee.status)}
                  </span>
                </div>
                <p className="text-slate-300 text-sm mt-1">{employee.designation || '-'}</p>
                <p className="text-slate-400 text-xs mt-0.5">{employee.employeeCode}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── QUICK INFO BAR ───────────────────────────────────────── */}
        <div className="bg-[var(--bg-card)]/50 border-b border-[var(--border-main)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center gap-6 py-4">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-[var(--text-muted)]" />
                <a
                  href={`mailto:${employee.workEmail}`}
                  className="text-accent-700 dark:text-accent-400 hover:underline"
                >
                  {employee.workEmail}
                </a>
              </div>
              {employee.phoneNumber && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-[var(--text-muted)]" />
                  <a
                    href={`tel:${employee.phoneNumber}`}
                    className="text-[var(--text-primary)] hover:underline"
                  >
                    {employee.phoneNumber}
                  </a>
                </div>
              )}
              {(employee.city || employee.state || employee.country) && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-[var(--text-muted)]" />
                  <span className="text-[var(--text-primary)]">
                    {[employee.city, employee.state, employee.country].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <IdCard className="h-4 w-4 text-[var(--text-muted)]" />
                <span className="text-[var(--text-primary)]">{employee.employeeCode}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── ORG INFO BAR ─────────────────────────────────────────── */}
        <div className="bg-[var(--bg-card)] border-b border-[var(--border-main)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-1">
                  Business Unit
                </p>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {employee.departmentName || 'Not Set'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-1">
                  Department
                </p>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {employee.departmentName || 'Not Set'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-1">
                  Cost Center
                </p>
                <p className="text-sm font-medium text-[var(--text-primary)]">Not Set</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-1">
                  Reporting Manager
                </p>
                {employee.managerId ? (
                  <button
                    onClick={() => router.push(`/employees/${employee.managerId}`)}
                    className="flex items-center gap-2 group"
                  >
                    <AvatarInitials name={employee.managerName || 'M'} size="sm" />
                    <span className="text-sm font-medium text-accent-700 dark:text-accent-400 group-hover:underline">
                      {employee.managerName}
                    </span>
                  </button>
                ) : (
                  <p className="text-sm font-medium text-[var(--text-primary)]">-</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN TABS ────────────────────────────────────────────── */}
        <div className="bg-[var(--bg-card)] border-b border-[var(--border-main)] sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex gap-1 -mb-px overflow-x-auto" aria-label="Employee tabs">
              {MAIN_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleMainTab(tab.key)}
                  className={tabClass(currentTab === tab.key)}
                >
                  {tab.label}
                </button>
              ))}
              {dottedReports.length > 0 && (
                <button
                  onClick={() => handleMainTab('about')}
                  className={`py-4 px-4 text-sm font-medium border-b-2 border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--border-main)] whitespace-nowrap`}
                  title="View dotted reports in Job tab org section"
                >
                  Dotted Reports ({dottedReports.length})
                </button>
              )}
            </nav>
          </div>
        </div>

        {/* ── TAB CONTENT ──────────────────────────────────────────── */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* ═══ ABOUT TAB ═══════════════════════════════════════════ */}
          {currentTab === 'about' && (
            <div>
              {/* Sub-tabs */}
              <div className="flex gap-1 mb-6 border-b border-[var(--border-main)]">
                {ABOUT_SUB_TABS.map((sub) => (
                  <button
                    key={sub.key}
                    onClick={() => handleAboutSubTab(sub.key)}
                    className={tabClass(aboutSubTab === sub.key)}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>

              {/* Summary sub-tab */}
              {aboutSubTab === 'summary' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left column — About & Professional Summary */}
                  <div className="lg:col-span-2 space-y-6">
                    <SectionCard title="About">
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                        {employee.designation
                          ? `${employee.fullName} is a ${formatEnumValue(employee.designation)} at the ${employee.departmentName || 'organization'}.`
                          : `${employee.fullName} is a member of the ${employee.departmentName || 'organization'}.`}
                        {employee.joiningDate &&
                          ` Joined on ${formatDate(employee.joiningDate)}.`}
                      </p>
                    </SectionCard>

                    <SectionCard title="Professional Summary">
                      <div className="grid grid-cols-2 gap-4">
                        <InfoField label="Job Role" value={formatEnumValue(employee.jobRole)} />
                        <InfoField label="Level" value={formatEnumValue(employee.level)} />
                        <InfoField
                          label="Employment Type"
                          value={formatEnumValue(employee.employmentType)}
                        />
                        <InfoField label="Department" value={employee.departmentName} />
                      </div>
                    </SectionCard>

                    {/* Custom Fields / Additional Info */}
                    <SectionCard title="Additional Information">
                      <CustomFieldsSection
                        entityType={EntityType.EMPLOYEE}
                        entityId={employee.id}
                        disabled={true}
                        showGroupHeaders={true}
                      />
                    </SectionCard>
                  </div>

                  {/* Right column — Skills, Reporting Team, Recognition */}
                  <div className="space-y-6">
                    {/* Reporting Team */}
                    <SectionCard title="Reporting Team">
                      {subordinates.length > 0 ? (
                        <div className="space-y-4">
                          {subordinates.slice(0, 8).map((sub) => (
                            <button
                              key={sub.id}
                              onClick={() => router.push(`/employees/${sub.id}`)}
                              className="flex items-center gap-4 w-full text-left hover:bg-[var(--bg-secondary)] rounded-lg p-2 -mx-2 transition-colors"
                            >
                              <AvatarInitials name={sub.fullName} size="sm" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                                  {sub.fullName}
                                </p>
                                <p className="text-xs text-[var(--text-muted)] truncate">
                                  {sub.designation || '-'}
                                </p>
                              </div>
                            </button>
                          ))}
                          {subordinates.length > 8 && (
                            <p className="text-xs text-accent-700 dark:text-accent-400 font-medium">
                              +{subordinates.length - 8} more
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-[var(--text-muted)]">No direct reports</p>
                      )}
                    </SectionCard>

                    {/* System Information */}
                    <SectionCard title="System Information">
                      <div className="space-y-4">
                        <InfoField label="Created At" value={formatDate(employee.createdAt)} />
                        <InfoField label="Last Updated" value={formatDate(employee.updatedAt)} />
                        <InfoField label="Employee ID" value={employee.id} />
                        {employee.userId && (
                          <InfoField label="User ID" value={employee.userId} />
                        )}
                      </div>
                    </SectionCard>
                  </div>
                </div>
              )}

              {/* Timeline sub-tab */}
              {aboutSubTab === 'timeline' && (
                <TalentJourneyTab employeeId={employeeId} />
              )}

              {/* Wall Activity sub-tab */}
              {aboutSubTab === 'wall' && (
                <div className="text-center py-16">
                  <MessageSquare className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                    Wall Activity
                  </h3>
                  <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
                    Social feed posts, recognitions, and announcements involving{' '}
                    {employee.firstName} will appear here.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ═══ PROFILE TAB ═════════════════════════════════════════ */}
          {currentTab === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Primary Details */}
              <SectionCard title="Primary Details">
                <div className="grid grid-cols-2 gap-4">
                  <InfoField label="First Name" value={employee.firstName} />
                  <InfoField label="Last Name" value={employee.lastName} />
                  <InfoField label="Middle Name" value={employee.middleName} />
                  <InfoField label="Gender" value={formatEnumValue(employee.gender)} />
                  <InfoField label="Date of Birth" value={formatDate(employee.dateOfBirth)} />
                  <InfoField label="Nationality" value={employee.country} />
                </div>
              </SectionCard>

              {/* Contact Details */}
              <SectionCard title="Contact Details">
                <div className="grid grid-cols-1 gap-4">
                  <InfoField label="Work Email" value={employee.workEmail} />
                  <InfoField label="Personal Email" value={employee.personalEmail} />
                  <InfoField label="Mobile" value={employee.phoneNumber} />
                  <InfoField
                    label="Emergency Contact"
                    value={employee.emergencyContactNumber}
                  />
                </div>
              </SectionCard>

              {/* Addresses */}
              <SectionCard title="Address">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <InfoField label="Street Address" value={employee.address} />
                  </div>
                  <InfoField label="City" value={employee.city} />
                  <InfoField label="State / Province" value={employee.state} />
                  <InfoField label="Postal Code" value={employee.postalCode} />
                  <InfoField label="Country" value={employee.country} />
                </div>
              </SectionCard>

              {/* Banking & Tax */}
              <SectionCard title="Banking & Tax">
                <div className="grid grid-cols-1 gap-4">
                  <InfoField label="Bank Name" value={employee.bankName} />
                  <InfoField label="Account Number" value={employee.bankAccountNumber} />
                  <InfoField label="IFSC / Routing" value={employee.bankIfscCode} />
                  <InfoField label="Tax ID / SSN" value={employee.taxId} />
                </div>
                <div className="mt-4 bg-accent-50 dark:bg-accent-950/30 border border-accent-500/30 rounded-md p-4">
                  <p className="text-xs text-accent-700 dark:text-accent-400">
                    Banking and tax information is encrypted and stored securely.
                  </p>
                </div>
              </SectionCard>
            </div>
          )}

          {/* ═══ JOB TAB ═════════════════════════════════════════════ */}
          {currentTab === 'job' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Job Details */}
              <SectionCard title="Job Details">
                <div className="grid grid-cols-2 gap-4">
                  <InfoField label="Employee Number" value={employee.employeeCode} />
                  <InfoField label="Date of Joining" value={formatDate(employee.joiningDate)} />
                  <InfoField label="Job Title" value={employee.designation} />
                  <InfoField label="Job Role" value={formatEnumValue(employee.jobRole)} />
                  <InfoField
                    label="Confirmation Date"
                    value={formatDate(employee.confirmationDate)}
                  />
                  <InfoField label="Worker Type" value={formatEnumValue(employee.employmentType)} />
                  <InfoField label="Level" value={formatEnumValue(employee.level)} />
                  <InfoField label="Status" value={formatEnumValue(employee.status)} />
                  {employee.exitDate && (
                    <InfoField label="Exit Date" value={formatDate(employee.exitDate)} />
                  )}
                </div>
              </SectionCard>

              {/* Organization */}
              <SectionCard title="Organization">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <InfoField label="Department" value={employee.departmentName} />
                    <InfoField label="Cost Center" value="Not Set" />
                  </div>

                  {/* Reporting Manager */}
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-2">
                      Reports To
                    </p>
                    {employee.managerId ? (
                      <button
                        onClick={() => router.push(`/employees/${employee.managerId}`)}
                        className="flex items-center gap-4 hover:bg-[var(--bg-secondary)] rounded-lg p-2 -mx-2 transition-colors"
                      >
                        <AvatarInitials name={employee.managerName || 'M'} size="sm" />
                        <span className="text-sm font-medium text-accent-700 dark:text-accent-400 hover:underline">
                          {employee.managerName}
                        </span>
                      </button>
                    ) : (
                      <p className="text-sm text-[var(--text-primary)]">-</p>
                    )}
                  </div>

                  {/* Dotted-Line Managers */}
                  {employee.dottedLineManager1Name && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-2">
                        Dotted-Line Manager 1
                      </p>
                      {employee.dottedLineManager1Id ? (
                        <button
                          onClick={() =>
                            router.push(`/employees/${employee.dottedLineManager1Id}`)
                          }
                          className="flex items-center gap-4 hover:bg-[var(--bg-secondary)] rounded-lg p-2 -mx-2 transition-colors"
                        >
                          <AvatarInitials
                            name={employee.dottedLineManager1Name}
                            size="sm"
                          />
                          <span className="text-sm font-medium text-accent-700 dark:text-accent-400 hover:underline">
                            {employee.dottedLineManager1Name}
                          </span>
                        </button>
                      ) : (
                        <p className="text-sm text-[var(--text-primary)]">
                          {employee.dottedLineManager1Name}
                        </p>
                      )}
                    </div>
                  )}
                  {employee.dottedLineManager2Name && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-2">
                        Dotted-Line Manager 2
                      </p>
                      {employee.dottedLineManager2Id ? (
                        <button
                          onClick={() =>
                            router.push(`/employees/${employee.dottedLineManager2Id}`)
                          }
                          className="flex items-center gap-4 hover:bg-[var(--bg-secondary)] rounded-lg p-2 -mx-2 transition-colors"
                        >
                          <AvatarInitials
                            name={employee.dottedLineManager2Name}
                            size="sm"
                          />
                          <span className="text-sm font-medium text-accent-700 dark:text-accent-400 hover:underline">
                            {employee.dottedLineManager2Name}
                          </span>
                        </button>
                      ) : (
                        <p className="text-sm text-[var(--text-primary)]">
                          {employee.dottedLineManager2Name}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Direct Reports count */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <InfoField
                      label="Direct Reports"
                      value={String(subordinates.length)}
                    />
                    <InfoField
                      label="Dotted Reports"
                      value={String(dottedReports.length)}
                    />
                  </div>
                </div>
              </SectionCard>

              {/* Dotted Reports Table */}
              {dottedReports.length > 0 && (
                <div className="lg:col-span-2">
                  <SectionCard title="Dotted-Line Reports">
                    <p className="text-xs text-[var(--text-muted)] mb-4">
                      Employees who have {employee.fullName} assigned as a dotted-line manager
                      (matrix reporting).
                    </p>
                    <div className="overflow-x-auto">
                      <table className="table-aura w-full">
                        <thead>
                          <tr>
                            <th className="text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] py-2">
                              Employee
                            </th>
                            <th className="text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] py-2">
                              Code
                            </th>
                            <th className="text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] py-2">
                              Designation
                            </th>
                            <th className="text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] py-2">
                              Department
                            </th>
                            <th className="text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] py-2">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {dottedReports.map((report) => (
                            <tr
                              key={report.id}
                              className="hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
                              onClick={() => router.push(`/employees/${report.id}`)}
                            >
                              <td className="whitespace-nowrap py-2">
                                <div className="flex items-center gap-2">
                                  <AvatarInitials name={report.fullName} size="sm" />
                                  <span className="font-medium text-sm text-[var(--text-primary)]">
                                    {report.fullName}
                                  </span>
                                </div>
                              </td>
                              <td className="whitespace-nowrap text-sm text-[var(--text-secondary)] py-2">
                                {report.employeeCode}
                              </td>
                              <td className="whitespace-nowrap text-sm text-[var(--text-secondary)] py-2">
                                {report.designation || '-'}
                              </td>
                              <td className="whitespace-nowrap text-sm text-[var(--text-secondary)] py-2">
                                {report.departmentName || '-'}
                              </td>
                              <td className="py-2">
                                <span
                                  className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusBadgeColor(report.status)}`}
                                >
                                  {formatEnumValue(report.status)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </SectionCard>
                </div>
              )}
            </div>
          )}

          {/* ═══ DOCUMENTS TAB ═══════════════════════════════════════ */}
          {currentTab === 'documents' && (
            <div>
              {/* Search */}
              <div className="mb-6">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    placeholder="Search document categories..."
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  />
                </div>
              </div>

              {/* Folder grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredDocCategories.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <motion.div
                      key={cat.name}
                      whileHover={{ y: -2 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    >
                      <Card className="cursor-pointer hover:border-accent-500/30 transition-colors">
                        <CardContent className="p-6 text-center">
                          <div className="h-12 w-12 mx-auto mb-3 rounded-xl bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
                            <Icon className="h-6 w-6 text-accent-700 dark:text-accent-400" />
                          </div>
                          <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
                            {cat.name}
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">
                            {cat.count} {cat.count === 1 ? 'document' : 'documents'}
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>

              {filteredDocCategories.length === 0 && (
                <div className="text-center py-12">
                  <FolderOpen className="h-10 w-10 text-[var(--text-muted)] mx-auto mb-3" />
                  <p className="text-sm text-[var(--text-muted)]">No matching categories found.</p>
                </div>
              )}
            </div>
          )}

          {/* ═══ ASSETS TAB ══════════════════════════════════════════ */}
          {currentTab === 'assets' && (
            <div>
              {/* Sub-tabs */}
              <div className="flex gap-1 mb-6 border-b border-[var(--border-main)]">
                {ASSET_SUB_TABS.map((sub) => (
                  <button
                    key={sub.key}
                    onClick={() => handleAssetSubTab(sub.key)}
                    className={tabClass(assetSubTab === sub.key)}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>

              {/* Assigned Assets */}
              {assetSubTab === 'assigned' && (
                <div>
                  {(employeeAssets as Asset[]).length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="table-aura w-full">
                        <thead>
                          <tr>
                            {[
                              'Asset Name',
                              'Category',
                              'Serial Number',
                              'Status',
                              'Purchase Date',
                              'Location',
                            ].map((h) => (
                              <th
                                key={h}
                                className="text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] py-2"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(employeeAssets as Asset[]).map((asset) => (
                            <tr
                              key={asset.id}
                              className="hover:bg-[var(--bg-card-hover)] transition-colors"
                            >
                              <td className="py-2">
                                <div className="flex items-center gap-2">
                                  <Laptop className="h-4 w-4 text-[var(--text-muted)]" />
                                  <div>
                                    <p className="text-sm font-medium text-[var(--text-primary)]">
                                      {asset.assetName}
                                    </p>
                                    <p className="text-xs text-[var(--text-muted)]">
                                      {asset.assetCode}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="text-sm text-[var(--text-secondary)] py-2">
                                {formatEnumValue(asset.category)}
                              </td>
                              <td className="text-sm text-[var(--text-secondary)] py-2 font-mono">
                                {asset.serialNumber || '-'}
                              </td>
                              <td className="py-2">
                                <span
                                  className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                    asset.status === 'ASSIGNED'
                                      ? 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-400'
                                      : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                                  }`}
                                >
                                  {formatEnumValue(asset.status)}
                                </span>
                              </td>
                              <td className="text-sm text-[var(--text-secondary)] py-2">
                                {formatDate(asset.purchaseDate)}
                              </td>
                              <td className="text-sm text-[var(--text-secondary)] py-2">
                                {asset.location || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <Package className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                        No Assets Assigned
                      </h3>
                      <p className="text-sm text-[var(--text-muted)]">
                        No assets are currently assigned to this employee.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Asset Requests */}
              {assetSubTab === 'requests' && (
                <div className="text-center py-16">
                  <Package className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                    Asset Requests
                  </h3>
                  <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
                    Asset requests made by {employee.firstName} will appear here.
                  </p>
                </div>
              )}

              {/* Damage Charges */}
              {assetSubTab === 'damages' && (
                <div className="text-center py-16">
                  <AlertTriangle className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                    Asset Damage Charges
                  </h3>
                  <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
                    Any damage charges for assets assigned to {employee.firstName} will appear here.
                  </p>
                </div>
              )}
            </div>
          )}
        </main>

        {/* ── DELETE CONFIRMATION MODAL ─────────────────────────────── */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-[var(--bg-card)] dark:bg-[var(--bg-secondary)] rounded-lg max-w-md w-full p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 h-12 w-12 rounded-full bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-danger-600 dark:text-danger-400" />
                </div>
                <h3 className="ml-4 text-lg font-medium text-[var(--text-primary)]">
                  Delete Employee
                </h3>
              </div>
              <p className="text-sm text-[var(--text-muted)] mb-6">
                Are you sure you want to delete <strong>{employee.fullName}</strong>? This action
                cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleteEmployeeMutation.isPending}
                  className="flex-1 px-4 py-2 border border-[var(--border-main)] rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteEmployeeMutation.isPending}
                  className="flex-1 px-4 py-2 bg-danger-600 text-white rounded-md hover:bg-danger-700 disabled:opacity-50"
                >
                  {deleteEmployeeMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
