'use client';

import React, {useState} from 'react';
import {Copy} from 'lucide-react';
import {useQueryClient} from '@tanstack/react-query';
import {Button} from '@/components/ui';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {showToast} from '@/components/ui/Toast';
import {timesheetService} from '@/lib/services/hrms/timesheet.service';
import {timesheetKeys, useTimesheetEntries} from '@/lib/hooks/queries/useTimesheets';
import {mapEntriesToNextWeek} from '@/lib/utils/timesheet-copy';
import {logger} from '@/lib/utils/logger';
import type {Timesheet, TimeEntry} from '@/lib/types/hrms/timesheet';

interface Props {
  employeeId: string;
  currentTimesheet: Timesheet;
  currentEntries: readonly TimeEntry[];
  previousTimesheet?: Timesheet;
}

export function CopyLastWeekButton({employeeId, currentTimesheet, currentEntries, previousTimesheet}: Props) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const {data: previousEntries = []} = useTimesheetEntries(previousTimesheet?.id || '', !!previousTimesheet?.id);

  const locked = currentTimesheet.status !== 'DRAFT';
  const disabled = locked || previousEntries.length === 0;
  const title = locked
    ? 'Timesheet already submitted'
    : previousEntries.length === 0 ? 'No entries last week' : 'Copy last week hours';

  const handleConfirm = async () => {
    const toCopy = mapEntriesToNextWeek(previousEntries, currentEntries, employeeId);
    setBusy(true);
    let copied = 0;
    try {
      for (const entry of toCopy) {
        await timesheetService.addTimeEntry(currentTimesheet.id, entry);
        copied += 1;
      }
      showToast({
        type: 'success',
        title: 'Hours copied',
        message: copied === 0 ? 'Nothing to copy, all days already have entries' : `${copied} entries copied from last week`,
      });
    } catch (err: unknown) {
      logger.error('Error copying last week entries:', err);
      showToast({
        type: 'error',
        title: 'Copy failed',
        message: `${copied} of ${toCopy.length} entries copied before the error`,
      });
    } finally {
      await queryClient.invalidateQueries({queryKey: timesheetKeys.entries(currentTimesheet.id)});
      await queryClient.invalidateQueries({queryKey: timesheetKeys.detail(currentTimesheet.id)});
      setBusy(false);
      setOpen(false);
    }
  };

  return (
    <>
      <Button size="sm" variant="outline" disabled={disabled} title={title} onClick={() => setOpen(true)}>
        <Copy className="h-4 w-4 mr-1"/>
        Copy last week
      </Button>
      <ConfirmDialog
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        loading={busy}
        type="info"
        title="Copy last week hours?"
        message="Entries from last week are added to this week on the same weekdays. Days that already have an entry for the project are skipped."
        confirmText="Copy"
      />
    </>
  );
}
