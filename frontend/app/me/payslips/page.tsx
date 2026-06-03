'use client';

import React, {useState} from 'react';
import {useRouter} from 'next/navigation';
import {AlertCircle, Calendar, DollarSign, Download, FileText, Filter, Search, TrendingUp, Users,} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {PageTransition, Reveal, Stagger, StaggerItem} from '@/components/motion';
import {Card, CardContent} from '@/components/ui/Card';
import {EmptyState} from '@/components/ui/EmptyState';
import {useAuth} from '@/lib/hooks/useAuth';
import {useDownloadPayslipPdf, usePayslips, usePayslipsByEmployee} from '@/lib/hooks/queries/usePayroll';
import {Payslip} from '@/lib/types/hrms/payroll';
import {createLogger} from '@/lib/utils/logger';
import {formatCurrency} from '@/lib/utils';
import {Stat} from '@/components/ui/Stat';
import {SkeletonStatCard, SkeletonTable} from '@/components/ui/Skeleton';
import {formatDate as formatDateCanonical, formatMonthYear as formatMonthYearCanonical} from '@/lib/utils/format/date';

const log = createLogger('PayslipsPage');

export default function MyPayslipsPage() {
  const router = useRouter();
  const {user, hasHydrated} = useAuth();
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
  const {data: payslipsData, isLoading} = isAdminView ? allPayslipsQuery : employeePayslipsQuery;
  const payslips = payslipsData?.content ?? [];

  const toggleView = () => {
    if (isAdmin && user?.employeeId) {
      setIsAdminView(!isAdminView);
    }
  };


  const formatDate = (date: string) => formatDateCanonical(date);

  const formatMonthYear = (date: string) => formatMonthYearCanonical(date);

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
      setError((err as {
        response?: { data?: { message?: string } }
      })?.response?.data?.message || 'Failed to download payslip PDF');
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
      <AppLayout activeMenuItem="payslips" breadcrumbs={[{label: 'My Payslips', href: '/me/payslips'}]}>
        <PageTransition className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({length: 3}).map((_, i) => (
              <SkeletonStatCard key={i}/>
            ))}
          </div>
          <SkeletonTable rows={6} columns={5}/>
        </PageTransition>
      </AppLayout>
    );
  }

  if (!user?.employeeId && !isAdmin) {
    return (
      <AppLayout activeMenuItem="payslips" breadcrumbs={[{label: 'My Payslips', href: '/me/payslips'}]}>
        <PageTransition>
          <EmptyState
            icon={<DollarSign className="h-8 w-8"/>}
            title="No Employee Profile Linked"
            description="Payslip access requires an employee profile. Use the admin panels to manage payroll."
          />
        </PageTransition>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="payslips" breadcrumbs={[{label: 'My Payslips', href: '/me/payslips'}]}>
      <PageTransition className="space-y-6">
        {/* Header */}
        <Reveal className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-aura-title text-[var(--text-1)]">
              {isAdminView ? 'All Employee Payslips' : 'My Payslips'}
            </h1>
            <p className="text-sm text-[var(--text-2)] mt-2">
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
              <Users className="h-4 w-4"/>
              View All Employees
            </button>
          )}
          {isAdminView && user?.employeeId && (
            <button
              onClick={toggleView}
              className="flex items-center gap-2 px-4 py-2 bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 rounded-lg hover:bg-accent-200 dark:hover:bg-accent-900/50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
            >
              <FileText className="h-4 w-4"/>
              View My Payslips
            </button>
          )}
        </Reveal>

        {/* Summary Cards */}
        <Reveal className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="card-aura">
            <CardContent className="pt-6">
              <div className="row-between">
                <Stat label="Total Payslips" value={filteredPayslips.length}/>
                <div
                  className="w-12 h-12 bg-accent-100 dark:bg-accent-950/30 rounded-full flex items-center justify-center">
                  <FileText className="h-6 w-6 text-accent-600 dark:text-accent-400"/>
                </div>
              </div>
            </CardContent>
          </Card>

          {isAdminView && (
            <Card className="card-aura">
              <CardContent className="pt-6">
                <div className="row-between">
                  <Stat
                    label="Employees"
                    value={new Set(filteredPayslips.map(p => p.employeeId)).size}
                  />
                  <div
                    className="w-12 h-12 bg-accent-100 dark:bg-accent-950/30 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-accent-600 dark:text-accent-400"/>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="card-aura">
            <CardContent className="pt-6">
              <div className="row-between">
                <Stat
                  label={isAdminView ? `Total Payout (${selectedYear})` : `Total Earnings (${selectedYear})`}
                  value={formatCurrency(yearlyTotal)}
                  tone="success"
                />
                <div
                  className="w-12 h-12 bg-success-100 dark:bg-success-950/30 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-success-600 dark:text-success-400"/>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-aura">
            <CardContent className="pt-6">
              <div className="row-between">
                <Stat
                  label={isAdminView ? 'Avg. per Employee' : 'Average Salary'}
                  value={formatCurrency(yearlyAverage)}
                  tone="accent"
                />
                <div
                  className="w-12 h-12 bg-accent-300 dark:bg-accent-900/30 rounded-full flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-accent-800 dark:text-accent-600"/>
                </div>
              </div>
            </CardContent>
          </Card>
        </Reveal>

        {/* Filters */}
        <Reveal>
        <Card className="card-aura">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]"/>
                <input
                  type="text"
                  placeholder={isAdminView ? "Search by employee name, month, or status..." : "Search payslips..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-aura w-full pl-10 pr-4 py-2 rounded-lg"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-[var(--text-muted)]"/>
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
        </Reveal>

        {/* Error Message */}
        {error && (
          <div
            className="flex items-center gap-2 p-4 bg-danger-50 dark:bg-danger-950/20 border border-danger-200 dark:border-danger-800 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertCircle className="h-5 w-5 text-danger-600"/>
            <p className="text-danger-800 dark:text-danger-200 font-medium">{error}</p>
          </div>
        )}

        {/* Payslips List */}
        {filteredPayslips.length === 0 ? (
          <Card className="card-aura">
            <CardContent>
              <EmptyState
                icon={<FileText className="w-full h-full"/>}
                title="No Payslips Found"
                description={searchQuery
                  ? 'Try adjusting your search criteria'
                  : `No payslips available for ${selectedYear}`}
              />
            </CardContent>
          </Card>
        ) : (
          <Stagger className="grid grid-cols-1 gap-4">
            {filteredPayslips.map((payslip) => (
              <StaggerItem key={payslip.id}>
                <Card className="card-aura card-interactive overflow-hidden hover-lift">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div
                          className="w-12 h-12 bg-accent-100 dark:bg-accent-950/30 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Calendar className="h-6 w-6 text-accent-700 dark:text-accent-400"/>
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
                          <p className="text-xl font-bold text-success-600 dark:text-success-400">
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
                              <div
                                className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                              Downloading...
                            </>
                          ) : (
                            <>
                              <Download className="h-4 w-4"/>
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
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </PageTransition>
    </AppLayout>
  );
}
