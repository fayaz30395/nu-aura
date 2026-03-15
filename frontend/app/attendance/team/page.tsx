'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Printer,
  RefreshCw,
  Grid3X3,
  List,
  Download,
  Smartphone,
  Globe,
  Fingerprint,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Skeleton, SkeletonStatCard, SkeletonTable, SkeletonCard } from '@/components/ui/Skeleton';
import { AttendanceRecord } from '@/lib/types/attendance';
import { getLocalDateString } from '@/lib/utils/dateUtils';
import { useAttendanceByDate } from '@/lib/hooks/queries/useAttendance';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface EmployeeAttendanceSummary {
  employeeId: string;
  employeeName: string;
  present: number;
  absent: number;
  late: number;
  totalHours: number;
}

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
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'asc' });

  const { data: attendanceResponse, isLoading: loading, error, refetch } = useAttendanceByDate(
    selectedDate,
    0,
    100
  );

  const records: AttendanceRecord[] = attendanceResponse?.content || [];

  const getStatusColor = (status?: string): string => {
    switch (status) {
      case 'PRESENT': return 'bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400';
      case 'ABSENT': return 'bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-400';
      case 'HALF_DAY': return 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-400';
      case 'LATE': return 'bg-orange-100 dark:bg-orange-950/30 text-orange-800 dark:text-orange-400';
      case 'LEAVE': return 'bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400';
      default: return 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] dark:text-[var(--text-muted)]';
    }
  };

  const getStatusBorderColor = (status?: string): string => {
    switch (status) {
      case 'PRESENT': return 'border-l-4 border-l-green-500';
      case 'ABSENT': return 'border-l-4 border-l-red-500';
      case 'HALF_DAY': return 'border-l-4 border-l-yellow-500';
      case 'LATE': return 'border-l-4 border-l-orange-500';
      case 'LEAVE': return 'border-l-4 border-l-blue-500';
      default: return 'border-l-4 border-l-gray-400';
    }
  };

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

    return { present, absent, late, onLeave, halfDay, total };
  };

  const stats = calculateStats();

  const filteredAndSortedRecords = useMemo(() => {
    let filtered = records.filter(record => {
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
    { name: 'Present', value: stats.present, fill: '#10b981' },
    { name: 'Absent', value: stats.absent, fill: '#ef4444' },
    { name: 'Late', value: stats.late, fill: '#f97316' },
    { name: 'Leave', value: stats.onLeave, fill: '#3b82f6' },
  ].filter(item => item.value > 0);

  const percentagePresent = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

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
    const blob = new Blob([csv], { type: 'text/csv' });
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
    if (sourceUpper.includes('MOBILE')) return <Smartphone className="h-4 w-4" />;
    if (sourceUpper.includes('WEB')) return <Globe className="h-4 w-4" />;
    if (sourceUpper.includes('BIOMETRIC')) return <Fingerprint className="h-4 w-4" />;
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

  return (
    <AppLayout activeMenuItem="attendance">
      <motion.div
        className="space-y-8"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Team Attendance</h1>
            <p className="text-[var(--text-muted)] text-sm mt-2">
              Monitor your team&apos;s attendance records for {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={exportToCSV}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button
              onClick={() => window.print()}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <motion.div
            className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-800 dark:text-red-300">{error?.message || 'Failed to load team attendance.'}</p>
            </div>
          </motion.div>
        )}

        {/* Date Navigation & Controls */}
        <Card className="bg-[var(--bg-card)]">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6 md:gap-8 md:items-center md:justify-between">
              {/* Date Navigator */}
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-[var(--text-muted)]" />
                <button
                  onClick={goToPreviousDate}
                  className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
                  aria-label="Previous day"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm"
                />
                <button
                  onClick={goToNextDate}
                  className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
                  aria-label="Next day"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <Button
                  onClick={goToToday}
                  variant="outline"
                  size="sm"
                  className="ml-2"
                >
                  Today
                </Button>
              </div>

              {/* View Mode Toggle & Refresh */}
              <div className="flex gap-2">
                <Button
                  onClick={() => setViewMode('table')}
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <List className="h-4 w-4" />
                  Table
                </Button>
                <Button
                  onClick={() => setViewMode('grid')}
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Grid3X3 className="h-4 w-4" />
                  Grid
                </Button>
                <Button
                  onClick={() => refetch()}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards with Animated Counters */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonStatCard key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut', delay: 0 }}
            >
              <Card className="card-interactive h-full">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-950/30 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)] uppercase font-medium">Present</p>
                      <p className="text-3xl font-bold text-[var(--text-primary)]">{stats.present}</p>
                      <p className="text-xs text-green-600 dark:text-green-400 font-medium mt-1">{percentagePresent}% attendance</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut', delay: 0.05 }}
            >
              <Card className="card-interactive h-full">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                      <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)] uppercase font-medium">Absent</p>
                      <p className="text-3xl font-bold text-[var(--text-primary)]">{stats.absent}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut', delay: 0.1 }}
            >
              <Card className="card-interactive h-full">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center">
                      <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)] uppercase font-medium">Late</p>
                      <p className="text-3xl font-bold text-[var(--text-primary)]">{stats.late}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut', delay: 0.15 }}
            >
              <Card className="card-interactive h-full">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)] uppercase font-medium">On Leave</p>
                      <p className="text-3xl font-bold text-[var(--text-primary)]">{stats.onLeave}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {chartData.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut', delay: 0.2 }}
              >
                <Card className="card-aura h-full">
                  <CardContent className="p-6 flex flex-col items-center justify-center">
                    <ResponsiveContainer width="100%" height={120}>
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={60}
                          dataKey="value"
                          startAngle={90}
                          endAngle={-270}
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-[var(--text-muted)] font-medium mt-3">Distribution</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        )}

        {/* Search & Filter Controls */}
        {!loading && records.length > 0 && (
          <Card className="bg-[var(--bg-card)]">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                <div className="flex-1">
                  <label className="block text-xs text-[var(--text-muted)] uppercase font-medium mb-2">
                    Search Employee
                  </label>
                  <Input
                    placeholder="Search by employee ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-[var(--text-muted)] uppercase font-medium mb-2">
                    Filter by Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-4 py-2 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm"
                  >
                    <option value="all">All Statuses</option>
                    <option value="PRESENT">Present</option>
                    <option value="ABSENT">Absent</option>
                    <option value="LATE">Late</option>
                    <option value="LEAVE">Leave</option>
                    <option value="HALF_DAY">Half Day</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Table View */}
        {viewMode === 'table' && (
          <Card className="bg-[var(--bg-card)]">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Attendance Records {filteredAndSortedRecords.length > 0 && `(${filteredAndSortedRecords.length})`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <SkeletonTable rows={8} columns={7} />
              ) : filteredAndSortedRecords.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-[var(--text-muted)] dark:text-[var(--text-secondary)] mx-auto mb-4" />
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
                        <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide cursor-pointer hover:text-[var(--text-secondary)]" onClick={() => handleSort('employeeId')}>
                          Employee {sortConfig.key === 'employeeId' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide cursor-pointer hover:text-[var(--text-secondary)]" onClick={() => handleSort('checkInTime')}>
                          Check In {sortConfig.key === 'checkInTime' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide cursor-pointer hover:text-[var(--text-secondary)]" onClick={() => handleSort('checkOutTime')}>
                          Check Out {sortConfig.key === 'checkOutTime' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide cursor-pointer hover:text-[var(--text-secondary)]" onClick={() => handleSort('totalWorkHours')}>
                          Work Hours {sortConfig.key === 'totalWorkHours' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide cursor-pointer hover:text-[var(--text-secondary)]" onClick={() => handleSort('status')}>
                          Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                          Source
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                          Remarks
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-main)]">
                      {filteredAndSortedRecords.map((record, index) => (
                        <motion.tr
                          key={record.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.02 }}
                          className="hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50 transition-colors"
                        >
                          <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">
                            {record.employeeId.substring(0, 12)}
                          </td>
                          <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                            {formatTime(record.checkInTime)}
                          </td>
                          <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                            {formatTime(record.checkOutTime)}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-[var(--text-secondary)]">{record.totalWorkHours?.toFixed(1) || '--'}h</span>
                              <div className="w-12 h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-500 transition-all"
                                  style={{
                                    width: `${Math.min(((record.totalWorkHours || 0) / 8) * 100, 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 text-xs font-medium rounded-full inline-flex items-center gap-1 ${getStatusColor(record.status)}`}>
                              {record.lateByMinutes && record.lateByMinutes > 0 && (
                                <span className="bg-current/20 px-2 py-0.5 rounded text-xs">
                                  +{record.lateByMinutes}m
                                </span>
                              )}
                              {record.status || 'PRESENT'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                            <div className="flex items-center gap-2">
                              {getSourceIcon(record.checkInSource)}
                              {record.checkInSource ? record.checkInSource.substring(0, 1).toUpperCase() + record.checkInSource.substring(1).toLowerCase() : 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                            {record.isRegularization && (
                              <span className="text-orange-600 dark:text-orange-400 font-medium text-xs">Regularized</span>
                            )}
                            {record.remarks && (
                              <div className="text-xs text-[var(--text-muted)] truncate max-w-xs" title={record.remarks}>
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
        )}

        {/* Grid View */}
        {viewMode === 'grid' && (
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Grid {filteredAndSortedRecords.length > 0 && `(${filteredAndSortedRecords.length})`}
            </h2>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : filteredAndSortedRecords.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-[var(--text-muted)] dark:text-[var(--text-secondary)] mx-auto mb-4" />
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
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.25 }}
                  >
                    <Card className={`card-aura h-full hover:shadow-lg transition-all ${getStatusBorderColor(record.status)}`}>
                      <CardContent className="p-6 flex flex-col gap-4">
                        <div className="flex items-start justify-between">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {record.employeeId.substring(0, 2).toUpperCase()}
                          </div>
                          <span className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap ml-2 ${getStatusColor(record.status)}`}>
                            {record.status || 'PRESENT'}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                            {record.employeeId.substring(0, 16)}
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">
                            {new Date(record.attendanceDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </p>
                        </div>

                        <div className="flex gap-4 text-xs">
                          <div className="flex-1">
                            <p className="text-[var(--text-muted)] font-medium">Check-In</p>
                            <p className="text-[var(--text-primary)] font-semibold">{formatTime(record.checkInTime)}</p>
                          </div>
                          <div className="flex-1">
                            <p className="text-[var(--text-muted)] font-medium">Check-Out</p>
                            <p className="text-[var(--text-primary)] font-semibold">{formatTime(record.checkOutTime)}</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[var(--text-muted)]">Work Hours</span>
                            <span className="font-semibold text-[var(--text-primary)]">{record.totalWorkHours?.toFixed(1) || '--'}h</span>
                          </div>
                          <div className="w-full h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all"
                              style={{
                                width: `${Math.min(((record.totalWorkHours || 0) / 8) * 100, 100)}%`,
                              }}
                            />
                          </div>
                        </div>

                        {record.lateByMinutes && record.lateByMinutes > 0 && (
                          <div className="px-3 py-2 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                            <p className="text-xs font-medium text-orange-700 dark:text-orange-400">
                              Late by {record.lateByMinutes} minutes
                            </p>
                          </div>
                        )}

                        {record.checkInSource && (
                          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
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
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card
              isClickable
              onClick={() => router.push('/attendance')}
              className="card-interactive h-full hover:shadow-lg transition-all"
            >
              <CardContent className="p-6">
                <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-950/30 flex items-center justify-center mb-4">
                  <Clock className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">My Attendance</h3>
                <p className="text-xs text-[var(--text-muted)]">View your own records</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <Card
              isClickable
              onClick={() => router.push('/attendance/regularization')}
              className="card-interactive h-full hover:shadow-lg transition-all"
            >
              <CardContent className="p-6">
                <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center mb-4">
                  <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Regularizations</h3>
                <p className="text-xs text-[var(--text-muted)]">Review corrections</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card
              isClickable
              onClick={() => window.print()}
              className="card-interactive h-full hover:shadow-lg transition-all"
            >
              <CardContent className="p-6">
                <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center mb-4">
                  <Printer className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Print Report</h3>
                <p className="text-xs text-[var(--text-muted)]">Generate PDF</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </AppLayout>
  );
}
