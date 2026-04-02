'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';
import {
  useWorkflowDefinition,
  useCreateWorkflowDefinition,
  useUpdateWorkflowDefinition,
} from '@/lib/hooks/queries/useWorkflows';
import type {
  WorkflowDefinitionRequest,
  WorkflowEntityType,
  WorkflowType,
  ApproverType,
} from '@/lib/types/core/workflow';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Edit,
  Eye,
  GitBranch,
  Plus,
  Save,
  Trash2,
  XCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react';

// ── Constants ────────────────────────────────────────────────────────────────

const ENTITY_TYPE_OPTIONS: { value: WorkflowEntityType; label: string }[] = [
  { value: 'LEAVE_REQUEST', label: 'Leave Request' },
  { value: 'EXPENSE_CLAIM', label: 'Expense Claim' },
  { value: 'TRAVEL_REQUEST', label: 'Travel Request' },
  { value: 'LOAN_REQUEST', label: 'Loan Request' },
  { value: 'ASSET_REQUEST', label: 'Asset Request' },
  { value: 'TIMESHEET', label: 'Timesheet' },
  { value: 'RESIGNATION', label: 'Resignation' },
  { value: 'SALARY_REVISION', label: 'Salary Revision' },
  { value: 'PROMOTION', label: 'Promotion' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'ONBOARDING', label: 'Onboarding' },
  { value: 'OFFBOARDING', label: 'Offboarding' },
  { value: 'DOCUMENT_REQUEST', label: 'Document Request' },
  { value: 'POLICY_ACKNOWLEDGMENT', label: 'Policy Acknowledgment' },
  { value: 'TRAINING_REQUEST', label: 'Training Request' },
  { value: 'REIMBURSEMENT', label: 'Reimbursement' },
  { value: 'OVERTIME', label: 'Overtime' },
  { value: 'SHIFT_CHANGE', label: 'Shift Change' },
  { value: 'WORK_FROM_HOME', label: 'Work From Home' },
  { value: 'RECRUITMENT_OFFER', label: 'Recruitment Offer' },
  { value: 'CUSTOM', label: 'Custom' },
];

const WORKFLOW_TYPE_OPTIONS: { value: WorkflowType; label: string; description: string }[] = [
  { value: 'SEQUENTIAL', label: 'Sequential', description: 'Steps are executed one after another' },
  { value: 'PARALLEL', label: 'Parallel', description: 'All approvals happen simultaneously' },
  { value: 'CONDITIONAL', label: 'Conditional', description: 'Steps are based on rules/conditions' },
  { value: 'HIERARCHICAL', label: 'Hierarchical', description: 'Based on reporting structure' },
  { value: 'HYBRID', label: 'Hybrid', description: 'Mix of sequential and parallel steps' },
];

const APPROVER_TYPE_OPTIONS: { value: ApproverType; label: string }[] = [
  { value: 'REPORTING_MANAGER', label: 'Reporting Manager' },
  { value: 'SKIP_LEVEL_MANAGER', label: 'Skip-Level Manager' },
  { value: 'DEPARTMENT_HEAD', label: 'Department Head' },
  { value: 'HR_MANAGER', label: 'HR Manager' },
  { value: 'FINANCE_MANAGER', label: 'Finance Manager' },
  { value: 'CEO', label: 'CEO' },
  { value: 'ROLE', label: 'Specific Role' },
  { value: 'SPECIFIC_USER', label: 'Specific User' },
  { value: 'ANY_OF_ROLE', label: 'Any of Role' },
  { value: 'COMMITTEE', label: 'Committee' },
  { value: 'CUSTOM_HIERARCHY', label: 'Custom Hierarchy' },
  { value: 'DYNAMIC', label: 'Dynamic (Expression)' },
];

// ── Zod Schema ───────────────────────────────────────────────────────────────

const stepSchema = z.object({
  stepName: z.string().min(1, 'Step name is required'),
  description: z.string().optional(),
  approverType: z.string().min(1, 'Approver type is required') as z.ZodType<ApproverType>,
  roleId: z.string().optional(),
  roleName: z.string().optional(),
  specificUserId: z.string().optional(),
  slaHours: z.coerce.number().min(0).optional(),
  escalationEnabled: z.boolean().optional(),
  escalateAfterHours: z.coerce.number().min(0).optional(),
  commentsRequired: z.boolean().optional(),
  delegationAllowed: z.boolean().optional(),
  isOptional: z.boolean().optional(),
  condition: z.string().optional(),
});

