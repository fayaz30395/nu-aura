'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/layout';
import { Settings, Tag, Shield, Plus, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';
import { Modal, ModalHeader, ModalBody, ModalFooter, ConfirmDialog } from '@/components/ui';
import {
  useAllExpenseCategories,
  useCreateExpenseCategory,
  useUpdateExpenseCategory,
  useToggleExpenseCategory,
  useDeleteExpenseCategory,
  useAllExpensePolicies,
  useCreateExpensePolicy,
  useUpdateExpensePolicy,
  useToggleExpensePolicy,
} from '@/lib/hooks/queries';
import { ExpenseCategoryEntity, ExpensePolicyEntity, CreateExpenseCategoryRequest, CreateExpensePolicyRequest } from '@/lib/types/expense';

// ─── Category Schema ─────────────────────────────────────────────────────────
const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  maxAmount: z.number({ coerce: true }).positive().optional().or(z.literal(0)),
  requiresReceipt: z.boolean(),
  glCode: z.string().max(50).optional(),
  iconName: z.string().max(50).optional(),
  sortOrder: z.number({ coerce: true }).int().min(0).optional(),
});
type CategoryFormData = z.infer<typeof categorySchema>;

// ─── Policy Schema ───────────────────────────────────────────────────────────
const policySchema = z.object({
  name: z.string().min(1, 'Name is required').max(150),
  description: z.string().max(500).optional(),
  dailyLimit: z.number({ coerce: true }).positive().optional().or(z.literal(0)),
  monthlyLimit: z.number({ coerce: true }).positive().optional().or(z.literal(0)),
  yearlyLimit: z.number({ coerce: true }).positive().optional().or(z.literal(0)),
  singleClaimLimit: z.number({ coerce: true }).positive().optional().or(z.literal(0)),
  requiresPreApproval: z.boolean(),
  preApprovalThreshold: z.number({ coerce: true }).positive().optional().or(z.literal(0)),
  receiptRequiredAbove: z.number({ coerce: true }).positive().optional().or(z.literal(0)),
  currency: z.string().length(3).optional(),
});
type PolicyFormData = z.infer<typeof policySchema>;

type ActiveTab = 'categories' | 'policies';

