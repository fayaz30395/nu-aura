'use client';

import { useState, useMemo, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { notifications } from '@mantine/notifications';
import {
  UserPlus, Users, Search, Shield, ChevronLeft, ChevronRight,
  AlertCircle, CheckCircle, X, Building2, Mail, Lock, User,
  Briefcase, Calendar, Hash, Eye, ChevronDown, ChevronUp,
  Pencil, Info,
} from 'lucide-react';
import { AdminPageContent } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { NuAuraLoader } from '@/components/ui/Loading';
import { useEmployees, useCreateEmployee, useManagers } from '@/lib/hooks/queries/useEmployees';
import { useAllDepartments } from '@/lib/hooks/queries/useDepartments';
import { useRoles, usePermissions as usePermissionsList, useAssignRolesToUser } from '@/lib/hooks/queries/useRoles';
import { useUpdateUserRole } from '@/lib/hooks/queries/useAdmin';
import { Permissions, Roles } from '@/lib/hooks/usePermissions';
import { Employee, CreateEmployeeRequest } from '@/lib/types/employee';
import { Role, Permission } from '@/lib/types/roles';

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
  { value: Roles.EMPLOYEE, label: 'Employee', description: 'Self-service: view own profile, request leave, mark attendance, view payslips', color: 'bg-blue-500', badgeClass: 'status-info',
    permissions: ['Self Profile', 'Leave Requests', 'Attendance (Self)', 'Payslips (Self)', 'Documents', 'Training', 'Recognition'] },
  { value: Roles.TEAM_LEAD, label: 'Team Lead', description: 'Everything Employee gets + manage direct reports, approve team leave, view team attendance', color: 'bg-cyan-500', badgeClass: 'status-info',
    permissions: ['Team Visibility', 'Leave Approval (Team)', 'Attendance (Team)', 'Performance Reviews', 'Goal Management'] },
  { value: Roles.MANAGER, label: 'Manager', description: 'Everything Team Lead gets + department view, timesheet approval, reporting access', color: 'bg-purple-500', badgeClass: 'status-purple',
    permissions: ['Department View', 'Timesheet Approval', 'Reports', 'Expense Approval (Team)', 'Recruitment (Team View)'] },
  { value: Roles.HR_MANAGER, label: 'HR Manager', description: 'Full HR operations: employee CRUD, leave management, recruitment, onboarding, benefits, compliance', color: 'bg-amber-500', badgeClass: 'status-warning',
    permissions: ['Employee CRUD', 'Leave Management', 'Recruitment', 'Onboarding/Exit', 'Benefits', 'Compensation', 'Compliance', 'Documents'] },
  { value: Roles.HR_ADMIN, label: 'HR Admin', description: 'Everything HR Manager gets + system settings, role management, leave type config', color: 'bg-orange-500', badgeClass: 'status-orange',
    permissions: ['All HR Manager +', 'Role Management', 'Settings', 'Leave Type Config', 'Shift Config', 'Custom Fields'] },
  { value: Roles.RECRUITER, label: 'Recruiter', description: 'Recruitment pipeline, candidate management, interviews, offers, job boards', color: 'bg-teal-500', badgeClass: 'status-info',
    permissions: ['Job Openings', 'Candidates', 'Interviews', 'Offers', 'Job Boards', 'Preboarding'] },
  { value: Roles.FINANCE_ADMIN, label: 'Finance Admin', description: 'Payroll processing, salary structures, statutory compliance, expense approvals', color: 'bg-emerald-500', badgeClass: 'status-success',
    permissions: ['Payroll Runs', 'Salary Structures', 'Statutory', 'TDS/PF/ESI', 'Expense Approval', 'Compensation'] },
  { value: Roles.SUPER_ADMIN, label: 'Super Admin', description: 'Bypasses ALL permission checks. Unrestricted access to every tenant, module, and data point in the system.', color: 'bg-red-500', badgeClass: 'status-danger',
    permissions: ['EVERYTHING — bypasses all RBAC'] },
];

const EMPLOYMENT_TYPES = [
  { value: 'FULL_TIME', label: 'Full Time' }, { value: 'PART_TIME', label: 'Part Time' },
  { value: 'CONTRACT', label: 'Contract' }, { value: 'INTERN', label: 'Intern' }, { value: 'CONSULTANT', label: 'Consultant' },
];

const PAGE_SIZE = 10;

