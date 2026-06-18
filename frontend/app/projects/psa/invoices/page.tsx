'use client';

import React, {useState} from 'react';
import {CheckCircle, DollarSign, FileText, Plus, X} from 'lucide-react';
import {useQueryClient} from '@tanstack/react-query';
import {AppLayout} from '@/components/layout';
import {Card, CardContent} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {Input} from '@/components/ui/Input';
import {SlidePanel} from '@/components/ui/SlidePanel';
import {useAuth} from '@/lib/hooks/useAuth';
import {usePermissions, Roles} from '@/lib/hooks/usePermissions';
import {
  getGetInvoicesByStatusQueryKey,
  useApproveInvoice,
  useCreateInvoice,
  useGetInvoicesByStatus,
  useUpdateInvoice,
} from '@/lib/generated/api/psa-invoice-controller/psa-invoice-controller';
import {PSAInvoiceStatus} from '@/lib/generated/api/model';
import type {PSAInvoice} from '@/lib/generated/api/model';

type InvoiceStatusKey = typeof PSAInvoiceStatus[keyof typeof PSAInvoiceStatus];

const ADMIN_ROLES = [Roles.SUPER_ADMIN, Roles.TENANT_ADMIN, Roles.HR_ADMIN];

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  PARTIALLY_PAID: 'Partial',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  SENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  PARTIALLY_PAID: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PAID: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  OVERDUE: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  CANCELLED: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500',
};

