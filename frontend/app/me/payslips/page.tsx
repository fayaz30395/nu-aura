'use client';

import React, {useState} from 'react';
import {DollarSign, FileText, Search, TrendingUp, Users} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {PageTransition} from '@/components/motion';
import {Card} from '@/components/ui/Card';
import {EmptyState} from '@/components/ui/EmptyState';
import {PageHeader} from '@/components/ui/PageHeader';
import {QueryErrorCard} from '@/components/ui/QueryState';
import {Button} from '@/components/ui/Button';
import {Input} from '@/components/ui/Input';
import {Select} from '@/components/ui/Select';
import {DashboardSkeleton} from '@/components/ui/skeletons';
import {PayslipCard} from './_components/PayslipCard';
import {useAuth} from '@/lib/hooks/useAuth';
import {Roles} from '@/lib/hooks/usePermissions';
import {
  useAllRunPayslips,
  useDownloadPayslipPdf,
  useMyPayslips,
  usePayslipReleaseStatus,
} from '@/lib/hooks/queries/usePayroll';
import {Callout} from '@/components/ui/Callout';
import {useToast} from '@/components/ui/Toast';
import {PayslipView, toPayslipView} from './payslipView';
import {createLogger} from '@/lib/utils/logger';
import {formatCurrency} from '@/lib/utils';
import {Stat} from '@/components/ui/Stat';
import {formatMonthYear} from '@/lib/utils/format/date';

const log = createLogger('PayslipsPage');

const PAYSLIP_ADMIN_ROLES: readonly string[] = [
  Roles.SUPER_ADMIN,
  Roles.TENANT_ADMIN,
  Roles.HR_ADMIN,
  Roles.HR_MANAGER,
  Roles.HR_EXECUTIVE,
  Roles.FINANCE_ADMIN,
  Roles.PAYROLL_ADMIN,
];