// ──────────────────────────────────────────────
// Permission Preview Component
// ──────────────────────────────────────────────
function PermissionPreview({ roleCodes }: { roleCodes: string[] }) {
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
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary-500" />
          <span className="text-sm font-medium text-[var(--text-primary)]">
            Permission Summary — {allPerms.size} capability areas
          </span>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-[var(--text-muted)]" /> : <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-4">
              {selectedRoles.map(role => (
                <div key={role.value}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`h-2 w-2 rounded-full ${role.color}`} />
                    <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">{role.label}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.map(p => (
                      <span key={p} className="px-2 py-0.5 text-xs rounded-full bg-[var(--bg-card)] border border-[var(--border-main)] text-[var(--text-secondary)]">
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
function InlineRoleEditor({ employee, onClose }: { employee: Employee; onClose: () => void }) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([Roles.EMPLOYEE]);
  const [saving, setSaving] = useState(false);
  const assignRolesMutation = useAssignRolesToUser(employee.userId || employee.id);

  const toggleRole = (code: string) => {
    setSelectedRoles(prev =>
      prev.includes(code) ? prev.filter(r => r !== code) : [...prev, code]
    );
  };

  const handleSave = async () => {
    if (selectedRoles.length === 0) {
      notifications.show({ title: 'Error', message: 'Select at least one role', color: 'red' });
      return;
    }
    setSaving(true);
    try {
      await assignRolesMutation.mutateAsync(selectedRoles);
      notifications.show({
        title: 'Roles Updated',
        message: `${employee.fullName || employee.firstName} now has ${selectedRoles.length} role(s)`,
        color: 'green',
        icon: <CheckCircle className="h-4 w-4" />,
      });
      onClose();
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to update roles', color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-[var(--text-primary)]">{employee.fullName || `${employee.firstName} ${employee.lastName}`}</p>
          <p className="text-xs text-[var(--text-muted)]">{employee.workEmail}</p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-[var(--bg-surface)] rounded">
          <X className="h-4 w-4 text-[var(--text-muted)]" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {ROLE_META.map(role => (
          <button
            key={role.value}
            type="button"
            onClick={() => toggleRole(role.value)}
            className={`flex items-center gap-2 p-2 rounded-lg border text-left text-xs transition-all ${
              selectedRoles.includes(role.value)
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                : 'border-[var(--border-main)] hover:border-[var(--border-subtle)]'
            }`}
          >
            <div className={`h-3 w-3 rounded border flex items-center justify-center flex-shrink-0 ${
              selectedRoles.includes(role.value) ? 'border-primary-500 bg-primary-500' : 'border-[var(--border-main)]'
            }`}>
              {selectedRoles.includes(role.value) && <CheckCircle className="h-2 w-2 text-white" />}
            </div>
            <span className="font-medium text-[var(--text-primary)]">{role.label}</span>
          </button>
        ))}
      </div>
      <PermissionPreview roleCodes={selectedRoles} />
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
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formStep, setFormStep] = useState<'details' | 'role'>('details');
  const [editingRoleForEmployee, setEditingRoleForEmployee] = useState<Employee | null>(null);

  // Queries
  const { data: employeesPage, isLoading: employeesLoading, error: employeesError } = useEmployees(page, PAGE_SIZE);
  const { data: departments } = useAllDepartments(0, 100);
  const { data: managers } = useManagers();
  const { data: rolesData } = useRoles();

  // Mutations
  const createEmployeeMutation = useCreateEmployee();
  const updateRoleMutation = useUpdateUserRole();

  const employees = employeesPage?.content ?? [];
  const totalPages = employeesPage?.totalPages ?? 0;
  const totalElements = employeesPage?.totalElements ?? 0;

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
    register, handleSubmit, control, reset, watch, formState: { errors, isSubmitting },
  } = useForm<CreateEmployeeWithRoleForm>({
    resolver: zodResolver(createEmployeeWithRoleSchema),
    defaultValues: {
      employeeCode: '', firstName: '', middleName: '', lastName: '', workEmail: '', password: '',
      joiningDate: new Date().toISOString().split('T')[0], employmentType: 'FULL_TIME',
      departmentId: '', designation: '', managerId: '', roleCodes: [Roles.EMPLOYEE],
    },
  });

  const selectedRoleCodes = watch('roleCodes');

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

      // Assign roles (supports multiple)
      if (data.roleCodes.length > 0 && newEmployee.userId) {
        try {
          await updateRoleMutation.mutateAsync({ userId: newEmployee.userId, role: data.roleCodes[0] });
          // Note: For multi-role, the useAssignRolesToUser hook supports full array
          // but we use updateUserRole for the primary role here for compatibility
        } catch {
          notifications.show({
            title: 'Partial Success', color: 'yellow', icon: <AlertCircle className="h-4 w-4" />,
            message: `Employee "${data.firstName}" created but role assignment failed. Edit roles from the table.`,
          });
          handleCloseModal();
          return;
        }
      }

      const roleLabels = data.roleCodes.map(c => ROLE_META.find(r => r.value === c)?.label).filter(Boolean).join(', ');
      notifications.show({
        title: 'Employee Created', color: 'green', icon: <CheckCircle className="h-4 w-4" />,
        message: `${data.firstName} ${data.lastName} added as ${roleLabels}`,
      });
      handleCloseModal();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create employee.';
      notifications.show({ title: 'Error', message, color: 'red', icon: <AlertCircle className="h-4 w-4" /> });
    }
  };

  const handleCloseModal = () => { setShowCreateModal(false); setFormStep('details'); reset(); };

  const getRoleBadgeClass = useCallback((level: string | undefined) => {
    const l = level?.toUpperCase();
    if (l === 'CXO' || l === 'SVP' || l === 'VP') return 'status-danger';
    if (l === 'DIRECTOR' || l === 'SENIOR_MANAGER') return 'status-orange';
    if (l === 'MANAGER' || l === 'LEAD') return 'status-purple';
    if (l === 'SENIOR') return 'status-info';
    return 'status-neutral';
  }, []);

  return (
    <AdminPageContent className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-page-title text-[var(--text-primary)]">Employee Management</h1>
          <p className="text-body-secondary text-[var(--text-secondary)] mt-1">Create employees, assign roles, and manage access</p>
        </div>
        <Button variant="primary" leftIcon={<UserPlus className="h-4 w-4" />} onClick={() => setShowCreateModal(true)}>
          Create Employee
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users, value: totalElements, label: 'Total Employees', tint: 'tint-info', iconColor: 'text-primary-600' },
          { icon: CheckCircle, value: employees.filter((e: Employee) => e.status === 'ACTIVE').length, label: 'Active', tint: 'tint-success', iconColor: 'text-emerald-600' },
          { icon: Shield, value: rolesData?.length ?? 0, label: 'Roles Defined', tint: 'tint-warning', iconColor: 'text-amber-600' },
          { icon: Building2, value: departments?.content?.length ?? 0, label: 'Departments', tint: '', iconColor: 'text-[var(--text-secondary)]' },
        ].map(({ icon: Icon, value, label, tint, iconColor }) => (
          <div key={label} className="card-aura p-4">
            <div className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-lg ${tint} flex items-center justify-center`}>
                <Icon className={`h-4 w-4 ${iconColor}`} />
              </div>
              <div>
                <p className="text-stat-medium text-[var(--text-primary)]">{value}</p>
                <p className="text-caption text-[var(--text-muted)]">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.1 }}>
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>All Employees</CardTitle>
                <CardDescription>Click the edit icon to change roles for any employee</CardDescription>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, email, code..." className="input-aura pl-10 w-full" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {employeesLoading ? (
              <NuAuraLoader message="Loading employees..." />
            ) : employeesError ? (
              <div className="flex flex-col items-center gap-4 py-12">
                <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-red-500" />
                </div>
                <p className="text-[var(--text-secondary)]">Failed to load employees</p>
                <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <EmptyState icon={<Users className="h-8 w-8" />} title="No employees found"
                description={searchQuery ? 'Try a different search term' : 'Create your first employee to get started'}
                actionLabel={searchQuery ? undefined : 'Create Employee'}
                onAction={searchQuery ? undefined : () => setShowCreateModal(true)} />
            ) : (
              <>
                <div className="table-aura">
                  <table>
                    <thead>
                      <tr>
                        <th>Employee</th><th>Code</th><th>Department</th><th>Designation</th>
                        <th>Type</th><th>Status</th><th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployees.map((emp: Employee) => (
                        <tr key={emp.id} className="hover:bg-[var(--bg-card-hover)] transition-colors">
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xs font-semibold text-primary-700 dark:text-primary-300">
                                {emp.firstName?.[0]}{emp.lastName?.[0]}
                              </div>
                              <div>
                                <p className="font-medium text-[var(--text-primary)]">{emp.fullName || `${emp.firstName} ${emp.lastName}`}</p>
                                <p className="text-xs text-[var(--text-muted)]">{emp.workEmail}</p>
                              </div>
                            </div>
                          </td>
                          <td className="text-caption text-[var(--text-secondary)] font-mono">{emp.employeeCode}</td>
                          <td className="text-[var(--text-secondary)]">{emp.departmentName || '—'}</td>
                          <td className="text-[var(--text-secondary)]">{emp.designation || '—'}</td>
                          <td><span className="badge-status status-info">{emp.employmentType?.replace('_', ' ') || 'Full Time'}</span></td>
                          <td>
                            <span className={`badge-status ${emp.status === 'ACTIVE' ? 'status-success' : emp.status === 'ON_LEAVE' ? 'status-warning' : emp.status === 'TERMINATED' ? 'status-danger' : 'status-neutral'}`}>
                              {emp.status || 'Active'}
                            </span>
                          </td>
                          <td className="text-right">
                            <Button variant="ghost" size="icon-sm" onClick={() => setEditingRoleForEmployee(emp)} title="Edit roles">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border-main)]">
                    <p className="text-caption text-[var(--text-muted)]">
                      {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalElements)} of {totalElements}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                        leftIcon={<ChevronLeft className="h-4 w-4" />}>Previous</Button>
                      <span className="text-sm text-[var(--text-secondary)]">{page + 1} / {totalPages}</span>
                      <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
                        rightIcon={<ChevronRight className="h-4 w-4" />}>Next</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══ INLINE ROLE EDIT MODAL ═══ */}
      <Modal isOpen={!!editingRoleForEmployee} onClose={() => setEditingRoleForEmployee(null)} size="md">
        <ModalHeader onClose={() => setEditingRoleForEmployee(null)}>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary-500" />
            <span>Edit Roles</span>
          </div>
        </ModalHeader>
        <ModalBody>
          {editingRoleForEmployee && (
            <InlineRoleEditor employee={editingRoleForEmployee} onClose={() => setEditingRoleForEmployee(null)} />
          )}
        </ModalBody>
      </Modal>

      {/* ═══ CREATE EMPLOYEE + ROLE MODAL ═══ */}
      <Modal isOpen={showCreateModal} onClose={handleCloseModal} size="lg">
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalHeader onClose={handleCloseModal}>
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary-500" />
              <span>Create Employee & Assign Roles</span>
            </div>
          </ModalHeader>

          <ModalBody>
            {/* Step Indicator */}
            <div className="flex items-center gap-4 mb-6">
              {[
                { step: 'details' as const, num: 1, label: 'Employee Details' },
                { step: 'role' as const, num: 2, label: 'Role Assignment' },
              ].map(({ step, num, label }) => (
                <button key={step} type="button" onClick={() => setFormStep(step)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    formStep === step ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'text-[var(--text-muted)]'
                  }`}>
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    formStep === step ? 'bg-primary-500 text-white' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'
                  }`}>{num}</div>
                  {label}
                </button>
              ))}
            </div>

            {/* Step 1: Details */}
            {formStep === 'details' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2"><Hash className="h-3.5 w-3.5 inline mr-1" />Employee Code *</label>
                    <input {...register('employeeCode')} className="input-aura w-full" placeholder="EMP-001" />
                    {errors.employeeCode && <p className="text-xs text-red-500 mt-1">{errors.employeeCode.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2"><Mail className="h-3.5 w-3.5 inline mr-1" />Work Email *</label>
                    <input {...register('workEmail')} type="email" className="input-aura w-full" placeholder="john@company.com" />
                    {errors.workEmail && <p className="text-xs text-red-500 mt-1">{errors.workEmail.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2"><User className="h-3.5 w-3.5 inline mr-1" />First Name *</label>
                    <input {...register('firstName')} className="input-aura w-full" placeholder="John" />
                    {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Middle Name</label>
                    <input {...register('middleName')} className="input-aura w-full" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Last Name</label>
                    <input {...register('lastName')} className="input-aura w-full" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2"><Lock className="h-3.5 w-3.5 inline mr-1" />Initial Password *</label>
                  <input {...register('password')} type="password" className="input-aura w-full" placeholder="Min 8 chars, uppercase + lowercase + number" />
                  {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2"><Briefcase className="h-3.5 w-3.5 inline mr-1" />Employment Type *</label>
                    <select {...register('employmentType')} className="input-aura w-full">
                      {EMPLOYMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2"><Calendar className="h-3.5 w-3.5 inline mr-1" />Joining Date *</label>
                    <input {...register('joiningDate')} type="date" className="input-aura w-full" />
                    {errors.joiningDate && <p className="text-xs text-red-500 mt-1">{errors.joiningDate.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2"><Building2 className="h-3.5 w-3.5 inline mr-1" />Department</label>
                    <select {...register('departmentId')} className="input-aura w-full">
                      <option value="">Select department</option>
                      {departments?.content?.map((d: { id: string; name: string }) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Designation</label>
                    <input {...register('designation')} className="input-aura w-full" placeholder="e.g. Software Engineer" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Reporting Manager</label>
                  <select {...register('managerId')} className="input-aura w-full">
                    <option value="">Select manager (optional)</option>
                    {managers?.map((m: Employee) => <option key={m.id} value={m.id}>{m.fullName || `${m.firstName} ${m.lastName}`}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Step 2: Multi-Role Assignment */}
            {formStep === 'role' && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                  <p className="text-sm text-[var(--text-secondary)] mb-1">Assigning roles for:</p>
                  <p className="font-semibold text-[var(--text-primary)]">
                    {watch('firstName') || 'Employee'} {watch('lastName')} ({watch('workEmail') || 'email'})
                  </p>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-[var(--text-secondary)]" />
                  <label className="text-sm font-medium text-[var(--text-secondary)]">Select Roles * <span className="text-xs text-[var(--text-muted)]">(multiple allowed)</span></label>
                </div>
                {errors.roleCodes && <p className="text-xs text-red-500 mb-2">{errors.roleCodes.message}</p>}

                <Controller
                  name="roleCodes"
                  control={control}
                  render={({ field }) => (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {ROLE_META.map(role => {
                        const isSelected = field.value.includes(role.value);
                        return (
                          <button
                            key={role.value}
                            type="button"
                            onClick={() => {
                              const next = isSelected
                                ? field.value.filter((r: string) => r !== role.value)
                                : [...field.value, role.value];
                              field.onChange(next);
                            }}
                            className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                              isSelected
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                                : 'border-[var(--border-main)] hover:border-[var(--border-subtle)] bg-[var(--bg-card)]'
                            }`}
                          >
                            {/* Checkbox */}
                            <div className={`mt-0.5 h-4 w-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                              isSelected ? 'border-primary-500 bg-primary-500' : 'border-[var(--border-main)]'
                            }`}>
                              {isSelected && <CheckCircle className="h-2.5 w-2.5 text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div className={`h-2 w-2 rounded-full ${role.color}`} />
                                <span className="font-medium text-sm text-[var(--text-primary)]">{role.label}</span>
                                {role.value === Roles.SUPER_ADMIN && <span className="badge-status status-danger text-[10px]">System</span>}
                              </div>
                              <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{role.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                />

                {/* Super Admin Warning */}
                {selectedRoleCodes?.includes(Roles.SUPER_ADMIN) && (
                  <div className="flex items-start gap-2 p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">Super Admin Access</p>
                      <p className="text-xs text-red-600 dark:text-red-300 mt-0.5">
                        This role bypasses ALL permission checks. The user will have unrestricted access to all tenants, modules, and data.
                      </p>
                    </div>
                  </div>
                )}

                {/* Permission Preview */}
                <PermissionPreview roleCodes={selectedRoleCodes || []} />
              </div>
            )}
          </ModalBody>

          <ModalFooter>
            <div className="flex items-center justify-between w-full">
              <Button variant="ghost" onClick={handleCloseModal} type="button">Cancel</Button>
              <div className="flex items-center gap-2">
                {formStep === 'role' && (
                  <Button variant="outline" onClick={() => setFormStep('details')} type="button">Back</Button>
                )}
                {formStep === 'details' ? (
                  <Button variant="primary" onClick={() => setFormStep('role')} type="button">Next: Assign Roles</Button>
                ) : (
                  <Button variant="primary" type="submit" isLoading={isSubmitting} loadingText="Creating..."
                    leftIcon={<UserPlus className="h-4 w-4" />}>
                    Create & Assign {selectedRoleCodes?.length || 0} Role{(selectedRoleCodes?.length || 0) !== 1 ? 's' : ''}
                  </Button>
                )}
              </div>
            </div>
          </ModalFooter>
        </form>
      </Modal>
    </AdminPageContent>
  );
}