const fmt = (n?: number) => n != null ? `$${Number(n).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '—';

type FormState = {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  totalHours: string;
  billableAmount: string;
  taxAmount: string;
  notes: string;
  status: string;
};

const BLANK: FormState = {
  invoiceNumber: '',
  invoiceDate: '',
  dueDate: '',
  billingPeriodStart: '',
  billingPeriodEnd: '',
  totalHours: '',
  billableAmount: '',
  taxAmount: '',
  notes: '',
  status: PSAInvoiceStatus.DRAFT,
};

function toForm(inv: PSAInvoice): FormState {
  return {
    invoiceNumber: inv.invoiceNumber ?? '',
    invoiceDate: inv.invoiceDate ?? '',
    dueDate: inv.dueDate ?? '',
    billingPeriodStart: inv.billingPeriodStart ?? '',
    billingPeriodEnd: inv.billingPeriodEnd ?? '',
    totalHours: inv.totalHours != null ? String(inv.totalHours) : '',
    billableAmount: inv.billableAmount != null ? String(inv.billableAmount) : '',
    taxAmount: inv.taxAmount != null ? String(inv.taxAmount) : '',
    notes: inv.notes ?? '',
    status: inv.status ?? PSAInvoiceStatus.DRAFT,
  };
}

function InvoicePanel({
  invoice,
  activeStatus,
  onClose,
}: {
  invoice: PSAInvoice | null;
  activeStatus: InvoiceStatusKey;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(invoice ? toForm(invoice) : BLANK);
  const [error, setError] = useState('');

  const set = (k: keyof FormState, v: string) => setForm(prev => ({...prev, [k]: v}));

  const invalidate = () =>
    queryClient.invalidateQueries({queryKey: getGetInvoicesByStatusQueryKey(activeStatus)});

  const createMutation = useCreateInvoice();
  const updateMutation = useUpdateInvoice();

  const handleSave = () => {
    if (!form.invoiceNumber.trim()) {
      setError('Invoice number is required');
      return;
    }
    setError('');
    const data: PSAInvoice = {
      invoiceNumber: form.invoiceNumber.trim(),
      invoiceDate: form.invoiceDate || undefined,
      dueDate: form.dueDate || undefined,
      billingPeriodStart: form.billingPeriodStart || undefined,
      billingPeriodEnd: form.billingPeriodEnd || undefined,
      totalHours: form.totalHours ? Number(form.totalHours) : undefined,
      billableAmount: form.billableAmount ? Number(form.billableAmount) : undefined,
      taxAmount: form.taxAmount ? Number(form.taxAmount) : undefined,
      notes: form.notes.trim() || undefined,
      status: form.status as PSAInvoice['status'],
    };
    const onSuccess = () => {invalidate(); onClose();};
    const onError = () => setError('Failed to save invoice');
    if (invoice?.id) {
      updateMutation.mutate({id: invoice.id, data}, {onSuccess, onError});
    } else {
      createMutation.mutate({data}, {onSuccess, onError});
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const total = (Number(form.billableAmount) || 0) + (Number(form.taxAmount) || 0);

  return (
    <SlidePanel onClose={onClose} title={invoice ? 'Edit Invoice' : 'New Invoice'} widthClassName="max-w-md">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold">{invoice ? 'Edit Invoice' : 'New Invoice'}</h2>
          <button type="button" onClick={onClose} aria-label="Close"><X className="w-4 h-4 text-[var(--text-muted)]"/></button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="invoice-number" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Invoice # *</label>
              <Input id="invoice-number" value={form.invoiceNumber} onChange={e => set('invoiceNumber', e.target.value)} className="h-8 text-sm" placeholder="INV-001"/>
            </div>
            <div>
              <label htmlFor="invoice-status" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Status</label>
              <select id="invoice-status" value={form.status} onChange={e => set('status', e.target.value)} className="input-aura w-full h-8 text-sm">
                {Object.values(PSAInvoiceStatus).map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="invoice-date" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Invoice Date</label>
              <Input id="invoice-date" type="date" value={form.invoiceDate} onChange={e => set('invoiceDate', e.target.value)} className="h-8 text-sm"/>
            </div>
            <div>
              <label htmlFor="invoice-due-date" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Due Date</label>
              <Input id="invoice-due-date" type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} className="h-8 text-sm"/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="invoice-period-start" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Period Start</label>
              <Input id="invoice-period-start" type="date" value={form.billingPeriodStart} onChange={e => set('billingPeriodStart', e.target.value)} className="h-8 text-sm"/>
            </div>
            <div>
              <label htmlFor="invoice-period-end" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Period End</label>
              <Input id="invoice-period-end" type="date" value={form.billingPeriodEnd} onChange={e => set('billingPeriodEnd', e.target.value)} className="h-8 text-sm"/>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label htmlFor="invoice-hours" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Hours</label>
              <Input id="invoice-hours" type="number" value={form.totalHours} onChange={e => set('totalHours', e.target.value)} className="h-8 text-sm" placeholder="0"/>
            </div>
            <div>
              <label htmlFor="invoice-amount" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Amount</label>
              <Input id="invoice-amount" type="number" value={form.billableAmount} onChange={e => set('billableAmount', e.target.value)} className="h-8 text-sm" placeholder="0.00"/>
            </div>
            <div>
              <label htmlFor="invoice-tax" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Tax</label>
              <Input id="invoice-tax" type="number" value={form.taxAmount} onChange={e => set('taxAmount', e.target.value)} className="h-8 text-sm" placeholder="0.00"/>
            </div>
          </div>
          {(form.billableAmount || form.taxAmount) ? (
            <div className="flex justify-between text-xs px-1">
              <span className="text-[var(--text-muted)]">Total</span>
              <span className="font-medium text-[var(--text-primary)]">{fmt(total)}</span>
            </div>
          ) : null}
          <div>
            <label htmlFor="invoice-notes" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Notes</label>
            <textarea id="invoice-notes" value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className="input-aura w-full text-sm resize-none" placeholder="Optional notes..."/>
          </div>
          {error && <p className="text-xs text-danger-600">{error}</p>}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={isPending} className="flex-1">
              {isPending ? 'Saving…' : 'Save Invoice'}
            </Button>
          </div>
        </div>
      </div>
    </SlidePanel>
  );
}

function InvoiceRow({invoice, isAdmin, onEdit, onApprove}: {
  invoice: PSAInvoice;
  isAdmin: boolean;
  onEdit: () => void;
  onApprove: () => void;
}) {
  const statusCls = STATUS_COLORS[invoice.status ?? ''] ?? 'bg-[var(--bg-secondary)] text-[var(--text-muted)]';
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border-main)] hover:border-[var(--accent)] transition-colors bg-[var(--bg-primary)]">
      <div className="w-7 h-7 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center shrink-0">
        <FileText className="w-3.5 h-3.5 text-[var(--text-muted)]"/>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-[var(--text-primary)]">{invoice.invoiceNumber}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${statusCls}`}>
            {STATUS_LABELS[invoice.status ?? ''] ?? invoice.status}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          {invoice.invoiceDate && <span className="text-[10px] text-[var(--text-muted)]">{invoice.invoiceDate}</span>}
          {invoice.dueDate && <span className="text-[10px] text-[var(--text-muted)]">Due: {invoice.dueDate}</span>}
          {invoice.totalHours != null && <span className="text-[10px] text-[var(--text-secondary)]">{invoice.totalHours}h</span>}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-0.5">
          <DollarSign className="w-3 h-3 text-[var(--text-muted)]"/>
          {invoice.totalAmount != null ? Number(invoice.totalAmount).toLocaleString(undefined, {minimumFractionDigits: 2}) : '—'}
        </div>
        {invoice.billableAmount != null && <div className="text-[10px] text-[var(--text-muted)]">+{fmt(invoice.taxAmount ?? 0)} tax</div>}
      </div>
      {isAdmin && (
        <div className="flex items-center gap-1 shrink-0">
          {invoice.status === PSAInvoiceStatus.DRAFT && (
            <button type="button" onClick={onApprove} title="Mark as Sent" className="w-7 h-7 flex items-center justify-center text-[var(--text-muted)] hover:text-green-600 rounded hover:bg-[var(--bg-secondary)]">
              <CheckCircle className="w-3.5 h-3.5"/>
            </button>
          )}
          <button type="button" onClick={onEdit} className="text-[10px] px-2 py-1 rounded border border-[var(--border-main)] text-[var(--text-secondary)] hover:border-[var(--accent)]">
            Edit
          </button>
        </div>
      )}
    </div>
  );
}

