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

  // Widget expansion states
  const [showAllBirthdays, setShowAllBirthdays] = useState(false);
  const [showAllOnLeave, setShowAllOnLeave] = useState(false);

  // Wall posts
  const [posts, setPosts] = useState<WallPostResponse[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postSubmitting, setPostSubmitting] = useState(false);

  // Comments
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentSubmitting, setCommentSubmitting] = useState<string | null>(null);
  const [postComments, setPostComments] = useState<Record<string, any[]>>({});

  // Quick links (can be configured by admin)
  const quickLinks: QuickLink[] = [
    { id: '1', title: 'Company Policies', url: '/policies' },
    { id: '2', title: 'IT Support', url: '/support' },
    { id: '3', title: 'Employee Handbook', url: '/handbook' },
  ];

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load data
  useEffect(() => {
    loadData();
    loadPosts();
  }, []);

  useEffect(() => {
    if (user?.employeeId) {
      loadAttendanceData();
    }
  }, [user?.employeeId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [dashboard, announcementsData, birthdaysData, anniversariesData, newJoineesData, holidaysData, onLeaveData] = await Promise.all([
        dashboardService.getEmployeeDashboard(),
        announcementService.getPinnedAnnouncements().catch(() => []),
        homeService.getUpcomingBirthdays(30).catch(() => []),
        homeService.getUpcomingAnniversaries(30).catch(() => []),
        homeService.getNewJoinees(30).catch(() => []),
        homeService.getUpcomingHolidays(90).catch(() => []),
        homeService.getEmployeesOnLeaveToday().catch(() => []),
      ]);

      setDashboardData(dashboard);
      setAnnouncements(announcementsData);
      setBirthdays(birthdaysData);
      setWorkAnniversaries(anniversariesData);
      setNewJoinees(newJoineesData);
      setHolidays(holidaysData);
      setOnLeaveToday(onLeaveData);
    } catch (err: any) {
      console.error('Error loading home data:', err);
      setError(err.response?.data?.message || 'Failed to load home page data');
    } finally {
      setLoading(false);
    }
  };

  const loadAttendanceData = async () => {
    try {
      const attendance = await homeService.getMyAttendanceToday();
      setAttendanceToday(attendance);
    } catch (err) {
      console.error('Error loading attendance:', err);
    }
  };

  const handleClockIn = async () => {
    if (!user?.employeeId) return;
    try {
      setClockActionLoading(true);
      await attendanceService.checkIn({ employeeId: user.employeeId, source: 'WEB' });
      await loadAttendanceData();
    } catch (err: any) {
      console.error('Error clocking in:', err);
      alert(err.response?.data?.message || 'Failed to clock in');
    } finally {
      setClockActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!user?.employeeId) return;
    try {
      setClockActionLoading(true);
      await attendanceService.checkOut({ employeeId: user.employeeId, source: 'WEB' });
      await loadAttendanceData();
    } catch (err: any) {
      console.error('Error clocking out:', err);
      alert(err.response?.data?.message || 'Failed to clock out');
    } finally {
      setClockActionLoading(false);
    }
  };

  // Wall functions
  const loadPosts = async () => {
    try {
      setPostsLoading(true);
      const response = await wallService.getPosts(0, 10);
      setPosts(response.content);
    } catch (err) {
      console.error('Error loading posts:', err);
    } finally {
      setPostsLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!postContent.trim()) return;
    try {
      setPostSubmitting(true);
      await wallService.createPost({
        type: 'POST',
        content: postContent,
      });
      setPostContent('');
      await loadPosts();
    } catch (err: any) {
      console.error('Error creating post:', err);
      alert(err.response?.data?.message || 'Failed to create post');
    } finally {
      setPostSubmitting(false);
    }
  };

  const handleCreatePoll = async () => {
    if (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2) return;
    try {
      setPostSubmitting(true);
      await wallService.createPost({
        type: 'POLL',
        content: pollQuestion,
        pollOptions: pollOptions.filter(o => o.trim()),
      });
      setPollQuestion('');
      setPollOptions(['', '']);
      await loadPosts();
    } catch (err: any) {
      console.error('Error creating poll:', err);
      alert(err.response?.data?.message || 'Failed to create poll');
    } finally {
      setPostSubmitting(false);
    }
  };

  const handleCreatePraise = async () => {
    if (!praiseRecipient.trim() || !postContent.trim()) return;
    try {
      setPostSubmitting(true);
      // Note: In a real implementation, you'd search for the employee by name
      // and get their ID. For now, we'll just create the post with the name in content.
      await wallService.createPost({
        type: 'PRAISE',
        content: `Praising ${praiseRecipient}: ${postContent}`,
      });
      setPraiseRecipient('');
      setPostContent('');
      await loadPosts();
    } catch (err: any) {
      console.error('Error creating praise:', err);
      alert(err.response?.data?.message || 'Failed to send praise');
    } finally {
      setPostSubmitting(false);
    }
  };

  const handleReaction = async (postId: string, hasReacted: boolean) => {
    try {
      if (hasReacted) {
        await wallService.removeReaction(postId);
      } else {
        await wallService.addReaction(postId, 'LIKE');
      }
      await loadPosts();
    } catch (err) {
      console.error('Error toggling reaction:', err);
    }
  };

  // Comment handlers
  const toggleComments = async (postId: string) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(postId)) {
      newExpanded.delete(postId);
    } else {
      newExpanded.add(postId);
      // Load comments if not already loaded
      if (!postComments[postId]) {
        try {
          const response = await wallService.getComments(postId, 0, 10);
          setPostComments(prev => ({ ...prev, [postId]: response.content }));
        } catch (err) {
          console.error('Error loading comments:', err);
        }
      }
    }
    setExpandedComments(newExpanded);
  };

  const handleCommentSubmit = async (postId: string) => {
    const content = commentInputs[postId]?.trim();
    if (!content) return;

    try {
      setCommentSubmitting(postId);
      await wallService.addComment(postId, { content });
      // Clear input and reload comments
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      const response = await wallService.getComments(postId, 0, 10);
      setPostComments(prev => ({ ...prev, [postId]: response.content }));
      // Reload posts to get updated comment count
      await loadPosts();
    } catch (err: any) {
      console.error('Error adding comment:', err);
      alert(err.response?.data?.message || 'Failed to add comment');
    } finally {
      setCommentSubmitting(null);
    }
  };

  // Helper functions
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  };

  const getInitials = (name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-rose-500',
      'bg-amber-500', 'bg-cyan-500', 'bg-pink-500', 'bg-indigo-500',
    ];
    return colors[name.charCodeAt(0) % colors.length];
  };

  const getClockStatus = () => {
    if (!attendanceToday) return { canClockIn: true, canClockOut: false, status: 'NOT_STARTED' };
    if (attendanceToday.status === 'HOLIDAY') return { canClockIn: false, canClockOut: false, status: 'HOLIDAY' };
    if (attendanceToday.status === 'WEEKLY_OFF') return { canClockIn: false, canClockOut: false, status: 'WEEKLY_OFF' };
    if (attendanceToday.status === 'ON_LEAVE') return { canClockIn: false, canClockOut: false, status: 'ON_LEAVE' };
    return {
      canClockIn: attendanceToday.canCheckIn,
      canClockOut: attendanceToday.canCheckOut,
      status: attendanceToday.status,
    };
  };

  const clockStatus = getClockStatus();
  const todayBirthdays = birthdays.filter((b) => b.isToday);
  const upcomingBirthdays = birthdays.filter((b) => !b.isToday);
  const allCelebrations = [...todayBirthdays, ...workAnniversaries.filter(a => a.isToday)];

  // Loading state
  if (loading) {
    return (
      <AppLayout activeMenuItem="home" showBreadcrumbs={false}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-40 w-full rounded-lg" />
            ))}
          </div>
          <div className="lg:col-span-8 space-y-4">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
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
          <Card className="max-w-md w-full">
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-50 mb-2">Unable to Load</h2>
              <p className="text-surface-600 dark:text-surface-400 mb-6">{error}</p>
              <Button variant="primary" onClick={loadData}>Try Again</Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="home" showBreadcrumbs={false}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Widgets */}
        <div className="lg:col-span-4 space-y-4">
          {/* Clock-in Widget */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-teal-500 p-4 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm opacity-90">{formatDate(currentTime)}</span>
              </div>
              <div className="text-3xl font-bold font-mono tracking-wider">
                {formatTime(currentTime)}
              </div>
            </div>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-surface-500 dark:text-surface-400">Status</p>
                  <p className="font-medium text-surface-900 dark:text-surface-50">
                    {clockStatus.status === 'HOLIDAY' ? 'Holiday'
                      : clockStatus.status === 'WEEKLY_OFF' ? 'Day Off'
                      : clockStatus.status === 'ON_LEAVE' ? 'On Leave'
                      : attendanceToday?.checkInTime && !attendanceToday?.checkOutTime
                        ? `Clocked in at ${new Date(attendanceToday.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
                      : attendanceToday?.checkInTime && attendanceToday?.checkOutTime
                        ? `Completed`
                      : 'Not clocked in'}
                  </p>
                </div>
                {attendanceToday?.checkOutTime && (
                  <div className="text-right">
                    <p className="text-sm text-surface-500 dark:text-surface-400">Clocked out</p>
                    <p className="font-medium text-surface-900 dark:text-surface-50">
                      {new Date(attendanceToday.checkOutTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={handleClockIn}
                  disabled={!clockStatus.canClockIn || clockActionLoading}
                >
                  {clockActionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <LogIn className="h-4 w-4 mr-2" />
                      Web Clock-in
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleClockOut}
                  disabled={!clockStatus.canClockOut || clockActionLoading}
                >
                  {clockActionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <LogOut className="h-4 w-4 mr-2" />
                      Web Clock-out
                    </>
                  )}
                </Button>
              </div>

              {/* Additional clock options */}
              <div className="mt-3 pt-3 border-t border-surface-100 dark:border-surface-800">
                <button className="w-full flex items-center justify-between text-sm text-surface-600 dark:text-surface-400 hover:text-primary-600 dark:hover:text-primary-400 py-1">
                  <span>More options</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Inbox Widget */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4 text-orange-500" />
                Inbox
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between py-3">
                <span className="text-surface-600 dark:text-surface-400">Pending actions</span>
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  All Clear
                </Badge>
              </div>
              <Button variant="outline" size="sm" className="w-full">
                Take Action
              </Button>
            </CardContent>
          </Card>

          {/* Upcoming Holidays Widget */}
          {holidays.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <PartyPopper className="h-4 w-4 text-amber-500" />
                    Upcoming Holidays
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => router.push('/admin/holidays')}>
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {holidays.slice(0, 3).map((holiday) => (
                    <div key={holiday.id} className="flex items-center justify-between py-2 border-b border-surface-100 dark:border-surface-800 last:border-0">
                      <div>
                        <p className="font-medium text-surface-900 dark:text-surface-50">{holiday.name}</p>
                        <p className="text-sm text-surface-500 dark:text-surface-400">
                          {new Date(holiday.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {holiday.daysUntil === 0 ? 'Today' : holiday.daysUntil === 1 ? 'Tomorrow' : `In ${holiday.daysUntil} days`}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Who's On Leave Widget */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Palmtree className="h-4 w-4 text-blue-500" />
                  Who's On Leave
                </CardTitle>
                <Badge>{onLeaveToday.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {onLeaveToday.length > 0 ? (
                <div className="space-y-2">
                  {(showAllOnLeave ? onLeaveToday : onLeaveToday.slice(0, 3)).map((emp) => (
                    <div key={emp.employeeId} className="flex items-center gap-3 py-2">
                      <div className={`w-8 h-8 rounded-full ${getAvatarColor(emp.employeeName)} flex items-center justify-center text-white text-xs font-medium`}>
                        {getInitials(emp.employeeName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-surface-900 dark:text-surface-50 truncate">{emp.employeeName}</p>
                        <p className="text-xs text-surface-500 dark:text-surface-400">{emp.leaveType}</p>
                      </div>
                    </div>
                  ))}
                  {onLeaveToday.length > 3 && (
                    <button
                      onClick={() => setShowAllOnLeave(!showAllOnLeave)}
                      className="text-sm text-primary-600 dark:text-primary-400 hover:underline w-full text-left py-1"
                    >
                      {showAllOnLeave ? 'Show less' : `+${onLeaveToday.length - 3} more`}
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-surface-500 dark:text-surface-400 py-4 text-center">
                  Everyone's in today!
                </p>
              )}
            </CardContent>
          </Card>

          {/* Quick Links Widget */}
          {quickLinks.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 text-violet-500" />
                  Quick Links
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  {quickLinks.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      className="flex items-center gap-2 py-2 text-surface-600 dark:text-surface-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span className="text-sm">{link.title}</span>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Birthdays Widget */}
          {birthdays.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Cake className="h-4 w-4 text-pink-500" />
                    Birthdays
                  </CardTitle>
                  <Badge>{birthdays.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {(showAllBirthdays ? birthdays : birthdays.slice(0, 3)).map((birthday) => (
                    <div key={birthday.employeeId} className="flex items-center gap-3 py-2">
                      <div className={`w-8 h-8 rounded-full ${getAvatarColor(birthday.employeeName)} flex items-center justify-center text-white text-xs font-medium`}>
                        {getInitials(birthday.employeeName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-surface-900 dark:text-surface-50 truncate">
                          {birthday.employeeName}
                          {birthday.isToday && <span className="ml-2 text-pink-500">🎂</span>}
                        </p>
                        <p className="text-xs text-surface-500 dark:text-surface-400">
                          {birthday.isToday ? 'Today!' : formatShortDate(birthday.dateOfBirth)}
                        </p>
                      </div>
                      {birthday.isToday && (
                        <Button size="sm" variant="outline" className="text-xs">
                          Wish
                        </Button>
                      )}
                    </div>
                  ))}
                  {birthdays.length > 3 && (
                    <button
                      onClick={() => setShowAllBirthdays(!showAllBirthdays)}
                      className="text-sm text-primary-600 dark:text-primary-400 hover:underline w-full text-left py-1"
                    >
                      {showAllBirthdays ? 'Show less' : `+${birthdays.length - 3} more`}
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Work Anniversaries Widget */}
          {workAnniversaries.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Award className="h-4 w-4 text-amber-500" />
                    Work Anniversaries
                  </CardTitle>
                  <Badge>{workAnniversaries.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {workAnniversaries.slice(0, 3).map((anniversary) => (
                    <div key={anniversary.employeeId} className="flex items-center gap-3 py-2">
                      <div className={`w-8 h-8 rounded-full ${getAvatarColor(anniversary.employeeName)} flex items-center justify-center text-white text-xs font-medium`}>
                        {getInitials(anniversary.employeeName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-surface-900 dark:text-surface-50 truncate">
                          {anniversary.employeeName}
                          {anniversary.isToday && <span className="ml-2">🎉</span>}
                        </p>
                        <p className="text-xs text-surface-500 dark:text-surface-400">
                          {anniversary.yearsCompleted} year{anniversary.yearsCompleted > 1 ? 's' : ''} • {anniversary.isToday ? 'Today!' : formatShortDate(anniversary.joiningDate)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* New Joinees Widget */}
          {newJoinees.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-emerald-500" />
                    New Joinees
                  </CardTitle>
                  <Badge>{newJoinees.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {newJoinees.slice(0, 3).map((joinee) => (
                    <div key={joinee.employeeId} className="flex items-center gap-3 py-2">
                      <div className={`w-8 h-8 rounded-full ${getAvatarColor(joinee.employeeName)} flex items-center justify-center text-white text-xs font-medium`}>
                        {getInitials(joinee.employeeName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-surface-900 dark:text-surface-50 truncate">{joinee.employeeName}</p>
                        <p className="text-xs text-surface-500 dark:text-surface-400">
                          {joinee.designation} • {joinee.daysSinceJoining === 0 ? 'Joined today' : `${joinee.daysSinceJoining}d ago`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Organization Wall */}
        <div className="lg:col-span-8 space-y-4">
          {/* Post Creator */}
          <Card>
            <CardContent className="p-4">
              {/* Tabs */}
              <div className="flex gap-1 mb-4 border-b border-surface-200 dark:border-surface-700">
                {(['Post', 'Poll', 'Praise'] as WallTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveWallTab(tab)}
                    className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                      activeWallTab === tab
                        ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                        : 'border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
                    }`}
                  >
                    {tab === 'Post' && <MessageSquare className="h-4 w-4" />}
                    {tab === 'Poll' && <BarChart3 className="h-4 w-4" />}
                    {tab === 'Praise' && <Heart className="h-4 w-4" />}
                    {tab}
                  </button>
                ))}
              </div>

              {/* Post Input */}
              {activeWallTab === 'Post' && (
                <div className="flex gap-3">
                  <div className={`w-10 h-10 shrink-0 rounded-full ${getAvatarColor(user?.fullName || 'User')} flex items-center justify-center text-white font-medium`}>
                    {getInitials(user?.fullName || 'User')}
                  </div>
                  <div className="flex-1">
                    <textarea
                      placeholder="Share something with your organization..."
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      className="w-full p-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 text-surface-900 dark:text-surface-100 placeholder-surface-400 min-h-[80px]"
                    />
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex gap-2">
                        <button className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-400 hover:text-surface-600">
                          <ImageIcon className="h-5 w-5" />
                        </button>
                        <button className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-400 hover:text-surface-600">
                          <Smile className="h-5 w-5" />
                        </button>
                      </div>
                      <Button variant="primary" disabled={!postContent.trim() || postSubmitting} onClick={handleCreatePost}>
                        <Send className="h-4 w-4 mr-2" />
                        {postSubmitting ? 'Posting...' : 'Post'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Poll Input */}
              {activeWallTab === 'Poll' && (
                <div className="flex gap-3">
                  <div className={`w-10 h-10 shrink-0 rounded-full ${getAvatarColor(user?.fullName || 'User')} flex items-center justify-center text-white font-medium`}>
                    {getInitials(user?.fullName || 'User')}
                  </div>
                  <div className="flex-1 space-y-3">
                    <input
                      type="text"
                      placeholder="Ask a question..."
                      value={pollQuestion}
                      onChange={(e) => setPollQuestion(e.target.value)}
                      className="w-full p-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-surface-900 dark:text-surface-100 placeholder-surface-400"
                    />
                    <div className="space-y-2">
                      {pollOptions.map((option, index) => (
                        <input
                          key={index}
                          type="text"
                          placeholder={`Option ${index + 1}`}
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...pollOptions];
                            newOptions[index] = e.target.value;
                            setPollOptions(newOptions);
                          }}
                          className="w-full p-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-surface-900 dark:text-surface-100 placeholder-surface-400 text-sm"
                        />
                      ))}
                      {pollOptions.length < 4 && (
                        <button
                          onClick={() => setPollOptions([...pollOptions, ''])}
                          className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                        >
                          <Plus className="h-4 w-4" /> Add option
                        </button>
                      )}
                    </div>
                    <div className="flex justify-end">
                      <Button variant="primary" disabled={!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2 || postSubmitting} onClick={handleCreatePoll}>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        {postSubmitting ? 'Creating...' : 'Create Poll'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Praise Input */}
              {activeWallTab === 'Praise' && (
                <div className="flex gap-3">
                  <div className={`w-10 h-10 shrink-0 rounded-full ${getAvatarColor(user?.fullName || 'User')} flex items-center justify-center text-white font-medium`}>
                    {getInitials(user?.fullName || 'User')}
                  </div>
                  <div className="flex-1 space-y-3">
                    <input
                      type="text"
                      placeholder="Who do you want to praise? (Type name...)"
                      value={praiseRecipient}
                      onChange={(e) => setPraiseRecipient(e.target.value)}
                      className="w-full p-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-surface-900 dark:text-surface-100 placeholder-surface-400"
                    />
                    <textarea
                      placeholder="Write your appreciation message..."
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      className="w-full p-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 text-surface-900 dark:text-surface-100 placeholder-surface-400 min-h-[80px]"
                    />
                    <div className="flex justify-end">
                      <Button variant="primary" disabled={!praiseRecipient.trim() || !postContent.trim() || postSubmitting} onClick={handleCreatePraise}>
                        <Heart className="h-4 w-4 mr-2" />
                        {postSubmitting ? 'Sending...' : 'Send Praise'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Announcements */}
          {announcements.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Megaphone className="h-4 w-4 text-orange-500" />
                    Announcements
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => router.push('/announcements')}>
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {announcements.slice(0, 2).map((announcement) => (
                  <div
                    key={announcement.id}
                    onClick={() => router.push(`/announcements/${announcement.id}`)}
                    className="p-3 bg-surface-50 dark:bg-surface-800 rounded-lg cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <Badge className={`${getCategoryColor(announcement.category)} shrink-0`}>
                        {announcement.category.replace('_', ' ')}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-surface-900 dark:text-surface-50 truncate">{announcement.title}</h4>
                        <p className="text-sm text-surface-500 dark:text-surface-400 line-clamp-2 mt-1">{announcement.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Posts Feed */}
          <div className="space-y-4">
            {posts.map((post) => (
              <Card key={post.id}>
                <CardContent className="p-4">
                  {/* Post Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-10 h-10 shrink-0 rounded-full ${getAvatarColor(post.author.fullName)} flex items-center justify-center text-white font-medium`}>
                      {getInitials(post.author.fullName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-surface-900 dark:text-surface-50">{post.author.fullName}</span>
                        {post.type === 'PRAISE' && (
                          <Badge className="bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400">
                            Praise
                          </Badge>
                        )}
                        {post.type === 'POLL' && (
                          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            Poll
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-surface-500 dark:text-surface-400">
                        {post.author.designation} • {formatTimeAgo(post.createdAt)}
                      </p>
                    </div>
                    <button className="p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-400">
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Post Content */}
                  <div className="mb-4">
                    {post.type === 'PRAISE' && post.praiseRecipient && (
                      <p className="text-surface-700 dark:text-surface-300 mb-2">
                        🌟 Celebrating <span className="text-primary-600 dark:text-primary-400 font-medium">@{post.praiseRecipient.fullName}</span>
                      </p>
                    )}
                    <p className="text-surface-700 dark:text-surface-300 whitespace-pre-wrap">{post.content}</p>
                  </div>

                  {/* Post Actions */}
                  <div className="flex items-center gap-4 pt-3 border-t border-surface-100 dark:border-surface-800">
                    <button
                      onClick={() => handleReaction(post.id, post.hasReacted)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors ${post.hasReacted ? 'text-primary-600' : 'text-surface-500'}`}
                    >
                      <ThumbsUp className="h-4 w-4" />
                      <span className="text-sm">{post.likeCount}</span>
                    </button>
                    <button
                      onClick={() => toggleComments(post.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors ${expandedComments.has(post.id) ? 'text-primary-600' : 'text-surface-500'}`}
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span className="text-sm">{post.commentCount}</span>
                    </button>
                  </div>

                  {/* Comments Section */}
                  {expandedComments.has(post.id) && (
                    <div className="mt-4 pt-4 border-t border-surface-100 dark:border-surface-800">
                      {/* Comment Input */}
                      <div className="flex gap-3 mb-4">
                        <div className={`w-8 h-8 shrink-0 rounded-full ${getAvatarColor(user?.fullName || 'User')} flex items-center justify-center text-white text-xs font-medium`}>
                          {getInitials(user?.fullName || 'User')}
                        </div>
                        <div className="flex-1 flex gap-2">
                          <input
                            type="text"
                            placeholder="Write a comment..."
                            value={commentInputs[post.id] || ''}
                            onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleCommentSubmit(post.id);
                              }
                            }}
                            className="flex-1 px-3 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-surface-900 dark:text-surface-100 placeholder-surface-400 text-sm"
                          />
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={!commentInputs[post.id]?.trim() || commentSubmitting === post.id}
                            onClick={() => handleCommentSubmit(post.id)}
                          >
                            {commentSubmitting === post.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Comments List */}
                      <div className="space-y-3">
                        {postComments[post.id]?.map((comment) => (
                          <div key={comment.id} className="flex gap-3">
                            <div className={`w-8 h-8 shrink-0 rounded-full ${getAvatarColor(comment.author.fullName)} flex items-center justify-center text-white text-xs font-medium`}>
                              {getInitials(comment.author.fullName)}
                            </div>
                            <div className="flex-1">
                              <div className="bg-surface-50 dark:bg-surface-800 rounded-lg px-3 py-2">
                                <p className="text-sm font-medium text-surface-900 dark:text-surface-50">
                                  {comment.author.fullName}
                                </p>
                                <p className="text-sm text-surface-700 dark:text-surface-300 mt-1">
                                  {comment.content}
                                </p>
                              </div>
                              <p className="text-xs text-surface-400 mt-1 ml-3">
                                {formatTimeAgo(comment.createdAt)}
                              </p>
                            </div>
                          </div>
                        ))}
                        {postComments[post.id]?.length === 0 && (
                          <p className="text-sm text-surface-400 text-center py-2">
                            No comments yet. Be the first to comment!
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Empty State for Posts */}
          {posts.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageSquare className="h-12 w-12 text-surface-300 dark:text-surface-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-surface-900 dark:text-surface-50 mb-2">No posts yet</h3>
                <p className="text-surface-500 dark:text-surface-400">Be the first to share something with your organization!</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
