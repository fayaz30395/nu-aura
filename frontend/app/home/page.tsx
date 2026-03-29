'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Clock,
  Cake,
  Award,
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
  AlertCircle,
  Loader2,
  Gift,
  Users,
  FileText,
  TrendingUp,
  Sun,
  Moon,
  Sunrise,
  CloudSun,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/lib/hooks/useAuth';
import { useCheckIn, useCheckOut } from '@/lib/hooks/queries/useAttendance';
import { useHomeDashboard } from '@/lib/hooks/queries/useHome';

type WallTab = 'Post' | 'Poll' | 'Praise';

/* ─── Greeting ─── */
function getGreeting(): { text: string; icon: React.ReactNode } {
  const h = new Date().getHours();
  if (h < 6) return { text: 'Good Night', icon: <Moon className="w-4 h-4" /> };
  if (h < 12) return { text: 'Good Morning', icon: <Sunrise className="w-4 h-4" /> };
  if (h < 17) return { text: 'Good Afternoon', icon: <Sun className="w-4 h-4" /> };
  if (h < 21) return { text: 'Good Evening', icon: <CloudSun className="w-4 h-4" /> };
  return { text: 'Good Night', icon: <Moon className="w-4 h-4" /> };
}

/* ─── Clock (isolated to avoid full-page re-render every second) ─── */
const formatTime = (d: Date) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
const formatDate = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const LiveClock = React.memo(function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <>
      <p className="text-xs text-[var(--text-muted)] mt-0.5">{formatDate(time)}</p>
    </>
  );
});

