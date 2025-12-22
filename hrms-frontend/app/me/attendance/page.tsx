'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  FileText,
  Coffee,
  Home,
  Sun,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuth } from '@/lib/hooks/useAuth';
import { attendanceService } from '@/lib/services/attendance.service';
import { AttendanceRecord, AttendanceStatus, TimeEntry } from '@/lib/types/attendance';

export default function MyAttendancePage() {
  const router = useRouter();
  const { user, isAuthenticated, hasHydrated } = useAuth();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [showRegularizationModal, setShowRegularizationModal] = useState(false);
  const [regularizationReason, setRegularizationReason] = useState('');
  const [regularizingRecord, setRegularizingRecord] = useState<AttendanceRecord | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]); // Today's time entries for button logic
  const [selectedDateTimeEntries, setSelectedDateTimeEntries] = useState<TimeEntry[]>([]); // Selected date's time entries
  const [isLoadingTimeEntries, setIsLoadingTimeEntries] = useState(false);

  useEffect(() => {
    // Wait for auth store to hydrate before checking authentication
    if (!hasHydrated) return;

    if (!isAuthenticated) {
      router.push('/auth/login');
    } else if (user?.employeeId) {
      loadAttendance();
    }
  }, [hasHydrated, isAuthenticated, user, router, currentDate]);

  const loadAttendance = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const data = await attendanceService.getAttendanceByDateRange(
        user!.employeeId!,
        startOfMonth.toISOString().split('T')[0],
        endOfMonth.toISOString().split('T')[0]
      );
      setAttendance(data);

      // Use local date format (YYYY-MM-DD) to match backend's LocalDate
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const todayRecord = data.find((a) => {
        const recordDate = a.attendanceDate?.includes('T')
          ? a.attendanceDate.split('T')[0]
          : a.attendanceDate;
        return recordDate === today;
      });
      setTodayAttendance(todayRecord || null);

      // Load today's time entries and set today as selected
      setSelectedDate(now);
      await loadTimeEntries(today, true);
    } catch (err: any) {
      console.error('Failed to load attendance:', err);
      setError(err.response?.data?.message || 'Failed to load attendance');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTimeEntries = async (date: string, isToday: boolean = false) => {
    try {
      setIsLoadingTimeEntries(true);
      const entries = await attendanceService.getMyTimeEntries(user!.employeeId!, date);
      if (isToday) {
        setTimeEntries(entries);
      }
      setSelectedDateTimeEntries(entries);
    } catch (err: any) {
      console.error('Failed to load time entries:', err);
      // Don't show error for time entries - it's not critical
      if (isToday) {
        setTimeEntries([]);
      }
      setSelectedDateTimeEntries([]);
    } finally {
      setIsLoadingTimeEntries(false);
    }
  };

  const handleDateSelect = async (day: Date) => {
    setSelectedDate(day);
    const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    await loadTimeEntries(dateStr, false);
  };

  const handleCheckIn = async () => {
    try {
      setIsCheckingIn(true);
      setError(null);

      // Get local date in YYYY-MM-DD format to handle timezone differences
      const now = new Date();
      const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      await attendanceService.checkIn({
        employeeId: user!.employeeId!,
        checkInTime: now.toISOString(),
        attendanceDate: localDate,
      });

      await loadAttendance();
    } catch (err: any) {
      console.error('Failed to check in:', err);
      setError(err.response?.data?.message || 'Failed to check in');
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setIsCheckingIn(true);
      setError(null);

      // Get local date in YYYY-MM-DD format to handle timezone differences
      const now = new Date();
      const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      await attendanceService.checkOut({
        employeeId: user!.employeeId!,
        checkOutTime: now.toISOString(),
        attendanceDate: localDate,
      });

      await loadAttendance();
    } catch (err: any) {
      console.error('Failed to check out:', err);
      setError(err.response?.data?.message || 'Failed to check out');
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleRequestRegularization = async () => {
    if (!regularizingRecord || !regularizationReason.trim()) return;

    try {
      setError(null);
      await attendanceService.requestRegularization(regularizingRecord.id, {
        reason: regularizationReason,
      });

      setShowRegularizationModal(false);
      setRegularizationReason('');
      setRegularizingRecord(null);
      await loadAttendance();
    } catch (err: any) {
      console.error('Failed to request regularization:', err);
      setError(err.response?.data?.message || 'Failed to request regularization');
    }
  };

  const formatTime = (time: string | undefined) => {
    if (!time) return '--:--';
    return new Date(time).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDuration = (minutes: number | undefined) => {
    if (!minutes) return '0h 0m';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case 'PRESENT':
        return 'bg-green-100 text-green-800';
      case 'ABSENT':
        return 'bg-red-100 text-red-800';
      case 'HALF_DAY':
        return 'bg-orange-100 text-orange-800';
      case 'ON_LEAVE':
        return 'bg-blue-100 text-blue-800';
      case 'WEEKLY_OFF':
        return 'bg-slate-100 text-slate-800';
      case 'HOLIDAY':
        return 'bg-purple-100 text-purple-800';
      case 'PENDING_REGULARIZATION':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case 'PRESENT':
        return <CheckCircle className="h-3 w-3" />;
      case 'ABSENT':
        return <XCircle className="h-3 w-3" />;
      case 'ON_LEAVE':
        return <Coffee className="h-3 w-3" />;
      case 'WEEKLY_OFF':
        return <Home className="h-3 w-3" />;
      case 'HOLIDAY':
        return <Sun className="h-3 w-3" />;
      case 'PENDING_REGULARIZATION':
        return <AlertTriangle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getAttendanceForDate = (date: Date) => {
    // Use local date format to avoid UTC timezone issues
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return attendance.find((a) => {
      const recordDate = a.attendanceDate?.includes('T')
        ? a.attendanceDate.split('T')[0]
        : a.attendanceDate;
      return recordDate === dateStr;
    });
  };

  const workingDaysCount = attendance.filter(a => a.workDurationMinutes && a.workDurationMinutes > 0).length;
  const monthStats = {
    present: attendance.filter((a) => a.status === 'PRESENT').length,
    absent: attendance.filter((a) => a.status === 'ABSENT').length,
    leave: attendance.filter((a) => a.status === 'ON_LEAVE').length,
    totalMinutes: attendance.reduce((sum, a) => sum + (a.workDurationMinutes || 0), 0),
    avgHours: workingDaysCount > 0
      ? attendance.reduce((sum, a) => sum + (a.workDurationMinutes || 0), 0) / workingDaysCount / 60
      : 0,
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const selectedAttendance = selectedDate ? getAttendanceForDate(selectedDate) : null;

  if (isLoading) {
    return (
      <AppLayout activeMenuItem="my-attendance">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="my-attendance">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Attendance</h1>
          <p className="text-slate-600 mt-1">Track your attendance and working hours</p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-medium">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-600 text-sm mt-2 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Check-in/Check-out Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Today's Status</h3>
                {todayAttendance && (
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-slate-600">
                      Check-in: <span className="font-medium">{formatTime(todayAttendance.checkInTime)}</span>
                    </p>
                    <p className="text-sm text-slate-600">
                      Check-out: <span className="font-medium">{formatTime(todayAttendance.checkOutTime)}</span>
                    </p>
                    {todayAttendance.workDurationMinutes !== undefined && (
                      <p className="text-sm text-slate-600">
                        Work Duration: <span className="font-medium">{formatDuration(todayAttendance.workDurationMinutes)}</span>
                      </p>
                    )}
                    {todayAttendance.isLate && (
                      <p className="text-sm text-yellow-600 font-medium">
                        Late by {todayAttendance.lateByMinutes} minutes
                      </p>
                    )}
                  </div>
                )}
                {!todayAttendance && (
                  <p className="text-sm text-slate-500 mt-2">No attendance record for today</p>
                )}
              </div>
              <div className="flex gap-3">
                {(() => {
                  // Determine if there's an open session using time entries (most accurate)
                  const hasOpenSession = timeEntries.some(e => e.open);

                  return (
                    <>
                      {/* Show Check In button if no open session */}
                      {!hasOpenSession && (
                        <button
                          onClick={handleCheckIn}
                          disabled={isCheckingIn}
                          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <LogIn className="h-5 w-5" />
                          {isCheckingIn ? 'Checking In...' : timeEntries.length > 0 ? 'Check In Again' : 'Check In'}
                        </button>
                      )}
                      {/* Show Check Out button if there's an open session */}
                      {hasOpenSession && (
                        <button
                          onClick={handleCheckOut}
                          disabled={isCheckingIn}
                          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <LogOut className="h-5 w-5" />
                          {isCheckingIn ? 'Checking Out...' : 'Check Out'}
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Present Days</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{monthStats.present}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Absent Days</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">{monthStats.absent}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">On Leave</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">{monthStats.leave}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Coffee className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Avg. Hours/Day</p>
                  <p className="text-3xl font-bold text-purple-600 mt-2">
                    {monthStats.avgHours.toFixed(1)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Calendar */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Attendance Calendar
                </CardTitle>
                <div className="flex items-center gap-2">
                  <button
                    onClick={previousMonth}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <span className="font-semibold text-lg min-w-[150px] text-center">
                    {currentDate.toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                  <button
                    onClick={nextMonth}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center text-xs font-semibold text-slate-500 py-1">
                    {day}
                  </div>
                ))}
                {getDaysInMonth().map((day, index) => {
                  if (!day) {
                    return <div key={`empty-${index}`} className="aspect-square" />;
                  }

                  const attendanceRecord = getAttendanceForDate(day);
                  const isSelected = selectedDate?.toDateString() === day.toDateString();
                  const isToday = new Date().toDateString() === day.toDateString();

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => handleDateSelect(day)}
                      className={`aspect-square p-1 rounded-md border transition-all ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50 shadow-sm'
                          : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                      } ${isToday ? 'ring-2 ring-primary-300' : ''}`}
                    >
                      <div className="flex flex-col items-center justify-center h-full gap-0.5">
                        <span
                          className={`text-xs font-medium ${
                            isToday ? 'text-primary-600' : 'text-slate-700'
                          }`}
                        >
                          {day.getDate()}
                        </span>
                        {attendanceRecord && (
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${getStatusColor(attendanceRecord.status)}`}>
                            {getStatusIcon(attendanceRecord.status)}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Attendance Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDate ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-600">Date</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {selectedDate?.toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>

                  {selectedAttendance && (
                    <>
                      <div>
                        <p className="text-sm text-slate-600">Status</p>
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedAttendance.status)}`}>
                          {getStatusIcon(selectedAttendance.status)}
                          {selectedAttendance.status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      {selectedAttendance.workDurationMinutes !== undefined && (
                        <div>
                          <p className="text-sm text-slate-600">Total Work Duration</p>
                          <p className="text-md font-medium text-slate-900">
                            {formatDuration(selectedAttendance.workDurationMinutes)}
                          </p>
                        </div>
                      )}

                      {selectedAttendance.isLate && (
                        <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800 font-medium">
                            Late by {selectedAttendance.lateByMinutes} minutes
                          </p>
                        </div>
                      )}

                      {selectedAttendance.regularizationRequested && (
                        <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-800 font-medium">Regularization Requested</p>
                          <p className="text-xs text-blue-600 mt-1">
                            Status: {selectedAttendance.regularizationApproved ? 'Approved' : 'Pending'}
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Sessions */}
                  <div className="pt-3 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-slate-700">Sessions</p>
                      {selectedDateTimeEntries.length > 0 && (
                        <span className="text-sm font-bold text-primary-600">
                          Total: {formatDuration(
                            selectedDateTimeEntries
                              .filter(e => e.entryType === 'REGULAR')
                              .reduce((sum, e) => sum + (e.durationMinutes || 0), 0)
                          )}
                        </span>
                      )}
                    </div>
                    {isLoadingTimeEntries ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                      </div>
                    ) : selectedDateTimeEntries.length === 0 ? (
                      <p className="text-sm text-slate-500 py-2">No sessions recorded</p>
                    ) : (
                      <div className="space-y-2 max-h-[250px] overflow-y-auto">
                        {selectedDateTimeEntries.map((entry) => (
                          <div
                            key={entry.id}
                            className={`p-2 rounded-lg border text-sm ${
                              entry.open
                                ? 'bg-green-50 border-green-200'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold ${
                                  entry.open ? 'bg-green-600 text-white' : 'bg-slate-300 text-slate-700'
                                }`}>
                                  {entry.sequenceNumber}
                                </span>
                                <div>
                                  <div className="flex items-center gap-1">
                                    <LogIn className="h-3 w-3 text-green-600" />
                                    <span>{formatTime(entry.checkInTime)}</span>
                                    {entry.checkOutTime ? (
                                      <>
                                        <span className="text-slate-400 mx-1">-</span>
                                        <LogOut className="h-3 w-3 text-blue-600" />
                                        <span>{formatTime(entry.checkOutTime)}</span>
                                      </>
                                    ) : (
                                      <span className="text-green-600 ml-1 italic text-xs">Active</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <span className="font-medium">
                                {entry.checkOutTime ? formatDuration(entry.durationMinutes) : '--'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedAttendance?.checkInTime && !selectedAttendance.regularizationRequested && (
                    <button
                      onClick={() => {
                        setRegularizingRecord(selectedAttendance);
                        setShowRegularizationModal(true);
                      }}
                      className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                    >
                      Request Regularization
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-slate-500">
                  <p>Select a date to view details</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Regularization Modal */}
      {showRegularizationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Request Regularization
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Reason
              </label>
              <textarea
                value={regularizationReason}
                onChange={(e) => setRegularizationReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={4}
                placeholder="Please explain why you need regularization..."
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRegularizationModal(false);
                  setRegularizationReason('');
                  setRegularizingRecord(null);
                }}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestRegularization}
                disabled={!regularizationReason.trim()}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