export default function ExpenseSettingsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('categories');

  // Categories
  const { data: categoriesData } = useAllExpenseCategories(0, 100);
  const createCategoryMutation = useCreateExpenseCategory();
  const updateCategoryMutation = useUpdateExpenseCategory();
  const toggleCategoryMutation = useToggleExpenseCategory();
  const deleteCategoryMutation = useDeleteExpenseCategory();

  // Policies
  const { data: policiesData } = useAllExpensePolicies(0, 100);
  const createPolicyMutation = useCreateExpensePolicy();
  const updatePolicyMutation = useUpdateExpensePolicy();
  const togglePolicyMutation = useToggleExpensePolicy();

  // Category modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategoryEntity | null>(null);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);

  // Policy modal state
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<ExpensePolicyEntity | null>(null);

  // Category form
  const categoryForm = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: { requiresReceipt: false, sortOrder: 0 },
  });

  // Policy form
  const policyForm = useForm<PolicyFormData>({
    resolver: zodResolver(policySchema),
    defaultValues: { requiresPreApproval: false, currency: 'INR' },
  });

  const openCategoryEdit = (cat: ExpenseCategoryEntity) => {
    setEditingCategory(cat);
    categoryForm.reset({
      name: cat.name,
      description: cat.description || '',
      maxAmount: cat.maxAmount || 0,
      requiresReceipt: cat.requiresReceipt,
      glCode: cat.glCode || '',
      iconName: cat.iconName || '',
      sortOrder: cat.sortOrder,
    });
    setShowCategoryModal(true);
  };

  const openCategoryCreate = () => {
    setEditingCategory(null);
    categoryForm.reset({ requiresReceipt: false, sortOrder: 0 });
    setShowCategoryModal(true);
  };

  const onCategorySubmit = (data: CategoryFormData) => {
    const payload = {
      ...data,
      maxAmount: data.maxAmount && data.maxAmount > 0 ? data.maxAmount : undefined,
    } as CreateExpenseCategoryRequest;
    if (editingCategory) {
      updateCategoryMutation.mutate(
        { categoryId: editingCategory.id, data: payload },
        { onSuccess: () => setShowCategoryModal(false) }
      );
    } else {
      createCategoryMutation.mutate(payload, {
        onSuccess: () => setShowCategoryModal(false),
      });
    }
  };

  const openPolicyEdit = (pol: ExpensePolicyEntity) => {
    setEditingPolicy(pol);
    policyForm.reset({
      name: pol.name,
      description: pol.description || '',
      dailyLimit: pol.dailyLimit || 0,
      monthlyLimit: pol.monthlyLimit || 0,
      yearlyLimit: pol.yearlyLimit || 0,
      singleClaimLimit: pol.singleClaimLimit || 0,
      requiresPreApproval: pol.requiresPreApproval,
      preApprovalThreshold: pol.preApprovalThreshold || 0,
      receiptRequiredAbove: pol.receiptRequiredAbove || 0,
      currency: pol.currency || 'INR',
    });
    setShowPolicyModal(true);
  };

  const openPolicyCreate = () => {
    setEditingPolicy(null);
    policyForm.reset({ requiresPreApproval: false, currency: 'INR' });
    setShowPolicyModal(true);
  };

  const onPolicySubmit = (data: PolicyFormData) => {
    const payload = {
      ...data,
      dailyLimit: data.dailyLimit && data.dailyLimit > 0 ? data.dailyLimit : undefined,
      monthlyLimit: data.monthlyLimit && data.monthlyLimit > 0 ? data.monthlyLimit : undefined,
      yearlyLimit: data.yearlyLimit && data.yearlyLimit > 0 ? data.yearlyLimit : undefined,
      singleClaimLimit: data.singleClaimLimit && data.singleClaimLimit > 0 ? data.singleClaimLimit : undefined,
      preApprovalThreshold: data.preApprovalThreshold && data.preApprovalThreshold > 0 ? data.preApprovalThreshold : undefined,
      receiptRequiredAbove: data.receiptRequiredAbove && data.receiptRequiredAbove > 0 ? data.receiptRequiredAbove : undefined,
    } as CreateExpensePolicyRequest;
    if (editingPolicy) {
      updatePolicyMutation.mutate(
        { policyId: editingPolicy.id, data: payload },
        { onSuccess: () => setShowPolicyModal(false) }
      );
    } else {
      createPolicyMutation.mutate(payload, {
        onSuccess: () => setShowPolicyModal(false),
      });
    }
  };

  const categories = categoriesData?.content || [];
  const policies = policiesData?.content || [];

  const inputClass = 'w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-[var(--bg-input)] text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2';

  return (
    <AppLayout>
      <PermissionGate
        permission={Permissions.EXPENSE_MANAGE}
        fallback={<div className="p-8 text-center text-surface-500">You do not have permission to manage expense settings.</div>}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2">
              <Settings className="w-6 h-6" />
              Expense Settings
            </h1>
            <p className="text-surface-500 mt-1">Manage expense categories and policies</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-surface-100 dark:bg-surface-800 p-1 rounded-lg w-fit">
            {(['categories', 'policies'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors capitalize ${
                  activeTab === tab
                    ? 'bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-50 shadow-sm'
                    : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
                }`}
              >
                {tab === 'categories' ? 'Categories' : 'Policies'}
              </button>
            ))}
          </div>

          {/* Categories Tab */}
          {activeTab === 'categories' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-2">
                  <Tag className="w-5 h-5" />
                  Expense Categories
                </h2>
                <button
                  onClick={openCategoryCreate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-700 hover:bg-accent-800 text-white rounded-lg text-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Category
                </button>
              </div>
              <div className="bg-[var(--bg-input)] border border-surface-200 dark:border-surface-700 rounded-lg divide-y divide-surface-200 dark:divide-surface-700">
                {categories.length === 0 ? (
                  <div className="p-6 text-center text-surface-500">No categories configured yet.</div>
                ) : (
                  categories.map((cat) => (
                    <div key={cat.id} className="px-6 py-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-surface-900 dark:text-surface-50">{cat.name}</p>
                          {!cat.isActive && (
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">Inactive</span>
                          )}
                          {cat.requiresReceipt && (
                            <span className="px-1.5 py-0.5 bg-warning-100 text-warning-700 rounded text-xs">Receipt Required</span>
                          )}
                        </div>
                        {cat.description && <p className="text-sm text-surface-500 mt-0.5">{cat.description}</p>}
                        <div className="flex gap-3 mt-1 text-xs text-surface-400">
                          {cat.glCode && <span>GL: {cat.glCode}</span>}
                          {cat.maxAmount && <span>Max: {cat.maxAmount.toLocaleString()}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleCategoryMutation.mutate({ categoryId: cat.id, active: !cat.isActive })}
                          className="p-1.5 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700 rounded transition-colors"
                          title={cat.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {cat.isActive ? <ToggleRight className="w-5 h-5 text-success-500" /> : <ToggleLeft className="w-5 h-5" />}
                        </button>
                        <button
                          onClick={() => openCategoryEdit(cat)}
                          className="p-1.5 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteCategoryId(cat.id)}
                          className="p-1.5 text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Policies Tab */}
          {activeTab === 'policies' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Expense Policies
                </h2>
                <button
                  onClick={openPolicyCreate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-700 hover:bg-accent-800 text-white rounded-lg text-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Policy
                </button>
              </div>
              <div className="bg-[var(--bg-input)] border border-surface-200 dark:border-surface-700 rounded-lg divide-y divide-surface-200 dark:divide-surface-700">
                {policies.length === 0 ? (
                  <div className="p-6 text-center text-surface-500">No policies configured yet.</div>
                ) : (
                  policies.map((pol) => (
                    <div key={pol.id} className="px-6 py-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-surface-900 dark:text-surface-50">{pol.name}</p>
                          {!pol.isActive && (
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">Inactive</span>
                          )}
                          {pol.requiresPreApproval && (
                            <span className="px-1.5 py-0.5 bg-accent-100 text-accent-700 rounded text-xs">Pre-Approval</span>
                          )}
                        </div>
                        {pol.description && <p className="text-sm text-surface-500 mt-0.5">{pol.description}</p>}
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-surface-400">
                          {pol.dailyLimit && <span>Daily: {pol.dailyLimit.toLocaleString()}</span>}
                          {pol.monthlyLimit && <span>Monthly: {pol.monthlyLimit.toLocaleString()}</span>}
                          {pol.yearlyLimit && <span>Yearly: {pol.yearlyLimit.toLocaleString()}</span>}
                          {pol.singleClaimLimit && <span>Per Claim: {pol.singleClaimLimit.toLocaleString()}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => togglePolicyMutation.mutate({ policyId: pol.id, active: !pol.isActive })}
                          className="p-1.5 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700 rounded transition-colors"
                        >
                          {pol.isActive ? <ToggleRight className="w-5 h-5 text-success-500" /> : <ToggleLeft className="w-5 h-5" />}
                        </button>
                        <button
                          onClick={() => openPolicyEdit(pol)}
                          className="p-1.5 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700 rounded transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Category Modal */}
          <Modal isOpen={showCategoryModal} onClose={() => setShowCategoryModal(false)} size="lg">
            <ModalHeader>{editingCategory ? 'Edit Category' : 'New Category'}</ModalHeader>
            <form onSubmit={categoryForm.handleSubmit(onCategorySubmit)}>
              <ModalBody>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Name *</label>
                    <input {...categoryForm.register('name')} className={inputClass} />
                    {categoryForm.formState.errors.name && <p className="text-danger-500 text-sm mt-1">{categoryForm.formState.errors.name.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Description</label>
                    <textarea {...categoryForm.register('description')} rows={2} className={inputClass} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Max Amount</label>
                      <input type="number" step="0.01" {...categoryForm.register('maxAmount')} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">GL Code</label>
                      <input {...categoryForm.register('glCode')} className={inputClass} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Icon Name</label>
                      <input {...categoryForm.register('iconName')} placeholder="e.g., Plane, Hotel" className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Sort Order</label>
                      <input type="number" {...categoryForm.register('sortOrder')} className={inputClass} />
                    </div>
                  </div>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" {...categoryForm.register('requiresReceipt')} className="rounded border-surface-300" />
                    <span className="text-sm text-surface-700 dark:text-surface-300">Requires receipt upload</span>
                  </label>
                </div>
              </ModalBody>
              <ModalFooter>
                <button type="button" onClick={() => setShowCategoryModal(false)} className="px-4 py-2 text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending} className="px-4 py-2 bg-accent-700 hover:bg-accent-800 text-white rounded-lg transition-colors disabled:opacity-50">
                  {editingCategory ? 'Update' : 'Create'}
                </button>
              </ModalFooter>
            </form>
          </Modal>

          {/* Policy Modal */}
          <Modal isOpen={showPolicyModal} onClose={() => setShowPolicyModal(false)} size="lg">
            <ModalHeader>{editingPolicy ? 'Edit Policy' : 'New Policy'}</ModalHeader>
            <form onSubmit={policyForm.handleSubmit(onPolicySubmit)}>
              <ModalBody>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Policy Name *</label>
                    <input {...policyForm.register('name')} className={inputClass} />
                    {policyForm.formState.errors.name && <p className="text-danger-500 text-sm mt-1">{policyForm.formState.errors.name.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Description</label>
                    <textarea {...policyForm.register('description')} rows={2} className={inputClass} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Daily Limit</label>
                      <input type="number" step="0.01" {...policyForm.register('dailyLimit')} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Monthly Limit</label>
                      <input type="number" step="0.01" {...policyForm.register('monthlyLimit')} className={inputClass} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Yearly Limit</label>
                      <input type="number" step="0.01" {...policyForm.register('yearlyLimit')} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Per Claim Limit</label>
                      <input type="number" step="0.01" {...policyForm.register('singleClaimLimit')} className={inputClass} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Receipt Required Above</label>
                      <input type="number" step="0.01" {...policyForm.register('receiptRequiredAbove')} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Currency</label>
                      <select {...policyForm.register('currency')} className={inputClass}>
                        <option value="INR">INR</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                      </select>
                    </div>
                  </div>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" {...policyForm.register('requiresPreApproval')} className="rounded border-surface-300" />
                    <span className="text-sm text-surface-700 dark:text-surface-300">Requires pre-approval for amounts above threshold</span>
                  </label>
                  {policyForm.watch('requiresPreApproval') && (
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Pre-Approval Threshold</label>
                      <input type="number" step="0.01" {...policyForm.register('preApprovalThreshold')} className={inputClass} />
                    </div>
                  )}
                </div>
              </ModalBody>
              <ModalFooter>
                <button type="button" onClick={() => setShowPolicyModal(false)} className="px-4 py-2 text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={createPolicyMutation.isPending || updatePolicyMutation.isPending} className="px-4 py-2 bg-accent-700 hover:bg-accent-800 text-white rounded-lg transition-colors disabled:opacity-50">
                  {editingPolicy ? 'Update' : 'Create'}
                </button>
              </ModalFooter>
            </form>
          </Modal>

          {/* Delete Category Confirm */}
          <ConfirmDialog
            isOpen={!!deleteCategoryId}
            onClose={() => setDeleteCategoryId(null)}
            onConfirm={() => {
              if (deleteCategoryId) {
                deleteCategoryMutation.mutate(deleteCategoryId, {
                  onSuccess: () => setDeleteCategoryId(null),
                });
              }
            }}
            title="Delete Category"
            message="Are you sure? This will soft-delete the category. Existing claims using it will not be affected."
            confirmText="Delete"
            type="danger"
            loading={deleteCategoryMutation.isPending}
          />
        </div>
      </PermissionGate>
    </AppLayout>
  );
}
