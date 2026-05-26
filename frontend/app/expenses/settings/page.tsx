'use client';

import {useState} from 'react';
import {AppLayout} from '@/components/layout';
import {Edit2, Plus, Settings, Shield, Tag, ToggleLeft, ToggleRight, Trash2} from 'lucide-react';
import {Controller, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {Checkbox, Drawer} from '@mantine/core';
import {Button, ConfirmDialog, EmptyState, Input, Select, Textarea} from '@/components/ui';
import {Label} from '@/components/ui/Label';
import {
  useAllExpenseCategories,
  useAllExpensePolicies,
  useCreateExpenseCategory,
  useCreateExpensePolicy,
  useDeleteExpenseCategory,
  useToggleExpenseCategory,
  useToggleExpensePolicy,
  useUpdateExpenseCategory,
  useUpdateExpensePolicy,
} from '@/lib/hooks/queries';
import {
  CreateExpenseCategoryRequest,
  CreateExpensePolicyRequest,
  ExpenseCategoryEntity,
  ExpensePolicyEntity
} from '@/lib/types/hrms/expense';

// ─── Category Schema ─────────────────────────────────────────────────────────
const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  maxAmount: z.number({coerce: true}).positive().optional().or(z.literal(0)),
  requiresReceipt: z.boolean(),
  glCode: z.string().max(50).optional(),
  iconName: z.string().max(50).optional(),
  sortOrder: z.number({coerce: true}).int().min(0).optional(),
});
type CategoryFormData = z.infer<typeof categorySchema>;

// ─── Policy Schema ───────────────────────────────────────────────────────────
const policySchema = z.object({
  name: z.string().min(1, 'Name is required').max(150),
  description: z.string().max(500).optional(),
  dailyLimit: z.number({coerce: true}).positive().optional().or(z.literal(0)),
  monthlyLimit: z.number({coerce: true}).positive().optional().or(z.literal(0)),
  yearlyLimit: z.number({coerce: true}).positive().optional().or(z.literal(0)),
  singleClaimLimit: z.number({coerce: true}).positive().optional().or(z.literal(0)),
  requiresPreApproval: z.boolean(),
  preApprovalThreshold: z.number({coerce: true}).positive().optional().or(z.literal(0)),
  receiptRequiredAbove: z.number({coerce: true}).positive().optional().or(z.literal(0)),
  currency: z.string().length(3).optional(),
});
type PolicyFormData = z.infer<typeof policySchema>;

type ActiveTab = 'categories' | 'policies';

