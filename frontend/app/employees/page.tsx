'use client';

import {useEffect, useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Controller, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {useCreateEmployee, useDeleteEmployee, useEmployees, useManagers} from '@/lib/hooks/queries/useEmployees';
import {useActiveDepartments} from '@/lib/hooks/queries/useDepartments';
import {CreateEmployeeRequest, Employee} from '@/lib/types/hrms/employee';
import {AppLayout} from '@/components/layout';
import {PageTransition, Reveal} from '@/components/motion';
import {
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
  UserPlus,
  Users,
  UserX,
  X,
} from 'lucide-react';
import {EmptyState} from '@/components/ui/EmptyState';
import {Button} from '@/components/ui/Button';
import {Modal, ModalBody, ModalHeader} from '@/components/ui/Modal';
import {SkeletonTable} from '@/components/ui/Skeleton';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {EMPLOYEE_LIFECYCLE_STATUS} from '@/lib/status/vocabulary';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {createLogger} from '@/lib/utils/logger';
import {formatMonthYear} from '@/lib/utils/format/date';
import {toLocalDateString} from '@/lib/utils/date';
import {EmployeeAvatar} from './_components/EmployeeAvatar';
import {ProfileSheet} from './_components/ProfileSheet';
import listStyles from './_components/employees-list.module.css';
import {useToast} from '@/components/ui/Toast';

/** Display "Month YYYY" from a YYYY-MM-DD string (mono-rendered in the Joined column). */
function joinedShort(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return formatMonthYear(d);
}

type SortKey = 'createdAt' | 'designation' | 'departmentName' | 'joiningDate';

/** Compact page-number window (up to 3 buttons) centred on the current page. */
function pageWindow(current: number, total: number): number[] {
  if (total <= 1) return [0];
  const start = Math.max(0, Math.min(current - 1, total - 3));
  const end = Math.min(total, start + 3);
  const out: number[] = [];
  for (let p = start; p < end; p += 1) out.push(p);
  return out;
}

const log = createLogger('EmployeesPage');

// Zod schema for create employee form
const createEmployeeFormSchema = z.object({
  employeeCode: z.string().min(1, 'Employee Code is required'),
  firstName: z.string().min(1, 'First Name is required'),
  middleName: z.string().optional().or(z.literal('')),
  lastName: z.string().optional().or(z.literal('')),
  workEmail: z.string().email('Invalid work email').min(1, 'Work Email is required'),
  personalEmail: z.string().email('Invalid personal email').optional().or(z.literal('')),
  phoneNumber: z.string().optional().or(z.literal('')),
  emergencyContactNumber: z.string().optional().or(z.literal('')),
  dateOfBirth: z.string().optional().or(z.literal('')),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  postalCode: z.string().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
  designation: z.string().min(1, 'Designation is required'),
  level: z.enum(['ENTRY', 'MID', 'SENIOR', 'LEAD', 'MANAGER', 'SENIOR_MANAGER', 'DIRECTOR', 'VP', 'SVP', 'CXO']).optional(),
  jobRole: z.string().optional().or(z.literal('')),
  departmentId: z.string().min(1, 'Department is required'),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']).default('FULL_TIME'),
  status: z.enum(['ACTIVE', 'ON_LEAVE', 'ON_NOTICE', 'TERMINATED', 'RESIGNED']).default('ACTIVE'),
  joiningDate: z.string().min(1, 'Joining Date is required'),
  confirmationDate: z.string().optional().or(z.literal('')),
  managerId: z.string().optional().or(z.literal('')),
  dottedLineManager1Id: z.string().optional().or(z.literal('')),
  dottedLineManager2Id: z.string().optional().or(z.literal('')),
  bankAccountNumber: z.string().optional().or(z.literal('')),
  bankName: z.string().optional().or(z.literal('')),
  bankIfscCode: z.string().optional().or(z.literal('')),
  taxId: z.string().optional().or(z.literal('')),
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a digit')
    .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
});

type CreateEmployeeFormData = z.infer<typeof createEmployeeFormSchema>;

export default function EmployeesPage() {
  const router = useRouter();
  const {hasPermission, isReady: permReady} = usePermissions();

  // ALL hooks must be called unconditionally before any returns (React rules)
  const canCreate = hasPermission(Permissions.EMPLOYEE_CREATE);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // Status is filtered via the Aura department chips + search; the query still
  // accepts a status param (kept for the fetching contract — no status control in this design).
  const statusFilter = '';
  const [currentTab, setCurrentTab] = useState('basic'); // basic, personal, employment, bank
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const PAGE_SIZE = 20;

  // Aura directory UI state (visual layer — does not alter fetching/permissions)
  const [deptFilter, setDeptFilter] = useState('All');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openEmployee, setOpenEmployee] = useState<Employee | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('createdAt');
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('DESC');

  // React Query - fetch employees, managers, and departments
  const {data: employeeResponse, isLoading: employeesLoading, error: employeesError} = useEmployees(
    currentPage, PAGE_SIZE, sortBy, sortDirection,
    searchQuery || undefined, statusFilter || undefined
  );
  const {data: managers = [], isLoading: managersLoading} = useManagers();
  const {data: departments = [], isLoading: departmentsLoading} = useActiveDepartments();

  const employees = useMemo(() => employeeResponse?.content ?? [], [employeeResponse]);
  const totalPages = employeeResponse?.totalPages ?? 1;
  const totalElements = employeeResponse?.totalElements ?? 0;
  const loading = employeesLoading || managersLoading || departmentsLoading;

  // Department chips: client-side refinement over the currently-loaded page.
  // Counts reflect the loaded page (server-side dept filtering is not part of the
  // employees query contract — we do not change fetching).
  const deptCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of employees) {
      const name = e.departmentName ?? 'Unassigned';
      counts[name] = (counts[name] ?? 0) + 1;
    }
    return counts;
  }, [employees]);

  const deptOptions = useMemo(() => {
    const fromData = Array.from(new Set(employees.map((e) => e.departmentName).filter(Boolean) as string[])).sort();
    return ['All', ...fromData];
  }, [employees]);

  // Distinct locations across the loaded page — drives the "· N locations"
  // subtitle (visual only; does not alter fetching).
  const locationCount = useMemo(() => {
    const locs = new Set<string>();
    for (const e of employees) {
      const loc = e.city ?? e.country;
      if (loc) locs.add(loc);
    }
    return locs.size;
  }, [employees]);

  const visibleEmployees = useMemo(
    () => (deptFilter === 'All' ? employees : employees.filter((e) => e.departmentName === deptFilter)),
    [employees, deptFilter],
  );

  const allVisibleSelected = visibleEmployees.length > 0 && visibleEmployees.every((e) => selected.has(e.id));
  const someVisibleSelected = visibleEmployees.some((e) => selected.has(e.id));
  const error = employeesError
    ? employeesError instanceof Error
      ? employeesError.message.includes('403')
        ? 'You do not have permission to view employees. Contact your administrator.'
        : employeesError.message.includes('401')
          ? 'Your session has expired. Please log in again.'
          : employeesError.message.includes('500')
            ? 'The server encountered an error. Please try again in a moment.'
            : employeesError.message.includes('Network Error')
              ? 'Unable to reach the server. Please check your connection.'
              : employeesError.message
      : 'Failed to load employees'
    : null;

  const {error: toastError} = useToast();
  const createEmployeeMutation = useCreateEmployee();
  const deleteEmployeeMutation = useDeleteEmployee();

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: {errors, isSubmitting},
  } = useForm<CreateEmployeeFormData>({
    resolver: zodResolver(createEmployeeFormSchema),
    defaultValues: {
      employeeCode: '',
      firstName: '',
      middleName: '',
      lastName: '',
      workEmail: '',
      personalEmail: '',
      phoneNumber: '',
      emergencyContactNumber: '',
      dateOfBirth: '',
      gender: undefined,
      address: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      designation: '',
      level: undefined,
      jobRole: undefined,
      departmentId: '',
      employmentType: 'FULL_TIME',
      status: 'ACTIVE',
      joiningDate: toLocalDateString(new Date()),
      confirmationDate: '',
      managerId: '',
      dottedLineManager1Id: '',
      dottedLineManager2Id: '',
      bankAccountNumber: '',
      bankName: '',
      bankIfscCode: '',
      taxId: '',
      password: '',
    },
  });

  // Permission check + redirect — AFTER all hooks
  useEffect(() => {
    if (!permReady) return;
    if (!hasPermission(Permissions.EMPLOYEE_READ)) {
      router.replace('/dashboard');
    }
  }, [permReady, hasPermission, router]);

  useEffect(() => {
    document.title = 'Employees | NU-AURA';
  }, []);

  // Show skeleton while permissions loading
  if (!permReady) {
    return (
      <AppLayout activeMenuItem="employees">
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <div className="h-10 bg-[var(--skeleton-base)] rounded-lg w-1/3 mb-4"/>
              <div className="h-5 bg-[var(--skeleton-base)] rounded-lg w-2/3"/>
            </div>
            <SkeletonTable rows={5} columns={4}/>
          </div>
        </div>
      </AppLayout>
    );
  }

  const onSubmit = async (data: CreateEmployeeFormData) => {
    // Clean up empty optional fields
    // Handle SELF manager - set selfManaged flag for backend to set managerId to employee's own ID
    const isSelfManaged = data.managerId === 'SELF';

    const submitData = {
      ...data,
      middleName: data.middleName || undefined,
      lastName: data.lastName || undefined,
      personalEmail: data.personalEmail || undefined,
      phoneNumber: data.phoneNumber || undefined,
      emergencyContactNumber: data.emergencyContactNumber || undefined,
      dateOfBirth: data.dateOfBirth || undefined,
      address: data.address || undefined,
      city: data.city || undefined,
      state: data.state || undefined,
      postalCode: data.postalCode || undefined,
      country: data.country || undefined,
      confirmationDate: data.confirmationDate || undefined,
      managerId: isSelfManaged ? undefined : (data.managerId || undefined),
      dottedLineManager1Id: data.dottedLineManager1Id || undefined,
      dottedLineManager2Id: data.dottedLineManager2Id || undefined,
      selfManaged: isSelfManaged,
      bankAccountNumber: data.bankAccountNumber || undefined,
      bankName: data.bankName || undefined,
      bankIfscCode: data.bankIfscCode || undefined,
      taxId: data.taxId || undefined,
      gender: data.gender,
      level: data.level,
      jobRole: data.jobRole || undefined,
      departmentId: data.departmentId,
      employmentType: data.employmentType,
      status: data.status,
    } as CreateEmployeeRequest;

    try {
      await createEmployeeMutation.mutateAsync(submitData);
      setShowAddModal(false);
      reset();
      setCurrentTab('basic');
    } catch (err: unknown) {
      log.error('Error creating employee:', err);
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toastError(msg || 'Failed to create employee. Please try again.');
    }
  };

  const handleSearch = () => {
    // Reset to first page when searching - React Query automatically refetches
    // because searchQuery is included in the useEmployees query key
    setCurrentPage(0);
  };

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelected((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        visibleEmployees.forEach((e) => next.delete(e.id));
        return next;
      }
      const next = new Set(prev);
      visibleEmployees.forEach((e) => next.add(e.id));
      return next;
    });
  };

  const cycleSort = () => {
    // Sort drives the server query (sortBy/sortDirection are in the query key).
    const order: SortKey[] = ['createdAt', 'designation', 'departmentName', 'joiningDate'];
    if (sortDirection === 'DESC') {
      setSortDirection('ASC');
    } else {
      const idx = order.indexOf(sortBy);
      setSortBy(order[(idx + 1) % order.length]);
      setSortDirection('DESC');
    }
    setCurrentPage(0);
  };

  const handleDelete = async () => {
    if (!employeeToDelete) return;

    try {
      await deleteEmployeeMutation.mutateAsync(employeeToDelete.id);
      setShowDeleteModal(false);
      setEmployeeToDelete(null);
    } catch (err: unknown) {
      log.error('Error deleting employee:', err);
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toastError(msg || 'Failed to delete employee. Please try again.');
      setShowDeleteModal(false);
    }
  };

  return (
    <AppLayout
      activeMenuItem="employees"
      breadcrumbs={[{label: 'NU-HRMS'}, {label: 'Employees'}]}
    >
      <PageTransition className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-aura-title text-[var(--text-1)]">Employees</h1>
            <p className="mt-1.5 text-[13.5px] text-[var(--text-3)]">
              <span className="num">{totalElements.toLocaleString()}</span> people
              {' '}across <span className="num">{deptOptions.length - 1}</span> departments
              {locationCount > 0 && (
                <>
                  {' · '}
                  <span className="num">{locationCount}</span> location{locationCount === 1 ? '' : 's'}
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<SlidersHorizontal size={15} aria-hidden />}
              onClick={() => router.push('/employees/change-requests')}
            >
              Change Requests
            </Button>
            <PermissionGate permission={Permissions.EMPLOYEE_CREATE}>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Download size={15} aria-hidden />}
                onClick={() => router.push('/employees/import')}
              >
                Import
              </Button>
            </PermissionGate>
            <PermissionGate permission={Permissions.EMPLOYEE_CREATE}>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<UserPlus size={15} aria-hidden />}
                onClick={() => {
                  window.nuToast?.('New employee', { msg: 'Opening the add-employee form…', type:'info' });
                  setShowAddModal(true);
                }}
              >
                Add Employee
              </Button>
            </PermissionGate>
          </div>
        </div>
        {/* Error Message */}
        {error && (
          <div
            className="p-4 bg-danger-50 dark:bg-danger-950/20 border border-danger-200 dark:border-danger-800 rounded-xl">
            <p className="text-sm text-danger-600 dark:text-danger-400">{error}</p>
          </div>
        )}

        {/* Employee directory card */}
        <Reveal inView className="card-aura overflow-hidden">
          {/* Toolbar OR bulk-select bar */}
          {selected.size > 0 ? (
            <div className={listStyles.bulkbar}>
              <span className={listStyles.bulkCount}>
                <span className="num">{selected.size}</span> selected
              </span>
              <span className={listStyles.bulkSep} />
              <button
                type="button"
                className={listStyles.bulkX}
                aria-label="Clear selection"
                onClick={() => setSelected(new Set())}
              >
                <X size={16} aria-hidden />
              </button>
            </div>
          ) : (
            <div className={listStyles.toolbar}>
              <div className={listStyles.search}>
                <Search size={16} aria-hidden />
                <label htmlFor="employee-search" className="sr-only">Search employees</label>
                <input
                  id="employee-search"
                  type="text"
                  placeholder="Search name, role, email…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  aria-label="Search employees by name, role or email"
                />
              </div>
              <div className={listStyles.chips} role="group" aria-label="Filter by department">
                {deptOptions.map((d) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={deptFilter === d}
                    className={`${listStyles.chip} ${deptFilter === d ? listStyles.chipActive : ''}`}
                    onClick={() => setDeptFilter(d)}
                  >
                    {d}
                    {deptFilter === d && <Check size={14} className="ml-1 inline" aria-hidden />}
                    {d !== 'All' && <span className={listStyles.chipN}>{deptCounts[d] ?? 0}</span>}
                  </button>
                ))}
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<ArrowUpDown size={15} aria-hidden />}
                  onClick={cycleSort}
                  aria-label={`Sort employees. Currently sorting by ${sortBy} in ${sortDirection === 'DESC' ? 'descending' : 'ascending'} order. Click to cycle to next sort field.`}
                >
                  Sort
                </Button>
              </div>
            </div>
          )}

          {loading ? (
            <SkeletonTable rows={8} columns={7}/>
          ) : error && visibleEmployees.length === 0 ? (
            <EmptyState
              icon={<UserX className="h-12 w-12"/>}
              iconColor="bg-[var(--status-error-bg)] text-[var(--err-fg)]"
              title="Failed to load employees"
              description="Please refresh the page and try again."
              size="compact"
            />
          ) : visibleEmployees.length === 0 ? (
            <EmptyState
              icon={<Users className="h-12 w-12"/>}
              title={searchQuery.trim() || deptFilter !== 'All' ? 'No employees match your filters' : 'No Employees Found'}
              description={searchQuery.trim() || deptFilter !== 'All' ? 'Try adjusting your search or department filter' : 'Add your first employee to get started'}
              action={canCreate ? {label: 'Add employee', onClick: () => setShowAddModal(true)} : undefined}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className={listStyles.table}>
                  <thead>
                  <tr>
                    <th className={listStyles.checkCell}>
                      <input
                        type="checkbox"
                        className={listStyles.check}
                        checked={allVisibleSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = !allVisibleSelected && someVisibleSelected;
                        }}
                        onChange={toggleAllVisible}
                        aria-label="Select all employees on this page"
                      />
                    </th>
                    <th>Employee</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Location</th>
                    <th>Joined</th>
                    <th>Status</th>
                    <th className={listStyles.kebabCell} aria-label="Actions" />
                  </tr>
                  </thead>
                  <tbody>
                  {visibleEmployees.map((employee) => {
                    const isSelected = selected.has(employee.id);
                    const location = [employee.city, employee.country].filter(Boolean).join(', ') || '—';
                    return (
                      <tr
                        key={employee.id}
                        className={`${listStyles.row} ${isSelected ? listStyles.rowSelected : ''}`}
                        onClick={() => setOpenEmployee(employee)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setOpenEmployee(employee);
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label={`View ${employee.fullName} profile`}
                      >
                        <td onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className={listStyles.check}
                            checked={isSelected}
                            onChange={() => toggleRow(employee.id)}
                            aria-label={`Select ${employee.fullName}`}
                          />
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className={listStyles.cellUser}
                            onClick={() => setOpenEmployee(employee)}
                            aria-label={`View ${employee.fullName} profile`}
                          >
                            <EmployeeAvatar name={employee.fullName} size={38} src={employee.profilePhotoUrl} />
                            <div>
                              <div className={listStyles.cellName}>{employee.fullName}</div>
                              <div className={listStyles.cellSub}>{employee.workEmail}</div>
                            </div>
                          </button>
                        </td>
                        <td className="font-medium text-[var(--text-1)]">{employee.designation ?? '—'}</td>
                        <td>{employee.departmentName ?? '—'}</td>
                        <td>{location}</td>
                        <td className="num text-[12.5px]">{joinedShort(employee.joiningDate)}</td>
                        <td>
                          <StatusBadge status={employee.status} domain={EMPLOYEE_LIFECYCLE_STATUS} compact />
                        </td>
                        <td className={listStyles.kebabCell} onClick={(e) => e.stopPropagation()}>
                          <PermissionGate
                            permission={Permissions.EMPLOYEE_DELETE}
                            fallback={
                              <button
                                type="button"
                                className={listStyles.kebab}
                                aria-label={`View ${employee.fullName}`}
                                onClick={() => router.push(`/employees/${employee.id}`)}
                              >
                                <MoreHorizontal size={16} aria-hidden />
                              </button>
                            }
                          >
                            <button
                              type="button"
                              className={listStyles.kebab}
                              aria-label={`Delete ${employee.fullName}`}
                              onClick={() => {
                                setEmployeeToDelete(employee);
                                setShowDeleteModal(true);
                              }}
                            >
                              <MoreHorizontal size={16} aria-hidden />
                            </button>
                          </PermissionGate>
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>

              <div className={listStyles.foot}>
                <span>
                  Showing <b className="num text-[var(--text-1)]">{visibleEmployees.length}</b>
                  {' '}of <span className="num">{totalElements.toLocaleString()}</span> employees
                </span>
                <div className={listStyles.pager} role="navigation" aria-label="Pagination">
                  <button
                    type="button"
                    aria-label="Previous page"
                    onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                  >
                    <ChevronLeft size={15} aria-hidden />
                  </button>
                  {pageWindow(currentPage, totalPages).map((p) => (
                    <button
                      key={p}
                      type="button"
                      aria-label={`Page ${p + 1}`}
                      aria-current={p === currentPage ? 'page' : undefined}
                      className={p === currentPage ? listStyles.pagerActive : undefined}
                      onClick={() => setCurrentPage(p)}
                    >
                      {p + 1}
                    </button>
                  ))}
                  <button
                    type="button"
                    aria-label="Next page"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={currentPage >= totalPages - 1}
                  >
                    <ChevronRight size={15} aria-hidden />
                  </button>
                </div>
              </div>
            </>
          )}
        </Reveal>

        {/* Add Employee Modal */}
        <Modal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            reset();
            setCurrentTab('basic');
          }}
          size="xl"
        >
          <ModalHeader
            onClose={() => {
              setShowAddModal(false);
              reset();
              setCurrentTab('basic');
            }}
          >
            Add New Employee
          </ModalHeader>
          <ModalBody>
            {/* Tabs */}
                <div className="mb-6 border-b border-[var(--border-main)]">
                  <nav className="-mb-px flex space-x-8">
                    <button
                      onClick={() => setCurrentTab('basic')}
                      className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 rounded-t-sm ${
                        currentTab === 'basic'
                          ? 'border-accent-500 text-accent-700 dark:text-accent-400'
                          : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)] hover:border-[var(--border-main)] dark:hover:border-[var(--border-main)]'
                      }`}
                    >
                      Basic Info
                    </button>
                    <button
                      onClick={() => setCurrentTab('personal')}
                      className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 rounded-t-sm ${
                        currentTab === 'personal'
                          ? 'border-accent-500 text-accent-700 dark:text-accent-400'
                          : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)] hover:border-[var(--border-main)] dark:hover:border-[var(--border-main)]'
                      }`}
                    >
                      Personal Details
                    </button>
                    <button
                      onClick={() => setCurrentTab('employment')}
                      className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 rounded-t-sm ${
                        currentTab === 'employment'
                          ? 'border-accent-500 text-accent-700 dark:text-accent-400'
                          : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)] hover:border-[var(--border-main)] dark:hover:border-[var(--border-main)]'
                      }`}
                    >
                      Employment
                    </button>
                    <button
                      onClick={() => setCurrentTab('bank')}
                      className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 rounded-t-sm ${
                        currentTab === 'bank'
                          ? 'border-accent-500 text-accent-700 dark:text-accent-400'
                          : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)] hover:border-[var(--border-main)] dark:hover:border-[var(--border-main)]'
                      }`}
                    >
                      Banking & Tax
                    </button>
                  </nav>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                  {/* Basic Info Tab */}
                  <div className={currentTab === 'basic' ? 'space-y-4' : 'hidden'}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="emp-code"
                               className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Employee Code *
                        </label>
                        <input
                          id="emp-code"
                          type="text"
                          {...register('employeeCode')}
                          className="input-aura"
                          placeholder="EMP001"
                          aria-invalid={!!errors.employeeCode}
                        />
                        {errors.employeeCode && <p
                          className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.employeeCode.message}</p>}
                      </div>
                      <div>
                        <label htmlFor="emp-work-email"
                               className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Work Email *
                        </label>
                        <input
                          id="emp-work-email"
                          type="email"
                          {...register('workEmail')}
                          className="input-aura"
                          placeholder="employee@company.com"
                          aria-invalid={!!errors.workEmail}
                        />
                        {errors.workEmail && <p
                          className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.workEmail.message}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="emp-first-name"
                               className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          First Name *
                        </label>
                        <input
                          id="emp-first-name"
                          type="text"
                          {...register('firstName')}
                          className="input-aura"
                          aria-invalid={!!errors.firstName}
                        />
                        {errors.firstName && <p
                          className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.firstName.message}</p>}
                      </div>
                      <div>
                        <label htmlFor="emp-middle-name"
                               className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Middle Name
                        </label>
                        <input
                          id="emp-middle-name"
                          type="text"
                          {...register('middleName')}
                          className="input-aura"
                        />
                        {errors.middleName && <p
                          className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.middleName.message}</p>}
                      </div>
                      <div>
                        <label htmlFor="emp-last-name"
                               className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Last Name
                        </label>
                        <input
                          id="emp-last-name"
                          type="text"
                          {...register('lastName')}
                          className="input-aura"
                        />
                        {errors.lastName && <p
                          className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.lastName.message}</p>}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="emp-password"
                             className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Initial Password *
                      </label>
                      <input
                        id="emp-password"
                        type="password"
                        {...register('password')}
                        className="input-aura"
                        placeholder="Employee will change on first login"
                        aria-invalid={!!errors.password}
                      />
                      {errors.password &&
                        <p className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.password.message}</p>}
                    </div>
                  </div>

                  {/* Personal Details Tab */}
                  <div className={currentTab === 'personal' ? 'space-y-4' : 'hidden'}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="emp-personal-email" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Personal Email
                        </label>
                        <input
                          id="emp-personal-email"
                          type="email"
                          {...register('personalEmail')}
                          className="input-aura"
                          placeholder="personal@email.com"
                        />
                        {errors.personalEmail && <p
                          className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.personalEmail.message}</p>}
                      </div>
                      <div>
                        <label htmlFor="emp-phone-number" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Phone Number
                        </label>
                        <input
                          id="emp-phone-number"
                          type="tel"
                          {...register('phoneNumber')}
                          className="input-aura"
                          placeholder="+1 234 567 8900"
                        />
                        {errors.phoneNumber && <p
                          className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.phoneNumber.message}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="emp-emergency-contact" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Emergency Contact
                        </label>
                        <input
                          id="emp-emergency-contact"
                          type="tel"
                          {...register('emergencyContactNumber')}
                          className="input-aura"
                          placeholder="+1 234 567 8900"
                        />
                        {errors.emergencyContactNumber && <p
                          className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.emergencyContactNumber.message}</p>}
                      </div>
                      <div>
                        <label htmlFor="emp-date-of-birth" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Date of Birth
                        </label>
                        <input
                          id="emp-date-of-birth"
                          type="date"
                          {...register('dateOfBirth')}
                          className="input-aura"
                        />
                        {errors.dateOfBirth && <p
                          className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.dateOfBirth.message}</p>}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="emp-gender" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Gender
                      </label>
                      <Controller
                        name="gender"
                        control={control}
                        render={({field}) => (
                          <select
                            id="emp-gender"
                            {...field}
                            value={field.value || ''}
                            className="input-aura"
                          >
                            <option value="">Select Gender</option>
                            <option value="MALE">Male</option>
                            <option value="FEMALE">Female</option>
                            <option value="OTHER">Other</option>
                            <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                          </select>
                        )}
                      />
                      {errors.gender &&
                        <p className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.gender.message}</p>}
                    </div>

                    <div>
                      <label htmlFor="emp-address" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Address
                      </label>
                      <textarea
                        id="emp-address"
                        rows={2}
                        {...register('address')}
                        className="input-aura min-h-[80px] py-2"
                        placeholder="Street address"
                      />
                      {errors.address &&
                        <p className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.address.message}</p>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="emp-city" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          City
                        </label>
                        <input
                          id="emp-city"
                          type="text"
                          {...register('city')}
                          className="input-aura"
                        />
                        {errors.city &&
                          <p className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.city.message}</p>}
                      </div>
                      <div>
                        <label htmlFor="emp-state" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          State/Province
                        </label>
                        <input
                          id="emp-state"
                          type="text"
                          {...register('state')}
                          className="input-aura"
                        />
                        {errors.state &&
                          <p className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.state.message}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="emp-postal-code" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Postal Code
                        </label>
                        <input
                          id="emp-postal-code"
                          type="text"
                          {...register('postalCode')}
                          className="input-aura"
                        />
                        {errors.postalCode && <p
                          className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.postalCode.message}</p>}
                      </div>
                      <div>
                        <label htmlFor="emp-country" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Country
                        </label>
                        <input
                          id="emp-country"
                          type="text"
                          {...register('country')}
                          className="input-aura"
                        />
                        {errors.country &&
                          <p className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.country.message}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Employment Tab */}
                  <div className={currentTab === 'employment' ? 'space-y-4' : 'hidden'}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="emp-designation" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Designation *
                        </label>
                        <input
                          id="emp-designation"
                          type="text"
                          {...register('designation')}
                          className="input-aura"
                          placeholder="Senior Software Engineer"
                        />
                        {errors.designation && <p
                          className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.designation.message}</p>}
                      </div>
                      <div>
                        <label htmlFor="emp-employment-type" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Employment Type *
                        </label>
                        <Controller
                          name="employmentType"
                          control={control}
                          render={({field}) => (
                            <select
                              id="emp-employment-type"
                              {...field}
                              className="input-aura"
                            >
                              <option value="FULL_TIME">Full Time</option>
                              <option value="PART_TIME">Part Time</option>
                              <option value="CONTRACT">Contract</option>
                              <option value="INTERN">Intern</option>
                            </select>
                          )}
                        />
                        {errors.employmentType && <p
                          className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.employmentType.message}</p>}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="emp-department" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Department *
                      </label>
                      <Controller
                        name="departmentId"
                        control={control}
                        render={({field}) => (
                          <select
                            id="emp-department"
                            {...field}
                            className="input-aura"
                          >
                            <option value="">Select Department</option>
                            {departments.map((dept) => (
                              <option key={dept.id} value={dept.id}>
                                {dept.name} ({dept.code})
                              </option>
                            ))}
                          </select>
                        )}
                      />
                      {errors.departmentId && <p
                        className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.departmentId.message}</p>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="emp-level" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Employee Level
                        </label>
                        <Controller
                          name="level"
                          control={control}
                          render={({field}) => (
                            <select
                              id="emp-level"
                              {...field}
                              value={field.value || ''}
                              className="input-aura"
                            >
                              <option value="">Select Level</option>
                              <option value="ENTRY">Entry</option>
                              <option value="MID">Mid</option>
                              <option value="SENIOR">Senior</option>
                              <option value="LEAD">Lead</option>
                              <option value="MANAGER">Manager</option>
                              <option value="SENIOR_MANAGER">Senior Manager</option>
                              <option value="DIRECTOR">Director</option>
                              <option value="VP">Vice President</option>
                              <option value="SVP">Senior Vice President</option>
                              <option value="CXO">C-Level Executive</option>
                            </select>
                          )}
                        />
                        {errors.level &&
                          <p className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.level.message}</p>}
                      </div>
                      <div>
                        <label htmlFor="emp-job-role" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Job Role
                        </label>
                        <Controller
                          name="jobRole"
                          control={control}
                          render={({field}) => (
                            <select
                              id="emp-job-role"
                              {...field}
                              value={field.value || ''}
                              className="input-aura"
                            >
                              <option value="">Select Role</option>
                              <option value="ENGINEER">Engineer</option>
                              <option value="MANAGER">Manager</option>
                              <option value="ANALYST">Analyst</option>
                              <option value="DESIGNER">Designer</option>
                              <option value="SUPPORT">Support</option>
                              <option value="SALES">Sales</option>
                              <option value="MARKETING">Marketing</option>
                              <option value="HR">HR</option>
                              <option value="FINANCE">Finance</option>
                              <option value="OPERATIONS">Operations</option>
                              <option value="OTHER">Other</option>
                            </select>
                          )}
                        />
                        {errors.jobRole &&
                          <p className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.jobRole.message}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="emp-joining-date" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Joining Date *
                        </label>
                        <input
                          id="emp-joining-date"
                          type="date"
                          {...register('joiningDate')}
                          className="input-aura"
                        />
                        {errors.joiningDate && <p
                          className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.joiningDate.message}</p>}
                      </div>
                      <div>
                        <label htmlFor="emp-confirmation-date" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Confirmation Date
                        </label>
                        <input
                          id="emp-confirmation-date"
                          type="date"
                          {...register('confirmationDate')}
                          className="input-aura"
                        />
                        {errors.confirmationDate && <p
                          className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.confirmationDate.message}</p>}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="emp-manager" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Reporting Manager
                      </label>
                      <Controller
                        name="managerId"
                        control={control}
                        render={({field}) => (
                          <select
                            id="emp-manager"
                            {...field}
                            className="input-aura"
                          >
                            <option value="">Select Manager</option>
                            <option value="SELF">Self (No Reporting Manager)</option>
                            {managers.map((manager) => (
                              <option key={manager.id} value={manager.id}>
                                {manager.fullName} ({manager.employeeCode})
                              </option>
                            ))}
                          </select>
                        )}
                      />
                      <p className="mt-1 text-caption">
                        Select &ldquo;Self&rdquo; for top-level employees who don&apos;t report to anyone.
                      </p>
                      {errors.managerId &&
                        <p className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.managerId.message}</p>}
                    </div>

                    {/* Dotted-Line Managers (Optional, Matrix Reporting) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="emp-dotted-manager-1" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Dotted-Line Manager 1 <span className="text-[var(--text-muted)]">(Optional)</span>
                        </label>
                        <Controller
                          name="dottedLineManager1Id"
                          control={control}
                          render={({field}) => (
                            <select
                              id="emp-dotted-manager-1"
                              {...field}
                              className="input-aura"
                            >
                              <option value="">None</option>
                              {managers.map((manager) => (
                                <option key={manager.id} value={manager.id}>
                                  {manager.fullName} ({manager.employeeCode})
                                </option>
                              ))}
                            </select>
                          )}
                        />
                      </div>
                      <div>
                        <label htmlFor="emp-dotted-manager-2" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Dotted-Line Manager 2 <span className="text-[var(--text-muted)]">(Optional)</span>
                        </label>
                        <Controller
                          name="dottedLineManager2Id"
                          control={control}
                          render={({field}) => (
                            <select
                              id="emp-dotted-manager-2"
                              {...field}
                              className="input-aura"
                            >
                              <option value="">None</option>
                              {managers.map((manager) => (
                                <option key={manager.id} value={manager.id}>
                                  {manager.fullName} ({manager.employeeCode})
                                </option>
                              ))}
                            </select>
                          )}
                        />
                      </div>
                    </div>
                    <p className="text-caption">
                      Dotted-line managers represent matrix reporting relationships. They are informational only and do
                      not participate in approval workflows.
                    </p>
                  </div>

                  {/* Banking & Tax Tab */}
                  <div className={currentTab === 'bank' ? 'space-y-4' : 'hidden'}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="emp-bank-account" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Bank Account Number
                        </label>
                        <input
                          id="emp-bank-account"
                          type="text"
                          {...register('bankAccountNumber')}
                          className="input-aura"
                          placeholder="1234567890"
                        />
                        {errors.bankAccountNumber && <p
                          className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.bankAccountNumber.message}</p>}
                      </div>
                      <div>
                        <label htmlFor="emp-bank-name" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Bank Name
                        </label>
                        <input
                          id="emp-bank-name"
                          type="text"
                          {...register('bankName')}
                          className="input-aura"
                          placeholder="Bank of America"
                        />
                        {errors.bankName && <p
                          className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.bankName.message}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="emp-bank-ifsc" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          IFSC Code / Routing Number
                        </label>
                        <input
                          id="emp-bank-ifsc"
                          type="text"
                          {...register('bankIfscCode')}
                          className="input-aura"
                          placeholder="HDFC0001234"
                        />
                        {errors.bankIfscCode && <p
                          className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.bankIfscCode.message}</p>}
                      </div>
                      <div>
                        <label htmlFor="emp-tax-id" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Tax ID / SSN
                        </label>
                        <input
                          id="emp-tax-id"
                          type="text"
                          {...register('taxId')}
                          className="input-aura"
                          placeholder="XXX-XX-XXXX"
                        />
                        {errors.taxId &&
                          <p className="text-danger-500 dark:text-danger-400 text-xs mt-1">{errors.taxId.message}</p>}
                      </div>
                    </div>

                    <div
                      className="bg-accent-50 dark:bg-accent-950/30 border border-accent-200 dark:border-accent-800 rounded-xl p-4">
                      <p className="text-sm text-accent-700 dark:text-accent-400">
                        <strong>Note:</strong> Banking and tax information is encrypted and stored securely. This
                        information will be used for payroll processing.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-6 border-t border-[var(--border-subtle)]">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setShowAddModal(false);
                        reset();
                        setCurrentTab('basic');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      className="flex-1"
                      isLoading={isSubmitting}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Adding...' : 'Add Employee'}
                    </Button>
                  </div>
                </form>
          </ModalBody>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={showDeleteModal && !!employeeToDelete}
          onClose={() => {
            setShowDeleteModal(false);
            setEmployeeToDelete(null);
          }}
          size="sm"
        >
          <ModalHeader
            onClose={() => {
              setShowDeleteModal(false);
              setEmployeeToDelete(null);
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="flex-shrink-0 h-10 w-10 rounded-lg bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center">
                <svg className="h-5 w-5 text-danger-600 dark:text-danger-400" fill="none" viewBox="0 0 24 24"
                     stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Delete Employee?</h2>
            </div>
          </ModalHeader>
          <ModalBody>
            <p className="text-body-secondary mb-6">
              <strong
              className="text-[var(--text-primary)]">{employeeToDelete?.fullName}</strong> will be deactivated and marked as terminated. Their employment records are retained for compliance and the account can be reactivated later.
            </p>
            <div className="flex gap-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowDeleteModal(false);
                  setEmployeeToDelete(null);
                }}
                disabled={deleteEmployeeMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={handleDelete}
                isLoading={deleteEmployeeMutation.isPending}
                disabled={deleteEmployeeMutation.isPending}
              >
                {deleteEmployeeMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </ModalBody>
        </Modal>

        {/* Profile slide-over (Aura screen 05) */}
        {openEmployee && (
          <ProfileSheet
            employee={openEmployee}
            onClose={() => setOpenEmployee(null)}
            onViewFull={() => router.push(`/employees/${openEmployee.id}`)}
            onEdit={
              hasPermission(Permissions.EMPLOYEE_UPDATE)
                ? () => router.push(`/employees/${openEmployee.id}/edit`)
                : undefined
            }
          />
        )}
      </PageTransition>
    </AppLayout>
  );
}
