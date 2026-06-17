'use client';

import React, {useState} from 'react';
import {DollarSign, Plus, Receipt, X} from 'lucide-react';
import {useQueryClient} from '@tanstack/react-query';
import {AppLayout} from '@/components/layout';
import {Card, CardContent} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {Input} from '@/components/ui/Input';
import {SlidePanel} from '@/components/ui/SlidePanel';
import {useAuth} from '@/lib/hooks/useAuth';
import {
  getGetByEmployeeQueryKey,
  useCreateExpense,
  useGetByEmployee,
} from '@/lib/generated/api/travel-expense-management/travel-expense-management';
import {
  CreateTravelExpenseRequestExpenseType,
  TravelExpenseDtoStatus,
} from '@/lib/generated/api/model';
import type {CreateTravelExpenseRequest, TravelExpenseDto} from '@/lib/generated/api/model';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  PARTIALLY_APPROVED: 'Partial',
  REJECTED: 'Rejected',
  REIMBURSED: 'Reimbursed',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  SUBMITTED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  PARTIALLY_APPROVED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  REJECTED: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  REIMBURSED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const EXPENSE_TYPE_LABELS: Record<string, string> = {
  AIRFARE: 'Airfare',
  TRAIN_FARE: 'Train',
  BUS_FARE: 'Bus',
  CAB_TAXI: 'Cab/Taxi',
  HOTEL: 'Hotel',
  MEALS: 'Meals',
  LOCAL_TRANSPORT: 'Local Transport',
  VISA_FEE: 'Visa',
  TRAVEL_INSURANCE: 'Insurance',
  COMMUNICATION: 'Communication',
  MISCELLANEOUS: 'Misc',
};

type ExpenseForm = {
  travelRequestId: string;
  expenseType: string;
  description: string;
  expenseDate: string;
  amount: string;
  currency: string;
  receiptNumber: string;
  remarks: string;
};

const BLANK: ExpenseForm = {
  travelRequestId: '',
  expenseType: CreateTravelExpenseRequestExpenseType.MEALS,
  description: '',
  expenseDate: '',
  amount: '',
  currency: 'INR',
  receiptNumber: '',
  remarks: '',
};

