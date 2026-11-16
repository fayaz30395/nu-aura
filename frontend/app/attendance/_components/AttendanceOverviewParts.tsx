'use client';

import React from 'react';
import Link from 'next/link';
import {Button} from '@mantine/core';
import {ArrowRight, CalendarClock, CalendarDays, Clock, LogIn, LogOut, Moon, Repeat, Timer, UserCheck, Users} from 'lucide-react';
import {Callout} from '@/components/ui/Callout';
import {Stat} from '@/components/ui/Stat';
import {Bone, SkeletonRegion} from '@/components/ui/skeletons/SkeletonRegion';
import {AttendanceRecord} from '@/lib/types/hrms/attendance';
import {formatDuration, formatTime, GRACE_PERIOD_MINS} from '../utils';

const CARD = 'rounded-lg border border-border bg-card p-4';

export function PanelSkeleton({height}: {height: number}) {
  return (
    <SkeletonRegion className={CARD}>
      <div className="flex flex-col gap-4">
        <Bone height={16} width="40%" radius="sm"/>
        <Bone height={height} radius="md"/>
      </div>
    </SkeletonRegion>
  );
}

interface StatsRowProps {
  presentThisMonth: number;
  attendanceRate: number;
  avgCheckIn: string;
  avgHours: string;
  overtimeHours: number;
}

export function AttendanceStatsRow({presentThisMonth, attendanceRate, avgCheckIn, avgHours, overtimeHours}: StatsRowProps) {
  const onTime = avgCheckIn !== '--:--' && avgCheckIn <= '09:15';
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className={CARD}>
        <Stat
          icon={<UserCheck className="h-4 w-4" aria-hidden="true"/>}
          iconTone="accent"
          label="Present this month"
          value={<span className="tabular-nums">{presentThisMonth}</span>}
          delta={<span className="tabular-nums">{attendanceRate}%</span>}
          deltaDir={attendanceRate >= 85 ? 'up' : 'down'}
          foot="Days logged"
        />
      </div>
      <div className={CARD}>
        <Stat
          icon={<Clock className="h-4 w-4" aria-hidden="true"/>}
          iconTone="info"
          label="Avg check-in"
          value={<span className="tabular-nums">{avgCheckIn}</span>}
          delta={onTime ? 'On time' : 'Late'}
          deltaDir={onTime ? 'flat' : 'down'}
          foot="Target 09:15"
        />
      </div>
      <div className={CARD}>
        <Stat
          icon={<Timer className="h-4 w-4" aria-hidden="true"/>}
          iconTone="warning"
          label="Avg hours / day"
          value={<span className="tabular-nums">{avgHours}h</span>}
          foot="This week"
        />
      </div>
      <div className={CARD}>
        <Stat
          icon={<Moon className="h-4 w-4" aria-hidden="true"/>}
          iconTone="neutral"
          label="Overtime logged"
          value={<span className="tabular-nums">{overtimeHours.toFixed(0)}h</span>}
          foot="This week"
        />
      </div>
    </div>
  );
}

const QUICK_LINKS = [
  {title: 'My attendance', description: 'Your log, worked hours and monthly calendar.', icon: CalendarDays, href: '/attendance/my-attendance'},
  {title: 'Team attendance', description: 'See who is in, who is out, and pending approvals.', icon: Users, href: '/attendance/team'},
  {title: 'Regularization', description: 'Raise or review missed-punch corrections.', icon: CalendarClock, href: '/attendance/regularization'},
  {title: 'Shift swap', description: 'Trade shifts with a teammate via your manager.', icon: Repeat, href: '/attendance/shift-swap'},
  {title: 'Comp-off', description: 'Request comp-off against approved overtime.', icon: Timer, href: '/attendance/comp-off'},
];

export function AttendanceQuickLinks() {
  return (
    <nav aria-label="Attendance workflows" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
      {QUICK_LINKS.map(({title, description, icon: Icon, href}) => (
        <Link
          key={href}
          href={href}
          className="group flex items-start gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border-subtle bg-surface-aura-sunken text-text-2">
            <Icon className="h-4 w-4" aria-hidden="true"/>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-text-1">{title}</span>
            <span className="mt-1 block text-xs text-text-2">{description}</span>
          </span>
          <ArrowRight
            className="h-4 w-4 self-center text-text-3 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </Link>
      ))}
    </nav>
  );
}

export function TodayPunches({todayRecord, workedHours}: {todayRecord: AttendanceRecord; workedHours: number}) {
  const rows: Array<{label: string; detail: string; value: string; icon: React.ReactNode}> = [];
  if (todayRecord.checkInTime) {
    rows.push({label: 'Check-in', detail: 'Recorded today', value: formatTime(todayRecord.checkInTime), icon: <LogIn className="h-4 w-4" aria-hidden="true"/>});
  }
  if (todayRecord.checkOutTime) {
    rows.push({label: 'Check-out', detail: 'Recorded today', value: formatTime(todayRecord.checkOutTime), icon: <LogOut className="h-4 w-4" aria-hidden="true"/>});
  }
  if (rows.length === 0) return null;
  rows.push({label: 'Total today', detail: 'Worked hours so far', value: formatDuration(workedHours), icon: <Clock className="h-4 w-4" aria-hidden="true"/>});

  return (
    <section aria-labelledby="attendance-punches-title" className="flex flex-col gap-2">
      <div className="flex items-end justify-between gap-4">
        <h2 id="attendance-punches-title" className="text-base font-semibold text-text-1">Today&apos;s punches</h2>
        <Link
          href="/attendance/my-attendance"
          className="inline-flex items-center gap-1 rounded text-sm font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          View history
          <ArrowRight className="h-4 w-4" aria-hidden="true"/>
        </Link>
      </div>
      <ul className="divide-y divide-border-subtle rounded-lg border border-border bg-card">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-4 px-4 py-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-aura-sunken text-text-2">{r.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-text-1">{r.label}</span>
              <span className="block text-xs text-text-3">{r.detail}</span>
            </span>
            <span className="text-sm font-semibold tabular-nums text-text-1">{r.value}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LateAttentionStrip({todayRecord}: {todayRecord: AttendanceRecord | null}) {
  if (!todayRecord?.checkInTime) return null;
  const checkIn = new Date(todayRecord.checkInTime);
  const shiftStart = new Date(checkIn);
  shiftStart.setHours(9, GRACE_PERIOD_MINS, 0, 0);
  const lateByMinutes = checkIn > shiftStart ? Math.round((checkIn.getTime() - shiftStart.getTime()) / 60000) : 0;
  if (lateByMinutes <= 0) return null;

  return (
    <Callout
      tone="warning"
      title={`Checked in ${lateByMinutes}m past the grace window`}
      action={
        <Button component={Link} href="/attendance/regularization" variant="default" size="xs" rightSection={<ArrowRight size={14} aria-hidden="true"/>}>
          Regularize
        </Button>
      }
    >
      File a regularization if this was approved.
    </Callout>
  );
}
