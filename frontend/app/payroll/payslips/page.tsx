'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout';
import { payrollService } from '@/lib/services/payroll.service';
import { Payslip } from '@/lib/types/payroll';
import { PayslipCard } from '@/components/payroll/PayslipCard';
import { Button } from '@/components/ui/Button';
import { Download, Filter, Search } from 'lucide-react';

type PayslipStatus = 'ALL' | 'DRAFT' | 'FINALIZED' | 'PAID' | 'PENDING';

export default function PayslipsPage() {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 12;

  useEffect(() => {
    loadPayslips();
  }, [currentPage, selectedMonth, selectedYear, statusFilter]);

  const loadPayslips = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await payrollService.getAllPayslips(currentPage, pageSize);
      setPayslips(response.content);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to load payslips');
      console.error('Error loading payslips:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async (payslip: Payslip) => {
    try {
      setLoading(true);
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
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to download payslip');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDownload = async () => {
    try {
      setLoading(true);
      setError(null);

      for (const payslip of filteredPayslips) {
        await handleDownloadPdf(payslip);
        // Add a small delay to avoid overwhelming the browser
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (err: unknown) {
      setError('Failed to download some payslips');
    } finally {
      setLoading(false);
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
                <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-50">
                  Payslips
                </h1>
                <p className="text-surface-600 dark:text-surface-400 mt-2">
                  View and download employee payslips
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  leftIcon={<Download className="h-4 w-4" />}
                  onClick={handleBulkDownload}
                  disabled={loading || filteredPayslips.length === 0}
                >
                  Download All
                </Button>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
              {error}
              <button
                onClick={() => setError(null)}
                className="ml-4 text-sm underline hover:no-underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Filters */}
          <div className="mb-6 bg-white dark:bg-surface-900 rounded-lg shadow-md p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-surface-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Employee name..."
                    className="w-full pl-10 pr-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50"
                  />
                </div>
              </div>

              {/* Month Filter */}
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Month
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50"
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
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50"
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
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as PayslipStatus)}
                  className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50"
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
            <div className="mt-4 pt-4 border-t border-surface-200 dark:border-surface-700">
              <p className="text-sm text-surface-600 dark:text-surface-400">
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
            <div className="bg-white dark:bg-surface-900 rounded-lg shadow-md p-12 text-center">
              <div className="text-surface-600 dark:text-surface-400 mb-4">
                No payslips found for the selected filters
              </div>
              <p className="text-sm text-surface-500 dark:text-surface-500">
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
