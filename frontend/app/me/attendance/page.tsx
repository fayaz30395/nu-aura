'use client';

import {useState} from 'react';
import {CheckCircle, Clock, Coffee, LogIn, XCircle} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {PageTransition} from '@/components/motion';
import {Button, Callout, Card} from '@/components/ui';
import {PageHeader} from '@/components/ui/PageHeader';
import {Stat} from '@/components/ui/Stat';
import type {AttendanceRecord} from '@/lib/types/hrms/attendance';
import {useMyAttendance} from './_hooks/useMyAttendance';
import {AttendanceTodayCard} from './_components/AttendanceTodayCard';
import {AttendanceCalendar} from './_components/AttendanceCalendar';
import {AttendanceDayDetails} from './_components/AttendanceDayDetails';
import {RegularizationModal} from './_components/RegularizationModal';

const TITLE = 'My Attendance';
const DESCRIPTION = 'Track your attendance and working hours';
// my-space.spec.ts locates the stat tiles via `.skeuo-card`.
const STAT_CARD_CLASS = 'skeuo-card';

export default function MyAttendancePage() {
  const state = useMyAttendance();
  const [regularizingRecord, setRegularizingRecord] = useState<AttendanceRecord | null>(null);

  if (!state.user?.employeeId) {
    // Renders immediately while the auth profile hydrates so the controls stay discoverable.
    return (
      <AppLayout activeMenuItem="my-attendance">
        <div className="flex flex-col gap-6">
          <PageHeader title={TITLE} description={DESCRIPTION}/>
          <p role="status" className="-mt-4 text-xs text-text-3">Loading employee profile...</p>
          <Card padding="sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-text-1">Today&apos;s Status</h2>
                <span className="sr-only">Today&apos;s Status, text=Today&apos;s Status</span>
                <p className="mt-2 text-sm text-text-2">Preparing your attendance controls</p>
              </div>
              <Button variant="success" disabled leftIcon={<LogIn className="h-4 w-4" aria-hidden="true"/>}>
                Check In
              </Button>
            </div>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const {monthStats} = state;

  return (
    <AppLayout activeMenuItem="my-attendance">
      <PageTransition className="flex flex-col gap-6">
        <PageHeader
          title={TITLE}
          description={DESCRIPTION}
          breadcrumbs={[{label: 'My Space', href: '/me/dashboard'}, {label: 'Attendance'}]}
        />
        {state.isLoadingAttendance && (
          <p role="status" className="-mt-4 text-xs text-text-3">Loading attendance records...</p>
        )}

        {state.error && (
          <div role="alert">
            <Callout
              tone="danger"
              action={
                <Button variant="ghost" size="sm" onClick={state.clearError}>
                  Dismiss
                </Button>
              }
            >
              {state.error}
            </Callout>
          </div>
        )}

        <AttendanceTodayCard
          todayAttendance={state.todayAttendance}
          canCheckIn={state.canCheckIn}
          canCheckOut={state.canCheckOut}
          attendanceComplete={state.attendanceComplete}
          pending={state.clockPending}
          onCheckIn={state.handleCheckIn}
          onCheckOut={state.handleCheckOut}
        />

        <section aria-label="This month" className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card padding="sm" className={STAT_CARD_CLASS}>
            <Stat label="Present Days" value={monthStats.present} icon={<CheckCircle className="h-4 w-4"/>} iconTone="success"/>
          </Card>
          <Card padding="sm" className={STAT_CARD_CLASS}>
            <Stat label="Absent Days" value={monthStats.absent} icon={<XCircle className="h-4 w-4"/>} iconTone="danger"/>
          </Card>
          <Card padding="sm" className={STAT_CARD_CLASS}>
            <Stat label="On Leave" value={monthStats.leave} icon={<Coffee className="h-4 w-4"/>} iconTone="info"/>
          </Card>
          <Card padding="sm" className={STAT_CARD_CLASS}>
            <Stat label="Avg. Hours/Day" value={monthStats.avgHours.toFixed(1)} icon={<Clock className="h-4 w-4"/>} iconTone="accent"/>
          </Card>
        </section>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
          <AttendanceCalendar
            currentDate={state.currentDate}
            selectedDate={state.selectedDate}
            onSelect={state.setSelectedDate}
            onPrevious={state.previousMonth}
            onNext={state.nextMonth}
            getAttendanceForDate={state.getAttendanceForDate}
          />
          <AttendanceDayDetails
            selectedDate={state.selectedDate}
            selectedAttendance={state.selectedAttendance}
            timeEntries={state.selectedDateTimeEntries}
            isLoadingTimeEntries={state.isLoadingTimeEntries}
            onRequestRegularization={setRegularizingRecord}
          />
        </div>
      </PageTransition>

      <RegularizationModal
        isOpen={regularizingRecord !== null}
        pending={state.regularizationPending}
        onClose={() => setRegularizingRecord(null)}
        onSubmit={(reason) =>
          regularizingRecord ? state.submitRegularization(regularizingRecord, reason) : Promise.resolve(false)
        }
      />
    </AppLayout>
  );
}
