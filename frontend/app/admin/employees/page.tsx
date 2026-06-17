'use client';

import React, {useEffect, useMemo, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {AnimatePresence, motion} from 'framer-motion';
import {PasswordInput, Select, TextInput} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {
  AlertCircle,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  Hash,
  Lock,
  Mail,
  Pencil,
  Search,
  Shield,
  User,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {AdminPageContent} from '@/components/layout';
import {PageTransition, Reveal, Stagger, StaggerItem} from '@/components/motion';
import {Button} from '@/components/ui/Button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui/Modal';
import {EmptyState} from '@/components/ui/EmptyState';
import {SkeletonTable} from '@/components/ui/Skeleton';
import {useCreateEmployee, useEmployees, useManagers} from '@/lib/hooks/queries/useEmployees';
import {useAllDepartments} from '@/lib/hooks/queries/useDepartments';
import {useAssignRolesToUser, useRoles} from '@/lib/hooks/queries/useRoles';
// useUpdateUserRole removed — using usersApi.assignRoles for multi-role support
import {Permissions, Roles, usePermissions} from '@/lib/hooks/usePermissions';
import {CreateEmployeeRequest, Employee} from '@/lib/types/hrms/employee';
import {usersApi} from '@/lib/api/users';
import {StatusBadge} from '@/components/ui/StatusBadge';

// ──────────────────────────────────────────────
// Zod schema
// ──────────────────────────────────────────────
const createEmployeeWithRoleSchema = z.object({
  employeeCode: z.string().min(1, 'Employee code is required').max(50).regex(/^[A-Za-z0-9\-_]+$/, 'Only letters, numbers, hyphens, underscores'),
  firstName: z.string().min(1, 'First name is required').max(100),
  middleName: z.string().max(100).optional().default(''),
  lastName: z.string().max(100).optional().default(''),
  workEmail: z.string().min(1, 'Work email is required').email('Must be a valid email'),
  password: z.string().min(8, 'Min 8 characters').regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Must contain uppercase, lowercase, and number'),
  joiningDate: z.string().min(1, 'Joining date is required'),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'CONSULTANT']),
  departmentId: z.string().optional().default(''),
  designation: z.string().max(100).optional().default(''),
  level: z.enum(['ENTRY', 'MID', 'SENIOR', 'LEAD', 'MANAGER', 'SENIOR_MANAGER', 'DIRECTOR', 'VP', 'SVP', 'CXO']).optional(),
  managerId: z.string().optional().default(''),
  roleCodes: z.array(z.string()).min(1, 'At least one role is required'),
});

type CreateEmployeeWithRoleForm = z.infer<typeof createEmployeeWithRoleSchema>;

// ──────────────────────────────────────────────
// Role metadata
// ──────────────────────────────────────────────
interface RoleMeta {
  value: string;
  label: string;
  description: string;
  color: string;
  badgeClass: string;
  permissions: string[]; // summarized permission areas
}

