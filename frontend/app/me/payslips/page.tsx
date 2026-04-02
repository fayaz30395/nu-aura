'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Download,
  FileText,
  Calendar,
  DollarSign,
  TrendingUp,
  Search,
  Filter,
  AlertCircle,
  Users,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/Card';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePayslipsByEmployee, usePayslips, useDownloadPayslipPdf } from '@/lib/hooks/queries/usePayroll';
import { Payslip } from '@/lib/types/hrms/payroll';
import { createLogger } from '@/lib/utils/logger';
import { formatCurrency } from '@/lib/utils';

const log = createLogger('PayslipsPage');

export default function MyPayslipsPage() {
  const router = useRouter();
  const { user, isAuthenticated, hasHydrated } = useAuth();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdminView, setIsAdminView] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user is admin/HR — role codes have no ROLE_ prefix in NU-AURA
  const isAdmin = !user?.employeeId || user?.roles?.some(role => {
    const code = typeof role === 'string' ? role : (role?.code || '');
    return ['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_MANAGER', 'HR_EXECUTIVE', 'PAYROLL_ADMIN'].includes(code);
  });

  // React Query hooks
  const employeePayslipsQuery = usePayslipsByEmployee(
    user?.employeeId || '',
    0,
    100,
    hasHydrated && !!user?.employeeId && !isAdminView
  );

  const allPayslipsQuery = usePayslips(0, 100, undefined, undefined, hasHydrated && isAdminView);

  // Determine which data to use
  const { data: payslipsData, isLoading } = isAdminView ? allPayslipsQuery : employeePayslipsQuery;
  const payslips = payslipsData?.content ?? [];

  useEffect(() => {
    // Wait for auth store to hydrate before checking authentication
    if (!hasHydrated) return;

    if (!isAuthenticated) {
      router.push('/auth/login');
    } else if (user) {
      if (!user.employeeId && !isAdmin) {
        // Regular user without employee profile
        setError('No employee profile found for your account. Please contact your administrator.');
      }
    }
  }, [hasHydrated, isAuthenticated, user, router, isAdmin]);

  const toggleView = () => {
    if (isAdmin && user?.employeeId) {
      setIsAdminView(!isAdminView);
    }
  };


  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatMonthYear = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
    });
  };

  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const downloadMutation = useDownloadPayslipPdf();

  const downloadPayslipPDF = async (payslip: Payslip) => {
    try {
      setDownloadingId(payslip.id);

      // Use backend PDF generation for professional payslip
      const blob = await downloadMutation.mutateAsync(payslip.id);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Payslip_${formatMonthYear(payslip.paymentDate).replace(' ', '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      log.error('Failed to download payslip:', err);
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to download payslip PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  // Create years array first (including "All" option represented by 0)
  const availableYears = payslips.length > 0
    ? Array.from(new Set(payslips.map((p) => new Date(p.paymentDate).getFullYear()))).sort((a, b) => b - a)
    : [new Date().getFullYear()];

  const filteredPayslips = payslips.filter((payslip) => {
    const payslipYear = new Date(payslip.paymentDate).getFullYear();
    // If selectedYear is 0, show all years; otherwise filter by year
    const matchesYear = selectedYear === 0 || payslipYear === selectedYear;
    const matchesSearch =
      searchQuery === '' ||
      formatMonthYear(payslip.paymentDate).toLowerCase().includes(searchQuery.toLowerCase()) ||
      payslip.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (isAdminView && payslip.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesYear && matchesSearch;
  });

  const years = availableYears;

  const yearlyTotal = filteredPayslips.reduce((sum, p) => sum + p.netAmount, 0);
  const yearlyAverage = filteredPayslips.length > 0 ? yearlyTotal / filteredPayslips.length : 0;

  if (isLoading) {
    return (
      <AppLayout activeMenuItem="payslips">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-12 h-12 border-4 border-accent-200 border-t-accent-700 rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!user?.employeeId && !isAdmin) {
    return (
      <AppLayout activeMenuItem="payslips">
        <div className="text-center py-12">
          <DollarSign className="h-16 w-16 mx-auto text-[var(--text-muted)] mb-4" />
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">No Employee Profile Linked</h2>
          <p className="text-[var(--text-muted)] max-w-md mx-auto">
            Payslip access requires an employee profile. Use the admin panels to manage payroll.
          </p>
          <button
            onClick={() => router.push('/payroll')}
            className="mt-6 px-4 py-2 bg-accent-700 text-white rounded-lg hover:bg-accent-800 transition-colors"
          >
            Go to Payroll Management
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="payslips">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold skeuo-emboss">
              {isAdminView ? 'All Employee Payslips' : 'My Payslips'}
            </h1>
            <p className="text-[var(--text-secondary)] mt-1 skeuo-deboss">
              {isAdminView
                ? 'View and manage all employee salary statements'
                : 'View and download your salary statements'}
            </p>
          </div>
          {isAdmin && user?.employeeId && !isAdminView && (
            <button
              onClick={toggleView}
              className="flex items-center gap-2 px-4 py-2 bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 rounded-lg hover:bg-accent-200 dark:hover:bg-accent-900/50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
            >
              <Users className="h-4 w-4" />
              View All Employees
            </button>
          )}
          {isAdminView && user?.employeeId && (
            <button
              onClick={toggleView}
              className="flex items-center gap-2 px-4 py-2 bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 rounded-lg hover:bg-accent-200 dark:hover:bg-accent-900/50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
            >
              <FileText className="h-4 w-4" />
              View My Payslips
            </button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="card-aura">
            <CardContent className="pt-6">
              <div className="row-between">
                <div>
                  <p className="text-body-secondary">Total Payslips</p>
                  <p className="text-3xl font-bold text-[var(--text-primary)] mt-2">
                    {filteredPayslips.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-accent-100 dark:bg-accent-950/30 rounded-full flex items-center justify-center">
                  <FileText className="h-6 w-6 text-accent-600 dark:text-accent-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {isAdminView && (
            <Card className="card-aura">
              <CardContent className="pt-6">
                <div className="row-between">
                  <div>
                    <p className="text-body-secondary">Employees</p>
                    <p className="text-3xl font-bold text-[var(--text-primary)] mt-2">
                      {new Set(filteredPayslips.map(p => p.employeeId)).size}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-accent-100 dark:bg-accent-950/30 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-accent-600 dark:text-accent-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="card-aura">
            <CardContent className="pt-6">
              <div className="row-between">
                <div>
                  <p className="text-body-secondary">
                    {isAdminView ? `Total Payout (${selectedYear})` : `Total Earnings (${selectedYear})`}
                  </p>
                  <p className="text-3xl font-bold text-[var(--text-primary)] mt-2">
                    {formatCurrency(yearlyTotal)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-success-100 dark:bg-success-950/30 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-success-600 dark:text-success-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-aura">
            <CardContent className="pt-6">
              <div className="row-between">
                <div>
                  <p className="text-body-secondary">
                    {isAdminView ? 'Avg. per Employee' : 'Average Salary'}
                  </p>
                  <p className="text-3xl font-bold text-[var(--text-primary)] mt-2">
                    {formatCurrency(yearlyAverage)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-accent-300 dark:bg-accent-900/30 rounded-full flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-accent-800 dark:text-accent-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="card-aura">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder={isAdminView ? "Search by employee name, month, or status..." : "Search payslips..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-aura w-full pl-10 pr-4 py-2 rounded-lg"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-[var(--text-muted)]" />
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="input-aura px-4 py-2 rounded-lg"
                >
                  <option value={0}>All Years</option>
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-danger-50 dark:bg-danger-950/20 border border-danger-200 dark:border-danger-800 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertCircle className="h-5 w-5 text-danger-600" />
            <p className="text-danger-800 dark:text-danger-200 font-medium">{error}</p>
          </div>
        )}

        {/* Payslips List */}
        {filteredPayslips.length === 0 ? (
          <Card className="card-aura">
            <CardContent className="py-16 text-center">
              <FileText className="h-16 w-16 mx-auto text-[var(--text-muted)] mb-4" />
              <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                No Payslips Found
              </h3>
              <p className="text-[var(--text-secondary)]">
                {searchQuery
                  ? 'Try adjusting your search criteria'
                  : `No payslips available for ${selectedYear}`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredPayslips.map((payslip) => (
              <div key={payslip.id}>
                <Card className="card-aura card-interactive overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-accent-100 dark:bg-accent-950/30 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Calendar className="h-6 w-6 text-accent-700 dark:text-accent-400" />
                        </div>
                        <div>
                          {isAdminView && payslip.employeeName && (
                            <p className="text-sm font-medium text-accent-700 dark:text-accent-400 mb-1">
                              {payslip.employeeName}
                            </p>
                          )}
                          <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                            {formatMonthYear(payslip.paymentDate)}
                          </h3>
                          <p className="text-body-secondary mt-1">
                            Payment Date: {formatDate(payslip.paymentDate)}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span
                              className={`badge-status ${
                                payslip.status === 'PAID'
                                  ? 'status-success'
                                  : payslip.status === 'FINALIZED'
                                  ? 'status-info'
                                  : 'status-warning'
                              }`}
                            >
                              {payslip.status}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col md:items-end gap-2">
                        <div className="space-y-1">
                          <p className="text-body-secondary">Net Salary</p>
                          <p className="text-2xl font-bold text-success-600 dark:text-success-400">
                            {formatCurrency(payslip.netAmount)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-body-secondary">
                          <span>Gross: {formatCurrency(payslip.grossAmount)}</span>
                          <span>•</span>
                          <span>Deductions: {formatCurrency(payslip.deductions)}</span>
                        </div>
                        <button
                          onClick={() => downloadPayslipPDF(payslip)}
                          disabled={downloadingId === payslip.id}
                          className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {downloadingId === payslip.id ? (
                            <>
                              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Downloading...
                            </>
                          ) : (
                            <>
                              <Download className="h-4 w-4" />
                              Download PDF
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Breakdown */}
                    {(payslip.allowanceDetails || payslip.deductionDetails) && (
                      <div className="mt-4 pt-4 border-t border-[var(--border-main)]">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Earnings */}
                          {payslip.allowanceDetails && payslip.allowanceDetails.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
                                Earnings
                              </h4>
                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-[var(--text-secondary)]">
                                    Base Salary
                                  </span>
                                  <span className="text-[var(--text-primary)] font-medium">
                                    {formatCurrency(payslip.baseSalary)}
                                  </span>
                                </div>
                                {payslip.allowanceDetails.map((allowance, idx) => (
                                  <div key={idx} className="flex justify-between text-sm">
                                    <span className="text-[var(--text-secondary)]">
                                      {allowance.name}
                                    </span>
                                    <span className="text-[var(--text-primary)] font-medium">
                                      {formatCurrency(allowance.amount)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Deductions */}
                          {payslip.deductionDetails && payslip.deductionDetails.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
                                Deductions
                              </h4>
                              <div className="space-y-1">
                                {payslip.deductionDetails.map((deduction, idx) => (
                                  <div key={idx} className="flex justify-between text-sm">
                                    <span className="text-[var(--text-secondary)]">
                                      {deduction.name}
                                    </span>
                                    <span className="text-danger-600 dark:text-danger-400 font-medium">
                                      -{formatCurrency(deduction.amount)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