const workflowFormSchema = z.object({
  name: z.string().min(1, 'Workflow name is required').max(200),
  description: z.string().optional(),
  entityType: z.string().min(1, 'Entity type is required') as z.ZodType<WorkflowEntityType>,
  workflowType: z.string().min(1, 'Workflow type is required') as z.ZodType<WorkflowType>,
  defaultSlaHours: z.coerce.number().min(0).optional(),
  escalationEnabled: z.boolean().optional(),
  escalationAfterHours: z.coerce.number().min(0).optional(),
  notifyOnSubmission: z.boolean().optional(),
  notifyOnApproval: z.boolean().optional(),
  notifyOnRejection: z.boolean().optional(),
  notifyOnEscalation: z.boolean().optional(),
  allowParallelApproval: z.boolean().optional(),
  autoApproveEnabled: z.boolean().optional(),
  skipLevelAllowed: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  minAmount: z.coerce.number().min(0).optional().or(z.literal('')),
  maxAmount: z.coerce.number().min(0).optional().or(z.literal('')),
  steps: z.array(stepSchema).min(1, 'At least one approval step is required'),
});

type WorkflowFormData = z.infer<typeof workflowFormSchema>;

// ── Step Status Colors for Pipeline Visualization ────────────────────────────

function getApproverTypeLabel(type: ApproverType): string {
  return APPROVER_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

// ── Pipeline Step Visual ─────────────────────────────────────────────────────

function StepPipelinePreview({
  steps,
}: {
  steps: Array<{ stepName: string; approverType: ApproverType; slaHours?: number }>;
}) {
  if (!steps || steps.length === 0) return null;

  return (
    <div className="flex items-center gap-0 overflow-x-auto py-4 px-2">
      {steps.map((step, idx) => (
        <React.Fragment key={idx}>
          {/* Step node */}
          <div className="flex flex-col items-center flex-shrink-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-accent-500 bg-accent-50 text-sm font-bold text-accent-700 dark:border-accent-400 dark:bg-accent-900/30 dark:text-accent-300">
              {idx + 1}
            </div>
            <p className="mt-2 max-w-[120px] text-center text-xs font-medium text-[var(--text-primary)] truncate">
              {step.stepName || `Step ${idx + 1}`}
            </p>
            <p className="text-2xs text-[var(--text-muted)] truncate max-w-[120px]">
              {getApproverTypeLabel(step.approverType)}
            </p>
            {step.slaHours && step.slaHours > 0 ? (
              <p className="flex items-center gap-0.5 text-2xs text-[var(--text-muted)]">
                <Clock className="h-3 w-3" /> {step.slaHours}h
              </p>
            ) : null}
          </div>
          {/* Connector arrow */}
          {idx < steps.length - 1 && (
            <div className="flex items-center flex-shrink-0 px-1">
              <div className="h-0.5 w-8 bg-accent-300 dark:bg-accent-600" />
              <div className="h-0 w-0 border-l-[6px] border-y-[4px] border-y-transparent border-l-accent-300 dark:border-l-accent-600" />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Main Page Component ──────────────────────────────────────────────────────

export default function WorkflowDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { hasPermission, isReady } = usePermissions();
  const canManage = isReady && hasPermission(Permissions.WORKFLOW_MANAGE);
  const canView = isReady && (hasPermission(Permissions.WORKFLOW_VIEW) || canManage);

  const workflowId = params.id as string;
  const isNew = workflowId === 'new';
  const editFromQuery = searchParams.get('edit') === 'true';
  const [isEditing, setIsEditing] = useState(isNew || editFromQuery);

  const { data: workflow, isLoading } = useWorkflowDefinition(isNew ? '' : workflowId);
  const createMutation = useCreateWorkflowDefinition();
  const updateMutation = useUpdateWorkflowDefinition(workflowId);

  // Form
  const form = useForm<WorkflowFormData>({
    resolver: zodResolver(workflowFormSchema),
    defaultValues: {
      name: '',
      description: '',
      entityType: 'LEAVE_REQUEST' as WorkflowEntityType,
      workflowType: 'SEQUENTIAL' as WorkflowType,
      defaultSlaHours: 48,
      escalationEnabled: false,
      escalationAfterHours: 72,
      notifyOnSubmission: true,
      notifyOnApproval: true,
      notifyOnRejection: true,
      notifyOnEscalation: true,
      allowParallelApproval: false,
      autoApproveEnabled: false,
      skipLevelAllowed: false,
      isDefault: false,
      steps: [
        {
          stepName: 'Manager Approval',
          approverType: 'REPORTING_MANAGER' as ApproverType,
          slaHours: 48,
          escalationEnabled: false,
          commentsRequired: false,
          delegationAllowed: true,
          isOptional: false,
        },
      ],
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'steps',
  });

  // Populate form from loaded workflow
  useEffect(() => {
    if (workflow && !isNew) {
      form.reset({
        name: workflow.name,
        description: workflow.description ?? '',
        entityType: workflow.entityType,
        workflowType: workflow.workflowType,
        defaultSlaHours: workflow.defaultSlaHours,
        escalationEnabled: workflow.escalationEnabled,
        escalationAfterHours: workflow.escalationAfterHours,
        notifyOnSubmission: workflow.notifyOnSubmission,
        notifyOnApproval: workflow.notifyOnApproval,
        notifyOnRejection: workflow.notifyOnRejection,
        notifyOnEscalation: workflow.notifyOnEscalation,
        allowParallelApproval: workflow.allowParallelApproval,
        autoApproveEnabled: workflow.autoApproveEnabled,
        skipLevelAllowed: workflow.skipLevelAllowed,
        isDefault: workflow.isDefault,
        minAmount: workflow.minAmount ?? undefined,
        maxAmount: workflow.maxAmount ?? undefined,
        steps:
          workflow.steps?.map((s) => ({
            stepName: s.stepName,
            description: s.description ?? '',
            approverType: s.approverType,
            roleId: s.roleId ?? '',
            roleName: s.roleName ?? '',
            specificUserId: s.specificUserId ?? '',
            slaHours: s.slaHours ?? 0,
            escalationEnabled: s.escalationEnabled ?? false,
            escalateAfterHours: s.escalateAfterHours ?? 0,
            commentsRequired: s.commentsRequired ?? false,
            delegationAllowed: s.delegationAllowed ?? true,
            isOptional: s.isOptional ?? false,
            condition: s.condition ?? '',
          })) ?? [],
      });
    }
  }, [workflow, isNew, form]);

  const watchedSteps = form.watch('steps');

  const handleSubmit = useCallback(
    async (data: WorkflowFormData) => {
      const payload: WorkflowDefinitionRequest = {
        name: data.name,
        description: data.description || undefined,
        entityType: data.entityType,
        workflowType: data.workflowType,
        defaultSlaHours: data.defaultSlaHours ?? 48,
        escalationEnabled: data.escalationEnabled ?? false,
        escalationAfterHours: data.escalationAfterHours ?? 72,
        notifyOnSubmission: data.notifyOnSubmission ?? true,
        notifyOnApproval: data.notifyOnApproval ?? true,
        notifyOnRejection: data.notifyOnRejection ?? true,
        notifyOnEscalation: data.notifyOnEscalation ?? true,
        allowParallelApproval: data.allowParallelApproval ?? false,
        autoApproveEnabled: data.autoApproveEnabled ?? false,
        skipLevelAllowed: data.skipLevelAllowed ?? false,
        isDefault: data.isDefault ?? false,
        minAmount: typeof data.minAmount === 'number' ? data.minAmount : undefined,
        maxAmount: typeof data.maxAmount === 'number' ? data.maxAmount : undefined,
        steps: data.steps.map((step, idx) => ({
          stepOrder: idx + 1,
          stepName: step.stepName,
          description: step.description || undefined,
          approverType: step.approverType,
          roleId: step.roleId || undefined,
          roleName: step.roleName || undefined,
          specificUserId: step.specificUserId || undefined,
          slaHours: step.slaHours ?? 0,
          escalationEnabled: step.escalationEnabled ?? false,
          escalateAfterHours: step.escalateAfterHours ?? 0,
          commentsRequired: step.commentsRequired ?? false,
          delegationAllowed: step.delegationAllowed ?? true,
          isOptional: step.isOptional ?? false,
          condition: step.condition || undefined,
        })),
      };

      if (isNew) {
        const created = await createMutation.mutateAsync(payload);
        router.push(`/workflows/${created.id}`);
      } else {
        await updateMutation.mutateAsync(payload);
        setIsEditing(false);
      }
    },
    [isNew, createMutation, updateMutation, router]
  );

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Permission check
  if (!canView) {
    return (
      <AppLayout activeMenuItem="workflows">
        <div className="flex h-full items-center justify-center p-8">
          <EmptyState
            title="Access denied"
            description="You do not have permission to view workflow definitions."
            icon={<XCircle className="h-12 w-12 text-danger-500" />}
          />
        </div>
      </AppLayout>
    );
  }

  // Loading state
  if (!isNew && isLoading) {
    return (
      <AppLayout activeMenuItem="workflows">
        <div className="space-y-6 p-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </AppLayout>
    );
  }

  // Not found
  if (!isNew && !workflow && !isLoading) {
    return (
      <AppLayout activeMenuItem="workflows">
        <div className="flex h-full items-center justify-center p-8">
          <EmptyState
            title="Workflow not found"
            description="The requested workflow definition could not be found."
            icon={<AlertTriangle className="h-12 w-12 text-warning-500" />}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="workflows">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="space-y-6 p-6"
      >
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/workflows')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
                {isNew ? 'Create Workflow' : isEditing ? 'Edit Workflow' : workflow?.name}
              </h1>
              {!isNew && !isEditing && workflow?.description && (
                <p className="mt-1 text-body-muted">{workflow.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isNew && !isEditing && canManage && (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
            {isEditing && !isNew && (
              <Button variant="ghost" onClick={() => setIsEditing(false)} disabled={isSaving}>
                Cancel
              </Button>
            )}
          </div>
        </div>

        {/* Read-only View */}
        {!isEditing && workflow && (
          <>
            {/* Info Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <InfoCard label="Entity Type" value={ENTITY_TYPE_OPTIONS.find((o) => o.value === workflow.entityType)?.label ?? workflow.entityType} />
              <InfoCard label="Workflow Type" value={WORKFLOW_TYPE_OPTIONS.find((o) => o.value === workflow.workflowType)?.label ?? workflow.workflowType} />
              <InfoCard
                label="Status"
                value={workflow.isActive ? 'Active' : 'Inactive'}
                valueClassName={workflow.isActive ? 'text-success-600 dark:text-success-400' : 'text-surface-500'}
              />
              <InfoCard label="Version" value={`v${workflow.version}`} />
            </div>

            {/* Pipeline Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-accent-600" />
                  Approval Pipeline ({workflow.totalSteps} {workflow.totalSteps === 1 ? 'step' : 'steps'})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {workflow.steps && workflow.steps.length > 0 ? (
                  <StepPipelinePreview
                    steps={workflow.steps.map((s) => ({
                      stepName: s.stepName,
                      approverType: s.approverType,
                      slaHours: s.slaHours,
                    }))}
                  />
                ) : (
                  <p className="text-body-muted">No steps defined.</p>
                )}
              </CardContent>
            </Card>

            {/* Step Details */}
            {workflow.steps && workflow.steps.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Step Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {workflow.steps.map((step, idx) => (
                    <div
                      key={step.id}
                      className="flex gap-4 rounded-lg border border-[var(--border-main)] bg-[var(--bg-secondary)]/30 p-4"
                    >
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent-100 text-sm font-bold text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
                        {idx + 1}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="font-medium text-[var(--text-primary)]">{step.stepName}</p>
                        {step.description && (
                          <p className="text-caption">{step.description}</p>
                        )}
                        <div className="flex flex-wrap gap-2 pt-1">
                          <span className="inline-flex items-center rounded-full bg-accent-100 px-2 py-0.5 text-xs font-medium text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
                            {getApproverTypeLabel(step.approverType)}
                          </span>
                          {step.roleName && (
                            <span className="inline-flex items-center rounded-full bg-accent-100 px-2 py-0.5 text-xs font-medium text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
                              Role: {step.roleName}
                            </span>
                          )}
                          {step.slaHours && step.slaHours > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-warning-100 px-2 py-0.5 text-xs font-medium text-warning-700 dark:bg-warning-900/30 dark:text-warning-300">
                              <Clock className="h-3 w-3" /> SLA: {step.slaHours}h
                            </span>
                          )}
                          {step.escalationEnabled && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-warning-100 px-2 py-0.5 text-xs font-medium text-warning-700 dark:bg-warning-900/30 dark:text-warning-300">
                              <AlertTriangle className="h-3 w-3" /> Escalation
                            </span>
                          )}
                          {step.commentsRequired && (
                            <span className="inline-flex items-center rounded-full bg-surface-100 px-2 py-0.5 text-xs font-medium text-surface-700 dark:bg-surface-800/30 dark:text-surface-300">
                              Comments required
                            </span>
                          )}
                          {step.isOptional && (
                            <span className="inline-flex items-center rounded-full bg-warning-100 px-2 py-0.5 text-xs font-medium text-warning-700 dark:bg-warning-900/30 dark:text-warning-300">
                              Optional
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <SettingItem label="Default SLA" value={`${workflow.defaultSlaHours}h`} />
                  <SettingItem label="Escalation Enabled" value={workflow.escalationEnabled ? 'Yes' : 'No'} />
                  <SettingItem label="Escalation After" value={`${workflow.escalationAfterHours}h`} />
                  <SettingItem label="Notify on Submission" value={workflow.notifyOnSubmission ? 'Yes' : 'No'} />
                  <SettingItem label="Notify on Approval" value={workflow.notifyOnApproval ? 'Yes' : 'No'} />
                  <SettingItem label="Notify on Rejection" value={workflow.notifyOnRejection ? 'Yes' : 'No'} />
                  <SettingItem label="Parallel Approval" value={workflow.allowParallelApproval ? 'Yes' : 'No'} />
                  <SettingItem label="Auto-Approve" value={workflow.autoApproveEnabled ? 'Yes' : 'No'} />
                  <SettingItem label="Skip-Level Allowed" value={workflow.skipLevelAllowed ? 'Yes' : 'No'} />
                  {workflow.minAmount != null && <SettingItem label="Min Amount" value={`${workflow.minAmount}`} />}
                  {workflow.maxAmount != null && <SettingItem label="Max Amount" value={`${workflow.maxAmount}`} />}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Edit/Create Form */}
        {isEditing && (
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Workflow Name <span className="text-danger-500">*</span>
                    </label>
                    <input
                      {...form.register('name')}
                      placeholder="e.g., Leave Approval - Standard"
                      className="w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] px-4 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                    />
                    {form.formState.errors.name && (
                      <p className="mt-1 text-xs text-danger-500">{form.formState.errors.name.message}</p>
                    )}
                  </div>

                  {/* Entity Type */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Entity Type <span className="text-danger-500">*</span>
                    </label>
                    <select
                      {...form.register('entityType')}
                      className="w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] px-4 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                    >
                      {ENTITY_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    {form.formState.errors.entityType && (
                      <p className="mt-1 text-xs text-danger-500">{form.formState.errors.entityType.message}</p>
                    )}
                  </div>

                  {/* Workflow Type */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Workflow Type <span className="text-danger-500">*</span>
                    </label>
                    <select
                      {...form.register('workflowType')}
                      className="w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] px-4 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                    >
                      {WORKFLOW_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Description
                    </label>
                    <textarea
                      {...form.register('description')}
                      placeholder="Describe what this workflow is used for..."
                      rows={2}
                      className="w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] px-4 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Amount Thresholds */}
            <Card>
              <CardHeader>
                <CardTitle>Conditions (Optional)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Min Amount Threshold
                    </label>
                    <input
                      type="number"
                      {...form.register('minAmount')}
                      placeholder="0"
                      className="w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] px-4 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Max Amount Threshold
                    </label>
                    <input
                      type="number"
                      {...form.register('maxAmount')}
                      placeholder="No limit"
                      className="w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] px-4 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pipeline Preview */}
            {watchedSteps.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-accent-600" />
                    Pipeline Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <StepPipelinePreview
                    steps={watchedSteps.map((s) => ({
                      stepName: s.stepName,
                      approverType: s.approverType,
                      slaHours: typeof s.slaHours === 'number' ? s.slaHours : undefined,
                    }))}
                  />
                </CardContent>
              </Card>
            )}

            {/* Steps Builder */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-accent-600" />
                  Approval Steps
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
                      stepName: '',
                      approverType: 'REPORTING_MANAGER' as ApproverType,
                      slaHours: 48,
                      escalationEnabled: false,
                      commentsRequired: false,
                      delegationAllowed: true,
                      isOptional: false,
                    })
                  }
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add Step
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {form.formState.errors.steps?.root && (
                  <p className="text-sm text-danger-500">{form.formState.errors.steps.root.message}</p>
                )}
                {fields.length === 0 && (
                  <p className="py-8 text-center text-body-muted">
                    No steps added yet. Click &quot;Add Step&quot; to create your first approval step.
                  </p>
                )}
                {fields.map((field, idx) => (
                  <div
                    key={field.id}
                    className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-secondary)]/20 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => move(idx, idx - 1)}
                            aria-label="Move step up"
                            className="rounded p-0.5 text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] disabled:opacity-30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === fields.length - 1}
                            onClick={() => move(idx, idx + 1)}
                            aria-label="Move step down"
                            className="rounded p-0.5 text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] disabled:opacity-30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-100 text-sm font-bold text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
                          {idx + 1}
                        </div>
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          Step {idx + 1}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(idx)}
                        aria-label="Delete step"
                        className="rounded p-1 text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-900/20 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {/* Step Name */}
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                          Step Name <span className="text-danger-500">*</span>
                        </label>
                        <input
                          {...form.register(`steps.${idx}.stepName`)}
                          placeholder="e.g., Manager Approval"
                          className="w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] px-4 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                        />
                        {form.formState.errors.steps?.[idx]?.stepName && (
                          <p className="mt-1 text-xs text-danger-500">
                            {form.formState.errors.steps[idx]?.stepName?.message}
                          </p>
                        )}
                      </div>

                      {/* Approver Type */}
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                          Approver Type <span className="text-danger-500">*</span>
                        </label>
                        <select
                          {...form.register(`steps.${idx}.approverType`)}
                          className="w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] px-4 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                        >
                          {APPROVER_TYPE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Role Name (shown for ROLE / ANY_OF_ROLE) */}
                      {(form.watch(`steps.${idx}.approverType`) === 'ROLE' ||
                        form.watch(`steps.${idx}.approverType`) === 'ANY_OF_ROLE') && (
                        <div>
                          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                            Role Name
                          </label>
                          <input
                            {...form.register(`steps.${idx}.roleName`)}
                            placeholder="e.g., Finance Manager"
                            className="w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] px-4 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                          />
                        </div>
                      )}

                      {/* SLA Hours */}
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                          SLA (hours)
                        </label>
                        <input
                          type="number"
                          {...form.register(`steps.${idx}.slaHours`)}
                          placeholder="48"
                          className="w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] px-4 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                        />
                      </div>

                      {/* Description */}
                      <div className="sm:col-span-2 lg:col-span-2">
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                          Description
                        </label>
                        <input
                          {...form.register(`steps.${idx}.description`)}
                          placeholder="Optional step description"
                          className="w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] px-4 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                        />
                      </div>
                    </div>

                    {/* Toggles */}
                    <div className="mt-4 flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                        <input
                          type="checkbox"
                          {...form.register(`steps.${idx}.escalationEnabled`)}
                          className="h-4 w-4 rounded border-[var(--border-main)] text-accent-600 focus:ring-accent-500"
                        />
                        Escalation
                      </label>
                      <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                        <input
                          type="checkbox"
                          {...form.register(`steps.${idx}.commentsRequired`)}
                          className="h-4 w-4 rounded border-[var(--border-main)] text-accent-600 focus:ring-accent-500"
                        />
                        Comments Required
                      </label>
                      <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                        <input
                          type="checkbox"
                          {...form.register(`steps.${idx}.delegationAllowed`)}
                          className="h-4 w-4 rounded border-[var(--border-main)] text-accent-600 focus:ring-accent-500"
                        />
                        Allow Delegation
                      </label>
                      <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                        <input
                          type="checkbox"
                          {...form.register(`steps.${idx}.isOptional`)}
                          className="h-4 w-4 rounded border-[var(--border-main)] text-accent-600 focus:ring-accent-500"
                        />
                        Optional Step
                      </label>
                    </div>

                    {/* Escalation hours (conditional) */}
                    {form.watch(`steps.${idx}.escalationEnabled`) && (
                      <div className="mt-4 max-w-[200px]">
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                          Escalate After (hours)
                        </label>
                        <input
                          type="number"
                          {...form.register(`steps.${idx}.escalateAfterHours`)}
                          placeholder="72"
                          className="w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] px-4 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Notification & Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Notifications & Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Default SLA (hours)
                    </label>
                    <input
                      type="number"
                      {...form.register('defaultSlaHours')}
                      className="w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] px-4 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Escalation After (hours)
                    </label>
                    <input
                      type="number"
                      {...form.register('escalationAfterHours')}
                      className="w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] px-4 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 text-body-secondary">
                    <input type="checkbox" {...form.register('escalationEnabled')} className="h-4 w-4 rounded border-[var(--border-main)] text-accent-600 focus:ring-accent-500" />
                    Enable Escalation
                  </label>
                  <label className="flex items-center gap-2 text-body-secondary">
                    <input type="checkbox" {...form.register('notifyOnSubmission')} className="h-4 w-4 rounded border-[var(--border-main)] text-accent-600 focus:ring-accent-500" />
                    Notify on Submission
                  </label>
                  <label className="flex items-center gap-2 text-body-secondary">
                    <input type="checkbox" {...form.register('notifyOnApproval')} className="h-4 w-4 rounded border-[var(--border-main)] text-accent-600 focus:ring-accent-500" />
                    Notify on Approval
                  </label>
                  <label className="flex items-center gap-2 text-body-secondary">
                    <input type="checkbox" {...form.register('notifyOnRejection')} className="h-4 w-4 rounded border-[var(--border-main)] text-accent-600 focus:ring-accent-500" />
                    Notify on Rejection
                  </label>
                  <label className="flex items-center gap-2 text-body-secondary">
                    <input type="checkbox" {...form.register('notifyOnEscalation')} className="h-4 w-4 rounded border-[var(--border-main)] text-accent-600 focus:ring-accent-500" />
                    Notify on Escalation
                  </label>
                  <label className="flex items-center gap-2 text-body-secondary">
                    <input type="checkbox" {...form.register('allowParallelApproval')} className="h-4 w-4 rounded border-[var(--border-main)] text-accent-600 focus:ring-accent-500" />
                    Allow Parallel Approval
                  </label>
                  <label className="flex items-center gap-2 text-body-secondary">
                    <input type="checkbox" {...form.register('autoApproveEnabled')} className="h-4 w-4 rounded border-[var(--border-main)] text-accent-600 focus:ring-accent-500" />
                    Auto-Approve Enabled
                  </label>
                  <label className="flex items-center gap-2 text-body-secondary">
                    <input type="checkbox" {...form.register('skipLevelAllowed')} className="h-4 w-4 rounded border-[var(--border-main)] text-accent-600 focus:ring-accent-500" />
                    Skip-Level Allowed
                  </label>
                  <label className="flex items-center gap-2 text-body-secondary">
                    <input type="checkbox" {...form.register('isDefault')} className="h-4 w-4 rounded border-[var(--border-main)] text-accent-600 focus:ring-accent-500" />
                    Set as Default
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex items-center justify-end gap-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => (isNew ? router.push('/workflows') : setIsEditing(false))}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving
                  ? isNew
                    ? 'Creating...'
                    : 'Saving...'
                  : isNew
                    ? 'Create Workflow'
                    : 'Save Changes'}
              </Button>
            </div>
          </form>
        )}
      </motion.div>
    </AppLayout>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function InfoCard({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-secondary)]/30 p-4">
      <p className="text-xs font-medium uppercase text-[var(--text-muted)]">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${valueClassName ?? 'text-[var(--text-primary)]'}`}>
        {value}
      </p>
    </div>
  );
}

function SettingItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="row-between rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] px-4 py-2">
      <span className="text-caption">{label}</span>
      <span className="text-sm font-medium text-[var(--text-primary)]">{value}</span>
    </div>
  );
}
