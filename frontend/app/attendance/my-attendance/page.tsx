'use client';

import {useMemo, useState} from 'react';
import Link from 'next/link';
import {format as formatDateFns} from 'date-fns';
import {Button, NativeSelect, Tabs} from '@mantine/core';
import {Download, FileText} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {PageHeader} from '@/components/ui/PageHeader';
import {QueryState} from '@/components/ui/QueryState';
import {ListPageSkeleton} from '@/components/ui/skeletons';
import {AttendanceRecord} from '@/lib/types/hrms/attendance';
import {getDateOffsetString, getLocalDateString, getMonthEndString, getMonthStartString} from '@/lib/utils/dateUtils';
import {useAttendanceByDateRange, useHolidaysByYear} from '@/lib/hooks/queries/useAttendance';
import {formatDuration, formatHoursFromMinutes, formatTime} from './_components/format';
import {computeStats, MyAttendanceStats, TodayTimingsCard} from './_components/MyAttendanceSummary';
import {AttendanceLogTable} from './_components/AttendanceLogTable';
import {AttendanceMonthCalendar} from './_components/AttendanceMonthCalendar';

const LAST_30 = '30days';
const BREADCRUMBS = [{label: 'Attendance', href: '/attendance'}, {label: 'My attendance'}];

function exportCsv(records: AttendanceRecord[], startDate: string, endDate: string) {
  const headers = ['Date', 'Status', 'Check In', 'Check Out', 'Effective Hours', 'Gross Hours'];
  const rows = records.map((r) => [
    r.attendanceDate,
    r.status,
    r.checkInTime ? formatTime(r.checkInTime) : '',
    r.checkOutTime ? formatTime(r.checkOutTime) : '',
    formatDuration(r.workDurationMinutes),
    formatHoursFromMinutes(r.workDurationMinutes),
  ]);
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], {type: 'text/csv'}));
  const a = document.createElement('a');
  a.href = url;
  a.download = `attendance_${startDate}_${endDate}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function MyAttendancePage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [periodFilter, setPeriodFilter] = useState<string>(LAST_30);

  const {startDate, endDate} = useMemo(() => {
    if (periodFilter === LAST_30) {
      return {startDate: getDateOffsetString(-30), endDate: getLocalDateString()};
    }
    return {
      startDate: getMonthStartString(selectedYear, selectedMonth),
      endDate: getMonthEndString(selectedYear, selectedMonth),
    };
  }, [periodFilter, selectedMonth, selectedYear]);

  const recordsQuery = useAttendanceByDateRange(startDate, endDate);
  useHolidaysByYear(selectedYear); // Pre-fetch for cache warming (data displayed on parent page)

  const monthOptions = useMemo(() => {
    const now = new Date();
    return Array.from({length: 6}, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return {value: `${d.getMonth()}-${d.getFullYear()}`, label: formatDateFns(d, 'MMMM yyyy'), month: d.getMonth(), year: d.getFullYear()};
    });
  }, []);

  const periodLabel =
    periodFilter === LAST_30 ? 'Last 30 days' : monthOptions.find((m) => m.value === periodFilter)?.label ?? '';

  const handlePeriodChange = (value: string) => {
    setPeriodFilter(value);
    const month = monthOptions.find((m) => m.value === value);
    if (month) {
      setSelectedMonth(month.month);
      setSelectedYear(month.year);
    }
  };

  const shiftMonth = (delta: number) => {
    const d = new Date(selectedYear, selectedMonth + delta, 1);
    setSelectedMonth(d.getMonth());
    setSelectedYear(d.getFullYear());
  };

  const records = useMemo(() => recordsQuery.data ?? [], [recordsQuery.data]);
  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => b.attendanceDate.localeCompare(a.attendanceDate)),
    [records]
  );
  const todayStr = getLocalDateString();
  const todayRecord = records.find((r) => r.attendanceDate === todayStr);

  return (
    <AppLayout activeMenuItem="attendance">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="My Attendance"
          description="Your check-ins, worked hours and monthly calendar."
          breadcrumbs={BREADCRUMBS}
          actions={
            <>
              <Button
                component={Link}
                href="/attendance/regularization"
                variant="default"
                leftSection={<FileText size={16} aria-hidden="true"/>}
              >
                Request regularization
              </Button>
              <Button
                variant="default"
                leftSection={<Download size={16} aria-hidden="true"/>}
                onClick={() => exportCsv(sortedRecords, startDate, endDate)}
                disabled={sortedRecords.length === 0}
              >
                Export
              </Button>
            </>
          }
        />

        <NativeSelect
          id="my-attendance-period"
          label="Period"
          value={periodFilter}
          onChange={(e) => handlePeriodChange(e.currentTarget.value)}
          data={[{value: LAST_30, label: 'Last 30 days'}, ...monthOptions.map(({value, label}) => ({value, label}))]}
          className="w-full sm:w-56"
        />

        <QueryState
          query={recordsQuery}
          skeleton={<ListPageSkeleton rows={8} columns={4} showHeader={false} showFilters={false}/>}
          errorTitle="Couldn't load your attendance"
        >
          {() => (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <MyAttendanceStats stats={computeStats(records)} periodLabel={periodLabel}/>
                </div>
                <TodayTimingsCard todayRecord={todayRecord}/>
              </div>

              <section aria-label="Logs" className="rounded-lg border border-border bg-card p-4">
                <Tabs defaultValue="log" keepMounted={false}>
                  <Tabs.List>
                    <Tabs.Tab value="log">Attendance log</Tabs.Tab>
                    <Tabs.Tab value="calendar">Calendar</Tabs.Tab>
                  </Tabs.List>
                  <Tabs.Panel value="log" pt="md">
                    <AttendanceLogTable records={sortedRecords}/>
                  </Tabs.Panel>
                  <Tabs.Panel value="calendar" pt="md">
                    <AttendanceMonthCalendar
                      month={selectedMonth}
                      year={selectedYear}
                      records={records}
                      onPrev={() => shiftMonth(-1)}
                      onNext={() => shiftMonth(1)}
                    />
                  </Tabs.Panel>
                </Tabs>
              </section>
            </div>
          )}
        </QueryState>
      </div>
    </AppLayout>
  );
}
