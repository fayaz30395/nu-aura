'use client';

import React, {useEffect, useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {useRouter} from 'next/navigation';
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  FileText,
  Home,
  LogIn,
  LogOut,
  Sun,
  XCircle,
} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/Card';
import {useAuth} from '@/lib/hooks/useAuth';
import {
  useAttendanceByDateRange,
  useCheckIn,
  useCheckOut,
  useMyTimeEntries,
  useRequestRegularization
} from '@/lib/hooks/queries/useAttendance';
import {AttendanceRecord, AttendanceStatus} from '@/lib/types/hrms/attendance';
import {
  getLocalDateString,
  getLocalDateTimeString,
  getMonthEndString,
  getMonthStartString
} from '@/lib/utils/dateUtils';
import {createLogger} from '@/lib/utils/logger';

const log = createLogger('AttendancePage');

// DEF-42: Zod schema for regularization form
const regularizationSchema = z.object({
  reason: z.string().min(1, 'Reason is required').max(1000, 'Reason must be 1000 characters or less'),
});

type RegularizationFormData = z.infer<typeof regularizationSchema>;

export default function MyAttendancePage() {
  const router = useRouter();
  const {user, isAuthenticated, hasHydrated} = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showRegularizationModal, setShowRegularizationModal] = useState(false);
  const [regularizingRecord, setRegularizingRecord] = useState<AttendanceRecord | null>(null);

  // DEF-42: React Hook Form + Zod for regularization modal
  const {
    register: registerRegularization,
    handleSubmit: handleRegularizationSubmit,
    reset: resetRegularization,
    watch: watchRegularization,
    formState: {errors: regularizationErrors},
  } = useForm<RegularizationFormData>({
    resolver: zodResolver(regularizationSchema),
    defaultValues: {reason: ''},
  });

  const startOfMonth = getMonthStartString(currentDate.getFullYear(), currentDate.getMonth());
  const endOfMonth = getMonthEndString(currentDate.getFullYear(), currentDate.getMonth());

  const {
    data: attendance = [],
    isLoading: isLoadingAttendance
  } = useAttendanceByDateRange(startOfMonth, endOfMonth, Boolean(hasHydrated && user?.employeeId));
  const todayDateStr = getLocalDateString();
  const {
    data: selectedDateTimeEntries = [],
    isLoading: isLoadingTimeEntries
  } = useMyTimeEntries(selectedDate ? getLocalDateString(selectedDate) : todayDateStr, Boolean(selectedDate));

  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  const requestRegularization = useRequestRegularization();

  const isLoading = isLoadingAttendance;

  const todayAttendance = attendance.find((a) => {
    const recordDate = a.attendanceDate?.includes('T')
      ? a.attendanceDate.split('T')[0]
      : a.attendanceDate;
    return recordDate === todayDateStr;
  });

  useEffect(() => {
    // Wait for auth store to hydrate before checking authentication
    if (!hasHydrated) return;

    if (!isAuthenticated) {
      router.push('/auth/login');
    } else if (user?.employeeId) {
      // Set selectedDate to today when component mounts
      setSelectedDate(new Date());
    }
  }, [hasHydrated, isAuthenticated, user, router]);

  const handleDateSelect = (day: Date) => {
    setSelectedDate(day);
  };

  const handleCheckIn = async () => {
    try {
      setError(null);

      // Use utility functions for consistent timezone handling
      const localDate = getLocalDateString();
      const localTime = getLocalDateTimeString();

      await checkIn.mutateAsync({
        employeeId: user!.employeeId!,
        checkInTime: localTime,
        attendanceDate: localDate,
      });
    } catch (err: unknown) {
      log.error('Failed to check in:', err);
      setError((err as {
        response?: { data?: { message?: string } }
      })?.response?.data?.message || 'Failed to check in');
    }
  };

  const handleCheckOut = async () => {
    try {
      setError(null);

      // Use utility functions for consistent timezone handling
      const localDate = getLocalDateString();
      const localTime = getLocalDateTimeString();

      await checkOut.mutateAsync({
        employeeId: user!.employeeId!,
        checkOutTime: localTime,
        attendanceDate: localDate,
      });
    } catch (err: unknown) {
      log.error('Failed to check out:', err);
      setError((err as {
        response?: { data?: { message?: string } }
      })?.response?.data?.message || 'Failed to check out');
    }
  };

  const handleRequestRegularization = async (formData: RegularizationFormData) => {
    if (!regularizingRecord) return;

    try {
      setError(null);
      await requestRegularization.mutateAsync({
        id: regularizingRecord.id,
        data: {
          reason: formData.reason,
        },
      });

      setShowRegularizationModal(false);
      resetRegularization();
      setRegularizingRecord(null);
    } catch (err: unknown) {
      log.error('Failed to request regularization:', err);
      setError((err as {
        response?: { data?: { message?: string } }
      })?.response?.data?.message || 'Failed to request regularization');
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

  const hasCheckedIn = Boolean(todayAttendance?.checkInTime);
  const hasCheckedOut = Boolean(todayAttendance?.checkOutTime);
  const canCheckIn = !hasCheckedIn;
  const canCheckOut = hasCheckedIn && !hasCheckedOut;
  const attendanceComplete = hasCheckedIn && hasCheckedOut;

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case 'PRESENT':
        return 'badge-status status-success';
      case 'ABSENT':
        return 'badge-status status-danger';
      case 'HALF_DAY':
        return 'badge-status status-warning';
      case 'ON_LEAVE':
        return 'badge-status status-info';
      case 'WEEKLY_OFF':
        return 'badge-status status-neutral';
      case 'HOLIDAY':
        return 'badge-status status-info';
      case 'PENDING_REGULARIZATION':
        return 'badge-status status-warning';
      default:
        return 'badge-status status-neutral';
    }
  };

  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case 'PRESENT':
        return <CheckCircle className="h-3 w-3"/>;
      case 'ABSENT':
        return <XCircle className="h-3 w-3"/>;
      case 'ON_LEAVE':
        return <Coffee className="h-3 w-3"/>;
      case 'WEEKLY_OFF':
        return <Home className="h-3 w-3"/>;
      case 'HOLIDAY':
        return <Sun className="h-3 w-3"/>;
      case 'PENDING_REGULARIZATION':
        return <AlertTriangle className="h-3 w-3"/>;
      default:
        return <Clock className="h-3 w-3"/>;
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
          <div
            className='w-12 h-12 border-4 border-[var(--accent-primary)] border-t-accent-700 rounded-full animate-spin'/>
        </div>
      </AppLayout>
    );
  }

  if (!user?.employeeId) {
    return (
      <AppLayout activeMenuItem="my-attendance">
        <div className="text-center py-12">
          <Clock className="h-16 w-16 mx-auto text-[var(--text-muted)] mb-4"/>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">No Employee Profile Linked</h2>
          <p className="text-[var(--text-muted)] max-w-md mx-auto">
            Attendance tracking requires an employee profile. Use the admin panels to manage team attendance.
          </p>
          <button
            onClick={() => router.push('/attendance/team')}
            className='mt-6 px-4 py-2 bg-accent text-inverse rounded-lg hover:bg-accent-hover transition-colors'
          >
            View Team Attendance
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="my-attendance">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold skeuo-emboss">My Attendance</h1>
          <p className="text-[var(--text-secondary)] mt-1 skeuo-deboss">Track your attendance and working hours</p>
        </div>

        {error && (
          <div className='p-4 bg-status-danger-bg border border-status-danger-border rounded-lg'>
            <p className='text-status-danger-text font-medium'>{error}</p>
            <button
              onClick={() => setError(null)}
              className='text-status-danger-text text-sm mt-2 underline'
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Check-in/Check-out Card */}
        <Card className="skeuo-card">
          <CardContent className="pt-6">
            <div className="row-between">
              <div>
                <h3 className="text-xl font-semibold text-[var(--text-primary)] skeuo-emboss">Today&apos;s Status</h3>
                {todayAttendance && (
                  <div className="mt-2 space-y-1">
                    <p className="text-body-secondary">
                      Check-in: <span className="font-medium">{formatTime(todayAttendance.checkInTime)}</span>
                    </p>
                    <p className="text-body-secondary">
                      Check-out: <span className="font-medium">{formatTime(todayAttendance.checkOutTime)}</span>
                    </p>
                    {todayAttendance.workDurationMinutes !== undefined && (
                      <p className="text-body-secondary">
                        Work Duration: <span
                        className="font-medium">{formatDuration(todayAttendance.workDurationMinutes)}</span>
                      </p>
                    )}
                    {todayAttendance.isLate && (
                      <p className='text-sm text-status-warning-text font-medium'>
                        Late by {todayAttendance.lateByMinutes} minutes
                      </p>
                    )}
                  </div>
                )}
                {!todayAttendance && (
                  <p className="text-body-muted mt-2">No attendance record for today</p>
                )}
              </div>
              <div className="flex gap-4">
                {canCheckIn && (
                  <button
                    onClick={handleCheckIn}
                    disabled={checkIn.isPending || checkOut.isPending}
                    className='flex items-center gap-2 px-6 py-4 bg-status-success-bg text-inverse rounded-lg hover:bg-status-success-bg disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
                  >
                    <LogIn className="h-5 w-5"/>
                    {checkIn.isPending || checkOut.isPending ? 'Checking In...' : 'Check In'}
                  </button>
                )}
                {canCheckOut && (
                  <button
                    onClick={handleCheckOut}
                    disabled={checkIn.isPending || checkOut.isPending}
                    className='flex items-center gap-2 px-6 py-4 bg-accent text-inverse rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
                  >
                    <LogOut className="h-5 w-5"/>
                    {checkIn.isPending || checkOut.isPending ? 'Checking Out...' : 'Check Out'}
                  </button>
                )}
                {attendanceComplete && (
                  <div
                    className="flex items-center gap-2 px-6 py-4 rounded-lg border border-success-600/30 bg-success-600/10">
                    <CheckCircle className='h-5 w-5 text-status-success-text'/>
                    <span className='text-sm font-semibold text-status-success-text'>Attendance Completed</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="skeuo-card">
            <CardContent className="pt-6">
              <div className="row-between">
                <div>
                  <p className="text-body-secondary skeuo-deboss">Present Days</p>
                  <p className="text-xl font-bold skeuo-emboss">{monthStats.present}</p>
                </div>
                <div className='w-12 h-12 bg-status-success-bg rounded-full flex items-center justify-center'>
                  <CheckCircle className='h-6 w-6 text-status-success-text'/>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="skeuo-card">
            <CardContent className="pt-6">
              <div className="row-between">
                <div>
                  <p className="text-body-secondary skeuo-deboss">Absent Days</p>
                  <p className="text-xl font-bold skeuo-emboss">{monthStats.absent}</p>
                </div>
                <div className='w-12 h-12 bg-status-danger-bg rounded-full flex items-center justify-center'>
                  <XCircle className='h-6 w-6 text-status-danger-text'/>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="skeuo-card">
            <CardContent className="pt-6">
              <div className="row-between">
                <div>
                  <p className="text-body-secondary skeuo-deboss">On Leave</p>
                  <p className="text-xl font-bold skeuo-emboss">{monthStats.leave}</p>
                </div>
                <div className='w-12 h-12 bg-accent-subtle rounded-full flex items-center justify-center'>
                  <Coffee className='h-6 w-6 text-accent'/>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="skeuo-card">
            <CardContent className="pt-6">
              <div className="row-between">
                <div>
                  <p className="text-body-secondary skeuo-deboss">Avg. Hours/Day</p>
                  <p className="text-xl font-bold skeuo-emboss">
                    {monthStats.avgHours.toFixed(1)}
                  </p>
                </div>
                <div className='w-12 h-12 bg-accent-subtle rounded-full flex items-center justify-center'>
                  <Clock className='h-6 w-6 text-accent'/>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Calendar */}
          <Card className="lg:col-span-2 card-aura">
            <CardHeader>
              <div className="row-between">
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5"/>
                  Attendance Calendar
                </CardTitle>
                <div className="flex items-center gap-2">
                  <button
                    onClick={previousMonth}
                    className="p-2 hover:bg-[var(--bg-card-hover)] rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                  >
                    <ChevronLeft className="h-5 w-5"/>
                  </button>
                  <span className="font-semibold text-lg min-w-[150px] text-center">
                    {currentDate.toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                  <button
                    onClick={nextMonth}
                    className="p-2 hover:bg-[var(--bg-card-hover)] rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                  >
                    <ChevronRight className="h-5 w-5"/>
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center text-xs font-semibold text-[var(--text-muted)] py-1">
                    {day}
                  </div>
                ))}
                {getDaysInMonth().map((day, index) => {
                  if (!day) {
                    return <div key={`empty-${index}`} className="aspect-square"/>;
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
                          ? 'border-accent-500 bg-accent-50 shadow-[var(--shadow-card)]'
                          : 'border-[var(--border-subtle)] hover:border-[var(--border-main)] hover:bg-[var(--bg-surface)]'
                      } ${isToday ? 'ring-2 ring-accent-300' : ''}`}
                    >
                      <div className="flex flex-col items-center justify-center h-full gap-0.5">
                        <span
                          className={`text-xs font-medium ${
                            isToday ? 'text-accent-700' : 'text-[var(--text-secondary)]'
                          }`}
                        >
                          {day.getDate()}
                        </span>
                        {attendanceRecord && (
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center ${getStatusColor(attendanceRecord.status)}`}>
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
          <Card className="card-aura">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5"/>
                Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDate ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-body-secondary">Date</p>
                    <p className="text-lg font-semibold text-[var(--text-primary)]">
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
                        <p className="text-body-secondary">Status</p>
                        <span
                          className={`inline-flex items-center gap-1 px-4 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedAttendance.status)}`}>
                          {getStatusIcon(selectedAttendance.status)}
                          {selectedAttendance.status?.replace(/_/g, ' ') ?? '-'}
                        </span>
                      </div>

                      {selectedAttendance.workDurationMinutes !== undefined && (
                        <div>
                          <p className="text-body-secondary">Total Work Duration</p>
                          <p className="text-md font-medium text-[var(--text-primary)]">
                            {formatDuration(selectedAttendance.workDurationMinutes)}
                          </p>
                        </div>
                      )}

                      {selectedAttendance.isLate && (
                        <div className='p-2 bg-status-warning-bg border border-status-warning-border rounded-lg'>
                          <p className='text-sm text-status-warning-text font-medium'>
                            Late by {selectedAttendance.lateByMinutes} minutes
                          </p>
                        </div>
                      )}

                      {selectedAttendance.regularizationRequested && (
                        <div className='p-2 bg-accent-subtle border border-[var(--accent-primary)] rounded-lg'>
                          <p className='text-sm text-accent font-medium'>Regularization Requested</p>
                          <p className='text-xs text-accent mt-1'>
                            Status: {selectedAttendance.regularizationApproved ? 'Approved' : 'Pending'}
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Sessions */}
                  <div className="pt-4 border-t border-[var(--border-main)]">
                    <div className="row-between mb-2">
                      <p className="text-sm font-medium text-[var(--text-secondary)]">Sessions</p>
                      {selectedDateTimeEntries.length > 0 && (
                        <span className='text-sm font-bold text-accent'>
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
                        <div
                          className='w-6 h-6 border-2 border-[var(--accent-primary)] border-t-accent-700 rounded-full animate-spin'/>
                      </div>
                    ) : selectedDateTimeEntries.length === 0 ? (
                      <p className="text-body-muted py-2">No sessions recorded</p>
                    ) : (
                      <div className="space-y-2 max-h-[250px] overflow-y-auto">
                        {selectedDateTimeEntries.map((entry) => (
                          <div
                            key={entry.id}
                            className={`p-2 rounded-lg border text-sm ${
                              entry.open
                                ? 'bg-success-50 border-success-200'
                                : 'bg-[var(--bg-surface)] border-[var(--border-main)]'
                            }`}
                          >
                            <div className="row-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold ${
                                    entry.open ? 'bg-success-600 text-white' : 'bg-[var(--border-main)] text-[var(--text-secondary)]'
                                  }`}>
                                  {entry.sequenceNumber}
                                </span>
                                <div>
                                  <div className="flex items-center gap-1">
                                    <LogIn className='h-3 w-3 text-status-success-text'/>
                                    <span>{formatTime(entry.checkInTime)}</span>
                                    {entry.checkOutTime ? (
                                      <>
                                        <span className="text-[var(--text-muted)] mx-1">-</span>
                                        <LogOut className='h-3 w-3 text-accent'/>
                                        <span>{formatTime(entry.checkOutTime)}</span>
                                      </>
                                    ) : (
                                      <span className='text-status-success-text ml-1 italic text-xs'>Active</span>
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
                      className='w-full px-4 py-2 bg-status-warning-bg text-inverse rounded-lg hover:bg-status-warning-bg transition-colors text-sm'
                    >
                      Request Regularization
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-[var(--text-muted)]">
                  <p>Select a date to view details</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Regularization Modal — DEF-42: React Hook Form + Zod */}
      {showRegularizationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-elevated)] rounded-lg p-6 w-full max-w-md card-aura">
            <h3
              className="text-xl font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-4 skeuo-emboss">
              Request Regularization
            </h3>
            <form onSubmit={handleRegularizationSubmit(handleRequestRegularization)}>
              <div className="mb-4">
                <label htmlFor="regularization-reason"
                       className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Reason
                </label>
                <textarea
                  id="regularization-reason"
                  {...registerRegularization('reason')}
                  className="w-full px-4 py-2 border border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                  rows={4}
                  placeholder="Please explain why you need regularization..."
                />
                {regularizationErrors.reason && (
                  <p className='mt-1 text-sm text-status-danger-text'>{regularizationErrors.reason.message}</p>
                )}
              </div>
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowRegularizationModal(false);
                    resetRegularization();
                    setRegularizingRecord(null);
                  }}
                  className="px-4 py-2 border border-[var(--border-main)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-surface)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!watchRegularization('reason')?.trim()}
                  className='px-4 py-2 bg-accent text-inverse rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
