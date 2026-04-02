'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AppLayout } from '@/components/layout';
import { motion } from 'framer-motion';
import { Skeleton } from '@mantine/core';
import dynamic from 'next/dynamic';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';
import { PermissionGate } from '@/components/auth/PermissionGate';
import {
  usePayrollRuns,
  useCreatePayrollRun,
  useUpdatePayrollRun,
  useDeletePayrollRun,
  useProcessPayrollRun,
  useApprovePayrollRun,
} from '@/lib/hooks/queries/usePayroll';
import { PayrollRunRequest } from '@/lib/types/hrms/payroll';
import {
  PayrollRunsTab,
  PayrollRun,
  PayrollRunStatus,
  PayrollRunFormData,
  FormModalState,
  payrollRunSchema,
} from '../_components';

const PayrollRunModal = dynamic(
  () => import('../_components/PayrollModals').then((m) => ({ default: m.PayrollRunModal })),
  { loading: () => <Skeleton height={400} radius="md" />, ssr: false }
);
const DeleteConfirmModal = dynamic(
  () => import('../_components/PayrollModals').then((m) => ({ default: m.DeleteConfirmModal })),
  { loading: () => <Skeleton height={200} radius="md" />, ssr: false }
);

export default function PayrollRunsPage() {
  const router = useRouter();
  const { hasPermission, isReady: permReady } = usePermissions();

  useEffect(() => {
    if (!permReady) return;
    if (!hasPermission(Permissions.PAYROLL_VIEW)) {
      router.replace('/me/dashboard');
    }
  }, [permReady, hasPermission, router]);

  const [error, setError] = useState<string | null>(null);
  const [payrollRunFilter, setPayrollRunFilter] = useState<PayrollRunStatus | 'ALL'>('ALL');
  const [selectedPayrollRun, setSelectedPayrollRun] = useState<PayrollRun | null>(null);
  const [payrollRunModal, setPayrollRunModal] = useState<FormModalState>({ isOpen: false, mode: 'create' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const runsQuery = usePayrollRuns(0, 100);
  const payrollRuns = runsQuery.data?.content || [];

  const runFormHook = useForm<PayrollRunFormData>({
    resolver: zodResolver(payrollRunSchema),
    defaultValues: { runName: '', payrollPeriodStart: '', payrollPeriodEnd: '', paymentDate: '', notes: '' },
  });

  const createRunMutation = useCreatePayrollRun();
  const updateRunMutation = useUpdatePayrollRun();
  const deleteRunMutation = useDeletePayrollRun();
  const processRunMutation = useProcessPayrollRun();
  const approveRunMutation = useApprovePayrollRun();

  if (!permReady || !hasPermission(Permissions.PAYROLL_VIEW)) {
    return null;
  }

  const loading =
    runsQuery.isLoading ||
    createRunMutation.isPending ||
    updateRunMutation.isPending ||
    deleteRunMutation.isPending ||
    processRunMutation.isPending ||
    approveRunMutation.isPending;

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
      onSuccess: () => { setShowDeleteConfirm(false); setSelectedPayrollRun(null); },
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

  return (
    <AppLayout activeMenuItem="payroll">
      <PermissionGate permission={Permissions.PAYROLL_VIEW} fallback={<div className="p-6"><p className="text-danger-600">You do not have permission to view payroll runs.</p></div>}>
      <motion.div
        className="p-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold skeuo-emboss">Payroll Runs</h1>
            <p className="text-[var(--text-secondary)] mt-2 skeuo-deboss">Create and manage payroll processing runs</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-danger-50 dark:bg-danger-900/40 border border-danger-200 dark:border-danger-800 text-danger-800 dark:text-danger-300 rounded-lg">
              {error}
              <button
                onClick={() => setError(null)}
                className="ml-4 text-sm underline hover:no-underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              >
                Dismiss
              </button>
            </div>
          )}

          <PayrollRunsTab
            payrollRuns={payrollRuns}
            loading={loading}
            payrollRunFilter={payrollRunFilter}
            onFilterChange={setPayrollRunFilter}
            onCreateRun={handleCreatePayrollRun}
            onEditRun={handleEditPayrollRun}
            onProcessRun={handleProcessPayrollRun}
            onApproveRun={handleApprovePayrollRun}
            onDeleteRun={(run) => { setSelectedPayrollRun(run); setShowDeleteConfirm(true); }}
          />
        </div>

        <PayrollRunModal
          isOpen={payrollRunModal.isOpen}
          mode={payrollRunModal.mode}
          formHook={runFormHook}
          isSaving={createRunMutation.isPending || updateRunMutation.isPending}
          onClose={() => setPayrollRunModal({ isOpen: false, mode: 'create' })}
          onSubmit={onSubmitPayrollRun}
        />

        <DeleteConfirmModal
          isOpen={showDeleteConfirm && !!selectedPayrollRun}
          title="Delete Payroll Run"
          message={`Are you sure you want to delete "${selectedPayrollRun?.runName}"? This action cannot be undone.`}
          loading={deleteRunMutation.isPending}
          onCancel={() => { setShowDeleteConfirm(false); setSelectedPayrollRun(null); }}
          onConfirm={handleDeletePayrollRun}
        />
      </motion.div>
      </PermissionGate>
    </AppLayout>
  );
}
