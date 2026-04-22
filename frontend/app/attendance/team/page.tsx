'use client';

import {useEffect, useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import {motion} from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Fingerprint,
  Globe,
  Grid3X3,
  List,
  Printer,
  RefreshCw,
  Smartphone,
  Users,
  XCircle,
} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {Input} from '@/components/ui/Input';
import {SkeletonCard, SkeletonStatCard, SkeletonTable} from '@/components/ui/Skeleton';
import {AttendanceRecord} from '@/lib/types/hrms/attendance';
import {getLocalDateString} from '@/lib/utils/dateUtils';
import {useAttendanceByDate} from '@/lib/hooks/queries/useAttendance';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {useAuth} from '@/lib/hooks/useAuth';
import dynamic from 'next/dynamic';
import {ChartLoadingFallback} from '@/lib/utils/lazy-components';

const TeamStatusChart = dynamic(
  () => import('./TeamStatusChart'),
  {loading: () => <ChartLoadingFallback/>, ssr: false}
);

interface StatusStats {
  present: number;
  absent: number;
  late: number;
  onLeave: number;
  halfDay: number;
  total: number;
}

interface SortConfig {
  key: keyof AttendanceRecord | null;
  direction: 'asc' | 'desc';
}

export default function TeamAttendancePage() {
  const router = useRouter();
  const {isAuthenticated, hasHydrated} = useAuth();
  const {hasPermission, isReady: permissionsReady} = usePermissions();

  // BUG-L6-007: Page-level permission gate for team attendance
  useEffect(() => {
    if (!hasHydrated || !permissionsReady) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (!hasPermission(Permissions.ATTENDANCE_VIEW_TEAM) && !hasPermission(Permissions.ATTENDANCE_VIEW_ALL)) {
      router.replace('/me/dashboard');
    }
  }, [hasHydrated, permissionsReady, isAuthenticated, router, hasPermission]);

  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({key: null, direction: 'asc'});

  const {data: attendanceResponse, isLoading: loading, error, refetch} = useAttendanceByDate(
    selectedDate,
    0,
    100
  );

  // Stable reference: prevents dependent useMemo hooks from re-running on every render.
  const records = useMemo<AttendanceRecord[]>(() => attendanceResponse?.content ?? [], [attendanceResponse]);

  const formatTime = (dateString?: string): string => {
    if (!dateString) return '--:--';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateStats = (): StatusStats => {
    const present = records.filter(r => r.status === 'PRESENT').length;
    const absent = records.filter(r => r.status === 'ABSENT').length;
    const late = records.filter(r => r.status === 'LATE').length;
    const onLeave = records.filter(r => r.status === 'LEAVE' || r.status === 'ON_LEAVE').length;
    const halfDay = records.filter(r => r.status === 'HALF_DAY').length;
    const total = records.length;

    return {present, absent, late, onLeave, halfDay, total};
  };

  const stats = calculateStats();

  const filteredAndSortedRecords = useMemo(() => {
    const filtered = records.filter(record => {
      const matchesSearch = record.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    if (sortConfig.key !== null) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof AttendanceRecord];
        const bValue = b[sortConfig.key as keyof AttendanceRecord];

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        if (typeof aValue === 'string') {
          return sortConfig.direction === 'asc'
            ? aValue.localeCompare(String(bValue))
            : String(bValue).localeCompare(aValue);
        }

        if (typeof aValue === 'number') {
          return sortConfig.direction === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number);
        }

        return 0;
      });
    }

    return filtered;
  }, [records, searchTerm, statusFilter, sortConfig]);

  const handleSort = (key: keyof AttendanceRecord) => {
    setSortConfig(prev => ({
      key: prev.key === key ? null : key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const chartData = [
    {name: 'Present', value: stats.present, fill: 'var(--chart-success)'},
    {name: 'Absent', value: stats.absent, fill: 'var(--chart-danger)'},
    {name: 'Late', value: stats.late, fill: 'var(--chart-accent)'},
    {name: 'Leave', value: stats.onLeave, fill: 'var(--chart-info)'},
  ].filter(item => item.value > 0);

  const exportToCSV = () => {
    const headers = ['Employee ID', 'Check-In', 'Check-Out', 'Work Hours', 'Status', 'Late (min)', 'Source'];
    const rows = filteredAndSortedRecords.map(record => [
      record.employeeId,
      formatTime(record.checkInTime),
      formatTime(record.checkOutTime),
      record.totalWorkHours?.toFixed(2) || '--',
      record.status || 'PRESENT',
      record.lateByMinutes || '--',
      record.checkInSource || 'N/A',
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], {type: 'text/csv'});
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `team-attendance-${selectedDate}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const getSourceIcon = (source?: string) => {
    if (!source) return null;
    const sourceUpper = source.toUpperCase();
    if (sourceUpper.includes('MOBILE')) return <Smartphone className="h-4 w-4"/>;
    if (sourceUpper.includes('WEB')) return <Globe className="h-4 w-4"/>;
    if (sourceUpper.includes('BIOMETRIC')) return <Fingerprint className="h-4 w-4"/>;
    return null;
  };

  const goToPreviousDate = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    setSelectedDate(getLocalDateString(date));
  };

  const goToNextDate = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    setSelectedDate(getLocalDateString(date));
  };

  const goToToday = () => {
    setSelectedDate(getLocalDateString());
  };

  // Permission guard
  if (!hasHydrated || !permissionsReady || (!hasPermission(Permissions.ATTENDANCE_VIEW_TEAM) && !hasPermission(Permissions.ATTENDANCE_VIEW_ALL))) {
    return null;
  }

  return (
    <AppLayout activeMenuItem="attendance">
      <motion.div
        className="space-y-8"
        initial={{opacity: 0, y: 8}}
        animate={{opacity: 1, y: 0}}
        transition={{duration: 0.25, ease: 'easeOut'}}
      >
        {/* Header with Breadcrumb */}
        <div className="flex flex-col gap-4">
          <motion.button
            onClick={() => router.push('/attendance')}
            className="flex items-center gap-2 text-body-secondary hover:text-[var(--text-primary)] transition-colors w-fit"
            whileHover={{x: -2}}
          >
            <ArrowLeft className="h-4 w-4"/>
            Back to Attendance
          </motion.button>
          <div>
            <h1 className="text-page-title text-[var(--text-primary)]">Team Attendance</h1>
            <p className="text-[var(--text-muted)] text-sm mt-2">
              Monitor your team&apos;s attendance records for {new Date(selectedDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <motion.div
            className='bg-status-danger-bg border border-status-danger-border rounded-lg p-4 flex items-start gap-2'
            initial={{opacity: 0, y: -8}}
            animate={{opacity: 1, y: 0}}
          >
            <AlertCircle className='w-5 h-5 text-status-danger-text mt-0.5 flex-shrink-0'/>
            <div className="flex-1">
              <p
                className='text-sm text-status-danger-text'>{error?.message || 'Failed to load team attendance.'}</p>
            </div>
          </motion.div>
        )}

        {/* Date Navigation Bar */}
        <motion.div
          className="card-aura bg-[var(--bg-card)] rounded-lg px-6 py-4 row-between gap-4 flex-wrap"
          initial={{opacity: 0, y: 8}}
          animate={{opacity: 1, y: 0}}
          transition={{delay: 0.1}}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={goToPreviousDate}
              className="cursor-pointer p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              aria-label="Previous day"
            >
              <ChevronLeft className="h-4 w-4 text-[var(--text-secondary)]"/>
            </button>
            <div className="text-center min-w-max">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {new Date(selectedDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}
              </p>
              <p className="text-caption">
                {new Date(selectedDate).toLocaleDateString('en-US', {weekday: 'short'})}
              </p>
            </div>
            <button
              onClick={goToNextDate}
              className="cursor-pointer p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              aria-label="Next day"
            >
              <ChevronRight className="h-4 w-4 text-[var(--text-secondary)]"/>
            </button>
            <Button
              onClick={goToToday}
              variant="outline"
              size="sm"
              className="ml-2 text-xs"
            >
              Today
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setViewMode('table')}
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="sm"
              className="flex items-center gap-2"
            >
              <List className="h-4 w-4"/>
              <span className="hidden sm:inline">Table</span>
            </Button>
            <Button
              onClick={() => setViewMode('grid')}
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              className="flex items-center gap-2"
            >
              <Grid3X3 className="h-4 w-4"/>
              <span className="hidden sm:inline">Grid</span>
            </Button>
            <Button
              onClick={() => refetch()}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4"/>
            </Button>
            <Button
              onClick={exportToCSV}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4"/>
              <span className="hidden sm:inline">CSV</span>
            </Button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({length: 4}).map((_, i) => (
              <SkeletonStatCard key={i}/>
            ))}
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            transition={{staggerChildren: 0.05, delayChildren: 0.15}}
          >
            {/* Present Card */}
            <motion.div
              initial={{opacity: 0, y: 8}}
              animate={{opacity: 1, y: 0}}
            >
              <Card className="card-aura h-full border-l-4 border-l-success-500">
                <CardContent className="p-6 flex flex-col gap-4">
                  <div
                    className='w-10 h-10 rounded-lg bg-status-success-bg flex items-center justify-center'>
                    <CheckCircle className='h-5 w-5 text-status-success-text'/>
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-caption uppercase font-medium tracking-wide">Present</p>
                    <p className="text-stat-large font-bold text-[var(--text-primary)]">{stats.present}</p>
                    <p className='text-xs text-status-success-text font-medium'>
                      {stats.total > 0 ? `${Math.round((stats.present / stats.total) * 100)}%` : '0%'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Absent Card */}
            <motion.div
              initial={{opacity: 0, y: 8}}
              animate={{opacity: 1, y: 0}}
            >
              <Card className="card-aura h-full border-l-4 border-l-danger-500">
                <CardContent className="p-6 flex flex-col gap-4">
                  <div
                    className='w-10 h-10 rounded-lg bg-status-danger-bg flex items-center justify-center'>
                    <XCircle className='h-5 w-5 text-status-danger-text'/>
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-caption uppercase font-medium tracking-wide">Absent</p>
                    <p className="text-stat-large font-bold text-[var(--text-primary)]">{stats.absent}</p>
                    <p className='text-xs text-status-danger-text font-medium'>
                      {stats.total > 0 ? `${Math.round((stats.absent / stats.total) * 100)}%` : '0%'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Late Card */}
            <motion.div
              initial={{opacity: 0, y: 8}}
              animate={{opacity: 1, y: 0}}
            >
              <Card className="card-aura h-full border-l-4 border-l-warning-500">
                <CardContent className="p-6 flex flex-col gap-4">
                  <div
                    className='w-10 h-10 rounded-lg bg-status-warning-bg flex items-center justify-center'>
                    <AlertCircle className='h-5 w-5 text-status-warning-text'/>
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-caption uppercase font-medium tracking-wide">Late</p>
                    <p className="text-stat-large font-bold text-[var(--text-primary)]">{stats.late}</p>
                    <p className='text-xs text-status-warning-text font-medium'>
                      {stats.total > 0 ? `${Math.round((stats.late / stats.total) * 100)}%` : '0%'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* On Leave Card */}
            <motion.div
              initial={{opacity: 0, y: 8}}
              animate={{opacity: 1, y: 0}}
            >
              <Card className="card-aura h-full border-l-4 border-l-accent-500">
                <CardContent className="p-6 flex flex-col gap-4">
                  <div
                    className='w-10 h-10 rounded-lg bg-accent-subtle flex items-center justify-center'>
                    <Clock className='h-5 w-5 text-accent'/>
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-caption uppercase font-medium tracking-wide">On Leave</p>
                    <p className="text-stat-large font-bold text-[var(--text-primary)]">{stats.onLeave}</p>
                    <p className='text-xs text-accent font-medium'>
                      {stats.total > 0 ? `${Math.round((stats.onLeave / stats.total) * 100)}%` : '0%'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}

        {/* Status Distribution Chart */}
        {!loading && chartData.length > 0 && (
          <motion.div
            initial={{opacity: 0, y: 8}}
            animate={{opacity: 1, y: 0}}
            transition={{delay: 0.25}}
          >
            <Card className="card-aura">
              <CardHeader>
                <CardTitle className="text-card-title">Status Distribution</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <TeamStatusChart chartData={chartData}/>
                <div className="flex flex-wrap gap-4 mt-6 justify-center">
                  {chartData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{backgroundColor: item.fill}}
                      />
                      <span className="text-xs text-[var(--text-secondary)]">
                        {item.name} ({item.value})
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Search & Filter Controls */}
        {!loading && records.length > 0 && (
          <motion.div
            className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center"
            initial={{opacity: 0, y: 8}}
            animate={{opacity: 1, y: 0}}
            transition={{delay: 0.3}}
          >
            <div className="flex-1">
              <Input
                placeholder="Search by employee ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className='px-4 py-2 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg focus:ring-2 focus:ring-accent-500/20 focus:border-[var(--accent-primary)] text-sm'
            >
              <option value="all">All Statuses</option>
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
              <option value="LATE">Late</option>
              <option value="LEAVE">Leave</option>
              <option value="HALF_DAY">Half Day</option>
            </select>
          </motion.div>
        )}

        {/* Table View */}
        {viewMode === 'table' && (
          <motion.div
            initial={{opacity: 0, y: 8}}
            animate={{opacity: 1, y: 0}}
            transition={{delay: 0.35}}
          >
            <Card className="card-aura">
              <CardHeader>
                <CardTitle className="text-card-title flex items-center gap-2">
                  <Users className="h-5 w-5"/>
                  Team Attendance
                  Records {filteredAndSortedRecords.length > 0 && `(${filteredAndSortedRecords.length})`}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <SkeletonTable rows={8} columns={7}/>
                ) : filteredAndSortedRecords.length === 0 ? (
                  <div className="text-center py-12">
                    <Users
                      className="h-12 w-12 text-[var(--text-muted)] dark:text-[var(--text-secondary)] mx-auto mb-4"/>
                    <p className="text-[var(--text-muted)]">
                      {records.length === 0
                        ? 'No attendance records found for this date'
                        : 'No records match your filters'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-[var(--bg-secondary)]/50 border-b border-[var(--border-main)]">
                      <tr>
                        <th
                          className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide cursor-pointer hover:text-[var(--text-secondary)]"
                          onClick={() => handleSort('employeeId')}>
                          Employee {sortConfig.key === 'employeeId' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th
                          className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide cursor-pointer hover:text-[var(--text-secondary)]"
                          onClick={() => handleSort('checkInTime')}>
                          Check In {sortConfig.key === 'checkInTime' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th
                          className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide cursor-pointer hover:text-[var(--text-secondary)]"
                          onClick={() => handleSort('checkOutTime')}>
                          Check Out {sortConfig.key === 'checkOutTime' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th
                          className="px-6 py-4 text-right text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide cursor-pointer hover:text-[var(--text-secondary)]"
                          onClick={() => handleSort('totalWorkHours')}>
                          Work
                          Hours {sortConfig.key === 'totalWorkHours' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th
                          className="px-6 py-4 text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide cursor-pointer hover:text-[var(--text-secondary)]"
                          onClick={() => handleSort('status')}>
                          Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th
                          className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                          Source
                        </th>
                        <th
                          className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                          Remarks
                        </th>
                      </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-main)]">
                      {filteredAndSortedRecords.map((record, index) => (
                        <motion.tr
                          key={record.id}
                          initial={{opacity: 0}}
                          animate={{opacity: 1}}
                          transition={{delay: index * 0.02}}
                          className="h-11 hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50 transition-colors"
                        >
                          <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">
                            {record.employeeId.substring(0, 12)}
                          </td>
                          <td className="px-6 py-4 text-body-secondary">
                            {formatTime(record.checkInTime)}
                          </td>
                          <td className="px-6 py-4 text-body-secondary">
                            {formatTime(record.checkOutTime)}
                          </td>
                          <td className="px-6 py-4 text-sm text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span
                                className="text-[var(--text-secondary)] min-w-max">{record.totalWorkHours?.toFixed(1) || '--'}h</span>
                              <div className="w-16 h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                                <div
                                  className='h-full bg-status-success-bg transition-all'
                                  style={{
                                    width: `${Math.min(((record.totalWorkHours || 0) / 8) * 100, 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                              <span className={`badge-status ${
                                record.status === 'PRESENT' ? 'status-success' :
                                  record.status === 'ABSENT' ? 'status-danger' :
                                    record.status === 'LATE' ? 'status-warning' :
                                      record.status === 'LEAVE' ? 'status-info' :
                                        record.status === 'HALF_DAY' ? 'status-warning' :
                                          'status-neutral'
                              } text-xs`}>
                                {record.lateByMinutes && record.lateByMinutes > 0 && (
                                  <span className="bg-current/20 px-1.5 py-0.5 rounded text-xs">
                                    +{record.lateByMinutes}m
                                  </span>
                                )}
                                {record.status || 'PRESENT'}
                              </span>
                          </td>
                          <td className="px-6 py-4 text-body-secondary">
                            <div className="flex items-center gap-2">
                              {getSourceIcon(record.checkInSource)}
                              {record.checkInSource ? record.checkInSource.substring(0, 1).toUpperCase() + record.checkInSource.substring(1).toLowerCase() : 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-body-secondary">
                            {record.isRegularization && (
                              <span
                                className='text-status-warning-text font-medium text-xs'>Regularized</span>
                            )}
                            {record.remarks && (
                              <div className="text-caption truncate max-w-xs" title={record.remarks}>
                                {record.remarks}
                              </div>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Grid View */}
        {viewMode === 'grid' && (
          <motion.div
            initial={{opacity: 0, y: 8}}
            animate={{opacity: 1, y: 0}}
            transition={{delay: 0.35}}
          >
            <h2 className="text-card-title text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <Users className="h-5 w-5"/>
              Team Attendance Grid {filteredAndSortedRecords.length > 0 && `(${filteredAndSortedRecords.length})`}
            </h2>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({length: 6}).map((_, i) => (
                  <SkeletonCard key={i}/>
                ))}
              </div>
            ) : filteredAndSortedRecords.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-[var(--text-muted)] dark:text-[var(--text-secondary)] mx-auto mb-4"/>
                <p className="text-[var(--text-muted)]">
                  {records.length === 0
                    ? 'No attendance records found for this date'
                    : 'No records match your filters'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAndSortedRecords.map((record, index) => (
                  <motion.div
                    key={record.id}
                    initial={{opacity: 0, y: 8}}
                    animate={{opacity: 1, y: 0}}
                    transition={{delay: index * 0.03, duration: 0.25}}
                  >
                    <Card
                      className={`card-aura h-full hover:shadow-[var(--shadow-dropdown)] transition-all border-t-4 ${
                        record.status === 'PRESENT' ? 'border-t-success-500' :
                          record.status === 'ABSENT' ? 'border-t-danger-500' :
                            record.status === 'LATE' ? 'border-t-warning-500' :
                              record.status === 'LEAVE' ? 'border-t-accent-500' :
                                record.status === 'HALF_DAY' ? 'border-t-warning-500' :
                                  'border-t-[var(--border-main)]'
                      }`}>
                      <CardContent className="p-6 flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-2">
                          <div
                            className='w-12 h-12 rounded-full bg-gradient-to-br from-accent-400 to-accent-700 flex items-center justify-center text-inverse font-bold text-sm flex-shrink-0'>
                            {record.employeeId.substring(0, 2).toUpperCase()}
                          </div>
                          <span className={`badge-status ${
                            record.status === 'PRESENT' ? 'status-success' :
                              record.status === 'ABSENT' ? 'status-danger' :
                                record.status === 'LATE' ? 'status-warning' :
                                  record.status === 'LEAVE' ? 'status-info' :
                                    record.status === 'HALF_DAY' ? 'status-warning' :
                                      'status-neutral'
                          } text-xs whitespace-nowrap`}>
                            {record.status || 'PRESENT'}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1">
                          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                            {record.employeeId.substring(0, 16)}
                          </p>
                          <p className="text-caption">
                            {new Date(record.attendanceDate).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                        </div>

                        <div className="space-y-2 border-t border-[var(--border-main)] pt-4">
                          <div className="flex gap-4 text-xs">
                            <div className="flex-1">
                              <p className="text-[var(--text-muted)] font-medium mb-1">Check-In</p>
                              <p
                                className="text-[var(--text-primary)] font-semibold">{formatTime(record.checkInTime)}</p>
                            </div>
                            <div className="flex-1">
                              <p className="text-[var(--text-muted)] font-medium mb-1">Check-Out</p>
                              <p
                                className="text-[var(--text-primary)] font-semibold">{formatTime(record.checkOutTime)}</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="row-between text-xs">
                            <span className="text-[var(--text-muted)] font-medium">Work Hours</span>
                            <span
                              className="font-semibold text-[var(--text-primary)]">{record.totalWorkHours?.toFixed(1) || '--'}h</span>
                          </div>
                          <div className="w-full h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-accent-400 to-accent-600 transition-all"
                              style={{
                                width: `${Math.min(((record.totalWorkHours || 0) / 8) * 100, 100)}%`,
                              }}
                            />
                          </div>
                        </div>

                        {record.lateByMinutes && record.lateByMinutes > 0 && (
                          <div
                            className='px-4 py-2 rounded-lg bg-status-warning-bg border border-status-warning-border'>
                            <p className='text-xs font-medium text-status-warning-text'>
                              Late by {record.lateByMinutes} minutes
                            </p>
                          </div>
                        )}

                        {record.checkInSource && (
                          <div className="flex items-center gap-2 text-caption">
                            {getSourceIcon(record.checkInSource)}
                            <span>{record.checkInSource.substring(0, 1).toUpperCase() + record.checkInSource.substring(1).toLowerCase()}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Quick Links */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          initial={{opacity: 0, y: 8}}
          animate={{opacity: 1, y: 0}}
          transition={{delay: 0.45, staggerChildren: 0.05}}
        >
          <motion.div
            initial={{opacity: 0, y: 8}}
            animate={{opacity: 1, y: 0}}
          >
            <Card
              isClickable
              onClick={() => router.push('/attendance')}
              className="card-interactive h-full hover:shadow-[var(--shadow-dropdown)] transition-all border-t-4 border-t-accent-500"
            >
              <CardContent className="p-6">
                <div
                  className='w-10 h-10 rounded-lg bg-accent-subtle flex items-center justify-center mb-4'>
                  <Clock className='h-5 w-5 text-accent'/>
                </div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">My Attendance</h3>
                <p className="text-caption">View your own records</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{opacity: 0, y: 8}}
            animate={{opacity: 1, y: 0}}
          >
            <Card
              isClickable
              onClick={() => router.push('/attendance/regularization')}
              className="card-interactive h-full hover:shadow-[var(--shadow-dropdown)] transition-all border-t-4 border-t-warning-500"
            >
              <CardContent className="p-6">
                <div
                  className='w-10 h-10 rounded-lg bg-status-warning-bg flex items-center justify-center mb-4'>
                  <AlertCircle className='h-5 w-5 text-status-warning-text'/>
                </div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Regularizations</h3>
                <p className="text-caption">Review corrections</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{opacity: 0, y: 8}}
            animate={{opacity: 1, y: 0}}
          >
            <Card
              isClickable
              onClick={() => window.print()}
              className="card-interactive h-full hover:shadow-[var(--shadow-dropdown)] transition-all border-t-4 border-t-accent-700"
            >
              <CardContent className="p-6">
                <div
                  className='w-10 h-10 rounded-lg bg-accent-subtle flex items-center justify-center mb-4'>
                  <Printer className='h-5 w-5 text-accent'/>
                </div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Print Report</h3>
                <p className="text-caption">Generate PDF</p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </motion.div>
    </AppLayout>
  );
}