function ExpensePanel({
  employeeId,
  onClose,
}: {
  employeeId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ExpenseForm>(BLANK);
  const [error, setError] = useState('');

  const set = (k: keyof ExpenseForm, v: string) => setForm(prev => ({...prev, [k]: v}));

  const createMutation = useCreateExpense();

  const handleSave = () => {
    if (!form.expenseDate || !form.amount || !form.travelRequestId) {
      setError('Travel request ID, date and amount are required');
      return;
    }
    if (Number(form.amount) <= 0) {
      setError('Amount must be greater than 0');
      return;
    }
    setError('');
    const data: CreateTravelExpenseRequest = {
      travelRequestId: form.travelRequestId.trim(),
      employeeId,
      expenseType: form.expenseType as CreateTravelExpenseRequest['expenseType'],
      description: form.description.trim() || undefined,
      expenseDate: form.expenseDate,
      amount: Number(form.amount),
      currency: form.currency.trim() || undefined,
      receiptNumber: form.receiptNumber.trim() || undefined,
      remarks: form.remarks.trim() || undefined,
    };
    createMutation.mutate({data}, {
      onSuccess: () => {
        queryClient.invalidateQueries({queryKey: getGetByEmployeeQueryKey(employeeId)});
        onClose();
      },
      onError: () => setError('Failed to submit expense'),
    });
  };

  return (
    <SlidePanel onClose={onClose} title="Add Travel Expense" widthClassName="max-w-md">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold">Add Travel Expense</h2>
          <button type="button" onClick={onClose} aria-label="Close"><X className="w-4 h-4 text-[var(--text-muted)]"/></button>
        </div>

        <div className="space-y-3">
          <div>
            <label htmlFor="travel-expense-request-id" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Travel Request ID *</label>
            <Input id="travel-expense-request-id" value={form.travelRequestId} onChange={e => set('travelRequestId', e.target.value)} className="h-8 text-sm" placeholder="Request ID from your approved travel"/>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="travel-expense-type" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Expense Type</label>
              <select id="travel-expense-type" value={form.expenseType} onChange={e => set('expenseType', e.target.value)} className="input-aura w-full h-8 text-sm">
                {Object.values(CreateTravelExpenseRequestExpenseType).map(t => (
                  <option key={t} value={t}>{EXPENSE_TYPE_LABELS[t] ?? t}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="travel-expense-date" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Date *</label>
              <Input id="travel-expense-date" type="date" value={form.expenseDate} onChange={e => set('expenseDate', e.target.value)} className="h-8 text-sm"/>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label htmlFor="travel-expense-amount" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Amount *</label>
              <Input id="travel-expense-amount" type="number" value={form.amount} onChange={e => set('amount', e.target.value)} className="h-8 text-sm" placeholder="0.00"/>
            </div>
            <div>
              <label htmlFor="travel-expense-currency" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Currency</label>
              <Input id="travel-expense-currency" value={form.currency} onChange={e => set('currency', e.target.value)} className="h-8 text-sm" placeholder="INR"/>
            </div>
          </div>
          <div>
            <label htmlFor="travel-expense-description" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Description</label>
            <Input id="travel-expense-description" value={form.description} onChange={e => set('description', e.target.value)} className="h-8 text-sm" placeholder="Brief description"/>
          </div>
          <div>
            <label htmlFor="travel-expense-receipt-number" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Receipt Number</label>
            <Input id="travel-expense-receipt-number" value={form.receiptNumber} onChange={e => set('receiptNumber', e.target.value)} className="h-8 text-sm" placeholder="INV-12345"/>
          </div>
          <div>
            <label htmlFor="travel-expense-remarks" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Remarks</label>
            <textarea id="travel-expense-remarks" value={form.remarks} onChange={e => set('remarks', e.target.value)} rows={2} className="input-aura w-full text-sm resize-none" placeholder="Optional remarks..."/>
          </div>
          {error && <p className="text-xs text-danger-600">{error}</p>}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={createMutation.isPending} className="flex-1">
              {createMutation.isPending ? 'Submitting…' : 'Submit Expense'}
            </Button>
          </div>
        </div>
      </div>
    </SlidePanel>
  );
}

function ExpenseCard({expense}: {expense: TravelExpenseDto}) {
  const statusCls = STATUS_COLORS[expense.status ?? ''] ?? 'bg-[var(--bg-secondary)] text-[var(--text-muted)]';
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border-main)] bg-[var(--bg-primary)]">
      <div className="w-7 h-7 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center shrink-0">
        <Receipt className="w-3.5 h-3.5 text-[var(--text-muted)]"/>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {EXPENSE_TYPE_LABELS[expense.expenseType ?? ''] ?? expense.expenseType}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${statusCls}`}>
            {STATUS_LABELS[expense.status ?? ''] ?? expense.status}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          {expense.description && <span className="text-xs text-[var(--text-muted)] truncate max-w-40">{expense.description}</span>}
          {expense.expenseDate && <span className="text-[10px] text-[var(--text-muted)]">{expense.expenseDate}</span>}
          {expense.receiptNumber && <span className="text-[10px] text-[var(--text-muted)]">#{expense.receiptNumber}</span>}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-medium text-[var(--text-primary)] flex items-center justify-end gap-0.5">
          <DollarSign className="w-3 h-3 text-[var(--text-muted)]"/>
          {expense.amount != null ? Number(expense.amount).toLocaleString(undefined, {minimumFractionDigits: 2}) : '—'}
        </div>
        {expense.currency && expense.currency !== 'INR' && (
          <div className="text-[10px] text-[var(--text-muted)]">{expense.currency}</div>
        )}
        {expense.approvedAmount != null && expense.approvedAmount !== expense.amount && (
          <div className="text-[10px] text-green-600">Approved: ${expense.approvedAmount}</div>
        )}
      </div>
    </div>
  );
}

export default function TravelExpensesPage() {
  const {isAuthenticated, hasHydrated, user} = useAuth();
  const [showPanel, setShowPanel] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const employeeId = user?.employeeId ?? '';
  const enabled = isAuthenticated && hasHydrated && !!employeeId;

  const {data, isLoading} = useGetByEmployee(
    employeeId,
    {pageable: {page: 0, size: 50}},
    {query: {enabled}}
  );

  const allExpenses: TravelExpenseDto[] = Array.isArray(data)
    ? data
    : ((data as unknown) as {content?: TravelExpenseDto[]})?.content ?? [];

  const expenses = statusFilter === 'ALL'
    ? allExpenses
    : allExpenses.filter(e => e.status === statusFilter);

  const totalPending = allExpenses
    .filter(e => e.status === TravelExpenseDtoStatus.PENDING || e.status === TravelExpenseDtoStatus.SUBMITTED)
    .reduce((sum, e) => sum + (e.amount ?? 0), 0);
  const totalApproved = allExpenses
    .filter(e => e.status === TravelExpenseDtoStatus.APPROVED || e.status === TravelExpenseDtoStatus.REIMBURSED)
    .reduce((sum, e) => sum + (e.approvedAmount ?? e.amount ?? 0), 0);

  return (
    <AppLayout>
      <div className="page-shell fade-slide-up">
        <div className="page-header">
          <div>
            <h1 className="page-title">Travel Expenses</h1>
            <p className="page-subtitle">Track and submit expenses for your approved travel requests.</p>
          </div>
          {isAuthenticated && (
            <Button size="sm" onClick={() => setShowPanel(true)} className="flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5"/>Add Expense
            </Button>
          )}
        </div>

        {(totalPending > 0 || totalApproved > 0) && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-amber-600"/>
                </div>
                <div>
                  <div className="text-xs text-[var(--text-muted)]">Pending</div>
                  <div className="text-base font-semibold text-[var(--text-primary)]">
                    ₹{totalPending.toLocaleString(undefined, {minimumFractionDigits: 2})}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-green-600"/>
                </div>
                <div>
                  <div className="text-xs text-[var(--text-muted)]">Approved</div>
                  <div className="text-base font-semibold text-[var(--text-primary)]">
                    ₹{totalApproved.toLocaleString(undefined, {minimumFractionDigits: 2})}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {['ALL', ...Object.values(TravelExpenseDtoStatus)].map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                statusFilter === s
                  ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                  : 'border-[var(--border-main)] text-[var(--text-secondary)] hover:border-[var(--accent)]'
              }`}
            >
              {s === 'ALL' ? 'All' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-lg bg-[var(--bg-secondary)] animate-pulse"/>)}
          </div>
        ) : expenses.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Receipt className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2"/>
              <p className="text-sm text-[var(--text-muted)]">
                {statusFilter === 'ALL' ? 'No travel expenses yet' : `No ${STATUS_LABELS[statusFilter]?.toLowerCase()} expenses`}
              </p>
              {statusFilter === 'ALL' && (
                <Button size="sm" variant="outline" onClick={() => setShowPanel(true)} className="mt-4">
                  Add First Expense
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {expenses.map(e => <ExpenseCard key={e.id} expense={e}/>)}
          </div>
        )}
      </div>

      {showPanel && employeeId && (
        <ExpensePanel
          employeeId={employeeId}
          onClose={() => setShowPanel(false)}
        />
      )}
    </AppLayout>
  );
}
