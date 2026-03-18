'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppLayout } from '@/components/layout';
import { motion } from 'framer-motion';
import { Banknote, FileText, Layers } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';
import { PermissionGate } from '@/components/auth/PermissionGate';
import {
  usePayrollRuns,
  usePayslips,
  useSalaryStructures,
  useCreatePayrollRun,
  useUpdatePayrollRun,
  useDeletePayrollRun,
  useProcessPayrollRun,
  useApprovePayrollRun,
  useCreatePayslip,
  useUpdatePayslip,
  useDeletePayslip,
  useCreateSalaryStructure,
  useUpdateSalaryStructure,
  useDeleteSalaryStructure,
} from '@/lib/hooks/queries/usePayroll';
import {
  PayrollRun,
  PayrollRunRequest,
  Payslip,
  PayslipRequest,
  SalaryStructure,
  SalaryStructureRequest,
  PayrollRunStatus,
} from '@/lib/types/payroll';

// ============ ZOD SCHEMAS ============
const payrollRunSchema = z.object({
  runName: z.string().min(1, 'Run name is required'),
  payrollPeriodStart: z.string().min(1, 'Period start is required'),
  payrollPeriodEnd: z.string().min(1, 'Period end is required'),
  paymentDate: z.string().min(1, 'Payment date is required'),
  notes: z.string().optional().or(z.literal('')),
});
type PayrollRunFormData = z.infer<typeof payrollRunSchema>;

const payslipFormSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  payrollRunId: z.string().min(1, 'Payroll run ID is required'),
  paymentDate: z.string().min(1, 'Payment date is required'),
  payrollPeriodStart: z.string().min(1, 'Period start is required'),
  payrollPeriodEnd: z.string().min(1, 'Period end is required'),
  baseSalary: z.number({ coerce: true }).positive('Base salary must be positive'),
  allowances: z.number({ coerce: true }).min(0).optional(),
  deductions: z.number({ coerce: true }).min(0).optional(),
});
type PayslipFormData = z.infer<typeof payslipFormSchema>;

const salaryComponentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  amount: z.number({ coerce: true }).min(0),
  type: z.enum(['FIXED', 'VARIABLE'] as const) as z.ZodType<'FIXED' | 'VARIABLE'>,
  description: z.string().optional().or(z.literal('')),
});

const salaryStructureSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  effectiveDate: z.string().min(1, 'Effective date is required'),
  baseSalary: z.number({ coerce: true }).positive('Base salary must be positive'),
  allowances: z.array(salaryComponentSchema).default([]),
  deductions: z.array(salaryComponentSchema).default([]),
});
type SalaryStructureFormData = z.infer<typeof salaryStructureSchema>;

type TabType = 'runs' | 'payslips' | 'structures';

interface FormModalState {
  isOpen: boolean;
  mode: 'create' | 'edit';
  item?: PayrollRun | Payslip | SalaryStructure;
}

