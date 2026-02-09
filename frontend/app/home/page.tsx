'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Clock,
  Calendar,
  Cake,
  Award,
  Megaphone,
  ChevronRight,
  ChevronDown,
  Plus,
  MessageSquare,
  BarChart3,
  Heart,
  UserPlus,
  Palmtree,
  CheckCircle2,
  Send,
  ThumbsUp,
  MoreHorizontal,
  LogIn,
  LogOut,
  AlertCircle,
  Loader2,
  MapPin,
  Briefcase,
  Gift,
  ExternalLink,
  Image as ImageIcon,
  Smile,
  Users,
  Bell,
  FileText,
  Link as LinkIcon,
  TrendingUp,
  PartyPopper,
  Home,
  UserCircle,
  Inbox,
  Laptop,
  Target,
  BarChart2,
  Folder,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/lib/hooks/useAuth';
import { dashboardService } from '@/lib/services/dashboard.service';
import { announcementService, Announcement, getCategoryColor } from '@/lib/services/announcement.service';
import { attendanceService } from '@/lib/services/attendance.service';
import {
  homeService,
  BirthdayResponse,
  WorkAnniversaryResponse,
  NewJoineeResponse,
  OnLeaveEmployeeResponse,
  UpcomingHolidayResponse,
  AttendanceTodayResponse,
} from '@/lib/services/home.service';
import {
  wallService,
  WallPostResponse,
  PostType,
  ReactionType,
} from '@/lib/services/wall.service';
import { leaveService } from '@/lib/services/leave.service';
import { LeaveBalance } from '@/lib/types/leave';
import { EmployeeDashboardData } from '@/lib/types/dashboard';

interface QuickLink {
  id: string;
  title: string;
  url: string;
  icon?: string;
}

