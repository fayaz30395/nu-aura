'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/layout';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';
import {
  usePayrollComponents,
  useCreatePayrollComponent,
  useUpdatePayrollComponent,
  useDeletePayrollComponent,
  useRecomputeEvaluationOrder,
} from '@/lib/hooks/queries/usePayroll';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Modal,
  TextInput,
  Textarea,
  Select,
  NumberInput,
  Switch,
  Button,
  Group,
  Stack,
  Badge,
  ActionIcon,
  Tooltip,
  Table,
  Text,
  Box,
  Tabs,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Building2,
  Code,
} from 'lucide-react';
import type { PayrollComponent, ComponentType, PayrollComponentRequest } from '@/lib/types/hrms/payroll';

// ─── Form schema ──────────────────────────────────────────────────────────────

const componentSchema = z.object({
  code: z
    .string()
    .min(1, 'Code is required')
    .max(50, 'Max 50 chars')
    .regex(/^[a-z][a-z0-9_]*$/, 'Lowercase letters, digits and underscores only, must start with a letter'),
  name: z.string().min(1, 'Name is required').max(100),
  componentType: z.enum(['EARNING', 'DEDUCTION', 'EMPLOYER_CONTRIBUTION']),
  formula: z.string().max(500).optional(),
  defaultValue: z.number().nullable().optional(),
  isActive: z.boolean().default(true),
  isTaxable: z.boolean().default(true),
  description: z.string().max(500).optional(),
});

type ComponentFormData = z.infer<typeof componentSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<ComponentType, string> = {
  EARNING: 'Earning',
  DEDUCTION: 'Deduction',
  EMPLOYER_CONTRIBUTION: 'Employer Contribution',
};

const TYPE_COLORS: Record<ComponentType, string> = {
  EARNING: 'text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-950/20',
  DEDUCTION: 'text-danger-600 dark:text-danger-400 bg-danger-50 dark:bg-danger-950/20',
  EMPLOYER_CONTRIBUTION: 'text-info-600 dark:text-info-400 bg-info-50 dark:bg-info-950/20',
};

function TypeIcon({ type }: { type: ComponentType }) {
  if (type === 'EARNING') return <TrendingUp className="h-4 w-4 text-success-500" />;
  if (type === 'DEDUCTION') return <TrendingDown className="h-4 w-4 text-danger-500" />;
  return <Building2 className="h-4 w-4 text-info-500" />;
}

// ─── Component form modal ─────────────────────────────────────────────────────