const ROLE_META: RoleMeta[] = [
  {
    value: Roles.EMPLOYEE,
    label: 'Employee',
    description: 'Self-service: view own profile, request leave, mark attendance, view payslips',
    color: 'bg-accent-500',
    badgeClass: 'status-info',
    permissions: ['Self Profile', 'Leave Requests', 'Attendance (Self)', 'Payslips (Self)', 'Documents', 'Training', 'Recognition']
  },
  {
    value: Roles.TEAM_LEAD,
    label: 'Team Lead',
    description: 'Everything Employee gets + manage direct reports, approve team leave, view team attendance',
    color: 'bg-accent-500',
    badgeClass: 'status-info',
    permissions: ['Team Visibility', 'Leave Approval (Team)', 'Attendance (Team)', 'Performance Reviews', 'Goal Management']
  },
  {
    value: Roles.MANAGER,
    label: 'Manager',
    description: 'Everything Team Lead gets + department view, timesheet approval, reporting access',
    color: 'bg-accent-700',
    badgeClass: 'status-info',
    permissions: ['Department View', 'Timesheet Approval', 'Reports', 'Expense Approval (Team)', 'Recruitment (Team View)']
  },
  {
    value: Roles.HR_MANAGER,
    label: 'HR Manager',
    description: 'Full HR operations: employee CRUD, leave management, recruitment, onboarding, benefits, compliance',
    color: 'bg-warning-500',
    badgeClass: 'status-warning',
    permissions: ['Employee CRUD', 'Leave Management', 'Recruitment', 'Onboarding/Exit', 'Benefits', 'Compensation', 'Compliance', 'Documents']
  },
  {
    value: Roles.HR_ADMIN,
    label: 'HR Admin',
    description: 'Everything HR Manager gets + system settings, role management, leave type config',
    color: 'bg-warning-500',
    badgeClass: 'status-warning',
    permissions: ['All HR Manager +', 'Role Management', 'Settings', 'Leave Type Config', 'Shift Config', 'Custom Fields']
  },
  {
    value: Roles.RECRUITER,
    label: 'Recruiter',
    description: 'Recruitment pipeline, candidate management, interviews, offers, job boards',
    color: 'bg-success-500',
    badgeClass: 'status-info',
    permissions: ['Job Openings', 'Candidates', 'Interviews', 'Offers', 'Job Boards', 'Preboarding']
  },
  {
    value: Roles.FINANCE_ADMIN,
    label: 'Finance Admin',
    description: 'Payroll processing, salary structures, statutory compliance, expense approvals',
    color: 'bg-success-500',
    badgeClass: 'status-success',
    permissions: ['Payroll Runs', 'Salary Structures', 'Statutory', 'TDS/PF/ESI', 'Expense Approval', 'Compensation']
  },
  {
    value: Roles.SUPER_ADMIN,
    label: 'Super Admin',
    description: 'Bypasses ALL permission checks. Unrestricted access to every tenant, module, and data point in the system.',
    color: 'bg-danger-500',
    badgeClass: 'status-danger',
    permissions: ['EVERYTHING (bypasses all RBAC)']
  },
];

const EMPLOYMENT_TYPES = [
  {value: 'FULL_TIME', label: 'Full Time'}, {value: 'PART_TIME', label: 'Part Time'},
  {value: 'CONTRACT', label: 'Contract'}, {value: 'INTERN', label: 'Intern'}, {
    value: 'CONSULTANT',
    label: 'Consultant'
  },
];

const PAGE_SIZE = 10;
const TEXT_INPUT_CLASS = 'w-full';

