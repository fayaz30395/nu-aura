'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Calendar, CheckCircle, XCircle, AlertCircle, Clock, Printer } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { attendanceService } from '@/lib/services/attendance.service';
import { AttendanceRecord } from '@/lib/types/attendance';
import { getLocalDateString } from '@/lib/utils/dateUtils';

interface EmployeeAttendanceSummary {
  employeeId: string;
  employeeName: string;
  present: number;
  absent: number;
  late: number;
  totalHours: number;
}

export default function TeamAttendancePage() {
  const router = useRouter();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [viewMode, setViewMode] = useState<'daily' | 'summary'>('daily');

  useEffect(() => {
    loadTeamAttendance();
  }, [selectedDate]);

  const loadTeamAttendance = async () => {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');

      // In a real implementation, this would fetch subordinates' attendance
      const response = await attendanceService.getAttendanceByDate(selectedDate, 0, 100);
      setRecords(response.content);
    } catch (error) {
      console.error('Error loading team attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'PRESENT': return 'bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400';
      case 'ABSENT': return 'bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-400';
      case 'HALF_DAY': return 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-400';
      case 'LATE': return 'bg-orange-100 dark:bg-orange-950/30 text-orange-800 dark:text-orange-400';
      case 'LEAVE': return 'bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400';
      default: return 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-400';
    }
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '--:--';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateStats = () => {
    const present = records.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
    const absent = records.filter(r => r.status === 'ABSENT').length;
    const late = records.filter(r => r.status === 'LATE').length;
    const onLeave = records.filter(r => r.status === 'LEAVE').length;

    return { present, absent, late, onLeave };
  };

  const stats = calculateStats();

  return (
    <AppLayout activeMenuItem="attendance">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">Team Attendance</h1>
            <p className="text-surface-500 dark:text-surface-400 mt-1">
              Monitor your team's attendance records
            </p>
          </div>
          <Button
            onClick={() => window.print()}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Print Report
          </Button>
        </div>

        {/* Controls */}
        <Card className="bg-white dark:bg-surface-900">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex gap-4 items-center">
                <Calendar className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Date:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-4 py-2 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('daily')}
                  className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                    viewMode === 'daily'
                      ? 'bg-primary-500 text-white'
                      : 'bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700'
                  }`}
                >
                  Daily View
                </button>
                <button
                  onClick={() => setViewMode('summary')}
                  className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                    viewMode === 'summary'
                      ? 'bg-primary-500 text-white'
                      : 'bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700'
                  }`}
                >
                  Summary View
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white dark:bg-surface-900">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-950/30 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-500 dark:text-surface-400">Present</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">{stats.present}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-surface-900">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-500 dark:text-surface-400">Absent</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">{stats.absent}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-surface-900">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-500 dark:text-surface-400">Late</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">{stats.late}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-surface-900">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-500 dark:text-surface-400">On Leave</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">{stats.onLeave}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Records */}
        <Card className="bg-white dark:bg-surface-900">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Attendance Records
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-12 text-surface-500 dark:text-surface-400">
                Loading team attendance...
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-surface-300 dark:text-surface-600 mx-auto mb-4" />
                <p className="text-surface-500 dark:text-surface-400">
                  No attendance records found for this date
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-surface-50 dark:bg-surface-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                        Employee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                        Check In
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                        Check Out
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                        Work Hours
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                        Source
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                        Remarks
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                    {records.map((record) => (
                      <tr key={record.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-surface-900 dark:text-surface-50">
                          {record.employeeId.substring(0, 8)}...
                        </td>
                        <td className="px-6 py-4 text-sm text-surface-600 dark:text-surface-400">
                          {formatTime(record.checkInTime)}
                        </td>
                        <td className="px-6 py-4 text-sm text-surface-600 dark:text-surface-400">
                          {formatTime(record.checkOutTime)}
                        </td>
                        <td className="px-6 py-4 text-sm text-surface-600 dark:text-surface-400">
                          {record.totalWorkHours?.toFixed(2) || '--'} hrs
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(record.status)}`}>
                            {record.status || 'PRESENT'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-surface-600 dark:text-surface-400">
                          {record.checkInSource || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-surface-600 dark:text-surface-400">
                          {record.isRegularization && (
                            <span className="text-orange-600 dark:text-orange-400 font-medium">Regularized</span>
                          )}
                          {record.remarks && (
                            <div className="text-xs text-surface-500 dark:text-surface-500 max-w-xs truncate" title={record.remarks}>
                              {record.remarks}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card
            isClickable
            onClick={() => router.push('/attendance')}
            className="bg-white dark:bg-surface-900 cursor-pointer"
          >
            <CardContent className="p-6">
              <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-950/30 flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-2">My Attendance</h3>
              <p className="text-surface-500 dark:text-surface-400 text-sm">View your own attendance</p>
            </CardContent>
          </Card>

          <Card
            isClickable
            onClick={() => router.push('/attendance/regularization')}
            className="bg-white dark:bg-surface-900 cursor-pointer"
          >
            <CardContent className="p-6">
              <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-2">Regularization Requests</h3>
              <p className="text-surface-500 dark:text-surface-400 text-sm">Review correction requests</p>
            </CardContent>
          </Card>

          <Card
            isClickable
            onClick={() => window.print()}
            className="bg-white dark:bg-surface-900 cursor-pointer"
          >
            <CardContent className="p-6">
              <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center mb-4">
                <Printer className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-2">Print Report</h3>
              <p className="text-surface-500 dark:text-surface-400 text-sm">Generate attendance report</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