export default function ExpenseSettingsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('categories');

  // Categories
  const {data: categoriesData} = useAllExpenseCategories(0, 100);
  const createCategoryMutation = useCreateExpenseCategory();
  const updateCategoryMutation = useUpdateExpenseCategory();
  const toggleCategoryMutation = useToggleExpenseCategory();
  const deleteCategoryMutation = useDeleteExpenseCategory();

  // Policies
  const {data: policiesData} = useAllExpensePolicies(0, 100);
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
    defaultValues: {requiresReceipt: false, sortOrder: 0},
  });

  // Policy form
  const policyForm = useForm<PolicyFormData>({
    resolver: zodResolver(policySchema),
    defaultValues: {requiresPreApproval: false, currency: 'INR'},
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
    categoryForm.reset({requiresReceipt: false, sortOrder: 0});
    setShowCategoryModal(true);
  };

  const onCategorySubmit = (data: CategoryFormData) => {
    const payload = {
      ...data,
      maxAmount: data.maxAmount && data.maxAmount > 0 ? data.maxAmount : undefined,
    } as CreateExpenseCategoryRequest;
    if (editingCategory) {
      updateCategoryMutation.mutate(
        {categoryId: editingCategory.id, data: payload},
        {onSuccess: () => setShowCategoryModal(false)}
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
    policyForm.reset({requiresPreApproval: false, currency: 'INR'});
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
        {policyId: editingPolicy.id, data: payload},
        {onSuccess: () => setShowPolicyModal(false)}
      );
    } else {
      createPolicyMutation.mutate(payload, {
        onSuccess: () => setShowPolicyModal(false),
      });
    }
  };

  const categories = categoriesData?.content || [];
  const policies = policiesData?.content || [];

  return (
    <AppLayout>
      <PermissionGate
        permission={Permissions.EXPENSE_MANAGE}
        fallback={<div className="p-8 text-center text-surface-500">You do not have permission to manage expense
          settings.</div>}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2">
              <Settings className="w-6 h-6"/>
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
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors capitalize cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                  activeTab === tab
                    ? 'bg-[var(--bg-card)] text-surface-900 dark:text-surface-50 shadow-[var(--shadow-card)]'
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
                <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-2">
                  <Tag className="w-5 h-5"/>
                  Expense Categories
                </h2>
                <Button
                  type="button"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4"/>}
                  onClick={openCategoryCreate}
                >
                  Add Category
                </Button>
              </div>
              <div
                className="bg-[var(--bg-input)] border border-surface-200 dark:border-surface-700 rounded-lg divide-y divide-surface-200 dark:divide-surface-700">
                {categories.length === 0 ? (
                  <EmptyState
                    icon={<Tag className="w-8 h-8"/>}
                    title="No expense categories"
                    description="Add categories so employees can classify their claims by type."
                  />
                ) : (
                  categories.map((cat) => (
                    <div key={cat.id} className="px-6 py-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-surface-900 dark:text-surface-50">{cat.name}</p>
                          {!cat.isActive && (
                            <span
                              className="px-1.5 py-0.5 bg-surface-100 text-surface-500 rounded text-xs">Inactive</span>
                          )}
                          {cat.requiresReceipt && (
                            <span className="px-1.5 py-0.5 bg-warning-100 text-warning-700 rounded text-xs">Receipt Required</span>
                          )}
                        </div>
                        {cat.description && <p className="text-sm text-surface-500 mt-0.5">{cat.description}</p>}
                        <div className="flex gap-4 mt-1 text-xs text-surface-400">
                          {cat.glCode && <span>GL: {cat.glCode}</span>}
                          {cat.maxAmount && <span>Max: {cat.maxAmount.toLocaleString()}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleCategoryMutation.mutate({categoryId: cat.id, active: !cat.isActive})}
                          className="p-1.5 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700 rounded transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                          title={cat.isActive ? 'Deactivate' : 'Activate'}
                          aria-label={cat.isActive ? 'Deactivate category' : 'Activate category'}
                        >
                          {cat.isActive ? <ToggleRight className="w-5 h-5 text-success-500"/> :
                            <ToggleLeft className="w-5 h-5"/>}
                        </button>
                        <button
                          onClick={() => openCategoryEdit(cat)}
                          className="p-1.5 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700 rounded transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                          title="Edit"
                          aria-label="Edit category"
                        >
                          <Edit2 className="w-4 h-4"/>
                        </button>
                        <button
                          onClick={() => setDeleteCategoryId(cat.id)}
                          className="p-1.5 text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                          title="Delete"
                          aria-label="Delete category"
                        >
                          <Trash2 className="w-4 h-4"/>
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
                <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-2">
                  <Shield className="w-5 h-5"/>
                  Expense Policies
                </h2>
                <Button
                  type="button"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4"/>}
                  onClick={openPolicyCreate}
                >
                  Add Policy
                </Button>
              </div>
              <div
                className="bg-[var(--bg-input)] border border-surface-200 dark:border-surface-700 rounded-lg divide-y divide-surface-200 dark:divide-surface-700">
                {policies.length === 0 ? (
                  <EmptyState
                    icon={<Shield className="w-8 h-8"/>}
                    title="No expense policies"
                    description="Define spending limits and approval rules to govern expense claims."
                  />
                ) : (
                  policies.map((pol) => (
                    <div key={pol.id} className="px-6 py-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-surface-900 dark:text-surface-50">{pol.name}</p>
                          {!pol.isActive && (
                            <span
                              className="px-1.5 py-0.5 bg-surface-100 text-surface-500 rounded text-xs">Inactive</span>
                          )}
                          {pol.requiresPreApproval && (
                            <span
                              className="px-1.5 py-0.5 bg-accent-100 text-accent-700 rounded text-xs">Pre-Approval</span>
                          )}
                        </div>
                        {pol.description && <p className="text-sm text-surface-500 mt-0.5">{pol.description}</p>}
                        <div className="flex flex-wrap gap-4 mt-1 text-xs text-surface-400">
                          {pol.dailyLimit && <span>Daily: {pol.dailyLimit.toLocaleString()}</span>}
                          {pol.monthlyLimit && <span>Monthly: {pol.monthlyLimit.toLocaleString()}</span>}
                          {pol.yearlyLimit && <span>Yearly: {pol.yearlyLimit.toLocaleString()}</span>}
                          {pol.singleClaimLimit && <span>Per Claim: {pol.singleClaimLimit.toLocaleString()}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => togglePolicyMutation.mutate({policyId: pol.id, active: !pol.isActive})}
                          className="p-1.5 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700 rounded transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                          aria-label={pol.isActive ? 'Deactivate policy' : 'Activate policy'}
                        >
                          {pol.isActive ? <ToggleRight className="w-5 h-5 text-success-500"/> :
                            <ToggleLeft className="w-5 h-5"/>}
                        </button>
                        <button
                          onClick={() => openPolicyEdit(pol)}
                          className="p-1.5 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700 rounded transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                          aria-label="Edit policy"
                        >
                          <Edit2 className="w-4 h-4"/>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Category Drawer (list stays visible behind) */}
          <Drawer
            opened={showCategoryModal}
            onClose={() => setShowCategoryModal(false)}
            position="right"
            size="lg"
            title={editingCategory ? 'Edit Category' : 'New Category'}
          >
            <form onSubmit={categoryForm.handleSubmit(onCategorySubmit)}>
              <div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="expense-category-name" required className="mb-1">Name</Label>
                    <Input
                      id="expense-category-name"
                      {...categoryForm.register('name')}
                      error={categoryForm.formState.errors.name?.message}
                    />
                  </div>
                  <div>
                    <Label htmlFor="expense-category-description" className="mb-1">Description</Label>
                    <Textarea id="expense-category-description" {...categoryForm.register('description')} rows={2}/>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expense-category-max-amount" className="mb-1">Max Amount</Label>
                      <Input id="expense-category-max-amount" type="number" step="0.01" {...categoryForm.register('maxAmount')}/>
                    </div>
                    <div>
                      <Label htmlFor="expense-category-gl-code" className="mb-1">GL Code</Label>
                      <Input id="expense-category-gl-code" {...categoryForm.register('glCode')}/>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expense-category-icon-name" className="mb-1">Icon Name</Label>
                      <Input
                        id="expense-category-icon-name"
                        {...categoryForm.register('iconName')}
                        placeholder="e.g., Plane, Hotel"
                      />
                    </div>
                    <div>
                      <Label htmlFor="expense-category-sort-order" className="mb-1">Sort Order</Label>
                      <Input id="expense-category-sort-order" type="number" {...categoryForm.register('sortOrder')}/>
                    </div>
                  </div>
                  <Controller
                    name="requiresReceipt"
                    control={categoryForm.control}
                    render={({field}) => (
                      <Checkbox
                        id="expense-category-requires-receipt"
                        label="Requires receipt upload"
                        checked={field.value}
                        onChange={(event) => field.onChange(event.currentTarget.checked)}
                      />
                    )}
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-surface-200 dark:border-surface-700">
                <Button type="button" variant="ghost" onClick={() => setShowCategoryModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={createCategoryMutation.isPending || updateCategoryMutation.isPending}>
                  {editingCategory ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </Drawer>

          {/* Policy Drawer (list stays visible behind) */}
          <Drawer
            opened={showPolicyModal}
            onClose={() => setShowPolicyModal(false)}
            position="right"
            size="lg"
            title={editingPolicy ? 'Edit Policy' : 'New Policy'}
          >
            <form onSubmit={policyForm.handleSubmit(onPolicySubmit)}>
              <div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="expense-policy-name" required className="mb-1">Policy Name</Label>
                    <Input
                      id="expense-policy-name"
                      {...policyForm.register('name')}
                      error={policyForm.formState.errors.name?.message}
                    />
                  </div>
                  <div>
                    <Label htmlFor="expense-policy-description" className="mb-1">Description</Label>
                    <Textarea id="expense-policy-description" {...policyForm.register('description')} rows={2}/>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expense-policy-daily-limit" className="mb-1">Daily Limit</Label>
                      <Input id="expense-policy-daily-limit" type="number" step="0.01" {...policyForm.register('dailyLimit')}/>
                    </div>
                    <div>
                      <Label htmlFor="expense-policy-monthly-limit" className="mb-1">Monthly Limit</Label>
                      <Input id="expense-policy-monthly-limit" type="number" step="0.01" {...policyForm.register('monthlyLimit')}/>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expense-policy-yearly-limit" className="mb-1">Yearly Limit</Label>
                      <Input id="expense-policy-yearly-limit" type="number" step="0.01" {...policyForm.register('yearlyLimit')}/>
                    </div>
                    <div>
                      <Label htmlFor="expense-policy-single-claim-limit" className="mb-1">Per Claim Limit</Label>
                      <Input
                        id="expense-policy-single-claim-limit"
                        type="number"
                        step="0.01"
                        {...policyForm.register('singleClaimLimit')}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expense-policy-receipt-required-above" className="mb-1">Receipt Required Above</Label>
                      <Input
                        id="expense-policy-receipt-required-above"
                        type="number"
                        step="0.01"
                        {...policyForm.register('receiptRequiredAbove')}
                      />
                    </div>
                    <div>
                      <Label htmlFor="expense-policy-currency" className="mb-1">Currency</Label>
                      <Select id="expense-policy-currency" {...policyForm.register('currency')}>
                        <option value="INR">INR</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                      </Select>
                    </div>
                  </div>
                  <Controller
                    name="requiresPreApproval"
                    control={policyForm.control}
                    render={({field}) => (
                      <Checkbox
                        id="expense-policy-requires-pre-approval"
                        label="Requires pre-approval for amounts above threshold"
                        checked={field.value}
                        onChange={(event) => field.onChange(event.currentTarget.checked)}
                      />
                    )}
                  />
                  {policyForm.watch('requiresPreApproval') && (
                    <div>
                      <Label htmlFor="expense-policy-pre-approval-threshold" className="mb-1">Pre-Approval Threshold</Label>
                      <Input
                        id="expense-policy-pre-approval-threshold"
                        type="number"
                        step="0.01"
                        {...policyForm.register('preApprovalThreshold')}
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-surface-200 dark:border-surface-700">
                <Button type="button" variant="ghost" onClick={() => setShowPolicyModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={createPolicyMutation.isPending || updatePolicyMutation.isPending}>
                  {editingPolicy ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </Drawer>

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