// ──────────────────────────────────────────────
// Permission Preview Component
// ──────────────────────────────────────────────
function PermissionPreview({roleCodes}: { roleCodes: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const selectedRoles = ROLE_META.filter(r => roleCodes.includes(r.value));
  if (selectedRoles.length === 0) return null;

  // Collect unique permission areas
  const allPerms = new Set<string>();
  selectedRoles.forEach(r => r.permissions.forEach(p => allPerms.add(p)));

  return (
    <div className="mt-4 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="row-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-accent-500"/>
          <span className="text-sm font-medium text-[var(--text-primary)]">
            Permission Summary: {allPerms.size} capability areas
          </span>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-[var(--text-muted)]"/> :
          <ChevronDown className="h-4 w-4 text-[var(--text-muted)]"/>}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{height: 0, opacity: 0}}
            animate={{height: 'auto', opacity: 1}}
            exit={{height: 0, opacity: 0}}
            transition={{duration: 0.2}}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-4">
              {selectedRoles.map(role => (
                <div key={role.value}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`h-2 w-2 rounded-full ${role.color}`}/>
                    <span
                      className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">{role.label}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.map(p => (
                      <span key={p}
                            className="px-2 py-0.5 text-xs rounded-full bg-[var(--bg-card)] border border-[var(--border-main)] text-[var(--text-secondary)]">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ──────────────────────────────────────────────
// Inline Role Editor Component
// ──────────────────────────────────────────────
function InlineRoleEditor({employee, onClose}: { employee: Employee; onClose: () => void }) {
  const {hasRole} = usePermissions();
  const [selectedRoles, setSelectedRoles] = useState<string[]>([Roles.EMPLOYEE]);
  const [saving, setSaving] = useState(false);
  const assignRolesMutation = useAssignRolesToUser(employee.userId || employee.id);

  // DEF-54: Only SuperAdmin can see/assign the SUPER_ADMIN role in the inline editor
  const availableRoles = useMemo(
    () => hasRole(Roles.SUPER_ADMIN) ? ROLE_META : ROLE_META.filter((r) => r.value !== Roles.SUPER_ADMIN),
    [hasRole],
  );

  const toggleRole = (code: string) => {
    setSelectedRoles(prev =>
      prev.includes(code) ? prev.filter(r => r !== code) : [...prev, code]
    );
  };

  const handleSave = async () => {
    if (selectedRoles.length === 0) {
      notifications.show({title: 'Error', message: 'Select at least one role', color: 'red'});
      return;
    }
    setSaving(true);
    try {
      await assignRolesMutation.mutateAsync(selectedRoles);
      notifications.show({
        title: 'Roles Updated',
        message: `${employee.fullName || employee.firstName} now has ${selectedRoles.length} role(s)`,
        color: 'green',
        icon: <CheckCircle className="h-4 w-4"/>,
      });
      onClose();
    } catch {
      notifications.show({title: 'Error', message: 'Failed to update roles', color: 'red'});
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="row-between">
        <div>
          <p
            className="font-medium text-[var(--text-primary)]">{employee.fullName || `${employee.firstName} ${employee.lastName}`}</p>
          <p className="text-caption">{employee.workEmail}</p>
        </div>
        <button onClick={onClose}
                aria-label="Close dialog"
                className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 p-1 hover:bg-[var(--bg-surface)] rounded">
          <X className="h-4 w-4 text-[var(--text-muted)]"/>
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {availableRoles.map(role => (
          <button
            key={role.value}
            type="button"
            role="checkbox"
            aria-checked={selectedRoles.includes(role.value)}
            aria-label={`Assign ${role.label} role`}
            onClick={() => toggleRole(role.value)}
            className={`flex items-center gap-2 p-2 rounded-lg border text-left text-xs transition-all ${
              selectedRoles.includes(role.value)
                ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/10'
                : 'border-[var(--border-main)] hover:border-[var(--border-subtle)]'
            }`}
          >
            <div className={`h-3 w-3 rounded border flex items-center justify-center flex-shrink-0 ${
              selectedRoles.includes(role.value) ? 'border-accent-500 bg-accent-500' : 'border-[var(--border-main)]'
            }`}>
              {selectedRoles.includes(role.value) && <CheckCircle className="h-2 w-2 text-white"/>}
            </div>
            <span className="font-medium text-[var(--text-primary)]">{role.label}</span>
          </button>
        ))}
      </div>
      <PermissionPreview roleCodes={selectedRoles}/>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={handleSave} isLoading={saving} loadingText="Saving...">
          Save Roles ({selectedRoles.length})
        </Button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────
export default function AdminEmployeesPage() {
  const {hasPermission, isAdmin, isReady} = usePermissions();
  useEffect(() => {
    document.title = 'Admin · Employees | NU-AURA';
  }, []);
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formStep, setFormStep] = useState<'details' | 'role'>('details');
  const [editingRoleForEmployee, setEditingRoleForEmployee] = useState<Employee | null>(null);

  // All hooks must be called unconditionally before any early returns
  // Queries
  const {data: employeesPage, isLoading: employeesLoading, error: employeesError} = useEmployees(page, PAGE_SIZE);
  const {data: departments} = useAllDepartments(0, 100);
  const {data: managers} = useManagers();
  const {data: rolesData} = useRoles();

  // Mutations
  const createEmployeeMutation = useCreateEmployee();

  const employees = useMemo(() => employeesPage?.content ?? [], [employeesPage?.content]);
  const totalPages = employeesPage?.totalPages ?? 0;
  const totalElements = employeesPage?.totalElements ?? 0;
  const departmentOptions = useMemo(
    () => departments?.content?.map((department: { id: string; name: string }) => ({
      value: department.id,
      label: department.name,
    })) ?? [],
    [departments?.content],
  );
  const managerOptions = useMemo(
    () => managers?.map((manager: Employee) => ({
      value: manager.id,
      label: manager.fullName || `${manager.firstName} ${manager.lastName}`,
    })) ?? [],
    [managers],
  );

  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const q = searchQuery.toLowerCase();
    return employees.filter((e: Employee) =>
      e.fullName?.toLowerCase().includes(q) || e.workEmail?.toLowerCase().includes(q) ||
      e.employeeCode?.toLowerCase().includes(q) || e.departmentName?.toLowerCase().includes(q)
    );
  }, [employees, searchQuery]);

  // Form
  const {
    register, handleSubmit, control, reset, watch, formState: {errors, isSubmitting},
  } = useForm<CreateEmployeeWithRoleForm>({
    resolver: zodResolver(createEmployeeWithRoleSchema),
    defaultValues: {
      employeeCode: '', firstName: '', middleName: '', lastName: '', workEmail: '', password: '',
      joiningDate: new Date().toISOString().split('T')[0], employmentType: 'FULL_TIME',
      departmentId: '', designation: '', managerId: '', roleCodes: [Roles.EMPLOYEE],
    },
  });

  const selectedRoleCodes = watch('roleCodes');

  // RBAC guard — only SuperAdmin, HR Admin, or users with EMPLOYEE:MANAGE can access
  if (isReady && !isAdmin && !hasPermission(Permissions.EMPLOYEE_MANAGE)) {
    return (
      <AdminPageContent className="page-shell p-8 flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <div
            className="h-16 w-16 mx-auto rounded-full bg-danger-100 dark:bg-danger-900/20 flex items-center justify-center">
            <Shield className="h-8 w-8 text-danger-500"/>
          </div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Access Denied</h2>
          <p className="text-body-muted">You need HR Admin or Employee Management permission to access this page.</p>
        </div>
      </AdminPageContent>
    );
  }

  const onSubmit = async (data: CreateEmployeeWithRoleForm) => {
    try {
      const employeePayload: CreateEmployeeRequest = {
        employeeCode: data.employeeCode, firstName: data.firstName,
        middleName: data.middleName || undefined, lastName: data.lastName || undefined,
        workEmail: data.workEmail, password: data.password,
        joiningDate: data.joiningDate, employmentType: data.employmentType, status: 'ACTIVE',
        departmentId: data.departmentId || undefined, designation: data.designation || undefined,
        level: data.level || undefined, managerId: data.managerId || undefined,
      };

      const newEmployee = await createEmployeeMutation.mutateAsync(employeePayload);

      // Assign ALL selected roles via PUT /users/{id}/roles
      if (data.roleCodes.length > 0 && newEmployee.userId) {
        try {
          await usersApi.assignRoles(newEmployee.userId, data.roleCodes);
        } catch {
          notifications.show({
            title: 'Partial Success', color: 'yellow', icon: <AlertCircle className="h-4 w-4"/>,
            message: `Employee "${data.firstName}" created but role assignment failed. Edit roles from the table.`,
          });
          handleCloseModal();
          return;
        }
      }

      const roleLabels = data.roleCodes.map(c => ROLE_META.find(r => r.value === c)?.label).filter(Boolean).join(', ');
      notifications.show({
        title: 'Employee Created', color: 'green', icon: <CheckCircle className="h-4 w-4"/>,
        message: `${data.firstName} ${data.lastName} added as ${roleLabels}`,
      });
      handleCloseModal();
    } catch (err: unknown) {
      const message = (err as {
        response?: { data?: { message?: string } }
      })?.response?.data?.message || 'Failed to create employee.';
      notifications.show({title: 'Error', message, color: 'red', icon: <AlertCircle className="h-4 w-4"/>});
    }
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setFormStep('details');
    reset();
  };

  return (
    <PageTransition>
      <AdminPageContent className="page-shell p-4 md:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <Reveal className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-page-title text-[var(--text-primary)]">Employee Management</h1>
          <p className="text-body-secondary text-[var(--text-secondary)] mt-1">Create employees, assign roles, and
            manage access</p>
        </div>
        <Button variant="primary" leftIcon={<UserPlus className="h-4 w-4"/>} onClick={() => setShowCreateModal(true)}>
          Create Employee
        </Button>
      </Reveal>

      {/* Stats */}
      <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: Users,
            value: totalElements,
            label: 'Total Employees',
            tint: 'tint-info',
            iconColor: 'text-accent-700'
          },
          {
            icon: CheckCircle,
            value: employees.filter((e: Employee) => e.status === 'ACTIVE').length,
            label: 'Active',
            tint: 'tint-success',
            iconColor: 'text-success-600'
          },
          {
            icon: Shield,
            value: rolesData?.length ?? 0,
            label: 'Roles Defined',
            tint: 'tint-warning',
            iconColor: 'text-warning-600'
          },
          {
            icon: Building2,
            value: departments?.content?.length ?? 0,
            label: 'Departments',
            tint: '',
            iconColor: 'text-[var(--text-secondary)]'
          },
        ].map(({icon: Icon, value, label, tint, iconColor}) => (
          <StaggerItem key={label} className="card-aura p-4 hover-lift">
            <div className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-lg ${tint} flex items-center justify-center`}>
                <Icon className={`h-4 w-4 ${iconColor}`}/>
              </div>
              <div>
                <p className="text-stat-medium text-[var(--text-primary)]">{value}</p>
                <p className="text-caption text-[var(--text-muted)]">{label}</p>
              </div>
            </div>
          </StaggerItem>
        ))}
      </Stagger>

      {/* Table */}
      <Reveal>
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>All Employees</CardTitle>
                <CardDescription>Click the edit icon to change roles for any employee</CardDescription>
              </div>
              <div className="relative w-full sm:w-72">
                <TextInput
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.currentTarget.value)}
                  placeholder="Search by name, email, code..."
                  leftSection={<Search className="h-4 w-4"/>}
                  className={TEXT_INPUT_CLASS}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {employeesLoading ? (
              <SkeletonTable rows={8} columns={5}/>
            ) : employeesError ? (
              <div className="flex flex-col items-center gap-4 py-12">
                <div
                  className="h-12 w-12 rounded-full bg-danger-100 dark:bg-danger-900/20 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-danger-500"/>
                </div>
                <p className="text-[var(--text-secondary)]">Failed to load employees</p>
                <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <EmptyState icon={<Users className="h-8 w-8"/>} title="No employees found"
                          description={searchQuery ? 'Try a different search term' : 'Create your first employee to get started'}
                          actionLabel={searchQuery ? undefined : 'Create Employee'}
                          onAction={searchQuery ? undefined : () => setShowCreateModal(true)}/>
            ) : (
              <>
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="table-aura min-w-[800px]">
                    <thead>
                    <tr>
                      <th className="text-aura-micro text-[var(--text-3)] uppercase">Employee</th>
                      <th className="text-aura-micro text-[var(--text-3)] uppercase">Code</th>
                      <th className="text-aura-micro text-[var(--text-3)] uppercase">Department</th>
                      <th className="text-aura-micro text-[var(--text-3)] uppercase">Designation</th>
                      <th className="text-aura-micro text-[var(--text-3)] uppercase">Type</th>
                      <th className="text-aura-micro text-[var(--text-3)] uppercase">Status</th>
                      <th className="text-aura-micro text-[var(--text-3)] uppercase text-right">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredEmployees.map((emp: Employee) => {
                      const isEditingRoles = editingRoleForEmployee?.id === emp.id;
                      return (
                        <React.Fragment key={emp.id}>
                          <tr className="hover:bg-[var(--surface-aura-2)] transition-colors duration-150 hover-lift">
                            <td>
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-8 w-8 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center text-xs font-semibold text-accent-700 dark:text-accent-300">
                                  {emp.firstName?.[0]}{emp.lastName?.[0]}
                                </div>
                                <div>
                                  <p
                                    className="font-medium text-[var(--text-1)]">{emp.fullName || `${emp.firstName} ${emp.lastName}`}</p>
                                  <p className="text-caption text-[var(--text-3)]">{emp.workEmail}</p>
                                </div>
                              </div>
                            </td>
                            <td className="text-caption text-[var(--text-2)] font-mono tabular-nums">{emp.employeeCode}</td>
                            <td className="text-[var(--text-2)]">{emp.departmentName || '—'}</td>
                            <td className="text-[var(--text-2)]">{emp.designation || '—'}</td>
                            <td><span
                              className="badge-status status-info text-xs font-medium">{emp.employmentType?.replace('_', ' ') || 'Full Time'}</span>
                            </td>
                            <td>
                              <StatusBadge status={emp.status || 'ACTIVE'} />
                            </td>
                            <td className="text-right">
                              <Button
                                variant={isEditingRoles ? 'primary' : 'ghost'}
                                size="icon-sm"
                                onClick={() => setEditingRoleForEmployee(isEditingRoles ? null : emp)}
                                title={isEditingRoles ? 'Close role editor' : 'Edit roles'}
                                aria-label={`${isEditingRoles ? 'Close role editor for' : 'Edit roles for'} ${emp.fullName || emp.firstName}`}
                                aria-expanded={isEditingRoles}
                                className="focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:rounded"
                              >
                                {isEditingRoles ? <X className="h-3.5 w-3.5"/> : <Pencil className="h-3.5 w-3.5"/>}
                              </Button>
                            </td>
                          </tr>
                          {isEditingRoles && (
                            <tr className="bg-[var(--bg-surface)]">
                              <td colSpan={7} className="p-0">
                                <div className="border border-accent-200 dark:border-accent-700 bg-accent-50 dark:bg-accent-900/20 rounded-lg px-4 py-4">
                                  <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-[var(--text-primary)]">
                                    <Shield className="h-4 w-4 text-accent-500"/>
                                    <span>Edit Roles</span>
                                  </div>
                                  <InlineRoleEditor employee={emp} onClose={() => setEditingRoleForEmployee(null)}/>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="row-between mt-4 pt-4 border-t border-[var(--border-soft)]">
                    <p className="text-caption text-[var(--text-3)] font-mono tabular-nums">
                      {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalElements)} of {totalElements}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPage(Math.max(0, page - 1))}
                              disabled={page === 0}
                              leftIcon={<ChevronLeft className="h-4 w-4"/>}
                              className="focus-visible:ring-2 focus-visible:ring-[var(--ring)]">Previous</Button>
                      <span className="text-body-secondary font-mono tabular-nums">{page + 1} / {totalPages}</span>
                      <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                              disabled={page >= totalPages - 1}
                              rightIcon={<ChevronRight className="h-4 w-4"/>}
                              className="focus-visible:ring-2 focus-visible:ring-[var(--ring)]">Next</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Reveal>

      {/* ═══ CREATE EMPLOYEE + ROLE MODAL ═══ */}
      <Modal isOpen={showCreateModal} onClose={handleCloseModal} size="lg">
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalHeader onClose={handleCloseModal}>
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-accent-500"/>
              <span>Create Employee & Assign Roles</span>
            </div>
          </ModalHeader>

          <ModalBody>
            {/* Step Indicator */}
            <div className="flex items-center gap-4 mb-6">
              {[
                {step: 'details' as const, num: 1, label: 'Employee Details'},
                {step: 'role' as const, num: 2, label: 'Role Assignment'},
              ].map(({step, num, label}) => (
                <button key={step} type="button" onClick={() => setFormStep(step)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          formStep === step ? 'bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300' : 'text-[var(--text-muted)]'
                        }`}>
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    formStep === step ? 'bg-accent-500 text-white' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'
                  }`}>{num}</div>
                  {label}
                </button>
              ))}
            </div>

            {/* Step 1: Details */}
            {formStep === 'details' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextInput
                    {...register('employeeCode')}
                    label="Employee Code"
                    placeholder="EMP-001"
                    leftSection={<Hash className="h-3.5 w-3.5"/>}
                    error={errors.employeeCode?.message}
                    required
                  />
                  <TextInput
                    {...register('workEmail')}
                    type="email"
                    label="Work Email"
                    placeholder="john@company.com"
                    leftSection={<Mail className="h-3.5 w-3.5"/>}
                    error={errors.workEmail?.message}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <TextInput
                    {...register('firstName')}
                    label="First Name"
                    placeholder="John"
                    leftSection={<User className="h-3.5 w-3.5"/>}
                    error={errors.firstName?.message}
                    required
                  />
                  <TextInput
                    {...register('middleName')}
                    label="Middle Name"
                    error={errors.middleName?.message}
                  />
                  <TextInput
                    {...register('lastName')}
                    label="Last Name"
                    error={errors.lastName?.message}
                  />
                </div>
                <PasswordInput
                  {...register('password')}
                  label="Initial Password"
                  placeholder="Min 8 chars, uppercase + lowercase + number"
                  leftSection={<Lock className="h-3.5 w-3.5"/>}
                  error={errors.password?.message}
                  required
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Controller
                    name="employmentType"
                    control={control}
                    render={({field}) => (
                      <Select
                        label="Employment Type"
                        data={EMPLOYMENT_TYPES}
                        value={field.value}
                        onChange={(value) => field.onChange(value ?? 'FULL_TIME')}
                        leftSection={<Briefcase className="h-3.5 w-3.5"/>}
                        error={errors.employmentType?.message}
                        required
                      />
                    )}
                  />
                  <TextInput
                    {...register('joiningDate')}
                    type="date"
                    label="Joining Date"
                    leftSection={<Calendar className="h-3.5 w-3.5"/>}
                    error={errors.joiningDate?.message}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Controller
                    name="departmentId"
                    control={control}
                    render={({field}) => (
                      <Select
                        label="Department"
                        placeholder="Select department"
                        data={departmentOptions}
                        value={field.value || null}
                        onChange={(value) => field.onChange(value ?? '')}
                        leftSection={<Building2 className="h-3.5 w-3.5"/>}
                        error={errors.departmentId?.message}
                        clearable
                      />
                    )}
                  />
                  <TextInput
                    {...register('designation')}
                    label="Designation"
                    placeholder="e.g. Software Engineer"
                    error={errors.designation?.message}
                  />
                </div>
                <Controller
                  name="managerId"
                  control={control}
                  render={({field}) => (
                    <Select
                      label="Reporting Manager"
                      placeholder="Select manager (optional)"
                      data={managerOptions}
                      value={field.value || null}
                      onChange={(value) => field.onChange(value ?? '')}
                      error={errors.managerId?.message}
                      clearable
                    />
                  )}
                />
              </div>
            )}

            {/* Step 2: Multi-Role Assignment */}
            {formStep === 'role' && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                  <p className="text-body-secondary mb-1">Assigning roles for:</p>
                  <p className="font-semibold text-[var(--text-primary)]">
                    {watch('firstName') || 'Employee'} {watch('lastName')} ({watch('workEmail') || 'email'})
                  </p>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-[var(--text-secondary)]"/>
                  <span className="text-sm font-medium text-[var(--text-secondary)]">Select Roles * <span
                    className="text-caption">(multiple allowed)</span></span>
                </div>
                {errors.roleCodes && <p className="text-xs text-danger-500 mb-2">{errors.roleCodes.message}</p>}

                <Controller
                  name="roleCodes"
                  control={control}
                  render={({field}) => (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {ROLE_META.map(role => {
                        const isSelected = field.value.includes(role.value);
                        return (
                          <button
                            key={role.value}
                            type="button"
                            role="checkbox"
                            aria-checked={isSelected}
                            aria-label={`${role.label}: ${role.description}`}
                            onClick={() => {
                              const next = isSelected
                                ? field.value.filter((r: string) => r !== role.value)
                                : [...field.value, role.value];
                              field.onChange(next);
                            }}
                            className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                              isSelected
                                ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/10'
                                : 'border-[var(--border-main)] hover:border-[var(--border-subtle)] bg-[var(--bg-card)]'
                            }`}
                          >
                            {/* Checkbox */}
                            <div
                              className={`mt-0.5 h-4 w-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                isSelected ? 'border-accent-500 bg-accent-500' : 'border-[var(--border-main)]'
                              }`}>
                              {isSelected && <CheckCircle className="h-2.5 w-2.5 text-white"/>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div className={`h-2 w-2 rounded-full ${role.color}`}/>
                                <span className="font-medium text-sm text-[var(--text-primary)]">{role.label}</span>
                                {role.value === Roles.SUPER_ADMIN &&
                                  <span className="badge-status status-danger text-2xs">System</span>}
                              </div>
                              <p className="text-caption mt-0.5 line-clamp-2">{role.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                />

                {/* Super Admin Warning */}
                {selectedRoleCodes?.includes(Roles.SUPER_ADMIN) && (
                  <div
                    className="flex items-start gap-2 p-4 rounded-lg bg-danger-50 dark:bg-danger-950/20 border border-danger-200 dark:border-danger-800">
                    <AlertCircle className="h-4 w-4 text-danger-600 mt-0.5 flex-shrink-0"/>
                    <div>
                      <p className="text-sm font-medium text-danger-800 dark:text-danger-200">Super Admin Access</p>
                      <p className="text-xs text-danger-600 dark:text-danger-300 mt-0.5">
                        This role bypasses ALL permission checks. The user will have unrestricted access to all tenants,
                        modules, and data.
                      </p>
                    </div>
                  </div>
                )}

                {/* Permission Preview */}
                <PermissionPreview roleCodes={selectedRoleCodes || []}/>
              </div>
            )}
          </ModalBody>

          <ModalFooter>
            <div className="row-between w-full">
              <Button variant="ghost" onClick={handleCloseModal} type="button">Cancel</Button>
              <div className="flex items-center gap-2">
                {formStep === 'role' && (
                  <Button variant="outline" onClick={() => setFormStep('details')} type="button">Back</Button>
                )}
                {formStep === 'details' ? (
                  <Button variant="primary" onClick={() => setFormStep('role')} type="button">Next: Assign
                    Roles</Button>
                ) : (
                  <Button variant="primary" type="submit" isLoading={isSubmitting} loadingText="Creating..."
                          leftIcon={<UserPlus className="h-4 w-4"/>}>
                    Create &
                    Assign {selectedRoleCodes?.length || 0} Role{(selectedRoleCodes?.length || 0) !== 1 ? 's' : ''}
                  </Button>
                )}
              </div>
            </div>
          </ModalFooter>
        </form>
      </Modal>
      </AdminPageContent>
    </PageTransition>
  );
}