const LiveTime = React.memo(function LiveTime() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span>{formatTime(time)}</span>;
});

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();

  const [activeWallTab, setActiveWallTab] = useState<WallTab>('Post');
  const [postContent, setPostContent] = useState('');

  // React Query hooks
  const { data: dashboardData, isLoading, isError, error } = useHomeDashboard();
  const checkInMutation = useCheckIn();
  const checkOutMutation = useCheckOut();

  const handleClockIn = async () => {
    if (!user?.id || !dashboardData.attendanceToday?.employeeId) return;
    checkInMutation.mutate({
      employeeId: dashboardData.attendanceToday.employeeId,
      checkInTime: new Date().toISOString(),
      source: 'WEB',
    });
  };

  const handleClockOut = async () => {
    if (!user?.id || !dashboardData.attendanceToday?.employeeId) return;
    checkOutMutation.mutate({
      employeeId: dashboardData.attendanceToday.employeeId,
      checkOutTime: new Date().toISOString(),
      source: 'WEB',
    });
  };

  // formatTime and formatDate moved to module scope for LiveClock/LiveTime
  const getInitials = (name?: string | null) => {
    if (!name) return '??';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getClockStatus = () => {
    const attendanceToday = dashboardData.attendanceToday;
    if (!attendanceToday) return { canClockIn: false, canClockOut: false, status: 'UNKNOWN' };
    if (['HOLIDAY', 'WEEKLY_OFF', 'ON_LEAVE'].includes(attendanceToday.status))
      return { canClockIn: false, canClockOut: false, status: attendanceToday.status };
    return { canClockIn: attendanceToday.canCheckIn, canClockOut: attendanceToday.canCheckOut, status: attendanceToday.status };
  };

  const greeting = useMemo(() => getGreeting(), []);
  const clockStatus = getClockStatus();
  const todayBirthdays = (dashboardData?.birthdays ?? []).filter((b) => b.isToday);
  const upcomingBirthdays = (dashboardData?.birthdays ?? []).filter((b) => !b.isToday);
  const todayAnniversaries = (dashboardData?.anniversaries ?? []).filter((a) => a.isToday);
  const nextHoliday = (dashboardData?.holidays ?? [])[0];
  const totalLeave = (dashboardData?.leaveBalances ?? []).reduce((sum, b) => sum + (b.available || 0), 0);
  const newJoinees = dashboardData?.newJoinees ?? [];

  if (isLoading) {
    return (
      <AppLayout activeMenuItem="home" showBreadcrumbs={false}>
        <div className="p-6">
          <Skeleton className="h-20 w-full rounded-xl mb-4" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
            <Skeleton className="lg:col-span-2 h-64 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (isError) {
    return (
      <AppLayout activeMenuItem="home" showBreadcrumbs={false}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-sm">
            <AlertCircle className="h-10 w-10 text-danger-400 mx-auto mb-3" />
            <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">Something went wrong</h2>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              {error instanceof Error ? error.message : 'Failed to load dashboard data'}
            </p>
            <Button variant="primary" onClick={() => window.location.reload()} size="sm">
              Retry
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="home" showBreadcrumbs={false}>
      <div className="p-4 md:p-6 space-y-4">

        {/* ═══ WELCOME STRIP ═══ */}
        <div className="bg-[var(--bg-sidebar)] rounded-xl px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-theme-md dark:shadow-dark-md">
          <div>
            <div className="flex items-center gap-2 text-accent-300 dark:text-accent-300 text-xs font-medium mb-0.5 uppercase tracking-wide">
              {greeting.icon}
              <span>{greeting.text}</span>
            </div>
            <h1 className="text-xl font-semibold text-white">
              {user?.fullName?.split(' ')[0] || 'there'}
            </h1>
            <LiveClock />
          </div>
          <div className="flex items-center gap-2.5 bg-[var(--bg-elevated)] border border-[var(--border-main)] rounded-lg px-4 py-2.5 self-start sm:self-auto">
            <div className="w-2 h-2 rounded-full bg-success-400 animate-pulse" aria-label="Online status indicator" />
            <span className="text-lg font-mono font-medium text-white tracking-wider">
              <LiveTime />
            </span>
          </div>
        </div>

        {/* ═══ STAT CARDS ROW ═══ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Attendance */}
          <div className="skeuo-card rounded-xl border border-[var(--border-main)] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide skeuo-deboss">Attendance</h3>
              <button onClick={() => router.push('/attendance')} className="text-xs text-accent-500 dark:text-accent-400 hover:text-accent-600 dark:hover:text-accent-300 font-medium">
                View
              </button>
            </div>
            <div className="flex items-center gap-4 mb-3">
              <div className="w-10 h-10 rounded-full bg-accent-50 dark:bg-accent-950 flex items-center justify-center">
                <Clock className="w-4 h-4 text-accent-500 dark:text-accent-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {dashboardData.attendanceToday?.checkInTime
                    ? new Date(dashboardData.attendanceToday.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                    : 'Not clocked in'}
                </p>
                <p className="text-xs text-[var(--text-muted)]">{clockStatus.status.replace(/_/g, ' ')}</p>
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              className="w-full"
              disabled={checkInMutation.isPending || checkOutMutation.isPending || (!clockStatus.canClockIn && !clockStatus.canClockOut)}
              onClick={clockStatus.canClockIn ? handleClockIn : handleClockOut}
            >
              {checkInMutation.isPending || checkOutMutation.isPending ? (
                <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Processing</>
              ) : clockStatus.canClockIn ? (
                <>Clock In</>
              ) : clockStatus.canClockOut ? (
                <>Clock Out</>
              ) : (
                <>{clockStatus.status.replace(/_/g, ' ')}</>
              )}
            </Button>
          </div>

          {/* Leave Balance */}
          <div className="skeuo-card rounded-xl border border-[var(--border-main)] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide skeuo-deboss">Leave</h3>
              <button onClick={() => router.push('/leave')} className="text-xs text-accent-500 dark:text-accent-400 hover:text-accent-600 dark:hover:text-accent-300 font-medium">
                Details
              </button>
            </div>
            <div className="mb-3">
              <span className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">{totalLeave > 0 ? totalLeave.toFixed(1) : '0'}</span>
              <span className="text-xs text-[var(--text-muted)] ml-1">days left</span>
            </div>
            {dashboardData.leaveBalances.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {dashboardData.leaveBalances.slice(0, 2).map((bal) => (
                  <div key={bal.leaveTypeId} className="flex justify-between text-xs">
                    <span className="text-[var(--text-muted)] truncate pr-2">{bal.leaveTypeId}</span>
                    <span className="font-medium text-[var(--text-secondary)]">{(bal.available || 0).toFixed(1)}</span>
                  </div>
                ))}
              </div>
            )}
            <Button
              variant="secondary"
              size="sm"
              className="w-full text-xs font-medium rounded-lg h-8 border-accent-200 dark:border-accent-800 text-brand-600 dark:text-accent-400 hover:bg-brand-25 dark:hover:bg-accent-950"
              onClick={() => router.push('/leave/apply')}
            >
              Request Leave
            </Button>
          </div>

          {/* Next Holiday */}
          <div className="bg-accent-500 dark:bg-accent-700 rounded-xl p-4 text-white relative overflow-hidden shadow-theme-sm dark:shadow-dark-sm">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-16 h-16 rounded-full bg-brand-600/50 dark:bg-accent-700/50 translate-y-1/3 -translate-x-1/4" />
            <h3 className="text-xs font-semibold text-accent-100 dark:text-accent-200 uppercase tracking-wide mb-3 relative z-10">Next Holiday</h3>
            {nextHoliday ? (
              <div className="relative z-10">
                <p className="text-sm font-semibold text-white mb-1">{nextHoliday.name}</p>
                <p className="text-xs text-accent-100 dark:text-accent-200">
                  {new Date(nextHoliday.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
                </p>
                {dashboardData.holidays.length > 1 && (
                  <p className="text-xs text-accent-200 dark:text-accent-300 mt-2">+{dashboardData.holidays.length - 1} more upcoming</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-accent-200 dark:text-accent-300 relative z-10">No upcoming holidays</p>
            )}
          </div>

          {/* Who's Out */}
          <div className="skeuo-card rounded-xl border border-[var(--border-main)] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide skeuo-deboss">Who&apos;s Out</h3>
              <span className="text-xs status-success px-1.5 py-0.5 rounded font-medium">
                {dashboardData.onLeaveToday.length}
              </span>
            </div>
            {dashboardData.onLeaveToday.length === 0 ? (
              <div className="text-center py-2">
                <CheckCircle2 className="w-5 h-5 text-success-400 mx-auto mb-1" />
                <p className="text-xs text-[var(--text-muted)]">Everyone is in</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {dashboardData.onLeaveToday.slice(0, 3).map((emp) => (
                  <div key={emp.employeeId} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full tint-info flex items-center justify-center text-accent-600 dark:text-accent-400 text-[9px] font-bold shrink-0">
                      {getInitials(emp.employeeName)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[var(--text-primary)] truncate" title={emp.employeeName}>{emp.employeeName}</p>
                    </div>
                  </div>
                ))}
                {dashboardData.onLeaveToday.length > 3 && (
                  <button
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)] hover:underline transition-colors"
                    title={dashboardData.onLeaveToday.slice(3).map((e) => e.employeeName).join(', ')}
                  >
                    +{dashboardData.onLeaveToday.length - 3} more
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ═══ MAIN CONTENT ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* LEFT — Feed */}
          <div className="lg:col-span-2 space-y-4">

            {/* Composer */}
            <div className="card-aura rounded-xl border border-[var(--border-main)] p-4">
              <div className="flex gap-4 border-b border-[var(--border-main)] dark:border-[var(--border-main)] pb-2.5 mb-3">
                {(['Post', 'Poll', 'Praise'] as WallTab[]).map((tab) => {
                  const icons = { Post: MessageSquare, Poll: BarChart3, Praise: Heart };
                  const Icon = icons[tab];
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveWallTab(tab)}
                      className={`flex items-center gap-1.5 pb-1 border-b-2 text-xs font-medium transition-colors
                        ${activeWallTab === tab
                          ? 'border-accent-500 dark:border-accent-400 text-brand-600 dark:text-accent-400'
                          : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {tab}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2.5">
                <div className="w-8 h-8 rounded-full tint-info flex items-center justify-center text-accent-600 dark:text-accent-400 text-xs font-bold shrink-0">
                  {getInitials(user?.fullName)}
                </div>
                <div className="flex-1">
                  <textarea
                    placeholder={
                      activeWallTab === 'Post' ? 'Share something with your team...'
                      : activeWallTab === 'Praise' ? 'Give a shout-out to a colleague...'
                      : 'Ask a question to your team...'
                    }
                    className="w-full bg-[var(--bg-surface)] dark:bg-[var(--bg-secondary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg p-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-accent-200 dark:focus:ring-accent-700 focus:border-accent-300 dark:focus:border-accent-700 resize-none"
                    rows={2}
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                  />
                  <div className="flex justify-end mt-1.5">
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={!postContent.trim()}
                      leftIcon={<Send className="w-3 h-3" />}
                    >
                      Post
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Announcements */}
            <div className="card-aura rounded-xl border border-[var(--border-main)] p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide skeuo-emboss">Announcements</h3>
                <button className="w-6 h-6 rounded-full bg-[var(--bg-surface)] dark:bg-[var(--bg-secondary)] flex items-center justify-center hover:bg-[var(--bg-card-hover)] transition-colors">
                  <Plus className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                </button>
              </div>
              <Skeleton className="h-16 rounded-lg mb-2" />
              <Skeleton className="h-16 rounded-lg" />
            </div>

            {/* Posts */}
            {!dashboardData?.wallPosts ? (
              <>
                <Skeleton className="h-48 rounded-xl" />
                <Skeleton className="h-48 rounded-xl" />
                <Skeleton className="h-48 rounded-xl" />
              </>
            ) : dashboardData.wallPosts.length === 0 ? (
              <div className="card-aura rounded-xl border border-[var(--border-main)] p-6 text-center">
                <MessageSquare className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
                <p className="text-sm text-[var(--text-secondary)]">No posts yet</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Be the first to share something</p>
              </div>
            ) : (
              dashboardData.wallPosts.map((post) => (
                <div key={post.id} className="card-aura rounded-xl border border-[var(--border-main)] p-4">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full tint-info flex items-center justify-center text-accent-600 dark:text-accent-400 text-xs font-bold shrink-0">
                      {getInitials(post.author?.fullName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-[var(--text-primary)]">{post.author?.fullName || 'Unknown'}</span>
                          <span className="text-xs text-[var(--text-muted)] ml-2">
                            {new Date(post.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        <button className="text-[var(--text-muted)] dark:text-[var(--text-secondary)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)]">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-sm text-[var(--text-secondary)] mt-1.5 leading-relaxed">{post.content}</p>
                      {post.imageUrl && (
                        <div className="mt-2 rounded-lg overflow-hidden border border-[var(--border-main)] dark:border-[var(--border-main)] relative w-full h-48">
                          <Image src={post.imageUrl} alt={`${post.author?.fullName || 'User'}'s post`} fill className="object-cover" sizes="(max-width: 768px) 100vw, 400px" />
                        </div>
                      )}
                      <div className="flex items-center gap-4 mt-2 pt-2 border-t border-[var(--border-main)] dark:border-[var(--border-main)]">
                        <button className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                          <ThumbsUp className="w-3 h-3" /> Like
                        </button>
                        <button className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                          <MessageSquare className="w-3 h-3" /> Comment
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* RIGHT — Sidebar widgets */}
          <div className="lg:col-span-1 space-y-4">

            {/* Celebrations */}
            <div className="skeuo-card rounded-xl border border-[var(--border-main)] p-4">
              <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3 skeuo-emboss">Celebrations</h3>

              {todayBirthdays.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Cake className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    <span className="text-xs font-medium text-[var(--text-secondary)]">Birthdays Today</span>
                  </div>
                  {todayBirthdays.map((b) => (
                    <div key={b.employeeId} className="flex items-center gap-2 p-1.5 rounded-lg tint-success mb-1">
                      <div className="w-6 h-6 rounded-full tint-info flex items-center justify-center text-accent-600 dark:text-accent-400 text-[9px] font-bold">
                        {getInitials(b.employeeName)}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[var(--text-primary)]">{b.employeeName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {todayAnniversaries.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Award className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    <span className="text-xs font-medium text-[var(--text-secondary)]">Work Anniversaries</span>
                  </div>
                  {todayAnniversaries.map((a) => (
                    <div key={a.employeeId} className="flex items-center gap-2 p-1.5 rounded-lg tint-warning mb-1">
                      <div className="w-6 h-6 rounded-full tint-info flex items-center justify-center text-accent-600 dark:text-accent-400 text-[9px] font-bold">
                        {getInitials(a.employeeName)}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[var(--text-primary)]">{a.employeeName}</p>
                        <p className="text-xs text-[var(--text-muted)]">{a.yearsCompleted} year{a.yearsCompleted !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {upcomingBirthdays.length > 0 && (
                <div className="mb-2">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Gift className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    <span className="text-xs font-medium text-[var(--text-secondary)]">Upcoming</span>
                  </div>
                  <div className="flex -space-x-1.5">
                    {upcomingBirthdays.slice(0, 5).map((b) => (
                      <div
                        key={b.employeeId}
                        title={`${b.employeeName} — ${b.birthdayDate}`}
                        className="w-7 h-7 rounded-full tint-info flex items-center justify-center text-accent-600 dark:text-accent-400 text-[8px] font-bold border-2 border-white dark:border-[var(--border-main)]800 hover:scale-110 transition-transform cursor-default"
                      >
                        {getInitials(b.employeeName)}
                      </div>
                    ))}
                    {upcomingBirthdays.length > 5 && (
                      <div className="w-7 h-7 rounded-full bg-[var(--bg-surface)] dark:bg-[var(--bg-secondary)] flex items-center justify-center text-[8px] font-bold text-[var(--text-muted)] border-2 border-white dark:border-[var(--border-main)]800">
                        +{upcomingBirthdays.length - 5}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {todayBirthdays.length === 0 && todayAnniversaries.length === 0 && upcomingBirthdays.length === 0 && (
                <div className="text-center py-4">
                  <Cake className="w-6 h-6 text-[var(--text-muted)] mx-auto mb-1" />
                  <p className="text-xs text-[var(--text-muted)]">No celebrations this month</p>
                </div>
              )}
            </div>

            {/* New Joinees */}
            <div className="skeuo-card rounded-xl border border-[var(--border-main)] p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide skeuo-emboss">New Joinees</h3>
                <span className="text-xs status-info px-1.5 py-0.5 rounded font-medium">
                  {newJoinees.length}
                </span>
              </div>
              {newJoinees.length === 0 ? (
                <div className="text-center py-4">
                  <UserPlus className="w-6 h-6 text-[var(--text-muted)] mx-auto mb-1" />
                  <p className="text-xs text-[var(--text-muted)]">No new joinees this month</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {newJoinees.slice(0, 4).map((j) => (
                    <div key={j.employeeId} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--bg-secondary)]/50 transition-colors">
                      <div className="w-6 h-6 rounded-full tint-success flex items-center justify-center text-brand-600 dark:text-accent-400 text-[9px] font-bold shrink-0">
                        {getInitials(j.employeeName)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[var(--text-primary)] truncate">{j.employeeName}</p>
                        <p className="text-xs text-[var(--text-muted)] truncate">{j.department || 'New member'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="skeuo-card rounded-xl border border-[var(--border-main)] p-4">
              <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3 skeuo-emboss">Quick Actions</h3>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: 'Attendance', icon: Clock, path: '/attendance' },
                  { label: 'Leave', icon: Palmtree, path: '/leave' },
                  { label: 'Employees', icon: Users, path: '/employee' },
                  { label: 'Documents', icon: FileText, path: '/documents' },
                  { label: 'Performance', icon: TrendingUp, path: '/performance' },
                  { label: 'Payroll', icon: BarChart3, path: '/payroll' },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => router.push(item.path)}
                    className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--bg-secondary)]/50 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg tint-info flex items-center justify-center text-accent-500 dark:text-accent-400 group-hover:tint-info dark:group-hover:tint-info transition-colors">
                      <item.icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-medium text-[var(--text-secondary)]">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
