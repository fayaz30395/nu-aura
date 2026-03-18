'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AppLayout } from '@/components/layout';
import { motion } from 'framer-motion';
import { Skeleton } from '@mantine/core';
import dynamic from 'next/dynamic';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';
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
  PayrollRunRequest,
  PayslipRequest,
  SalaryStructureRequest,
} from '@/lib/types/payroll';

import {
  PayrollRunsTab,
  PayslipsTab,
  SalaryStructuresTab,
  PayrollRun,
  Payslip,
  SalaryStructure,
  PayrollRunStatus,
  PayrollRunFormData,
  PayslipFormData,
  SalaryStructureFormData,
  TabType,
  FormModalState,
  payrollRunSchema,
  payslipFormSchema,
  salaryStructureSchema,
} from './_components';

// Dynamic imports for heavy modal components — only loaded when a modal is opened
const PayrollRunModal = dynamic(
  () => import('./_components/PayrollModals').then((m) => ({ default: m.PayrollRunModal })),
  { loading: () => <Skeleton height={400} radius="md" />, ssr: false }
);
const PayslipModal = dynamic(
  () => import('./_components/PayrollModals').then((m) => ({ default: m.PayslipModal })),
  { loading: () => <Skeleton height={400} radius="md" />, ssr: false }
);
const SalaryStructureModal = dynamic(
  () => import('./_components/PayrollModals').then((m) => ({ default: m.SalaryStructureModal })),
  { loading: () => <Skeleton height={500} radius="md" />, ssr: false }
);
const DeleteConfirmModal = dynamic(
  () => import('./_components/PayrollModals').then((m) => ({ default: m.DeleteConfirmModal })),
  { loading: () => <Skeleton height={200} radius="md" />, ssr: false }
);

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
  const [payrollRunModal, setPayrollRunModal] = useState<FormModalState>({ isOpen: false, mode: 'create' });
  const [payrollRunFilter, setPayrollRunFilter] = useState<PayrollRunStatus | 'ALL'>('ALL');
  const [selectedPayrollRun, setSelectedPayrollRun] = useState<PayrollRun | null>(null);
  const [showRunDeleteConfirm, setShowRunDeleteConfirm] = useState(false);

  // Payslips State
  const payslips = payslipsQuery.data?.content || [];
  const [payslipModal, setPayslipModal] = useState<FormModalState>({ isOpen: false, mode: 'create' });
  const [payslipSearchMonth, setPayslipSearchMonth] = useState<string>(new Date().toISOString().substring(0, 7));
  const [payslipSearchEmployee, setPayslipSearchEmployee] = useState('');
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [showPayslipDeleteConfirm, setShowPayslipDeleteConfirm] = useState(false);

  // Salary Structures State
  const salaryStructures = structuresQuery.data?.content || [];
  const [structureModal, setStructureModal] = useState<FormModalState>({ isOpen: false, mode: 'create' });
  const [structureFilter, setStructureFilter] = useState<'ACTIVE' | 'INACTIVE' | 'PENDING' | 'ALL'>('ACTIVE');
  const [selectedStructure, setSelectedStructure] = useState<SalaryStructure | null>(null);
  const [showStructureDeleteConfirm, setShowStructureDeleteConfirm] = useState(false);

  // ============ MUTATIONS ============
  const createRunMutation = useCreatePayrollRun();
  const updateRunMutation = useUpdatePayrollRun();
  const deleteRunMutation = useDeletePayrollRun();
  const processRunMutation = useProcessPayrollRun();
  const approveRunMutation = useApprovePayrollRun();
  const createPayslipMutation = useCreatePayslip();
  const updatePayslipMutation = useUpdatePayslip();
  const deletePayslipMutation = useDeletePayslip();
  const createStructureMutation = useCreateSalaryStructure();
  const updateStructureMutation = useUpdateSalaryStructure();
  const deleteStructureMutation = useDeleteSalaryStructure();

  // RBAC guard — all hooks declared above; safe to return null after them
  if (!permReady || !hasPermission(Permissions.PAYROLL_VIEW)) {
    return null;
  }

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

  // ============ PAYROLL RUNS ============
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
      onSuccess: () => { setShowRunDeleteConfirm(false); setSelectedPayrollRun(null); },
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

  // ============ PAYSLIPS ============
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
      onSuccess: () => { setShowPayslipDeleteConfirm(false); setSelectedPayslip(null); },
      onError: (err: unknown) => {
        setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete payslip');
      },
    });
  };

  // ============ SALARY STRUCTURES ============
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
      onSuccess: () => { setShowStructureDeleteConfirm(false); setSelectedStructure(null); },
      onError: (err: unknown) => {
        setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete salary structure');
      },
    });
  };

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
            {(['runs', 'payslips', 'structures'] as TabType[]).map((tab) => {
              const labels: Record<TabType, string> = { runs: 'Payroll Runs', payslips: 'Payslips', structures: 'Salary Structures' };
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-secondary)]'
                  }`}
                >
                  {labels[tab]}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <Suspense fallback={<Skeleton height={400} radius="md" />}>
            {activeTab === 'runs' && (
              <PayrollRunsTab
                payrollRuns={payrollRuns}
                loading={loading}
                payrollRunFilter={payrollRunFilter}
                onFilterChange={setPayrollRunFilter}
                onCreateRun={handleCreatePayrollRun}
                onEditRun={handleEditPayrollRun}
                onProcessRun={handleProcessPayrollRun}
                onApproveRun={handleApprovePayrollRun}
                onDeleteRun={(run) => { setSelectedPayrollRun(run); setShowRunDeleteConfirm(true); }}
              />
            )}

            {activeTab === 'payslips' && (
              <PayslipsTab
                payslips={payslips}
                loading={loading}
                payslipSearchMonth={payslipSearchMonth}
                payslipSearchEmployee={payslipSearchEmployee}
                onMonthChange={setPayslipSearchMonth}
                onEmployeeSearch={setPayslipSearchEmployee}
                onCreatePayslip={handleCreatePayslip}
                onEditPayslip={handleEditPayslip}
                onDeletePayslip={(payslip) => { setSelectedPayslip(payslip); setShowPayslipDeleteConfirm(true); }}
              />
            )}

            {activeTab === 'structures' && (
              <SalaryStructuresTab
                salaryStructures={salaryStructures}
                loading={loading}
                structureFilter={structureFilter}
                onFilterChange={setStructureFilter}
                onCreateStructure={handleCreateStructure}
                onEditStructure={handleEditStructure}
                onDeleteStructure={(structure) => { setSelectedStructure(structure); setShowStructureDeleteConfirm(true); }}
              />
            )}
          </Suspense>
        </div>

        {/* ============ MODALS ============ */}
        <PayrollRunModal
          isOpen={payrollRunModal.isOpen}
          mode={payrollRunModal.mode}
          formHook={runFormHook}
          isSaving={createRunMutation.isPending || updateRunMutation.isPending}
          onClose={() => setPayrollRunModal({ isOpen: false, mode: 'create' })}
          onSubmit={onSubmitPayrollRun}
        />

        <PayslipModal
          isOpen={payslipModal.isOpen}
          mode={payslipModal.mode}
          formHook={payslipFormHook}
          isSaving={createPayslipMutation.isPending || updatePayslipMutation.isPending}
          onClose={() => setPayslipModal({ isOpen: false, mode: 'create' })}
          onSubmit={onSubmitPayslip}
        />

        <SalaryStructureModal
          isOpen={structureModal.isOpen}
          mode={structureModal.mode}
          formHook={structureFormHook}
          allowanceFields={allowanceFields}
          deductionFields={deductionFields}
          appendAllowance={appendAllowance}
          removeAllowance={removeAllowance}
          appendDeduction={appendDeduction}
          removeDeduction={removeDeduction}
          isSaving={createStructureMutation.isPending || updateStructureMutation.isPending}
          onClose={() => setStructureModal({ isOpen: false, mode: 'create' })}
          onSubmit={onSubmitStructure}
        />

        {/* Delete Confirmations */}
        <DeleteConfirmModal
          isOpen={showRunDeleteConfirm && !!selectedPayrollRun}
          title="Delete Payroll Run"
          message={`Are you sure you want to delete "${selectedPayrollRun?.runName}"? This action cannot be undone.`}
          loading={loading}
          onCancel={() => { setShowRunDeleteConfirm(false); setSelectedPayrollRun(null); }}
          onConfirm={handleDeletePayrollRun}
        />

        <DeleteConfirmModal
          isOpen={showPayslipDeleteConfirm && !!selectedPayslip}
          title="Delete Payslip"
          message={`Are you sure you want to delete the payslip for ${selectedPayslip?.employeeName}? This action cannot be undone.`}
          loading={loading}
          onCancel={() => { setShowPayslipDeleteConfirm(false); setSelectedPayslip(null); }}
          onConfirm={handleDeletePayslip}
        />

        <DeleteConfirmModal
          isOpen={showStructureDeleteConfirm && !!selectedStructure}
          title="Delete Salary Structure"
          message={`Are you sure you want to delete the salary structure for ${selectedStructure?.employeeName}? This action cannot be undone.`}
          loading={loading}
          onCancel={() => { setShowStructureDeleteConfirm(false); setSelectedStructure(null); }}
          onConfirm={handleDeleteStructure}
        />
      </motion.div>
    </AppLayout>
  );
}
