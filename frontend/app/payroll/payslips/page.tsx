'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/layout';
import { Payslip } from '@/lib/types/payroll';
import { PayslipCard } from '@/components/payroll/PayslipCard';
import { Button } from '@/components/ui/Button';
import { Download, Search } from 'lucide-react';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';
import { usePayslips } from '@/lib/hooks/queries/usePayroll';
import { payrollService } from '@/lib/services/payroll.service';

type PayslipStatus = 'ALL' | 'DRAFT' | 'FINALIZED' | 'PAID' | 'PENDING';

export default function PayslipsPage() {
  const { hasPermission, isReady: permReady } = usePermissions();

  // Filters
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().substring(0, 7)
  );
  const [selectedYear, setSelectedYear] = useState<string>(
    new Date().getFullYear().toString()
  );
  const [statusFilter, setStatusFilter] = useState<PayslipStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 12;

  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadLoading, setDownloadLoading] = useState(false);

  const { data: response, isLoading: loading, error: fetchError } = usePayslips(currentPage, pageSize);

  // RBAC guard — all hooks declared above; safe to return null after them
  if (!permReady || !hasPermission(Permissions.PAYROLL_VIEW)) {
    return null;
  }
  const payslips = response?.content || [];
  const totalPages = response?.totalPages || 0;
  const totalElements = response?.totalElements || 0;

  const handleDownloadPdf = async (payslip: Payslip) => {
    try {
      setDownloadLoading(true);
      const blob = await payrollService.downloadPayslipPdf(payslip.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payslip-${payslip.employeeName}-${payslip.paymentDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setDownloadError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to download payslip');
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleBulkDownload = async () => {
    try {
      setDownloadLoading(true);
      setDownloadError(null);
      for (const payslip of filteredPayslips) {
        await handleDownloadPdf(payslip);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch {
      setDownloadError('Failed to download some payslips');
    } finally {
      setDownloadLoading(false);
    }
  };

  // Filter payslips based on search and filters
  const filteredPayslips = payslips.filter((payslip) => {
    const payslipMonth = payslip.paymentDate.substring(0, 7);
    const monthMatch = selectedMonth === '' || payslipMonth === selectedMonth;
    const statusMatch = statusFilter === 'ALL' || payslip.status === statusFilter;
    const searchMatch =
      searchQuery === '' ||
      (payslip.employeeName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (payslip.payrollRunName?.toLowerCase() || '').includes(searchQuery.toLowerCase());

    return monthMatch && statusMatch && searchMatch;
  });

  // Generate month options for the last 12 months
  const getMonthOptions = () => {
    const options = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const value = date.toISOString().substring(0, 7);
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      options.push({ value, label });
    }
    return options;
  };

  return (
    <AppLayout activeMenuItem="payroll">
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-[var(--text-primary)] skeuo-emboss">
                  Payslips
                </h1>
                <p className="text-[var(--text-secondary)] mt-2 skeuo-deboss">
                  View and download employee payslips
                </p>
              </div>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  leftIcon={<Download className="h-4 w-4" />}
                  onClick={handleBulkDownload}
                  disabled={loading || downloadLoading || filteredPayslips.length === 0}
                >
                  Download All
                </Button>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {(fetchError || downloadError) && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
              {downloadError ?? fetchError?.message ?? 'An error occurred'}
              <button
                onClick={() => setDownloadError(null)}
                className="ml-4 text-sm underline hover:no-underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Filters */}
          <div className="mb-6 skeuo-card rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Employee name..."
                    className="input-aura w-full pl-10 pr-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Month Filter */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Month
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="input-aura w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All Months</option>
                  {getMonthOptions().map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Filter */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="input-aura w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All Years</option>
                  {[2024, 2023, 2022, 2021, 2020].map(year => (
                    <option key={year} value={year.toString()}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as PayslipStatus)}
                  className="input-aura w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="ALL">All Status</option>
                  <option value="DRAFT">Draft</option>
                  <option value="FINALIZED">Finalized</option>
                  <option value="PENDING">Pending</option>
                  <option value="PAID">Paid</option>
                </select>
              </div>
            </div>

            {/* Results count */}
            <div className="mt-4 pt-4 border-t border-[var(--border-main)]">
              <p className="text-sm text-[var(--text-secondary)]">
                Showing {filteredPayslips.length} of {totalElements} payslips
              </p>
            </div>
          </div>

          {/* Payslips Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
            </div>
          ) : filteredPayslips.length === 0 ? (
            <div className="card-aura rounded-lg p-12 text-center">
              <div className="text-[var(--text-secondary)] mb-4">
                No payslips found for the selected filters
              </div>
              <p className="text-sm text-[var(--text-muted)]">
                Try adjusting your filters or check back later
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPayslips.map((payslip) => (
                <PayslipCard
                  key={payslip.id}
                  payslip={payslip}
                  onDownload={() => handleDownloadPdf(payslip)}
                  loading={loading}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                disabled={currentPage === 0 || loading}
              >
                Previous
              </Button>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    disabled={loading}
                    className="min-w-[40px]"
                  >
                    {page + 1}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                disabled={currentPage >= totalPages - 1 || loading}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
