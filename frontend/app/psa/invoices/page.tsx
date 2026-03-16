'use client';

import { AppLayout } from '@/components/layout';
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ResponsiveTable, TablePagination, Column } from '@/components/ui/ResponsiveTable';
import { useRouter } from 'next/navigation';
import { PSAInvoice, InvoiceStatus } from '@/lib/types/psa';
import { usePsaInvoices } from '@/lib/hooks/queries/usePsa';
import { Plus, MoreVertical, FileText, Send, Download, AlertCircle, DollarSign, Clock } from 'lucide-react';

const ITEMS_PER_PAGE = 10;

export default function PsaInvoicesPage() {
  const router = useRouter();
  const { data: invoices = [], isLoading, error } = usePsaInvoices();
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(ITEMS_PER_PAGE);
  const [showActions, setShowActions] = useState<string | null>(null);

  // Calculate pagination
  const paginatedInvoices = useMemo(() => {
    const start = currentPage * pageSize;
    return invoices.slice(start, start + pageSize);
  }, [invoices, currentPage, pageSize]);

  const totalPages = Math.ceil(invoices.length / pageSize);

  // Calculate stats
  const stats = useMemo(() => {
    const total = invoices.length;
    const totalAmount = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const paidAmount = invoices
      .filter((inv) => inv.status === InvoiceStatus.PAID)
      .reduce((sum, inv) => sum + inv.totalAmount, 0);
    const overdueCount = invoices.filter((inv) => inv.status === InvoiceStatus.OVERDUE).length;

    return {
      total,
      totalAmount,
      paidAmount,
      overdueCount,
    };
  }, [invoices]);

  // Status badge configuration
  const getStatusBadge = (status: InvoiceStatus) => {
    const config: Record<InvoiceStatus, { variant: any; label: string }> = {
      [InvoiceStatus.PAID]: { variant: 'success', label: 'Paid' },
      [InvoiceStatus.OVERDUE]: { variant: 'danger', label: 'Overdue' },
      [InvoiceStatus.SENT]: { variant: 'info', label: 'Sent' },
      [InvoiceStatus.DRAFT]: { variant: 'default', label: 'Draft' },
      [InvoiceStatus.PARTIALLY_PAID]: { variant: 'warning', label: 'Partially Paid' },
      [InvoiceStatus.CANCELLED]: { variant: 'danger', label: 'Cancelled' },
    };

    const { variant, label } = config[status] || { variant: 'default', label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  // Format client ID - show first 8 chars and last 4 chars
  const formatClientId = (clientId: string) => {
    if (clientId.length <= 12) return clientId;
    return `${clientId.substring(0, 8)}...${clientId.substring(clientId.length - 4)}`;
  };

  // Table columns
  const columns: Column<PSAInvoice>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      accessor: (row) => (
        <div>
          <div className="font-medium text-[var(--text-primary)]">{row.invoiceNumber}</div>
          <div className="text-xs text-[var(--text-muted)]">Due: {row.dueDate}</div>
        </div>
      ),
      mobilePriority: 'primary',
      sortable: true,
    },
    {
      key: 'clientId',
      header: 'Client ID',
      accessor: (row) => (
        <div className="text-sm text-[var(--text-secondary)]">
          {formatClientId(row.clientId)}
        </div>
      ),
      mobilePriority: 'secondary',
      mobileLabel: 'Client',
    },
    {
      key: 'totalAmount',
      header: 'Amount',
      accessor: (row) => (
        <div className="font-medium text-[var(--text-primary)]">
          {formatCurrency(row.totalAmount)}
        </div>
      ),
      mobilePriority: 'secondary',
      sortable: true,
      width: 'w-28',
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row) => getStatusBadge(row.status),
      mobilePriority: 'secondary',
      sortable: true,
      width: 'w-32',
    },
  ];

  // Row actions dropdown
  const renderRowActions = (invoice: PSAInvoice) => {
    const isOpen = showActions === invoice.id;

    return (
      <div className="relative">
        <button
          onClick={() => setShowActions(isOpen ? null : invoice.id)}
          className="p-2 rounded-lg hover:bg-[var(--bg-surface)] transition-colors text-[var(--text-secondary)]"
          aria-label="Row actions"
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-1 w-48 bg-[var(--bg-card)] border border-surface-200 dark:border-surface-700 rounded-lg shadow-lg z-10" data-dropdown-menu>
            <button
              onClick={() => {
                router.push(`/psa/invoices/${invoice.id}`);
                setShowActions(null);
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--bg-surface)] flex items-center gap-2 first:rounded-t-lg transition-colors text-[var(--text-secondary)]"
            >
              <FileText className="h-4 w-4" />
              View Details
            </button>
            <button
              onClick={() => {
                // TODO: Implement PDF download
                setShowActions(null);
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--bg-surface)] flex items-center gap-2 transition-colors text-[var(--text-secondary)]"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>
            {invoice.status === InvoiceStatus.DRAFT && (
              <button
                onClick={() => {
                  // TODO: Implement send to client
                  setShowActions(null);
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--bg-surface)] flex items-center gap-2 last:rounded-b-lg transition-colors text-[var(--text-secondary)]"
              >
                <Send className="h-4 w-4" />
                Send to Client
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Close dropdown if click is outside any dropdown menu
      if (!target.closest('[data-dropdown-menu]')) {
        setShowActions(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <AppLayout>
      <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">Invoices</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Manage client billing and payments
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => router.push('/psa/invoices/new')}
          >
            Create Invoice
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <Card variant="bordered" padding="md" className="border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950/20">
            <CardContent className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-danger-600 dark:text-danger-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-danger-900 dark:text-danger-100">Failed to load invoices</h3>
                <p className="text-sm text-danger-700 dark:text-danger-300 mt-1">
                  There was an error loading your invoices. Please try refreshing the page.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        {!error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Invoices"
              value={stats.total}
              icon={<FileText className="h-5 w-5" />}
              variant="default"
              size="compact"
            />
            <StatCard
              title="Total Amount"
              value={formatCurrency(stats.totalAmount)}
              icon={<DollarSign className="h-5 w-5" />}
              variant="primary"
              size="compact"
            />
            <StatCard
              title="Paid Amount"
              value={formatCurrency(stats.paidAmount)}
              icon={<FileText className="h-5 w-5" />}
              variant="success"
              size="compact"
            />
            <StatCard
              title="Overdue"
              value={stats.overdueCount}
              icon={<Clock className="h-5 w-5" />}
              variant="destructive"
              size="compact"
              trend={stats.overdueCount > 0 ? { value: stats.overdueCount, isPositive: false } : undefined}
            />
          </div>
        )}

        {/* Table Card */}
        <Card variant="default" padding="none">
          <CardHeader className="border-b border-surface-200 dark:border-surface-700">
            <CardTitle>Invoice List</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Table */}
            <div className="overflow-x-auto">
              <ResponsiveTable
                columns={columns}
                data={paginatedInvoices}
                keyExtractor={(inv) => inv.id}
                isLoading={isLoading}
                emptyMessage="No invoices found. Create your first invoice to get started."
                emptyIcon={<FileText className="h-8 w-8 text-surface-400" />}
                renderRowActions={renderRowActions}
                className="w-full"
              />
            </div>

            {/* Pagination */}
            {!isLoading && invoices.length > 0 && (
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={invoices.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[10, 20, 50]}
              />
            )}

            {/* Empty State - only show if no loading, no error, and no invoices */}
            {!isLoading && !error && invoices.length === 0 && (
              <div className="py-8">
                <EmptyState
                  icon={<FileText className="h-12 w-12" />}
                  title="No invoices yet"
                  description="Get started by creating your first invoice. You can manage billing and track payments all in one place."
                  actionLabel="Create Invoice"
                  onAction={() => router.push('/psa/invoices/new')}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
