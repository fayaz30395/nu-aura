'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
import { attendanceService } from '@/lib/services/attendance.service';
import { AttendanceRecord } from '@/lib/types/attendance';

export default function AttendancePage() {
  const router = useRouter();
  const { user, isAuthenticated, hasHydrated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [weeklyRecords, setWeeklyRecords] = useState<AttendanceRecord[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
    } else {
      loadData();
    }
  }, [hasHydrated, isAuthenticated, router]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    try {
      setDataLoading(true);
      if (!user?.employeeId) return;

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      // Calculate date range for the last 7 days
      const lastWeek = new Date(today);
      lastWeek.setDate(today.getDate() - 6);
      const lastWeekStr = lastWeek.toISOString().split('T')[0];

      const [todayData, weeklyData] = await Promise.all([
        attendanceService.getAttendanceByDateRange(user.employeeId, todayStr, todayStr),
        attendanceService.getAttendanceByDateRange(user.employeeId, lastWeekStr, todayStr)
      ]);

      if (todayData.length > 0) {
        setTodayRecord(todayData[0]);
      }
      setWeeklyRecords(weeklyData);
    } catch (error) {
      console.error('Error loading attendance data:', error);
      setError('Failed to load attendance data');
    } finally {
      setDataLoading(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      setLoading(true);
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
        console.log('Location not available');
      }

      let ip = 'Unknown';
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        ip = ipData.ip;
      } catch (e) {
        console.log('IP fetch failed');
      }

      const now = new Date();
      // Format to LocalDateTime string as expected by backend
      const localTimeString = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0') + 'T' +
        String(now.getHours()).padStart(2, '0') + ':' +
        String(now.getMinutes()).padStart(2, '0') + ':' +
        String(now.getSeconds()).padStart(2, '0');

      await attendanceService.checkIn({
        employeeId: user.employeeId,
        checkInTime: localTimeString,
        source: 'WEB',
        location,
        ip,
      });

      await loadData();
    } catch (error: any) {
      console.error('Check-in error:', error);
      setError(error.response?.data?.message || 'Failed to check in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setLoading(true);
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
        console.log('Location not available');
      }

      let ip = 'Unknown';
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        ip = ipData.ip;
      } catch (e) {
        console.log('IP fetch failed');
      }

      const now = new Date();
      const localTimeString = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0') + 'T' +
        String(now.getHours()).padStart(2, '0') + ':' +
        String(now.getMinutes()).padStart(2, '0') + ':' +
        String(now.getSeconds()).padStart(2, '0');

      await attendanceService.checkOut({
        employeeId: user.employeeId,
        checkOutTime: localTimeString,
        source: 'WEB',
        location,
        ip,
      });

      await loadData();
    } catch (error: any) {
      console.error('Check-out error:', error);
      setError(error.response?.data?.message || 'Failed to check out. Please try again.');
    } finally {
      setLoading(false);
    }
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
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-surface-900 dark:text-white">Attendance</h1>
            <p className="text-surface-600 dark:text-surface-400 mt-1">
              Track your daily work hours and check-in status
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-surface-500">Current Time</div>
            <div className="text-xl font-mono font-bold text-surface-900 dark:text-white">
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-400">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Clock & Action Card */}
          <div className="lg:col-span-2">
            <Card className="h-full bg-gradient-to-br from-indigo-600 to-violet-700 text-white overflow-hidden relative border-0 shadow-xl">
              <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
              <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

              <CardContent className="h-full flex flex-col justify-between p-8 relative z-10">
                <div className="space-y-1">
                  <div className="text-indigo-200 font-medium tracking-wide uppercase text-sm">Today</div>
                  <div className="text-4xl font-bold text-white">
                    {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-8 mt-8">
                  <div className="text-center md:text-left">
                    <div className="text-7xl font-bold font-mono tracking-tighter tabular-nums drop-shadow-lg">
                      {currentTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-indigo-200 mt-2 flex items-center gap-2 justify-center md:justify-start">
                      <MapPin className="h-4 w-4" />
                      {todayRecord?.checkInLocation || 'Location Pending'}
                    </div>
                  </div>

                  <div className="w-full md:w-auto">
                    {dayComplete ? (
                      <div className="bg-white/20 backdrop-blur-md rounded-2xl p-6 text-center border border-white/10">
                        <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-2" />
                        <h3 className="text-xl font-bold">Shift Complete</h3>
                        <p className="text-indigo-100">See you tomorrow!</p>
                      </div>
                    ) : !isCheckedIn ? (
                      <Button
                        onClick={handleCheckIn}
                        isLoading={loading}
                        className="w-full md:w-48 h-16 text-lg bg-white text-indigo-600 hover:bg-white/90 border-0 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all rounded-2xl"
                      >
                        <LogIn className="h-6 w-6 mr-2" />
                        Check In
                      </Button>
                    ) : (
                      <Button
                        onClick={handleCheckOut}
                        isLoading={loading}
                        className="w-full md:w-48 h-16 text-lg bg-rose-500 text-white hover:bg-rose-600 border-0 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all rounded-2xl"
                      >
                        <LogOut className="h-6 w-6 mr-2" />
                        Check Out
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Today's Stats Cards */}
          <div className="space-y-4">
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-green-50/50 dark:bg-green-900/10">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-surface-500 dark:text-surface-400">Check In</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-white mt-1">
                    {todayRecord?.checkInTime ? new Date(todayRecord.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-green-100 dark:bg-green-800/30 flex items-center justify-center text-green-600 dark:text-green-400">
                  <LogIn className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-blue-50/50 dark:bg-blue-900/10">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-surface-500 dark:text-surface-400">Work Duration</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-white mt-1">
                    {formatDuration(currentWorkHours)}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-800/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Timer className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-purple-50/50 dark:bg-purple-900/10">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-surface-500 dark:text-surface-400">Avg Check-in</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-white mt-1">
                    {stats.avgCheckIn}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-purple-800/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Activity className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-500" />
                Weekly Hours
              </CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748B', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748B', fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ fill: '#F1F5F9' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.hours >= 8 ? '#10B981' : entry.isToday ? '#6366F1' : '#F59E0B'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Link href="/attendance/my-attendance">
              <Card className="h-full border-0 shadow-md hover:shadow-xl transition-all cursor-pointer group hover:-translate-y-1">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full gap-4">
                  <div className="h-16 w-16 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <History className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-surface-900 dark:text-white">View History</h3>
                    <p className="text-surface-500 text-sm mt-1">Check past attendance logs</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/attendance/regularization">
              <Card className="h-full border-0 shadow-md hover:shadow-xl transition-all cursor-pointer group hover:-translate-y-1">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full gap-4">
                  <div className="h-16 w-16 rounded-full bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ClipboardCheck className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-surface-900 dark:text-white">Regularize</h3>
                    <p className="text-surface-500 text-sm mt-1">Fix attendance discrepancies</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
