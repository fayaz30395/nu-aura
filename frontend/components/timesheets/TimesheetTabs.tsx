'use client';

import React from 'react';
import {Tabs, type TabItem} from '@/components/ui/Tabs';
import {isPastDue} from '@/lib/utils/timesheet-analytics';
import type {Timesheet} from '@/lib/types/hrms/timesheet';
import {ProjectsAllocatedTab} from './ProjectsAllocatedTab';
import {ProjectTimeTab} from './ProjectTimeTab';
import {TimeSummaryTab} from './TimeSummaryTab';
import {TimesheetStatusListTab} from './TimesheetStatusListTab';

export type TimesheetTabId = 'all' | 'past-due' | 'rejected' | 'project-time' | 'summary' | 'projects';

interface SwitcherProps {
  value: TimesheetTabId;
  onChange: (next: TimesheetTabId) => void;
  timesheets: readonly Timesheet[];
}

export function TimesheetTabSwitcher({value, onChange, timesheets}: SwitcherProps) {
  const today = new Date().toISOString().slice(0, 10);
  const tabs: TabItem<TimesheetTabId>[] = [
    {id: 'all', label: 'All timesheets'},
    {id: 'past-due', label: 'Past due', count: timesheets.filter((t) => isPastDue(t, today)).length},
    {id: 'rejected', label: 'Rejected', count: timesheets.filter((t) => t.status === 'REJECTED').length},
    {id: 'project-time', label: 'Project time'},
    {id: 'summary', label: 'Time summary'},
    {id: 'projects', label: 'Projects allocated'},
  ];
  return <Tabs tabs={tabs} value={value} onChange={onChange} aria-label="Timesheet views" className="overflow-x-auto"/>;
}

interface PanelProps {
  tab: Exclude<TimesheetTabId, 'all'>;
  employeeId: string;
  timesheets: readonly Timesheet[];
  isLoading: boolean;
  projectNames: Readonly<Record<string, string>>;
  onOpen: (ts: Timesheet) => void;
}

export function TimesheetTabPanel({tab, timesheets, isLoading, projectNames, onOpen}: PanelProps) {
  return (
    <div role="tabpanel" id={`tabpanel-${tab}`} aria-labelledby={`tab-${tab}`}>
      {tab === 'past-due' && <TimesheetStatusListTab mode="past-due" timesheets={timesheets} isLoading={isLoading} onOpen={onOpen}/>}
      {tab === 'rejected' && <TimesheetStatusListTab mode="rejected" timesheets={timesheets} isLoading={isLoading} onOpen={onOpen}/>}
      {tab === 'project-time' && <ProjectTimeTab timesheets={timesheets} projectNames={projectNames}/>}
      {tab === 'summary' && <TimeSummaryTab timesheets={timesheets} isLoading={isLoading}/>}
      {tab === 'projects' && <ProjectsAllocatedTab/>}
    </div>
  );
}
