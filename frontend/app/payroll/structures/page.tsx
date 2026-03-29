'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AppLayout } from '@/components/layout';
import { motion } from 'framer-motion';
import { Skeleton } from '@mantine/core';
import dynamic from 'next/dynamic';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';
import { PermissionGate } from '@/components/auth/PermissionGate';
import {
  useSalaryStructures,
  useCreateSalaryStructure,
  useUpdateSalaryStructure,
  useDeleteSalaryStructure,
} from '@/lib/hooks/queries/usePayroll';
import { SalaryStructureRequest } from '@/lib/types/payroll';
import {
  SalaryStructuresTab,
  SalaryStructure,
  SalaryStructureFormData,
  FormModalState,
  salaryStructureSchema,
} from '../_components';

const SalaryStructureModal = dynamic(
  () => import('../_components/PayrollModals').then((m) => ({ default: m.SalaryStructureModal })),
  { loading: () => <Skeleton height={500} radius="md" />, ssr: false }
);
const DeleteConfirmModal = dynamic(
  () => import('../_components/PayrollModals').then((m) => ({ default: m.DeleteConfirmModal })),
  { loading: () => <Skeleton height={200} radius="md" />, ssr: false }
);

export default function SalaryStructuresPage() {
  const router = useRouter();
  const { hasPermission, isReady: permReady } = usePermissions();

  useEffect(() => {
    if (!permReady) return;
    if (!hasPermission(Permissions.PAYROLL_VIEW)) {
      router.replace('/dashboard');
    }
  }, [permReady, hasPermission, router]);

  const [error, setError] = useState<string | null>(null);
  const [structureFilter, setStructureFilter] = useState<'ACTIVE' | 'INACTIVE' | 'PENDING' | 'ALL'>('ACTIVE');
  const [selectedStructure, setSelectedStructure] = useState<SalaryStructure | null>(null);
  const [structureModal, setStructureModal] = useState<FormModalState>({ isOpen: false, mode: 'create' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const structuresQuery = useSalaryStructures(0, 100);
  const salaryStructures = structuresQuery.data?.content || [];

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

  const createStructureMutation = useCreateSalaryStructure();
  const updateStructureMutation = useUpdateSalaryStructure();
  const deleteStructureMutation = useDeleteSalaryStructure();

  if (!permReady || !hasPermission(Permissions.PAYROLL_VIEW)) {
    return null;
  }

  const loading =
    structuresQuery.isLoading ||
    createStructureMutation.isPending ||
    updateStructureMutation.isPending ||
    deleteStructureMutation.isPending;

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
      onSuccess: () => { setShowDeleteConfirm(false); setSelectedStructure(null); },
      onError: (err: unknown) => {
        setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete salary structure');
      },
    });
  };

  return (
    <AppLayout activeMenuItem="payroll">
      <PermissionGate permission={Permissions.PAYROLL_VIEW} fallback={<div className="p-6"><p className="text-danger-600">You do not have permission to view salary structures.</p></div>}>
      <motion.div
        className="p-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold skeuo-emboss">Salary Structures</h1>
            <p className="text-[var(--text-secondary)] mt-2 skeuo-deboss">Define and manage employee salary structures with allowances and deductions</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-danger-50 dark:bg-danger-900/40 border border-danger-200 dark:border-danger-800 text-danger-800 dark:text-danger-300 rounded-lg">
              {error}
              <button
                onClick={() => setError(null)}
                className="ml-4 text-sm underline hover:no-underline"
              >
                Dismiss
              </button>
            </div>
          )}

          <SalaryStructuresTab
            salaryStructures={salaryStructures}
            loading={loading}
            structureFilter={structureFilter}
            onFilterChange={setStructureFilter}
            onCreateStructure={handleCreateStructure}
            onEditStructure={handleEditStructure}
            onDeleteStructure={(structure) => { setSelectedStructure(structure); setShowDeleteConfirm(true); }}
          />
        </div>

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

        <DeleteConfirmModal
          isOpen={showDeleteConfirm && !!selectedStructure}
          title="Delete Salary Structure"
          message={`Are you sure you want to delete the salary structure for ${selectedStructure?.employeeName}? This action cannot be undone.`}
          loading={deleteStructureMutation.isPending}
          onCancel={() => { setShowDeleteConfirm(false); setSelectedStructure(null); }}
          onConfirm={handleDeleteStructure}
        />
      </motion.div>
      </PermissionGate>
    </AppLayout>
  );
}