export default function PSAInvoicesPage() {
  const {isAuthenticated, hasHydrated} = useAuth();
  const {hasAnyRole, isReady} = usePermissions();
  const queryClient = useQueryClient();
  const [activeStatus, setActiveStatus] = useState<InvoiceStatusKey>(PSAInvoiceStatus.DRAFT);
  const [panel, setPanel] = useState<PSAInvoice | null | 'new'>(null);

  const isAdmin = isReady && hasAnyRole(...ADMIN_ROLES);
  const enabled = isAuthenticated && hasHydrated;

  const {data: invoices, isLoading} = useGetInvoicesByStatus(
    activeStatus,
    {query: {enabled}}
  );

  const approveMutation = useApproveInvoice();
  const handleApprove = (id: string) => {
    approveMutation.mutate({id}, {
      onSuccess: () => queryClient.invalidateQueries({queryKey: getGetInvoicesByStatusQueryKey(activeStatus)}),
    });
  };

  const list: PSAInvoice[] = Array.isArray(invoices) ? invoices : [];

  if (hasHydrated && isAuthenticated && isReady && !hasAnyRole(...ADMIN_ROLES)) {
    return null;
  }

  return (
    <AppLayout
      activeMenuItem="psa-invoices"
      breadcrumbs={[
        {label: 'Projects', href: '/projects'},
        {label: 'PSA', href: '/projects/psa'},
        {label: 'Invoices'},
      ]}
    >
      <div className="page-shell fade-slide-up">
        <div className="page-header">
          <div>
            <h1 className="page-title">PSA Invoices</h1>
            <p className="page-subtitle">Professional services invoices and billing management.</p>
          </div>
          {isAdmin && (
            <Button size="sm" onClick={() => setPanel('new')} className="flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5"/>New Invoice
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {Object.values(PSAInvoiceStatus).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setActiveStatus(s)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                activeStatus === s
                  ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                  : 'border-[var(--border-main)] text-[var(--text-secondary)] hover:border-[var(--accent)]'
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-lg bg-[var(--bg-secondary)] animate-pulse"/>)}
          </div>
        ) : list.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <FileText className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2"/>
              <p className="text-sm text-[var(--text-muted)]">No {STATUS_LABELS[activeStatus].toLowerCase()} invoices</p>
              {isAdmin && activeStatus === PSAInvoiceStatus.DRAFT && (
                <Button size="sm" variant="outline" onClick={() => setPanel('new')} className="mt-4">
                  Create Invoice
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {list.map(inv => (
              <InvoiceRow
                key={inv.id}
                invoice={inv}
                isAdmin={isAdmin}
                onEdit={() => setPanel(inv)}
                onApprove={() => inv.id && handleApprove(inv.id)}
              />
            ))}
          </div>
        )}
      </div>

      {panel !== null && (
        <InvoicePanel
          invoice={panel === 'new' ? null : panel}
          activeStatus={activeStatus}
          onClose={() => setPanel(null)}
        />
      )}
    </AppLayout>
  );
}