function ComponentModal({
  opened,
  onClose,
  editTarget,
}: {
  opened: boolean;
  onClose: () => void;
  editTarget: PayrollComponent | null;
}) {
  const create = useCreatePayrollComponent();
  const update = useUpdatePayrollComponent();
  const isEdit = !!editTarget;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ComponentFormData>({
    resolver: zodResolver(componentSchema),
    defaultValues: editTarget
      ? {
          code: editTarget.code,
          name: editTarget.name,
          componentType: editTarget.componentType,
          formula: editTarget.formula ?? '',
          defaultValue: editTarget.defaultValue ?? null,
          isActive: editTarget.isActive,
          isTaxable: editTarget.isTaxable,
          description: editTarget.description ?? '',
        }
      : {
          componentType: 'EARNING',
          isActive: true,
          isTaxable: true,
        },
  });

  const isActive = watch('isActive');
  const isTaxable = watch('isTaxable');
  const componentType = watch('componentType');

  const onSubmit = async (data: ComponentFormData) => {
    const payload: PayrollComponentRequest = {
      code: data.code!,
      name: data.name!,
      componentType: data.componentType!,
      isActive: data.isActive,
      isTaxable: data.isTaxable,
      defaultValue: data.defaultValue ?? undefined,
      formula: data.formula || undefined,
      description: data.description || undefined,
    };

    try {
      if (isEdit) {
        await update.mutateAsync({ id: editTarget!.id, data: payload });
        notifications.show({ message: 'Component updated', color: 'green' });
      } else {
        await create.mutateAsync(payload);
        notifications.show({ message: 'Component created', color: 'green' });
      }
      reset();
      onClose();
    } catch {
      notifications.show({ message: 'Failed to save component', color: 'red' });
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEdit ? 'Edit Component' : 'New Payroll Component'}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack gap="md">
          <Group grow>
            <TextInput
              label="Code"
              placeholder="e.g. basic, hra, pf_employee"
              description="Used in formulas. Cannot be changed after creation."
              disabled={isEdit}
              error={errors.code?.message}
              {...register('code')}
            />
            <TextInput
              label="Display Name"
              placeholder="e.g. Basic Salary"
              error={errors.name?.message}
              {...register('name')}
            />
          </Group>

          <Select
            label="Component Type"
            data={[
              { value: 'EARNING', label: 'Earning (adds to gross)' },
              { value: 'DEDUCTION', label: 'Deduction (subtracts from gross)' },
              { value: 'EMPLOYER_CONTRIBUTION', label: "Employer Contribution (employer's cost)" },
            ]}
            value={componentType}
            onChange={(v) => setValue('componentType', v as ComponentType)}
            error={errors.componentType?.message}
          />

          <TextInput
            label="Formula (SpEL)"
            placeholder='e.g. basic * 0.4 or (basic + hra) * 0.12'
            description="Reference other components by code. Leave blank to use Default Value."
            error={errors.formula?.message}
            {...register('formula')}
          />

          <NumberInput
            label="Default Value"
            placeholder="Fixed amount when no formula"
            description="Used as fallback or when no formula is set"
            value={watch('defaultValue') ?? undefined}
            onChange={(v) => setValue('defaultValue', typeof v === 'number' ? v : null)}
            min={0}
            decimalScale={2}
          />

          <Textarea
            label="Description"
            placeholder="What this component represents..."
            rows={2}
            error={errors.description?.message}
            {...register('description')}
          />

          <Group gap="xl">
            <Switch
              label="Active"
              checked={isActive}
              onChange={(e) => setValue('isActive', e.currentTarget.checked)}
            />
            <Switch
              label="Taxable"
              checked={isTaxable}
              onChange={(e) => setValue('isTaxable', e.currentTarget.checked)}
            />
          </Group>

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Update' : 'Create'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

// ─── Components table ─────────────────────────────────────────────────────────

function ComponentsTable({
  components,
  onEdit,
  onDelete,
}: {
  components: PayrollComponent[];
  onEdit: (c: PayrollComponent) => void;
  onDelete: (c: PayrollComponent) => void;
}) {
  if (components.length === 0) {
    return (
      <div className="py-16 text-center">
        <Code className="h-10 w-10 text-[var(--text-muted)] mx-auto mb-4" />
        <p className="text-sm font-medium text-[var(--text-primary)]">No components in this category</p>
        <p className="text-caption mt-1">Add a component using the button above</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Order</Table.Th>
            <Table.Th>Code</Table.Th>
            <Table.Th>Name</Table.Th>
            <Table.Th>Type</Table.Th>
            <Table.Th>Formula / Default</Table.Th>
            <Table.Th>Taxable</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {components.map((c) => (
            <Table.Tr key={c.id}>
              <Table.Td>
                <span className="text-xs font-mono text-[var(--text-muted)]">
                  {c.evaluationOrder}
                </span>
              </Table.Td>
              <Table.Td>
                <code className="text-xs bg-[var(--surface-2)] px-1.5 py-0.5 rounded font-mono">
                  {c.code}
                </code>
              </Table.Td>
              <Table.Td>
                <span className="text-sm text-[var(--text-primary)]">{c.name}</span>
                {c.description && (
                  <p className="text-caption mt-0.5 truncate max-w-[200px]">
                    {c.description}
                  </p>
                )}
              </Table.Td>
              <Table.Td>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[c.componentType]}`}
                >
                  <TypeIcon type={c.componentType} />
                  {TYPE_LABELS[c.componentType]}
                </span>
              </Table.Td>
              <Table.Td>
                {c.formula ? (
                  <code className="text-xs text-accent-600 dark:text-accent-400 font-mono">
                    {c.formula}
                  </code>
                ) : c.defaultValue != null ? (
                  <span className="text-sm">₹{c.defaultValue.toLocaleString()}</span>
                ) : (
                  <span className="text-caption">—</span>
                )}
              </Table.Td>
              <Table.Td>
                <span
                  className={`text-xs font-medium ${
                    c.isTaxable
                      ? 'text-warning-600 dark:text-warning-400'
                      : 'text-[var(--text-muted)]'
                  }`}
                >
                  {c.isTaxable ? 'Yes' : 'No'}
                </span>
              </Table.Td>
              <Table.Td>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    c.isActive
                      ? 'badge-success'
                      : 'bg-[var(--surface-2)] text-[var(--text-muted)]'
                  }`}
                >
                  {c.isActive ? 'Active' : 'Inactive'}
                </span>
              </Table.Td>
              <Table.Td>
                <Group gap={4} justify="flex-end">
                  <Tooltip label="Edit">
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      onClick={() => onEdit(c)}
                      aria-label="Edit component"
                      className="cursor-pointer"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Delete">
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      onClick={() => onDelete(c)}
                      aria-label="Delete component"
                      className="cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PayrollComponentsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PayrollComponent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PayrollComponent | null>(null);
  const [activeTab, setActiveTab] = useState<string>('ALL');

  const { data: componentsPage, isLoading } = usePayrollComponents(0, 200);
  const deleteComponent = useDeletePayrollComponent();
  const recompute = useRecomputeEvaluationOrder();

  const all = componentsPage?.content ?? [];
  const earnings = all.filter((c) => c.componentType === 'EARNING');
  const deductions = all.filter((c) => c.componentType === 'DEDUCTION');
  const employer = all.filter((c) => c.componentType === 'EMPLOYER_CONTRIBUTION');

  function openNew() {
    setEditTarget(null);
    setModalOpen(true);
  }

  function openEdit(c: PayrollComponent) {
    setEditTarget(c);
    setModalOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteComponent.mutateAsync(deleteTarget.id);
      notifications.show({ message: `Deleted "${deleteTarget.name}"`, color: 'green' });
    } catch {
      notifications.show({ message: 'Delete failed', color: 'red' });
    } finally {
      setDeleteTarget(null);
    }
  }

  const tabComponents =
    activeTab === 'EARNING'
      ? earnings
      : activeTab === 'DEDUCTION'
        ? deductions
        : activeTab === 'EMPLOYER_CONTRIBUTION'
          ? employer
          : all;

  return (
    <AppLayout activeMenuItem="payroll">
      <PermissionGate
        anyOf={[Permissions.PAYROLL_VIEW, Permissions.PAYROLL_PROCESS]}
        fallback={
          <Box p="lg">
            <Text c="red">You do not have permission to view payroll components.</Text>
          </Box>
        }
      >
        <div className="p-4 md:p-6 space-y-6">
          {/* Header */}
          <div className="row-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
                Payroll Components
              </h1>
              <p className="mt-1 text-body-secondary">
                Configure earnings, deductions, and employer contributions used in salary formulas
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip label="Recompute evaluation order">
                <ActionIcon
                  variant="default"
                  size="md"
                  onClick={() => recompute.mutate()}
                  loading={recompute.isPending}
                  aria-label="Recompute evaluation order"
                  className="cursor-pointer"
                >
                  <RefreshCw className="h-4 w-4" />
                </ActionIcon>
              </Tooltip>
              <PermissionGate permission={Permissions.PAYROLL_PROCESS}>
                <Button
                  leftSection={<Plus className="h-4 w-4" />}
                  onClick={openNew}
                  className="skeuo-button cursor-pointer"
                >
                  Add Component
                </Button>
              </PermissionGate>
            </div>
          </div>

          {/* Summary badges */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: `${earnings.length} Earnings`, color: TYPE_COLORS.EARNING },
              { label: `${deductions.length} Deductions`, color: TYPE_COLORS.DEDUCTION },
              { label: `${employer.length} Employer`, color: TYPE_COLORS.EMPLOYER_CONTRIBUTION },
            ].map(({ label, color }) => (
              <span
                key={label}
                className={`px-4 py-1 rounded-full text-xs font-semibold ${color}`}
              >
                {label}
              </span>
            ))}
          </div>

          {/* Table with tabs */}
          <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] overflow-hidden">
            <Tabs value={activeTab} onChange={(v) => setActiveTab(v ?? 'ALL')}>
              <Tabs.List px="md" pt="sm">
                <Tabs.Tab value="ALL">All ({all.length})</Tabs.Tab>
                <Tabs.Tab value="EARNING">Earnings ({earnings.length})</Tabs.Tab>
                <Tabs.Tab value="DEDUCTION">Deductions ({deductions.length})</Tabs.Tab>
                <Tabs.Tab value="EMPLOYER_CONTRIBUTION">Employer ({employer.length})</Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value={activeTab} pt="sm">
                {isLoading ? (
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="px-6 py-4 flex items-center gap-4">
                        <div className="h-4 w-8 rounded bg-[var(--skeleton-base)] animate-pulse" />
                        <div className="h-4 w-24 rounded bg-[var(--skeleton-base)] animate-pulse" />
                        <div className="h-4 flex-1 rounded bg-[var(--skeleton-base)] animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <ComponentsTable
                    components={tabComponents}
                    onEdit={openEdit}
                    onDelete={setDeleteTarget}
                  />
                )}
              </Tabs.Panel>
            </Tabs>
          </div>

          {/* Formula reference */}
          <div className="rounded-xl border border-[var(--border-main)] bg-[var(--surface-1)] p-4">
            <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
              Formula Reference
            </h2>
            <p className="text-caption mb-2">
              Formulas use Spring Expression Language (SpEL). Reference other components by their code:
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'HRA (40% of basic)', formula: 'basic * 0.4' },
                { label: 'PF (12% of basic)', formula: 'basic * 0.12' },
                { label: 'ESI (0.75%)', formula: '(basic + hra) * 0.0075' },
              ].map(({ label, formula }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg px-4 py-1.5"
                >
                  <span className="text-caption">{label}:</span>
                  <code className="text-xs text-accent-600 dark:text-accent-400 font-mono">{formula}</code>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Create/Edit modal */}
        <ComponentModal
          opened={modalOpen}
          onClose={() => { setModalOpen(false); setEditTarget(null); }}
          editTarget={editTarget}
        />

        {/* Delete confirm modal */}
        <Modal
          opened={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title="Delete Component"
          size="sm"
        >
          <Stack gap="md">
            <Text size="sm">
              Are you sure you want to delete{' '}
              <strong>{deleteTarget?.name}</strong> ({deleteTarget?.code})?
              Salary structures referencing this code may break.
            </Text>
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                color="red"
                loading={deleteComponent.isPending}
                onClick={confirmDelete}
              >
                Delete
              </Button>
            </Group>
          </Stack>
        </Modal>
      </PermissionGate>
    </AppLayout>
  );
}