type WallTab = 'Post' | 'Poll' | 'Praise';

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<EmployeeDashboardData | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeWallTab, setActiveWallTab] = useState<WallTab>('Post');
  const [postContent, setPostContent] = useState('');
  const [praiseRecipient, setPraiseRecipient] = useState('');
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  // Real data from APIs
  const [birthdays, setBirthdays] = useState<BirthdayResponse[]>([]);
  const [workAnniversaries, setWorkAnniversaries] = useState<WorkAnniversaryResponse[]>([]);
  const [newJoinees, setNewJoinees] = useState<NewJoineeResponse[]>([]);
  const [holidays, setHolidays] = useState<UpcomingHolidayResponse[]>([]);
  const [onLeaveToday, setOnLeaveToday] = useState<OnLeaveEmployeeResponse[]>([]);
  const [attendanceToday, setAttendanceToday] = useState<AttendanceTodayResponse | null>(null);
  const [clockActionLoading, setClockActionLoading] = useState(false);

  // Wall state
  const [wallPosts, setWallPosts] = useState<WallPostResponse[]>([]);
  const [wallLoading, setWallLoading] = useState(false);

  // Leave balance state
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);

  // Clock update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        birthdaysData,
        anniversariesData,
        joineesData,
        holidaysData,
        leaveData,
        attendanceData,
        wallData,
      ] = await Promise.all([
        homeService.getUpcomingBirthdays(30).catch(() => []),
        homeService.getUpcomingAnniversaries(30).catch(() => []),
        homeService.getNewJoinees(30).catch(() => []),
        homeService.getUpcomingHolidays(90).catch(() => []),
        homeService.getEmployeesOnLeaveToday().catch(() => []),
        homeService.getMyAttendanceToday().catch(() => null),
        wallService.getPosts(0, 10).catch(() => ({ content: [], totalElements: 0 })),
      ]);

      setBirthdays(birthdaysData);
      setWorkAnniversaries(anniversariesData);
      setNewJoinees(joineesData);
      setHolidays(holidaysData);
      setOnLeaveToday(leaveData);
      setAttendanceToday(attendanceData);
      setWallPosts(wallData.content);

      // Fetch leave balances if we have attendance data with employeeId
      if (attendanceData?.employeeId) {
        const balances = await leaveService.getEmployeeBalances(attendanceData.employeeId).catch(() => []);
        setLeaveBalances(balances);
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    if (!user?.id || !attendanceToday?.employeeId) return;
    try {
      setClockActionLoading(true);
      await attendanceService.checkIn({
        employeeId: attendanceToday.employeeId,
        checkInTime: new Date().toISOString(),
        source: 'WEB'
      });
      await loadData();
    } catch (err) {
      console.error('Clock in failed:', err);
    } finally {
      setClockActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!user?.id || !attendanceToday?.employeeId) return;
    try {
      setClockActionLoading(true);
      await attendanceService.checkOut({
        employeeId: attendanceToday.employeeId,
        checkOutTime: new Date().toISOString(),
        source: 'WEB'
      });
      await loadData();
    } catch (err) {
      console.error('Clock out failed:', err);
    } finally {
      setClockActionLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getInitials = (name?: string | null) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getClockStatus = () => {
    if (!attendanceToday) return { canClockIn: false, canClockOut: false, status: 'UNKNOWN' };
    if (attendanceToday.status === 'HOLIDAY') return { canClockIn: false, canClockOut: false, status: 'HOLIDAY' };
    if (attendanceToday.status === 'WEEKLY_OFF') return { canClockIn: false, canClockOut: false, status: 'WEEKLY_OFF' };
    if (attendanceToday.status === 'ON_LEAVE') return { canClockIn: false, canClockOut: false, status: 'ON_LEAVE' };
    return {
      canClockIn: attendanceToday.canCheckIn,
      canClockOut: attendanceToday.canCheckOut,
      status: attendanceToday.status,
    };
  };

  // Loading state
  if (loading) {
    return (
      <AppLayout activeMenuItem="home" showBreadcrumbs={false}>
        <div className="p-4 md:p-5 lg:p-6 max-w-[1600px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-4 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32 w-full rounded-lg" />
              ))}
            </div>
            <div className="lg:col-span-8 space-y-3">
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <AppLayout activeMenuItem="home" showBreadcrumbs={false}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full border-0 shadow-md">
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
              <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-2">Unable to Load</h2>
              <p className="text-sm text-surface-600 dark:text-surface-400 mb-4">{error}</p>
              <Button variant="primary" onClick={loadData} className="h-9 px-4 text-sm">Try Again</Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // Compute derived state
  const clockStatus = getClockStatus();
  const todayBirthdays = birthdays.filter((b) => b.isToday);
  const upcomingBirthdays = birthdays.filter((b) => !b.isToday);
  const allCelebrations = [...todayBirthdays, ...workAnniversaries.filter(a => a.isToday)];

  const nextHoliday = holidays[0];

  return (
    <AppLayout activeMenuItem="home" showBreadcrumbs={false}>
      {/* Keka-style light theme layout */}
      <div className="min-h-screen bg-gray-50">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-800 to-purple-900 px-8 py-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'}} />
          <div className="relative z-10">
            <h1 className="text-2xl font-bold text-white">
              Welcome {user?.fullName?.split(' ')[0] || 'there'}!
            </h1>
          </div>
        </div>

        {/* Main Content - Three Column Layout */}
        <div className="px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Sidebar - Quick Access */}
            <div className="lg:col-span-3 space-y-4">
              {/* Inbox Card */}
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Inbox className="w-6 h-6 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">Inbox</h3>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-gray-600">Good job!</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">You have no pending actions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Time Card - Purple gradient like Keka */}
              <Card className="bg-gradient-to-br from-purple-400 to-purple-300 border-0 shadow-lg overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-purple-900">
                      Time Today - {formatDate(currentTime).split(',')[0]}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-purple-900 hover:bg-purple-500/20 h-7 px-2 text-xs"
                      onClick={() => router.push('/attendance')}
                    >
                      View All
                    </Button>
                  </div>
                  <div className="mb-4">
                    <p className="text-xs font-medium text-purple-900/70 mb-1">CURRENT TIME</p>
                    <div className="text-4xl font-bold text-purple-900">
                      {formatTime(currentTime).replace(' ', '')}
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full bg-white text-purple-900 hover:bg-purple-50 font-medium"
                    disabled={clockActionLoading || (!clockStatus.canClockIn && !clockStatus.canClockOut)}
                    onClick={clockStatus.canClockIn ? handleClockIn : handleClockOut}
                  >
                    {clockActionLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing...</>
                    ) : clockStatus.canClockIn ? (
                      <>Remote Clock-In</>
                    ) : clockStatus.canClockOut ? (
                      <>Clock-Out</>
                    ) : (
                      <>{clockStatus.status.replace('_', ' ')}</>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Next Holiday - Indian flag style */}
              {nextHoliday && (
                <Card className="bg-gradient-to-br from-cyan-400 via-white to-green-400 border-0 shadow-lg overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-orange-500 to-transparent opacity-80" />
                  <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-green-600 to-transparent opacity-80" />
                  <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(120deg, rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 1px, transparent 1px, transparent 20px)' }} />

                  <CardContent className="p-5 relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-semibold text-gray-800">Holidays</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-800 hover:bg-white/30 h-7 px-2 text-xs"
                      >
                        View All
                      </Button>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{nextHoliday.name}</h3>
                      <p className="text-sm text-gray-700">
                        {new Date(nextHoliday.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* On Leave Today */}
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">On Leave Today</h3>
                  {onLeaveToday.length === 0 ? (
                    <div className="text-center py-6">
                      <div className="flex items-center justify-center mb-3">
                        <CheckCircle2 className="w-10 h-10 text-green-600" />
                        <Users className="w-6 h-6 text-gray-400 ml-2" />
                      </div>
                      <p className="text-sm text-gray-700">Everyone is working today!</p>
                      <p className="text-xs text-gray-500 mt-1">No one is on leave today.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {onLeaveToday.slice(0, 3).map((emp) => (
                        <div key={emp.employeeId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                            {getInitials(emp.employeeName)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{emp.employeeName}</p>
                            <p className="text-xs text-gray-500">{emp.leaveType}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Working Remotely */}
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Working Remotely</h3>
                  <div className="text-center py-6">
                    <div className="flex items-center justify-center mb-3">
                      <Laptop className="w-10 h-10 text-blue-600" />
                      <MapPin className="w-6 h-6 text-gray-400 ml-2" />
                    </div>
                    <p className="text-sm text-gray-700">Everyone is at office!</p>
                    <p className="text-xs text-gray-500 mt-1">No one is working remotely today.</p>
                  </div>
                </CardContent>
              </Card>

              {/* Leave Balance */}
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Leave Balances</h3>
                  <div className="flex items-center justify-center py-6">
                    <div className="text-center">
                      <div className="w-24 h-24 rounded-full border-4 border-blue-500 flex items-center justify-center mb-3">
                        <div>
                          <div className="text-3xl font-bold text-gray-900">
                            {leaveBalances.length > 0
                              ? leaveBalances.reduce((sum, b) => sum + (b.available || 0), 0).toFixed(1)
                              : '0'}
                          </div>
                          <div className="text-xs text-gray-500">Days</div>
                        </div>
                      </div>
                      <p className="text-xs font-medium text-gray-500">
                        {leaveBalances.length > 0 ? 'TOTAL AVAILABLE' : 'NO BALANCE DATA'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1 bg-indigo-600 text-white hover:bg-indigo-700 font-medium text-xs"
                      onClick={() => router.push('/leave/request')}
                    >
                      Request Leave
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-600 hover:bg-gray-100 text-xs"
                      onClick={() => router.push('/leave/balances')}
                    >
                      View All Balances
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Center Column - Main Content */}
            <div className="lg:col-span-6 space-y-4">
              {/* Quick Links / Tabs */}
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex gap-2">
                    <Button
                      variant={activeWallTab === 'Post' ? 'default' : 'ghost'}
                      size="sm"
                      className={activeWallTab === 'Post' ? 'bg-indigo-600 text-white border border-indigo-700' : 'text-gray-700 hover:bg-gray-100 border border-gray-300'}
                      onClick={() => setActiveWallTab('Post')}
                    >
                      Organization
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-700 hover:bg-gray-100 border border-gray-300"
                    >
                      Delivery India
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Post/Poll/Praise Tabs */}
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex gap-6 border-b border-gray-200 pb-3 mb-4">
                    <button
                      onClick={() => setActiveWallTab('Post')}
                      className={`flex items-center gap-2 pb-1 border-b-2 transition-colors ${
                        activeWallTab === 'Post'
                          ? 'border-indigo-600 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-sm font-medium">Post</span>
                    </button>
                    <button
                      onClick={() => setActiveWallTab('Poll')}
                      className={`flex items-center gap-2 pb-1 border-b-2 transition-colors ${
                        activeWallTab === 'Poll'
                          ? 'border-indigo-600 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span className="text-sm font-medium">Poll</span>
                    </button>
                    <button
                      onClick={() => setActiveWallTab('Praise')}
                      className={`flex items-center gap-2 pb-1 border-b-2 transition-colors ${
                        activeWallTab === 'Praise'
                          ? 'border-indigo-600 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Heart className="w-4 h-4" />
                      <span className="text-sm font-medium">Praise</span>
                    </button>
                  </div>

                  <textarea
                    placeholder="Write your post here and mention your peers"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    rows={3}
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                  />
                </CardContent>
              </Card>

              {/* Announcements */}
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-900">Announcements</h3>
                    <Button
                      variant="primary"
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-700 h-8 w-8 p-0 rounded-full"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {announcements.length === 0 ? (
                    <div className="text-center py-8">
                      <Megaphone className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm text-gray-600">No announcements</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {announcements.map((announcement) => (
                        <div key={announcement.id} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <h4 className="text-sm font-medium text-gray-900 mb-1">{announcement.title}</h4>
                          <p className="text-xs text-gray-600">{announcement.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Celebrations Section */}
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Cake className="w-4 h-4 text-pink-600" />
                        <span className="text-gray-900 font-medium">{todayBirthdays.length} Birthdays</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-yellow-600" />
                        <span className="text-gray-900 font-medium">{workAnniversaries.filter(a => a.isToday).length} Work Anniversaries</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-green-600" />
                        <span className="text-gray-900 font-medium">{newJoinees.length} New Joinees</span>
                      </div>
                    </div>
                  </div>

                  {/* Birthdays Today */}
                  {todayBirthdays.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Birthdays today</h4>
                      <div className="flex items-center justify-center py-6">
                        <Cake className="w-12 h-12 text-gray-400" />
                        <Gift className="w-8 h-8 text-gray-300 ml-2" />
                      </div>
                      <p className="text-center text-sm text-gray-600">No birthdays today.</p>
                    </div>
                  )}

                  {/* Upcoming Birthdays */}
                  {upcomingBirthdays.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Upcoming Birthdays</h4>
                      <div className="flex gap-4 overflow-x-auto pb-2">
                        {upcomingBirthdays.slice(0, 5).map((birthday) => (
                          <div key={birthday.employeeId} className="flex flex-col items-center flex-shrink-0">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-sm font-bold mb-2">
                              {getInitials(birthday.employeeName)}
                            </div>
                            <p className="text-xs font-medium text-gray-900 text-center max-w-[80px] truncate">
                              {birthday.employeeName?.split(' ')[0] || 'Unknown'}
                            </p>
                            <p className="text-xs text-gray-500">{birthday.birthdayDate}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Wall Posts */}
              {wallPosts.map((post) => (
                <Card key={post.id} className="bg-white border-gray-200 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                        {getInitials(post.author?.fullName)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900">{post.author?.fullName || 'Unknown'}</h4>
                            <p className="text-xs text-gray-500">
                              {new Date(post.createdAt).toLocaleDateString('en-US', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                          <button className="text-gray-400 hover:text-gray-600">
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                        </div>
                        <p className="text-sm text-gray-700 mt-2">{post.content}</p>
                        {post.imageUrl && (
                          <div className="mt-3 rounded-lg overflow-hidden">
                            <img src={post.imageUrl} alt="Post" className="w-full" />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Right Column - Additional Info */}
            <div className="lg:col-span-3 space-y-4">
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Links</h3>
                  <div className="space-y-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      onClick={() => router.push('/attendance')}
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Attendance
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      onClick={() => router.push('/leave')}
                    >
                      <Palmtree className="w-4 h-4 mr-2" />
                      Leave Management
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      onClick={() => router.push('/employee')}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Employees
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
