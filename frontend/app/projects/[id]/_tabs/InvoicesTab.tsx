'use client';

import React, { useMemo } from 'react';
import { Loader2, Plus } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  ResponsiveTable,
} from '@/components/ui';
import { StatCard } from '@/components/ui/StatCard';
import { usePsaProjectInvoices } from '@/lib/hooks/queries/usePsa';
import { PSAInvoice } from '@/lib/types/hrms/psa';
import { formatCurrency } from '@/lib/utils';

interface InvoicesTabProps {
  projectId: string;
}

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};


const STATUS_BADGE: Record<string, { label: string; variant: 'success' | 'warning' | 'secondary' | 'danger' | 'primary' }> = {
  DRAFT: { label: 'Draft', variant: 'secondary' },
  SENT: { label: 'Sent', variant: 'primary' },
  PARTIALLY_PAID: { label: 'Partially Paid', variant: 'warning' },
  PAID: { label: 'Paid', variant: 'success' },
  OVERDUE: { label: 'Overdue', variant: 'danger' },
  CANCELLED: { label: 'Cancelled', variant: 'secondary' },
};

const getStatusBadge = (status?: string | null) => {
  if (status && STATUS_BADGE[status]) {
    return STATUS_BADGE[status];
  }
  return { label: status ?? 'Unknown', variant: 'secondary' as const };
};

export function InvoicesTab({ projectId }: InvoicesTabProps) {
  const {
    data: invoices = [],
    isLoading: invoicesLoading,
    error: invoicesError,
  } = usePsaProjectInvoices(projectId, !!projectId);

  const invoicesTotal = invoices.length;

  // Calculate stats
  const stats = useMemo(() => {
    const totalAmount = invoices.reduce((sum: number, inv: PSAInvoice) => sum + (inv.totalAmount || 0), 0);
    const paidCount = invoices.filter((inv: PSAInvoice) => inv.status === 'PAID').length;
    const paidAmount = invoices
      .filter((inv: PSAInvoice) => inv.status === 'PAID')
      .reduce((sum: number, inv: PSAInvoice) => sum + (inv.totalAmount || 0), 0);
    const overdueCount = invoices.filter((inv: PSAInvoice) => inv.status === 'OVERDUE').length;

    return {
      totalInvoices: invoicesTotal,
      totalAmount,
      paidAmount,
      paidCount,
      overdueCount,
    };
  }, [invoices, invoicesTotal]);

  const columns = useMemo(() => [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      accessor: (invoice: PSAInvoice) => (
        <span className="font-medium text-[var(--text-primary)]">
          {invoice.invoiceNumber || '—'}
        </span>
      ),
      mobilePriority: 'primary' as const,
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      accessor: (invoice: PSAInvoice) => (
        <span className="text-sm text-[var(--text-secondary)]">
          {formatDate(invoice.dueDate)}
        </span>
      ),
      mobilePriority: 'secondary' as const,
    },
    {
      key: 'amount',
      header: 'Amount',
      accessor: (invoice: PSAInvoice) => (
        <span className="text-sm text-[var(--text-secondary)]">
          {formatCurrency(invoice.totalAmount)}
        </span>
      ),
      mobilePriority: 'secondary' as const,
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (invoice: PSAInvoice) => {
        const badge = getStatusBadge(invoice.status);
        return (
          <Badge variant={badge.variant} size="sm">
            {badge.label}
          </Badge>
        );
      },
      mobilePriority: 'secondary' as const,
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  const invoicesErrorMessage = invoicesError ? (invoicesError instanceof Error ? invoicesError.message : String(invoicesError)) : null;

  if (invoicesLoading && !invoices.length) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-accent-500" />
        </CardContent>
      </Card>
    );
  }

  if (invoicesTotal === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-between py-6">
          <EmptyState
            title="No invoices"
            description="Create an invoice for this project."
          />
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Create Invoice
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Invoices"
          value={stats.totalInvoices.toString()}
        />
        <StatCard
          title="Total Amount"
          value={formatCurrency(stats.totalAmount)}
        />
        <StatCard
          title="Paid Amount"
          value={formatCurrency(stats.paidAmount)}
        />
        <StatCard
          title="Overdue"
          value={stats.overdueCount.toString()}
        />
      </div>

      {/* Invoices Table */}
      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Invoices</h2>
              <p className="text-sm text-[var(--text-muted)]">Billing invoices for this project.</p>
            </div>
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Create Invoice
            </Button>
          </div>

          {invoicesErrorMessage && (
            <div className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-4 text-sm text-danger-700 dark:border-danger-800 dark:bg-danger-900/20 dark:text-danger-400">
              {invoicesErrorMessage}
            </div>
          )}

          <ResponsiveTable
            columns={columns}
            data={invoices}
            keyExtractor={(row) => row.id}
            isLoading={invoicesLoading}
            emptyMessage="No invoices found for this project."
          />
        </CardContent>
      </Card>
    </div>
  );
}