export default function MyPayslipsPage() {
  const {user, hasHydrated} = useAuth();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdminView, setIsAdminView] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user is admin/HR — role codes have no ROLE_ prefix in NU-AURA
  const isAdmin = !!user?.roles?.some(role => {
    const code = typeof role === 'string' ? role : (role?.code || '');
    return PAYSLIP_ADMIN_ROLES.includes(code);
  });

  // React Query hooks
  const employeePayslipsQuery = useMyPayslips(
    user?.employeeId || '',
    0,
    100,
    hasHydrated && !!user?.employeeId && !isAdminView
  );

  const allPayslipsQuery = useAllRunPayslips(0, 100, hasHydrated && isAdminView);

  // Determine which data to use
  const activeQuery = isAdminView ? allPayslipsQuery : employeePayslipsQuery;
  const {data: payslipsData, isError: isQueryError} = activeQuery;
  // A disabled query reports isLoading=false in React Query v5; isPending stays true until it has data.
  // Users without an employee profile never enable the self query, so they skip the skeleton.
  const queryEnabled = isAdminView || !!user?.employeeId;
  const isLoading = !hasHydrated || (queryEnabled && activeQuery.isPending);
  const payslips = (payslipsData?.content ?? []).map(toPayslipView);

  // Release state is per employee and per year, so it is only requested in the self view. "All Years" falls
  // back to the current year: it can show that some payslips are unavailable, but never a count.
  const currentYear = new Date().getFullYear();
  const releaseStatusQuery = usePayslipReleaseStatus(
    user?.employeeId || '',
    selectedYear || currentYear,
    hasHydrated && !!user?.employeeId && !isAdminView
  );
  const releaseMonths = releaseStatusQuery.data;
  const notReleasedCount = !isAdminView && releaseMonths && releaseMonths.length === 12
    ? releaseMonths.filter((m) => m.reason === 'NOT_RELEASED').length
    : 0;
  const releaseNote = notReleasedCount === 0
    ? null
    : selectedYear === 0
      ? 'Some payslips are not yet available. Your totals include released periods only.'
      : `${notReleasedCount} ${notReleasedCount === 1 ? 'period is' : 'periods are'} not yet released. Your totals include released periods only.`;

  const toggleView = () => {
    if (isAdmin && user?.employeeId) {
      setIsAdminView(!isAdminView);
    }
  };


  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const downloadMutation = useDownloadPayslipPdf();
  const toast = useToast();

  const downloadPayslipPDF = async (payslip: PayslipView) => {
    try {
      setDownloadingId(payslip.id);

      // Use backend PDF generation for professional payslip
      const blob = await downloadMutation.mutateAsync(payslip.id);
      if (blob.size === 0) {
        toast.error('Payslip PDF is empty, contact HR');
        return;
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Payslip_${formatMonthYear(payslip.periodDate).replace(' ', '_')}.pdf`;
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
  // The current year is always offered, so a year whose payslips are all unreleased does not vanish from the filter.
  const availableYears = Array.from(new Set([currentYear, ...payslips.map((p) => p.year)])).sort((a, b) => b - a);

  const filteredPayslips = payslips.filter((payslip) => {
    // If selectedYear is 0, show all years; otherwise filter by year
    const matchesYear = selectedYear === 0 || payslip.year === selectedYear;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      searchQuery === '' ||
      formatMonthYear(payslip.periodDate).toLowerCase().includes(query) ||
      (isAdminView && !!payslip.employeeName?.toLowerCase().includes(query));
    return matchesYear && matchesSearch;
  });

  const years = availableYears;

  const yearlyTotal = filteredPayslips.reduce((sum, p) => sum + p.netAmount, 0);
  const yearlyAverage = filteredPayslips.length > 0 ? yearlyTotal / filteredPayslips.length : 0;
  const yearLabel = selectedYear === 0 ? 'All Years' : String(selectedYear);

  const breadcrumbs = [{label: 'My Space', href: '/me/dashboard'}, {label: 'My Payslips'}];

  if (isLoading) {
    return (
      <AppLayout activeMenuItem="payslips">
        <PageTransition className="flex flex-col gap-6">
          <DashboardSkeleton stats={3} showHeader={false}/>
        </PageTransition>
      </AppLayout>
    );
  }

  if (!user?.employeeId && !isAdmin) {
    return (
      <AppLayout activeMenuItem="payslips">
        <PageTransition className="flex flex-col gap-6">
          <PageHeader title="My Payslips" breadcrumbs={breadcrumbs}/>
          <EmptyState
            icon={<DollarSign className="h-8 w-8"/>}
            title="No Employee Profile Linked"
            description="Payslip access requires an employee profile. Use the admin panels to manage payroll."
          />
        </PageTransition>
      </AppLayout>
    );
  }

  const searchLabel = isAdminView ? 'Search by employee name or month...' : 'Search payslips...';

  return (
    <AppLayout activeMenuItem="payslips">
      <PageTransition className="flex flex-col gap-6">
        <PageHeader
          title={isAdminView ? 'All Employee Payslips' : 'My Payslips'}
          description={isAdminView ? 'View and manage all employee salary statements' : 'View and download your salary statements'}
          breadcrumbs={breadcrumbs}
          actions={isAdmin && user?.employeeId ? (
            <Button
              variant="soft"
              onClick={toggleView}
              leftIcon={isAdminView ? <FileText className="h-4 w-4" aria-hidden="true"/> : <Users className="h-4 w-4" aria-hidden="true"/>}
            >
              {isAdminView ? 'View My Payslips' : 'View All Employees'}
            </Button>
          ) : undefined}
        />

        <section aria-label="Payslip summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card padding="sm">
            <Stat label="Total Payslips" value={filteredPayslips.length} icon={<FileText className="h-4 w-4"/>} iconTone="accent"/>
          </Card>
          {isAdminView && (
            <Card padding="sm">
              <Stat
                label="Employees"
                value={new Set(filteredPayslips.map(p => p.employeeId)).size}
                icon={<Users className="h-4 w-4"/>}
                iconTone="accent"
              />
            </Card>
          )}
          <Card padding="sm">
            <Stat
              label={isAdminView ? `Total Payout (${yearLabel})` : `Total Earnings (${yearLabel})`}
              value={formatCurrency(yearlyTotal)}
              tone="success"
              icon={<TrendingUp className="h-4 w-4"/>}
              iconTone="success"
            />
          </Card>
          <Card padding="sm">
            <Stat
              label={isAdminView ? 'Avg. per Employee' : 'Average Salary'}
              value={formatCurrency(yearlyAverage)}
              tone="accent"
              icon={<DollarSign className="h-4 w-4"/>}
              iconTone="info"
            />
          </Card>
        </section>

        {/* Unreleased periods are explicit, not silently missing from the totals */}
        {releaseNote && (
          <div role="status">
            <Callout tone="info">{releaseNote}</Callout>
          </div>
        )}

        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1">
            <Input
              type="text"
              aria-label={searchLabel}
              placeholder={searchLabel}
              icon={<Search className="h-4 w-4"/>}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="md:w-48">
            <Select aria-label="Year" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
              <option value={0}>All Years</option>
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </Select>
          </div>
        </div>

        {error && (
          <div role="alert">
            <Callout tone="danger">{error}</Callout>
          </div>
        )}

        {isQueryError ? (
          <QueryErrorCard
            title="Couldn't Load Payslips"
            message="Something went wrong while loading your payslips. Please try again."
            onRetry={() => activeQuery.refetch()}
            retrying={activeQuery.isFetching}
          />
        ) : filteredPayslips.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-4">
            <EmptyState
              icon={<FileText className="h-8 w-8"/>}
              title="No Payslips Found"
              description={searchQuery ? 'Try adjusting your search criteria' : `No payslips available for ${yearLabel}`}
              actionLabel={searchQuery ? 'Clear search' : undefined}
              onAction={searchQuery ? () => setSearchQuery('') : undefined}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredPayslips.map((payslip) => (
              <PayslipCard
                key={payslip.id}
                payslip={payslip}
                isAdminView={isAdminView}
                downloading={downloadingId === payslip.id}
                onDownload={downloadPayslipPDF}
              />
            ))}
          </div>
        )}
      </PageTransition>
    </AppLayout>
  );
}
