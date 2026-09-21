'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Gift} from 'lucide-react';
import {BenefitPlan, BenefitPlanRequest, BenefitType} from '@/lib/types/hrms/benefits';
import {useAuth} from '@/lib/hooks/useAuth';
import {Roles, usePermissions} from '@/lib/hooks/usePermissions';
import {EmptyState} from '@/components/ui/EmptyState';
import {Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui/Modal';
import {useAllBenefitPlans, useCreateBenefitPlan, useUpdateBenefitPlan} from '@/lib/hooks/queries';
import {getLocalDateString} from '@/lib/utils/dateUtils';

const ADMIN_ACCESS_ROLES = [Roles.SUPER_ADMIN, Roles.TENANT_ADMIN, Roles.HR_ADMIN, Roles.HR_MANAGER];

const benefitTypes: BenefitType[] = ['HEALTH', 'DENTAL', 'VISION', 'LIFE', 'DISABILITY', 'RETIREMENT', 'FSA', 'HSA', 'OTHER'];

const benefitPlanFormSchema = z.object({
  planCode: z.string().min(1, 'Plan code required'),
  planName: z.string().min(1, 'Plan name required'),
  description: z.string().optional().or(z.literal('')),
  benefitType: z.enum(['HEALTH', 'DENTAL', 'VISION', 'LIFE', 'DISABILITY', 'RETIREMENT', 'FSA', 'HSA', 'OTHER']),
  coverageAmount: z.coerce.number().min(0).default(0),
  employeeContribution: z.coerce.number().min(0).default(0),
  employerContribution: z.coerce.number().min(0).default(0),
  effectiveDate: z.string().min(1, 'Effective date required'),
  expiryDate: z.string().optional().or(z.literal('')),
  eligibilityCriteria: z.string().optional().or(z.literal('')),
});

type BenefitPlanFormData = z.infer<typeof benefitPlanFormSchema>;

const defaultFormValues: BenefitPlanFormData = {
  planCode: '',
  planName: '',
  description: '',
  benefitType: 'HEALTH',
  coverageAmount: 0,
  employeeContribution: 0,
  employerContribution: 0,
  effectiveDate: getLocalDateString(new Date()),
  expiryDate: '',
  eligibilityCriteria: '',
};

export default function BenefitPlansManagementPage() {
  const router = useRouter();
  const {isAuthenticated, hasHydrated} = useAuth();
  const {hasAnyRole, isReady} = usePermissions();
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<BenefitPlan | null>(null);
  const [uiError, setUiError] = useState<string | null>(null);

  const {data: page, isLoading, error: queryError} = useAllBenefitPlans(0, 100);
  const createMutation = useCreateBenefitPlan();
  const updateMutation = useUpdateBenefitPlan();

  const plans = page?.content || [];

  const form = useForm<BenefitPlanFormData>({
    resolver: zodResolver(benefitPlanFormSchema),
    defaultValues: defaultFormValues,
  });

  if (hasHydrated && isReady && isAuthenticated && !hasAnyRole(...ADMIN_ACCESS_ROLES)) {
    router.push('/me/dashboard');
    return null;
  }

  if (hasHydrated && isReady && !isAuthenticated) {
    router.replace('/auth/login');
    return null;
  }

  const handleSubmit = async (data: BenefitPlanFormData) => {
    setUiError(null);

    const submitData: BenefitPlanRequest = {
      planCode: data.planCode,
      planName: data.planName,
      description: data.description || '',
      benefitType: data.benefitType,
      coverageAmount: data.coverageAmount,
      employeeContribution: data.employeeContribution,
      employerContribution: data.employerContribution,
      effectiveDate: data.effectiveDate,
      expiryDate: data.expiryDate || undefined,
      eligibilityCriteria: data.eligibilityCriteria || undefined,
    };

    const onError = (err: unknown) => {
      setUiError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        `Failed to ${editingPlan ? 'update' : 'create'} benefit plan`
      );
    };

    const onSuccess = () => {
      setShowModal(false);
      setEditingPlan(null);
      form.reset(defaultFormValues);
    };

    if (editingPlan) {
      updateMutation.mutate({planId: editingPlan.id, data: submitData}, {onSuccess, onError});
    } else {
      createMutation.mutate(submitData, {onSuccess, onError});
    }
  };

  const handleEdit = (plan: BenefitPlan) => {
    setEditingPlan(plan);
    form.reset({
      planCode: plan.planCode,
      planName: plan.planName,
      description: plan.description || '',
      benefitType: plan.benefitType,
      coverageAmount: plan.coverageAmount || 0,
      employeeContribution: plan.employeeContribution || 0,
      employerContribution: plan.employerContribution || 0,
      effectiveDate: plan.effectiveDate,
      expiryDate: plan.expiryDate || '',
      eligibilityCriteria: plan.eligibilityCriteria || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPlan(null);
    form.reset(defaultFormValues);
  };

  return (
    <div className="page-shell-centered fade-slide-up auth-delay-20 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-xl font-bold">Benefit Plans Management</h1>
            <p className="mt-1 text-body-secondary">Configure and manage benefit plans for your organization</p>
          </div>
          <button
            onClick={() => {
              form.reset(defaultFormValues);
              setEditingPlan(null);
              setShowModal(true);
            }}
            className="btn-primary !h-auto cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
          >
            + Add Benefit Plan
          </button>
        </div>

        {(uiError || queryError) && (
          <div className="mb-4 bg-danger-50 border border-danger-200 text-danger-700 px-4 py-4 rounded relative">
            <span className="block sm:inline">{uiError || (queryError as Error)?.message || 'An error occurred'}</span>
            <button onClick={() => setUiError(null)} className="absolute top-0 bottom-0 right-0 px-4 py-4">
              <span className="text-danger-500 text-xl">&times;</span>
            </button>
          </div>
        )}

        <div className="skeuo-card overflow-hidden">
          <table className="table-aura">
            <thead className="skeuo-table-header">
            <tr>
              <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Code & Name</th>
              <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Type</th>
              <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Coverage</th>
              <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Effective</th>
              <th className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Status</th>
              <th className="px-6 py-2 text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Actions</th>
            </tr>
            </thead>
            <tbody className="bg-[var(--bg-card)] divide-y divide-[var(--border-main)]">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-[var(--text-muted)]">Loading benefit plans...</td>
              </tr>
            ) : plans.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    icon={<Gift className="h-8 w-8"/>}
                    title="No benefit plans configured"
                    description='Click "Add Benefit Plan" to create your first plan.'
                  />
                </td>
              </tr>
            ) : (
              plans.map((plan) => (
                <tr key={plan.id} className="hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-[var(--text-primary)]">{plan.planName}</div>
                    <div className="text-body-muted">{plan.planCode}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">{plan.benefitType}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">
                    {new Intl.NumberFormat('en-IN', {style: 'currency', currency: 'INR', maximumFractionDigits: 0}).format(plan.coverageAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">{plan.effectiveDate}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${plan.isActive ? 'bg-success-100 text-success-800' : 'bg-danger-100 text-danger-800'}`}>
                      {plan.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleEdit(plan)} className="text-accent-700 hover:text-accent-900">
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
            </tbody>
          </table>
        </div>

        <Modal isOpen={showModal} onClose={closeModal} size="lg">
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <ModalHeader onClose={closeModal}>
              {editingPlan ? 'Edit Benefit Plan' : 'Add New Benefit Plan'}
            </ModalHeader>
            <ModalBody className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="plan-code" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Plan Code *</label>
                  <input id="plan-code" type="text" {...form.register('planCode')} className="input-aura" placeholder="HLTH-01"/>
                  {form.formState.errors.planCode && (
                    <p className="mt-1 text-xs text-danger-500">{form.formState.errors.planCode.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="plan-name" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Plan Name *</label>
                  <input id="plan-name" type="text" {...form.register('planName')} className="input-aura" placeholder="Gold Health Plan"/>
                  {form.formState.errors.planName && (
                    <p className="mt-1 text-xs text-danger-500">{form.formState.errors.planName.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="plan-description" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Description</label>
                <textarea id="plan-description" {...form.register('description')} rows={2} className="input-aura" placeholder="Brief description of this plan..."/>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="plan-benefit-type" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Benefit Type *</label>
                  <select id="plan-benefit-type" {...form.register('benefitType')} className="input-aura">
                    {benefitTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="plan-coverage-amount" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Coverage Amount</label>
                  <input id="plan-coverage-amount" type="number" step="1" min="0" {...form.register('coverageAmount')} className="input-aura"/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="plan-employee-contribution" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Employee Contribution</label>
                  <input id="plan-employee-contribution" type="number" step="1" min="0" {...form.register('employeeContribution')} className="input-aura"/>
                </div>
                <div>
                  <label htmlFor="plan-employer-contribution" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Employer Contribution</label>
                  <input id="plan-employer-contribution" type="number" step="1" min="0" {...form.register('employerContribution')} className="input-aura"/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="plan-effective-date" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Effective Date *</label>
                  <input id="plan-effective-date" type="date" {...form.register('effectiveDate')} className="input-aura"/>
                  {form.formState.errors.effectiveDate && (
                    <p className="mt-1 text-xs text-danger-500">{form.formState.errors.effectiveDate.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="plan-expiry-date" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Expiry Date</label>
                  <input id="plan-expiry-date" type="date" {...form.register('expiryDate')} className="input-aura"/>
                </div>
              </div>

              <div>
                <label htmlFor="plan-eligibility" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Eligibility Criteria</label>
                <input id="plan-eligibility" type="text" {...form.register('eligibilityCriteria')} className="input-aura" placeholder="e.g. Grade L3 and above"/>
              </div>

              {/* ponytail: enrollment window fields land once backend exposes
                  enrollmentWindowStart/End on BenefitPlanRequest/Response
                  (see US-2FZK4F7NT000) — slot reserved, disabled until then. */}
              <fieldset className="border-t pt-4" disabled>
                <legend className="text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Open Enrollment Window <span className="text-body-muted">(coming soon — pending backend support)</span>
                </legend>
                <div className="grid grid-cols-2 gap-4 opacity-50">
                  <div>
                    <label htmlFor="plan-enrollment-window-start" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Window Start</label>
                    <input id="plan-enrollment-window-start" type="date" className="input-aura" disabled/>
                  </div>
                  <div>
                    <label htmlFor="plan-enrollment-window-end" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Window End</label>
                    <input id="plan-enrollment-window-end" type="date" className="input-aura" disabled/>
                  </div>
                </div>
              </fieldset>
            </ModalBody>
            <ModalFooter>
              <button
                type="button"
                onClick={closeModal}
                className="btn-secondary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={form.formState.isSubmitting || createMutation.isPending || updateMutation.isPending}
                className="btn-primary !h-auto disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              >
                {form.formState.isSubmitting || createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : editingPlan ? 'Update Plan' : 'Create Plan'}
              </button>
            </ModalFooter>
          </form>
        </Modal>
      </div>
    </div>
  );
}
