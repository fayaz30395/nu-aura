'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Clock,
  LogIn,
  LogOut,
  Calendar,
  MapPin,
  Globe,
  Monitor,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Timer,
  CalendarDays,
  ClipboardCheck,
  History,
  TrendingUp,
  Activity,
  Coffee,
  BarChart3,
  Target,
  ArrowRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui';
import { useAuth } from '@/lib/hooks/useAuth';
import { AttendanceRecord } from '@/lib/types/attendance';
import { getLocalDateString, getDateOffsetString, getLocalDateTimeString } from '@/lib/utils/dateUtils';
import { motion } from 'framer-motion';
import {
  useAttendanceByDateRange,
  useCheckIn,
  useCheckOut,
  useHolidaysByYear,
} from '@/lib/hooks/queries/useAttendance';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';

// Standard working hours per day
// TODO: Make configurable per tenant shift settings
const STANDARD_WORK_HOURS = 8;

export default function AttendancePage() {
  const { user, isAuthenticated, hasHydrated } = useAuth();
  const toast = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [error, setError] = useState<string | null>(null);
  const [showCheckOutConfirm, setShowCheckOutConfirm] = useState(false);

  // Use local date strings
  const todayStr = getLocalDateString();
  const lastWeekStr = getDateOffsetString(-6);

  // Fetch today's attendance
  const { data: todayData, isLoading: todayLoading } = useAttendanceByDateRange(
    todayStr,
    todayStr,
    isAuthenticated && hasHydrated
  );

  // Fetch weekly attendance
  const { data: weeklyData, isLoading: weeklyLoading } = useAttendanceByDateRange(
    lastWeekStr,
    todayStr,
    isAuthenticated && hasHydrated
  );

  // Fetch holidays for this year
  const currentYear = new Date().getFullYear();
  const { data: holidaysData } = useHolidaysByYear(currentYear);

  // Mutations
  const checkInMutation = useCheckIn();
  const checkOutMutation = useCheckOut();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayRecord: AttendanceRecord | null = todayData && todayData.length > 0 ? todayData[0] : null;
  const weeklyRecords: AttendanceRecord[] = weeklyData || [];

  const handleCheckIn = async () => {
    try {
      setError(null);

      if (!user?.employeeId) {
        setError('User not found. Please login again.');
        return;
      }

      let location = 'Location unavailable';
      try {
        if (navigator.geolocation) {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          location = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
        }
      } catch (e) {
        // Location services unavailable
        toast.info('Location services unavailable. Attendance will be recorded without location.');
      }

      // Use local date-time string to ensure correct timezone handling
      const localTimeString = getLocalDateTimeString();

      await checkInMutation.mutateAsync({
        employeeId: user.employeeId,
        checkInTime: localTimeString,
        source: 'WEB',
        location,
      });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to check in. Please try again.');
    }
  };

  const performCheckOut = async () => {
    try {
      setError(null);

      if (!user?.employeeId) {
        setError('User not found. Please login again.');
        return;
      }

      let location = 'Location unavailable';
      try {
        if (navigator.geolocation) {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          location = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
        }
      } catch (e) {
        // Location services unavailable
        toast.info('Location services unavailable. Attendance will be recorded without location.');
      }

      // Use local date-time string to ensure correct timezone handling
      const localTimeString = getLocalDateTimeString();

      await checkOutMutation.mutateAsync({
        employeeId: user.employeeId,
        checkOutTime: localTimeString,
        source: 'WEB',
        location,
      });
      setShowCheckOutConfirm(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to check out. Please try again.');
    }
  };

  const handleCheckOut = () => {
    setShowCheckOutConfirm(true);
  };

  const calculateHours = (checkInStr?: string, checkOutStr?: string) => {
    if (!checkInStr) return 0;
    const start = new Date(checkInStr).getTime();
    const end = checkOutStr ? new Date(checkOutStr).getTime() : new Date().getTime();
    return Math.max(0, (end - start) / (1000 * 60 * 60));
  };

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const chartData = useMemo(() => {
    // Generate last 7 days placeholder
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

      const record = weeklyRecords.find(r => r.attendanceDate === dateStr);
      const hours = record ? calculateHours(record.checkInTime, record.checkOutTime) : 0;

      days.push({
        name: dayName,
        date: dateStr,
        hours: parseFloat(hours.toFixed(1)),
        isToday: i === 0
      });
    }
    return days;
  }, [weeklyRecords]);

  const stats = useMemo(() => {
    const totalHours = weeklyRecords.reduce((acc, curr) =>
      acc + calculateHours(curr.checkInTime, curr.checkOutTime), 0);
    const avgHours = weeklyRecords.length ? totalHours / weeklyRecords.length : 0;

    const checkInTimes = weeklyRecords
      .filter((r): r is AttendanceRecord & { checkInTime: string } => !!r.checkInTime)
      .map(r => new Date(r.checkInTime).getHours() * 60 + new Date(r.checkInTime).getMinutes());

    let avgCheckInStr = '--:--';
    if (checkInTimes.length) {
      const avgMins = checkInTimes.reduce((a, b) => a + b, 0) / checkInTimes.length;
      const h = Math.floor(avgMins / 60);
      const m = Math.floor(avgMins % 60);
      avgCheckInStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }

    return {
      avgHours: avgHours.toFixed(1),
      avgCheckIn: avgCheckInStr,
      presentDays: weeklyRecords.length
    };
  }, [weeklyRecords]);

  const currentWorkHours = useMemo(() => {
    return calculateHours(todayRecord?.checkInTime);
  }, [todayRecord, currentTime]); // Update when time changes

  const isCheckedIn = !!todayRecord?.checkInTime;
  const isCheckedOut = !!todayRecord?.checkOutTime;
  const dayComplete = isCheckedIn && isCheckedOut;

  // Custom Skeleton Loader
  const DashboardSkeleton = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  );

  const dataLoading = todayLoading || weeklyLoading;

  if (dataLoading) {
    return (
      <AppLayout activeMenuItem="attendance">
        <div className="p-6">
          <DashboardSkeleton />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="attendance">
      <motion.div
        className="p-4 md:p-5 lg:p-6 max-w-[1600px] mx-auto space-y-4"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        {/* Compact Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Clock className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Attendance</h1>
            </div>
            <p className="text-surface-600 dark:text-surface-400 text-xs ml-10">
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          {/* Compact Live Clock */}
          <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg shadow-sm border border-surface-200 dark:border-surface-700">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center animate-pulse">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-[10px] font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">Live Time</div>
              <div className="text-xl font-mono font-bold text-surface-900 dark:text-white tabular-nums">
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 rounded-lg flex items-start gap-2 text-red-700 dark:text-red-400 shadow-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">Error</p>
              <p className="text-xs">{error}</p>
            </div>
          </div>
        )}

        {/* Compact Main Section - Clock In/Out */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Attendance Card */}
          <div className="lg:col-span-2">
            <Card className="bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 text-white overflow-hidden relative border-0 shadow-lg">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

              <CardContent className="flex flex-col justify-between p-5 lg:p-6 relative z-10">
                {/* Compact Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-[10px] font-semibold uppercase tracking-wider">
                      <div className="h-1.5 w-1.5 bg-green-400 rounded-full animate-pulse" />
                      Today&apos;s Shift
                    </div>
                    <div className="text-2xl lg:text-3xl font-bold text-white">
                      {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl lg:text-5xl font-bold font-mono tracking-tight tabular-nums">
                      {currentTime.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="flex items-center gap-2 text-indigo-100 justify-end mt-1">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">{todayRecord?.checkInLocation || 'Location unavailable'}</span>
                    </div>
                  </div>
                </div>

                {/* Action Section */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-4">
                    <div>
                      <div className="text-xs text-indigo-200 mb-0.5">Check In</div>
                      <div className="text-lg font-bold tabular-nums">
                        {todayRecord?.checkInTime ? new Date(todayRecord.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </div>
                    </div>
                    {isCheckedIn && (
                      <div>
                        <div className="text-xs text-indigo-200 mb-0.5">Duration</div>
                        <div className="text-lg font-bold tabular-nums">{formatDuration(currentWorkHours)}</div>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div>
                    {dayComplete ? (
                      <div className="bg-white/20 backdrop-blur-md rounded-2xl px-5 py-3 text-center border border-white/30">
                        <CheckCircle className="h-8 w-8 text-emerald-300 mx-auto mb-1" />
                        <div className="text-sm font-bold">Day Complete!</div>
                        <div className="text-xs text-indigo-100 mt-0.5">{formatDuration(calculateHours(todayRecord?.checkInTime, todayRecord?.checkOutTime))} worked</div>
                      </div>
                    ) : !isCheckedIn ? (
                      <Button
                        onClick={handleCheckIn}
                        isLoading={checkInMutation.isPending}
                        className="h-12 px-6 text-base font-semibold bg-white text-indigo-600 hover:bg-white/95 border-0 shadow-lg hover:shadow-xl hover:scale-105 transition-all rounded-xl"
                      >
                        <LogIn className="h-5 w-5 mr-2" />
                        Check In
                      </Button>
                    ) : (
                      <Button
                        onClick={handleCheckOut}
                        isLoading={checkOutMutation.isPending}
                        className="h-12 px-6 text-base font-semibold bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:from-rose-600 hover:to-pink-700 border-0 shadow-lg hover:shadow-xl hover:scale-105 transition-all rounded-xl"
                      >
                        <LogOut className="h-5 w-5 mr-2" />
                        Check Out
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Compact Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
            {/* Check In Time */}
            <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
                    <LogIn className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-[10px] font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">Check In</p>
                </div>
                <p className="text-2xl font-bold text-surface-900 dark:text-white tabular-nums">
                  {todayRecord?.checkInTime ? new Date(todayRecord.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                </p>
                <p className="text-[10px] text-surface-500 dark:text-surface-400 mt-1">
                  {todayRecord?.checkInTime ? 'Checked in' : 'Not yet'}
                </p>
              </CardContent>
            </Card>

            {/* Work Duration */}
            <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-sm">
                    <Timer className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-[10px] font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">Duration</p>
                </div>
                <p className="text-2xl font-bold text-surface-900 dark:text-white tabular-nums">
                  {formatDuration(currentWorkHours)}
                </p>
                <p className="text-[10px] text-surface-500 dark:text-surface-400 mt-1">
                  {isCheckedIn ? 'Working' : 'Not started'}
                </p>
              </CardContent>
            </Card>

            {/* Weekly Averages Combined */}
            <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 hover:shadow-lg transition-shadow col-span-2 lg:col-span-1">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-sm">
                        <Activity className="h-3.5 w-3.5 text-white" />
                      </div>
                      <p className="text-[10px] font-semibold text-surface-500 dark:text-surface-400 uppercase">Avg In</p>
                    </div>
                    <p className="text-xl font-bold text-surface-900 dark:text-white tabular-nums">
                      {stats.avgCheckIn}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm">
                        <Target className="h-3.5 w-3.5 text-white" />
                      </div>
                      <p className="text-[10px] font-semibold text-surface-500 dark:text-surface-400 uppercase">Avg Hrs</p>
                    </div>
                    <p className="text-xl font-bold text-surface-900 dark:text-white tabular-nums">
                      {stats.avgHours}h
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Compact Analytics and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Weekly Chart */}
          <Card className="lg:col-span-2 border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="border-b border-surface-200 dark:border-surface-700 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <BarChart3 className="h-4 w-4 text-white" />
                  </div>
                  Weekly Overview
                </CardTitle>
                <div className="flex items-center gap-1.5 text-xs text-surface-600 dark:text-surface-400">
                  <Calendar className="h-3.5 w-3.5" />
                  Last 7 days
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-surface-700" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 500 }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9CA3AF', fontSize: 11 }}
                  />
                  <Tooltip
                    cursor={{ fill: '#F3F4F6', opacity: 0.5 }}
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      padding: '8px 12px',
                      fontSize: '13px'
                    }}
                  />
                  <Bar dataKey="hours" radius={[6, 6, 0, 0]} maxBarSize={50} aria-label="Daily working hours">
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.hours >= STANDARD_WORK_HOURS
                            ? '#10B981'
                            : entry.isToday
                            ? '#6366F1'
                            : entry.hours > 0
                            ? '#F59E0B'
                            : '#E5E7EB'
                        }
                        aria-label={`${entry.name}: ${entry.hours} hours`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div className="flex items-center justify-center gap-4 mt-3 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded bg-emerald-500" aria-label="Full day indicator" />
                  <span className="text-surface-600 dark:text-surface-400">Full Day ({STANDARD_WORK_HOURS}h+)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded bg-indigo-500" aria-label="Today indicator" />
                  <span className="text-surface-600 dark:text-surface-400">Today</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded bg-amber-500" aria-label="Partial day indicator" />
                  <span className="text-surface-600 dark:text-surface-400">Partial</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="space-y-3">
            <Link href="/attendance/my-attendance" className="block group">
              <Card className="border-0 shadow-md hover:shadow-lg transition-all cursor-pointer hover:-translate-y-0.5 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      <History className="h-5 w-5 text-white" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-surface-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="text-base font-bold text-surface-900 dark:text-white mb-0.5">Attendance History</h3>
                  <p className="text-xs text-surface-600 dark:text-surface-400">View complete records</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/attendance/regularization" className="block group">
              <Card className="border-0 shadow-md hover:shadow-lg transition-all cursor-pointer hover:-translate-y-0.5 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      <ClipboardCheck className="h-5 w-5 text-white" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-surface-400 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="text-base font-bold text-surface-900 dark:text-white mb-0.5">Regularization</h3>
                  <p className="text-xs text-surface-600 dark:text-surface-400">Request corrections</p>
                </CardContent>
              </Card>
            </Link>

            {/* This Week Info */}
            <Card className="border-0 shadow-md bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-800 dark:to-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Coffee className="h-4 w-4 text-surface-500" />
                  <h4 className="text-sm font-semibold text-surface-900 dark:text-white">This Week</h4>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-surface-600 dark:text-surface-400">Present Days</span>
                    <span className="font-bold text-surface-900 dark:text-white">{stats.presentDays}/7</span>
                  </div>
                  <div className="h-1.5 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                      style={{ width: `${(stats.presentDays / 7) * 100}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Checkout Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showCheckOutConfirm}
          onClose={() => setShowCheckOutConfirm(false)}
          onConfirm={performCheckOut}
          title="Confirm Check Out"
          message="Are you sure you want to check out? Your working hours will be recorded."
          confirmText="Check Out"
          cancelText="Cancel"
          type="warning"
          loading={checkOutMutation.isPending}
        />
      </motion.div>
    </AppLayout>
  );
}