export default function PayrollPage() {

  const router = useRouter();
  const { hasPermission, isReady: permReady } = usePermissions();

  // RBAC guard — redirect if user lacks required permission
  useEffect(() => {
    if (!permReady) return;
    if (!hasPermission(Permissions.PAYROLL_VIEW)) {
      router.replace('/dashboard');
    }
  }, [permReady, hasPermission, router]);

  const [activeTab, setActiveTab] = useState<TabType>('runs');
  const [error, setError] = useState<string | null>(null);

  // React Query hooks for data fetching
  const runsQuery = usePayrollRuns(0, 100);
  const payslipsQuery = usePayslips(0, 100);
  const structuresQuery = useSalaryStructures(0, 100);

  // ============ FORM HOOKS ============
  const runFormHook = useForm<PayrollRunFormData>({
    resolver: zodResolver(payrollRunSchema),
    defaultValues: { runName: '', payrollPeriodStart: '', payrollPeriodEnd: '', paymentDate: '', notes: '' },
  });

  const payslipFormHook = useForm<PayslipFormData>({
    resolver: zodResolver(payslipFormSchema),
    defaultValues: { employeeId: '', payrollRunId: '', paymentDate: '', payrollPeriodStart: '', payrollPeriodEnd: '', baseSalary: 0, allowances: 0, deductions: 0 },
  });

  const structureFormHook = useForm<SalaryStructureFormData>({
    resolver: zodResolver(salaryStructureSchema),
    defaultValues: { employeeId: '', effectiveDate: '', baseSalary: 0, allowances: [], deductions: [] },
  });

  const { fields: allowanceFields, append: appendAllowance, remove: removeAllowance } = useFieldArray({
    control: structureFormHook.control,
    name: 'allowances',
  });

  const { fields: deductionFields, append: appendDeduction, remove: removeDeduction } = useFieldArray({
    control: structureFormHook.control,
    name: 'deductions',
  });

  // Payroll Runs State
  const payrollRuns = runsQuery.data?.content || [];
  const [payrollRunModal, setPayrollRunModal] = useState<FormModalState>({
    isOpen: false,
    mode: 'create',
  });
  const [payrollRunFilter, setPayrollRunFilter] = useState<PayrollRunStatus | 'ALL'>('ALL');
  const [selectedPayrollRun, setSelectedPayrollRun] = useState<PayrollRun | null>(null);
  const [showRunDeleteConfirm, setShowRunDeleteConfirm] = useState(false);

  // Payslips State
  const payslips = payslipsQuery.data?.content || [];
  const [payslipModal, setPayslipModal] = useState<FormModalState>({
    isOpen: false,
    mode: 'create',
  });
  const [payslipSearchMonth, setPayslipSearchMonth] = useState<string>(
    new Date().toISOString().substring(0, 7)
  );
  const [payslipSearchEmployee, setPayslipSearchEmployee] = useState('');
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [showPayslipDeleteConfirm, setShowPayslipDeleteConfirm] = useState(false);

  // Salary Structures State
  const salaryStructures = structuresQuery.data?.content || [];
  const [structureModal, setStructureModal] = useState<FormModalState>({
    isOpen: false,
    mode: 'create',
  });
  const [structureFilter, setStructureFilter] = useState<'ACTIVE' | 'INACTIVE' | 'PENDING' | 'ALL'>('ACTIVE');
  const [selectedStructure, setSelectedStructure] = useState<SalaryStructure | null>(null);
  const [showStructureDeleteConfirm, setShowStructureDeleteConfirm] = useState(false);

  // ============ PAYROLL RUNS ============
  const createRunMutation = useCreatePayrollRun();
  const updateRunMutation = useUpdatePayrollRun();
  const deleteRunMutation = useDeletePayrollRun();
  const processRunMutation = useProcessPayrollRun();
  const approveRunMutation = useApprovePayrollRun();

  // ============ PAYSLIPS ============
  const createPayslipMutation = useCreatePayslip();
  const updatePayslipMutation = useUpdatePayslip();
  const deletePayslipMutation = useDeletePayslip();

  // ============ SALARY STRUCTURES ============
  const createStructureMutation = useCreateSalaryStructure();
  const updateStructureMutation = useUpdateSalaryStructure();
  const deleteStructureMutation = useDeleteSalaryStructure();

  // RBAC guard — all hooks declared above; safe to return null after them
  if (!permReady || !hasPermission(Permissions.PAYROLL_VIEW)) {
    return null;
  }

  // Compute loading state from queries and mutations
  const loading =
    runsQuery.isLoading ||
    payslipsQuery.isLoading ||
    structuresQuery.isLoading ||
    createRunMutation.isPending ||
    updateRunMutation.isPending ||
    deleteRunMutation.isPending ||
    processRunMutation.isPending ||
    approveRunMutation.isPending ||
    createPayslipMutation.isPending ||
    updatePayslipMutation.isPending ||
    deletePayslipMutation.isPending ||
    createStructureMutation.isPending ||
    updateStructureMutation.isPending ||
    deleteStructureMutation.isPending;

  const handleCreatePayrollRun = () => {
    runFormHook.reset({ runName: '', payrollPeriodStart: '', payrollPeriodEnd: '', paymentDate: '', notes: '' });
    setSelectedPayrollRun(null);
    setPayrollRunModal({ isOpen: true, mode: 'create' });
  };

  const handleEditPayrollRun = (run: PayrollRun) => {
    setSelectedPayrollRun(run);
    runFormHook.reset({
      runName: run.runName,
      payrollPeriodStart: run.payrollPeriodStart,
      payrollPeriodEnd: run.payrollPeriodEnd,
      paymentDate: run.paymentDate,
      notes: run.notes || '',
    });
    setPayrollRunModal({ isOpen: true, mode: 'edit' });
  };

  const onSubmitPayrollRun = (data: PayrollRunFormData) => {
    if (selectedPayrollRun) {
      updateRunMutation.mutate(
        { id: selectedPayrollRun.id, data: data as PayrollRunRequest },
        {
          onSuccess: () => { setPayrollRunModal({ isOpen: false, mode: 'create' }); },
          onError: (err: unknown) => {
            setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save payroll run');
          },
        }
      );
    } else {
      createRunMutation.mutate(data as PayrollRunRequest, {
        onSuccess: () => { setPayrollRunModal({ isOpen: false, mode: 'create' }); },
        onError: (err: unknown) => {
          setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save payroll run');
        },
      });
    }
  };

  const handleDeletePayrollRun = () => {
    if (!selectedPayrollRun) return;
    deleteRunMutation.mutate(selectedPayrollRun.id, {
      onSuccess: () => {
        setShowRunDeleteConfirm(false);
        setSelectedPayrollRun(null);
      },
      onError: (err: unknown) => {
        setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete payroll run');
      },
    });
  };

  const handleProcessPayrollRun = (run: PayrollRun) => {
    processRunMutation.mutate(run.id, {
      onError: (err: unknown) => {
        setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to process payroll run');
      },
    });
  };

  const handleApprovePayrollRun = (run: PayrollRun) => {
    approveRunMutation.mutate(run.id, {
      onError: (err: unknown) => {
        setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to approve payroll run');
      },
    });
  };

  const handleCreatePayslip = () => {
    payslipFormHook.reset({ employeeId: '', payrollRunId: '', paymentDate: '', payrollPeriodStart: '', payrollPeriodEnd: '', baseSalary: 0, allowances: 0, deductions: 0 });
    setSelectedPayslip(null);
    setPayslipModal({ isOpen: true, mode: 'create' });
  };

  const handleEditPayslip = (payslip: Payslip) => {
    setSelectedPayslip(payslip);
    payslipFormHook.reset({
      employeeId: payslip.employeeId,
      payrollRunId: payslip.payrollRunId,
      paymentDate: payslip.paymentDate,
      payrollPeriodStart: payslip.payrollPeriodStart,
      payrollPeriodEnd: payslip.payrollPeriodEnd,
      baseSalary: payslip.baseSalary,
      allowances: payslip.allowances,
      deductions: payslip.deductions,
    });
    setPayslipModal({ isOpen: true, mode: 'edit' });
  };

  const onSubmitPayslip = (data: PayslipFormData) => {
    if (selectedPayslip) {
      updatePayslipMutation.mutate(
        { id: selectedPayslip.id, data: data as PayslipRequest },
        {
          onSuccess: () => { setPayslipModal({ isOpen: false, mode: 'create' }); },
          onError: (err: unknown) => {
            setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save payslip');
          },
        }
      );
    } else {
      createPayslipMutation.mutate(data as PayslipRequest, {
        onSuccess: () => { setPayslipModal({ isOpen: false, mode: 'create' }); },
        onError: (err: unknown) => {
          setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save payslip');
        },
      });
    }
  };

  const handleDeletePayslip = () => {
    if (!selectedPayslip) return;
    deletePayslipMutation.mutate(selectedPayslip.id, {
      onSuccess: () => {
        setShowPayslipDeleteConfirm(false);
        setSelectedPayslip(null);
      },
      onError: (err: unknown) => {
        setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete payslip');
      },
    });
  };

  const handleCreateStructure = () => {
    structureFormHook.reset({ employeeId: '', effectiveDate: '', baseSalary: 0, allowances: [], deductions: [] });
    setSelectedStructure(null);
    setStructureModal({ isOpen: true, mode: 'create' });
  };

  const handleEditStructure = (structure: SalaryStructure) => {
    setSelectedStructure(structure);
    structureFormHook.reset({
      employeeId: structure.employeeId,
      effectiveDate: structure.effectiveDate,
      baseSalary: structure.baseSalary,
      allowances: structure.allowances.map(a => ({ name: a.name, amount: a.amount, type: a.type, description: a.description || '' })),
      deductions: structure.deductions.map(d => ({ name: d.name, amount: d.amount, type: d.type, description: d.description || '' })),
    });
    setStructureModal({ isOpen: true, mode: 'edit' });
  };

  const onSubmitStructure = (data: SalaryStructureFormData) => {
    if (selectedStructure) {
      updateStructureMutation.mutate(
        { id: selectedStructure.id, data: data as SalaryStructureRequest },
        {
          onSuccess: () => { setStructureModal({ isOpen: false, mode: 'create' }); },
          onError: (err: unknown) => {
            setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save salary structure');
          },
        }
      );
    } else {
      createStructureMutation.mutate(data as SalaryStructureRequest, {
        onSuccess: () => { setStructureModal({ isOpen: false, mode: 'create' }); },
        onError: (err: unknown) => {
          setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save salary structure');
        },
      });
    }
  };

  const handleDeleteStructure = () => {
    if (!selectedStructure) return;
    deleteStructureMutation.mutate(selectedStructure.id, {
      onSuccess: () => {
        setShowStructureDeleteConfirm(false);
        setSelectedStructure(null);
      },
      onError: (err: unknown) => {
        setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete salary structure');
      },
    });
  };

  // ============ HELPER FUNCTIONS ============
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      DRAFT: 'bg-[var(--bg-secondary)] text-[var(--text-primary)]',
      PROCESSING: 'bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400',
      PROCESSED: 'bg-cyan-100 text-cyan-800',
      APPROVED: 'bg-green-100 text-green-800',
      LOCKED: 'bg-red-100 text-red-800',
      ACTIVE: 'bg-green-100 text-green-800',
      INACTIVE: 'bg-[var(--bg-secondary)] text-[var(--text-primary)]',
      PENDING: 'bg-yellow-100 text-yellow-800',
      FINALIZED: 'bg-cyan-100 text-cyan-800',
      PAID: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-[var(--bg-secondary)] text-[var(--text-primary)]';
  };

  const filteredPayrollRuns = payrollRuns.filter(
    (run) => payrollRunFilter === 'ALL' || run.status === payrollRunFilter
  );

  const filteredPayslips = payslips.filter((payslip) => {
    const payslipMonth = payslip.paymentDate.substring(0, 7);
    const employeeMatch =
      payslipSearchEmployee === '' ||
      (payslip.employeeName?.toLowerCase() || '').includes(payslipSearchEmployee.toLowerCase());
    const monthMatch = payslipSearchMonth === '' || payslipMonth === payslipSearchMonth;
    return employeeMatch && monthMatch;
  });

  const filteredStructures = salaryStructures.filter(
    (structure) => structureFilter === 'ALL' || structure.status === structureFilter
  );

  return (
    <AppLayout activeMenuItem="payroll">
      <motion.div
        className="p-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">Payroll Management</h1>
          <p className="text-[var(--text-secondary)] mt-2">Manage payroll runs, payslips, and salary structures</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 rounded-lg">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-4 text-sm underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-[var(--border-main)]">
          <button
            onClick={() => setActiveTab('runs')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'runs'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-secondary)]'
            }`}
          >
            Payroll Runs
          </button>
          <button
            onClick={() => setActiveTab('payslips')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'payslips'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-secondary)]'
            }`}
          >
            Payslips
          </button>
          <button
            onClick={() => setActiveTab('structures')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'structures'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-secondary)]'
            }`}
          >
            Salary Structures
          </button>
        </div>

        {/* PAYROLL RUNS TAB */}
        {activeTab === 'runs' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <div className="flex gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Filter by Status
                  </label>
                  <select
                    value={payrollRunFilter}
                    onChange={(e) => setPayrollRunFilter(e.target.value as PayrollRunStatus | 'ALL')}
                    className="px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="ALL">All Status</option>
                    <option value="DRAFT">Draft</option>
                    <option value="PROCESSING">Processing</option>
                    <option value="PROCESSED">Processed</option>
                    <option value="APPROVED">Approved</option>
                    <option value="LOCKED">Locked</option>
                  </select>
                </div>
              </div>
              <PermissionGate permission={Permissions.PAYROLL_PROCESS}>
                <button
                  onClick={handleCreatePayrollRun}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                  Create Payroll Run
                </button>
              </PermissionGate>
            </div>

            {loading ? (
              <div className="text-center py-12 text-[var(--text-secondary)]">Loading payroll runs...</div>
            ) : filteredPayrollRuns.length === 0 ? (
              <EmptyState
                icon={<Banknote className="h-8 w-8" />}
                title="No Payroll Runs Yet"
                description="Create your first payroll run to manage employee salaries and payments"
                action={{
                  label: 'Create Payroll Run',
                  onClick: handleCreatePayrollRun,
                }}
                iconColor="blue"
              />
            ) : (
              <div className="overflow-x-auto bg-[var(--bg-card)] rounded-lg shadow-md">
                <table className="w-full">
                  <thead className="bg-[var(--bg-secondary)]/50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-[var(--text-primary)]">
                        Run Name
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-[var(--text-primary)]">
                        Period
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-[var(--text-primary)]">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-[var(--text-primary)]">
                        Employees
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-[var(--text-primary)]">
                        Gross Amount
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-[var(--text-primary)]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayrollRuns.map((run) => (
                      <tr key={run.id} className="border-b hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50">
                        <td className="px-6 py-4 text-sm font-medium">{run.runName}</td>
                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                          {formatDate(run.payrollPeriodStart)} - {formatDate(run.payrollPeriodEnd)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                              run.status
                            )}`}
                          >
                            {run.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">{run.totalEmployees}</td>
                        <td className="px-6 py-4 text-sm font-semibold">
                          {formatCurrency(run.totalGrossAmount)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex gap-2">
                            {run.status === 'DRAFT' && (
                              <PermissionGate permission={Permissions.PAYROLL_PROCESS}>
                                <button
                                  onClick={() => handleProcessPayrollRun(run)}
                                  disabled={loading}
                                  className="px-2 py-1 bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 rounded text-xs hover:bg-primary-100 disabled:opacity-50"
                                >
                                  Process
                                </button>
                              </PermissionGate>
                            )}
                            {run.status === 'PROCESSED' && (
                              <PermissionGate permission={Permissions.PAYROLL_APPROVE}>
                                <button
                                  onClick={() => handleApprovePayrollRun(run)}
                                  disabled={loading}
                                  className="px-2 py-1 bg-green-50 dark:bg-green-900/40 text-green-600 dark:text-green-400 rounded text-xs hover:bg-green-100 dark:hover:bg-green-900/60 disabled:opacity-50"
                                >
                                  Approve
                                </button>
                              </PermissionGate>
                            )}
                            <PermissionGate permission={Permissions.PAYROLL_PROCESS}>
                              <button
                                onClick={() => handleEditPayrollRun(run)}
                                className="px-2 py-1 bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 rounded text-xs hover:bg-primary-100"
                              >
                                Edit
                              </button>
                            </PermissionGate>
                            <PermissionGate permission={Permissions.PAYROLL_PROCESS}>
                              <button
                                onClick={() => {
                                  setSelectedPayrollRun(run);
                                  setShowRunDeleteConfirm(true);
                                }}
                                className="px-2 py-1 bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded text-xs hover:bg-red-100 dark:hover:bg-red-900/60"
                              >
                                Delete
                              </button>
                            </PermissionGate>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* PAYSLIPS TAB */}
        {activeTab === 'payslips' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <div className="flex gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Month</label>
                  <input
                    type="month"
                    value={payslipSearchMonth}
                    onChange={(e) => setPayslipSearchMonth(e.target.value)}
                    className="px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Employee Name
                  </label>
                  <input
                    type="text"
                    placeholder="Search by employee..."
                    value={payslipSearchEmployee}
                    onChange={(e) => setPayslipSearchEmployee(e.target.value)}
                    className="px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <PermissionGate permission={Permissions.PAYROLL_PROCESS}>
                <button
                  onClick={handleCreatePayslip}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                  Create Payslip
                </button>
              </PermissionGate>
            </div>

            {loading ? (
              <div className="text-center py-12 text-[var(--text-secondary)]">Loading payslips...</div>
            ) : filteredPayslips.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-8 w-8" />}
                title="No Payslips Found"
                description="Generate payslips for your employees to view their salary details and deductions"
                action={{
                  label: 'Create Payslip',
                  onClick: handleCreatePayslip,
                }}
                iconColor="cyan"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPayslips.map((payslip) => (
                  <div key={payslip.id} className="bg-[var(--bg-card)] rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{payslip.employeeName}</h3>
                        <p className="text-sm text-[var(--text-secondary)]">{payslip.payrollRunName}</p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                          payslip.status
                        )}`}
                      >
                        {payslip.status}
                      </span>
                    </div>

                    <div className="mb-4 pb-4 border-b">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-[var(--text-secondary)]">Period</span>
                        <span className="font-medium">
                          {formatDate(payslip.payrollPeriodStart)} -{' '}
                          {formatDate(payslip.payrollPeriodEnd)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-[var(--text-secondary)]">Base Salary</span>
                        <span className="font-medium">{formatCurrency(payslip.baseSalary)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-[var(--text-secondary)]">Allowances</span>
                        <span className="text-green-600 font-medium">
                          {formatCurrency(payslip.allowances)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-[var(--text-secondary)]">Deductions</span>
                        <span className="text-red-600 font-medium">
                          {formatCurrency(payslip.deductions)}
                        </span>
                      </div>
                      <div className="border-t pt-3 flex justify-between text-sm font-semibold">
                        <span className="text-[var(--text-primary)]">Net Amount</span>
                        <span className="text-primary-600 dark:text-primary-400">{formatCurrency(payslip.netAmount)}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <PermissionGate permission={Permissions.PAYROLL_PROCESS}>
                        <button
                          onClick={() => handleEditPayslip(payslip)}
                          className="flex-1 px-3 py-2 bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 rounded hover:bg-primary-100 text-sm font-medium"
                        >
                          Edit
                        </button>
                      </PermissionGate>
                      <PermissionGate permission={Permissions.PAYROLL_PROCESS}>
                        <button
                          onClick={() => {
                            setSelectedPayslip(payslip);
                            setShowPayslipDeleteConfirm(true);
                          }}
                          className="flex-1 px-3 py-2 bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/60 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </PermissionGate>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* SALARY STRUCTURES TAB */}
        {activeTab === 'structures' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <div className="flex gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Filter by Status
                  </label>
                  <select
                    value={structureFilter}
                    onChange={(e) => setStructureFilter(e.target.value as 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'ALL')}
                    className="px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="ALL">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="PENDING">Pending</option>
                  </select>
                </div>
              </div>
              <PermissionGate permission={Permissions.PAYROLL_PROCESS}>
                <button
                  onClick={handleCreateStructure}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                  Create Structure
                </button>
              </PermissionGate>
            </div>

            {loading ? (
              <div className="text-center py-12 text-[var(--text-secondary)]">Loading salary structures...</div>
            ) : filteredStructures.length === 0 ? (
              <EmptyState
                icon={<Layers className="h-8 w-8" />}
                title="No Salary Structures Yet"
                description="Define salary structures with allowances and deductions for your employees"
                action={{
                  label: 'Create Structure',
                  onClick: handleCreateStructure,
                }}
                iconColor="grape"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredStructures.map((structure) => (
                  <div key={structure.id} className="bg-[var(--bg-card)] rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{structure.employeeName}</h3>
                        <p className="text-sm text-[var(--text-secondary)]">
                          Effective: {formatDate(structure.effectiveDate)}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                          structure.status
                        )}`}
                      >
                        {structure.status}
                      </span>
                    </div>

                    <div className="mb-6 pb-6 border-b">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-[var(--text-secondary)]">Base Salary</span>
                          <p className="font-semibold text-lg">
                            {formatCurrency(structure.baseSalary)}
                          </p>
                        </div>
                        <div>
                          <span className="text-[var(--text-secondary)]">Total CTC</span>
                          <p className="font-semibold text-lg">
                            {formatCurrency(structure.totalCTC)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {structure.allowances && structure.allowances.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-semibold text-sm mb-2 text-green-700">Allowances</h4>
                        <div className="space-y-1">
                          {structure.allowances.map((allow, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-[var(--text-secondary)]">{allow.name}</span>
                              <span className="text-green-600 font-medium">
                                {formatCurrency(allow.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {structure.deductions && structure.deductions.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-semibold text-sm mb-2 text-red-700">Deductions</h4>
                        <div className="space-y-1">
                          {structure.deductions.map((ded, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-[var(--text-secondary)]">{ded.name}</span>
                              <span className="text-red-600 font-medium">
                                {formatCurrency(ded.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <PermissionGate permission={Permissions.PAYROLL_PROCESS}>
                        <button
                          onClick={() => handleEditStructure(structure)}
                          className="flex-1 px-3 py-2 bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 rounded hover:bg-primary-100 text-sm font-medium"
                        >
                          Edit
                        </button>
                      </PermissionGate>
                      <PermissionGate permission={Permissions.PAYROLL_PROCESS}>
                        <button
                          onClick={() => {
                            setSelectedStructure(structure);
                            setShowStructureDeleteConfirm(true);
                          }}
                          className="flex-1 px-3 py-2 bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/60 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </PermissionGate>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ============ PAYROLL RUN MODAL ============ */}
      {payrollRunModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">
                {payrollRunModal.mode === 'create' ? 'Create Payroll Run' : 'Edit Payroll Run'}
              </h2>
              <form onSubmit={runFormHook.handleSubmit(onSubmitPayrollRun)}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      Run Name *
                    </label>
                    <input
                      type="text"
                      {...runFormHook.register('runName')}
                      className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g., November 2024 Payroll"
                    />
                    {runFormHook.formState.errors.runName && (
                      <p className="text-red-500 text-xs mt-1">{runFormHook.formState.errors.runName.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Period Start *
                      </label>
                      <input
                        type="date"
                        {...runFormHook.register('payrollPeriodStart')}
                        className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      {runFormHook.formState.errors.payrollPeriodStart && (
                        <p className="text-red-500 text-xs mt-1">{runFormHook.formState.errors.payrollPeriodStart.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Period End *
                      </label>
                      <input
                        type="date"
                        {...runFormHook.register('payrollPeriodEnd')}
                        className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      {runFormHook.formState.errors.payrollPeriodEnd && (
                        <p className="text-red-500 text-xs mt-1">{runFormHook.formState.errors.payrollPeriodEnd.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      Payment Date *
                    </label>
                    <input
                      type="date"
                      {...runFormHook.register('paymentDate')}
                      className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    {runFormHook.formState.errors.paymentDate && (
                      <p className="text-red-500 text-xs mt-1">{runFormHook.formState.errors.paymentDate.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Notes</label>
                    <textarea
                      {...runFormHook.register('notes')}
                      rows={3}
                      className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Additional notes..."
                    />
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setPayrollRunModal({ isOpen: false, mode: 'create' })}
                    className="flex-1 px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createRunMutation.isPending || updateRunMutation.isPending}
                    className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                  >
                    {createRunMutation.isPending || updateRunMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ============ PAYSLIP MODAL ============ */}
      {payslipModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">
                {payslipModal.mode === 'create' ? 'Create Payslip' : 'Edit Payslip'}
              </h2>
              <form onSubmit={payslipFormHook.handleSubmit(onSubmitPayslip)}>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Employee ID *
                      </label>
                      <input
                        type="text"
                        {...payslipFormHook.register('employeeId')}
                        className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      {payslipFormHook.formState.errors.employeeId && (
                        <p className="text-red-500 text-xs mt-1">{payslipFormHook.formState.errors.employeeId.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Payroll Run ID *
                      </label>
                      <input
                        type="text"
                        {...payslipFormHook.register('payrollRunId')}
                        className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      {payslipFormHook.formState.errors.payrollRunId && (
                        <p className="text-red-500 text-xs mt-1">{payslipFormHook.formState.errors.payrollRunId.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Period Start *
                      </label>
                      <input
                        type="date"
                        {...payslipFormHook.register('payrollPeriodStart')}
                        className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      {payslipFormHook.formState.errors.payrollPeriodStart && (
                        <p className="text-red-500 text-xs mt-1">{payslipFormHook.formState.errors.payrollPeriodStart.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Period End *
                      </label>
                      <input
                        type="date"
                        {...payslipFormHook.register('payrollPeriodEnd')}
                        className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      {payslipFormHook.formState.errors.payrollPeriodEnd && (
                        <p className="text-red-500 text-xs mt-1">{payslipFormHook.formState.errors.payrollPeriodEnd.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      Payment Date *
                    </label>
                    <input
                      type="date"
                      {...payslipFormHook.register('paymentDate')}
                      className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    {payslipFormHook.formState.errors.paymentDate && (
                      <p className="text-red-500 text-xs mt-1">{payslipFormHook.formState.errors.paymentDate.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Base Salary *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        {...payslipFormHook.register('baseSalary', { valueAsNumber: true })}
                        className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      {payslipFormHook.formState.errors.baseSalary && (
                        <p className="text-red-500 text-xs mt-1">{payslipFormHook.formState.errors.baseSalary.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Allowances
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        {...payslipFormHook.register('allowances', { valueAsNumber: true })}
                        className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Deductions
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        {...payslipFormHook.register('deductions', { valueAsNumber: true })}
                        className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setPayslipModal({ isOpen: false, mode: 'create' })}
                    className="flex-1 px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createPayslipMutation.isPending || updatePayslipMutation.isPending}
                    className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                  >
                    {createPayslipMutation.isPending || updatePayslipMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ============ SALARY STRUCTURE MODAL ============ */}
      {structureModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">
                {structureModal.mode === 'create'
                  ? 'Create Salary Structure'
                  : 'Edit Salary Structure'}
              </h2>
              <form onSubmit={structureFormHook.handleSubmit(onSubmitStructure)}>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Employee ID *
                      </label>
                      <input
                        type="text"
                        {...structureFormHook.register('employeeId')}
                        className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      {structureFormHook.formState.errors.employeeId && (
                        <p className="text-red-500 text-xs mt-1">{structureFormHook.formState.errors.employeeId.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Effective Date *
                      </label>
                      <input
                        type="date"
                        {...structureFormHook.register('effectiveDate')}
                        className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      {structureFormHook.formState.errors.effectiveDate && (
                        <p className="text-red-500 text-xs mt-1">{structureFormHook.formState.errors.effectiveDate.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      Base Salary *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      {...structureFormHook.register('baseSalary', { valueAsNumber: true })}
                      className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    {structureFormHook.formState.errors.baseSalary && (
                      <p className="text-red-500 text-xs mt-1">{structureFormHook.formState.errors.baseSalary.message}</p>
                    )}
                  </div>

                  {/* Allowances */}
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-green-700">Allowances</h3>
                      <button
                        type="button"
                        onClick={() => appendAllowance({ name: '', amount: 0, type: 'FIXED', description: '' })}
                        className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        Add Allowance
                      </button>
                    </div>
                    <div className="space-y-4">
                      {allowanceFields.map((field, idx) => (
                        <div key={field.id} className="flex gap-4 pb-3 border-b">
                          <div className="flex-1">
                            <input
                              type="text"
                              placeholder="Name"
                              {...structureFormHook.register(`allowances.${idx}.name`)}
                              className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                          <div className="w-24">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Amount"
                              {...structureFormHook.register(`allowances.${idx}.amount`, { valueAsNumber: true })}
                              className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAllowance(idx)}
                            className="px-2 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Deductions */}
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-red-700">Deductions</h3>
                      <button
                        type="button"
                        onClick={() => appendDeduction({ name: '', amount: 0, type: 'FIXED', description: '' })}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        Add Deduction
                      </button>
                    </div>
                    <div className="space-y-4">
                      {deductionFields.map((field, idx) => (
                        <div key={field.id} className="flex gap-4 pb-3 border-b">
                          <div className="flex-1">
                            <input
                              type="text"
                              placeholder="Name"
                              {...structureFormHook.register(`deductions.${idx}.name`)}
                              className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                          <div className="w-24">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Amount"
                              {...structureFormHook.register(`deductions.${idx}.amount`, { valueAsNumber: true })}
                              className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeDeduction(idx)}
                            className="px-2 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setStructureModal({ isOpen: false, mode: 'create' })}
                    className="flex-1 px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createStructureMutation.isPending || updateStructureMutation.isPending}
                    className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                  >
                    {createStructureMutation.isPending || updateStructureMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ============ DELETE CONFIRMATION MODALS ============ */}
      {showRunDeleteConfirm && selectedPayrollRun && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Delete Payroll Run</h2>
            <p className="text-[var(--text-secondary)] mb-6">
              Are you sure you want to delete &quot;{selectedPayrollRun.runName}&quot;? This action cannot
              be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowRunDeleteConfirm(false);
                  setSelectedPayrollRun(null);
                }}
                className="flex-1 px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePayrollRun}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPayslipDeleteConfirm && selectedPayslip && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Delete Payslip</h2>
            <p className="text-[var(--text-secondary)] mb-6">
              Are you sure you want to delete the payslip for {selectedPayslip.employeeName}?
              This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowPayslipDeleteConfirm(false);
                  setSelectedPayslip(null);
                }}
                className="flex-1 px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePayslip}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showStructureDeleteConfirm && selectedStructure && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Delete Salary Structure</h2>
            <p className="text-[var(--text-secondary)] mb-6">
              Are you sure you want to delete the salary structure for {selectedStructure.employeeName}?
              This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowStructureDeleteConfirm(false);
                  setSelectedStructure(null);
                }}
                className="flex-1 px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteStructure}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      </motion.div>
    </AppLayout>
  );
}
