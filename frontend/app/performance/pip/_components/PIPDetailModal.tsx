'use client';

import {useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {Button, NativeSelect, Progress, Textarea} from '@mantine/core';
import {CheckCircle2, Clock} from 'lucide-react';
import {Modal, ModalBody, ModalHeader} from '@/components/ui/Modal';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {StatusBadge} from '@/components/ui/StatusBadge';
import type {PIPResponse} from '@/lib/types/grow/performance';
import {useAddPipCheckIn, useClosePip} from '../_hooks/usePips';
import {
  calculateDaysRemaining,
  calculateProgress,
  checkInSchema,
  type CheckInFormData,
  CLOSE_STATUS_OPTIONS,
  closePIPSchema,
  type ClosePIPFormData,
  formatPipDate,
  PIP_STATUS,
} from './pipConfig';

interface PIPDetailModalProps {
  pip: PIPResponse | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

function InfoItem({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-text-2">{label}</dt>
      <dd className="text-sm font-semibold text-text-1">{children}</dd>
    </div>
  );
}

export function PIPDetailModal({pip, open, onClose, onUpdated}: PIPDetailModalProps) {
  const [pendingTermination, setPendingTermination] = useState<ClosePIPFormData | null>(null);
  const addCheckInMutation = useAddPipCheckIn(pip?.id);
  const closeMutation = useClosePip(pip?.id);

  const {
    register: registerCheckIn,
    handleSubmit: handleCheckInSubmit,
    reset: resetCheckIn,
    formState: {errors: checkInErrors, isSubmitting: checkInSubmitting},
  } = useForm<CheckInFormData>({
    resolver: zodResolver(checkInSchema),
    defaultValues: {progressNotes: '', managerComments: ''},
  });

  const {
    register: registerClose,
    handleSubmit: handleCloseSubmit,
    formState: {errors: closeErrors, isSubmitting: closeSubmitting},
  } = useForm<ClosePIPFormData>({
    resolver: zodResolver(closePIPSchema),
    defaultValues: {status: 'COMPLETED', notes: ''},
  });

  const checkInPending = checkInSubmitting || addCheckInMutation.isPending;
  const closePending = closeSubmitting || closeMutation.isPending;

  // Failures are toasted by the mutations' onError; the dialog stays open so the user can retry.
  const submitCheckIn = async (data: CheckInFormData) => {
    try {
      await addCheckInMutation.mutateAsync(data);
    } catch {
      return;
    }
    resetCheckIn();
    onUpdated();
  };

  const runClose = async (data: ClosePIPFormData) => {
    try {
      await closeMutation.mutateAsync(data);
    } catch {
      return;
    }
    setPendingTermination(null);
    onUpdated();
  };

  const submitClose = (data: ClosePIPFormData) => {
    if (data.status === 'TERMINATED') {
      setPendingTermination(data);
      return;
    }
    return runClose(data);
  };

  const isOpen = open && !!pip;
  const daysRemaining = pip ? calculateDaysRemaining(pip.endDate) : 0;
  const progress = pip ? calculateProgress(pip.startDate, pip.endDate) : 0;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        {pip && (
          <>
            <ModalHeader onClose={onClose}>
              <h2 className="truncate text-xl font-semibold text-text-1">PIP Details</h2>
              <p className="truncate text-sm text-text-2">{pip.employeeName}</p>
            </ModalHeader>
            <ModalBody className="flex flex-col gap-6">
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InfoItem label="Employee">{pip.employeeName}</InfoItem>
                <InfoItem label="Manager">{pip.managerName}</InfoItem>
                <InfoItem label="Period">{formatPipDate(pip.startDate)} → {formatPipDate(pip.endDate)}</InfoItem>
                <InfoItem label="Status">
                  <StatusBadge status={pip.status} domain={PIP_STATUS}/>
                </InfoItem>
              </dl>

              {pip.status === 'ACTIVE' && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-text-2">Progress</p>
                    <span className="text-sm text-text-2">{progress}% • {daysRemaining} days remaining</span>
                  </div>
                  <Progress value={progress} size="sm" radius="xl" aria-label="PIP progress"/>
                </div>
              )}

              {pip.reason && (
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-text-2">Reason</p>
                  <p className="text-sm text-text-1">{pip.reason}</p>
                </div>
              )}

              {pip.goals && (
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-text-2">Goals & Objectives</p>
                  <div className="rounded-lg bg-surface-aura-sunken p-4 text-sm text-text-1">{pip.goals}</div>
                </div>
              )}

              <section className="flex flex-col gap-4">
                <h3 className="text-sm font-semibold text-text-1">Check-ins</h3>
                {pip.checkIns && pip.checkIns.length > 0 ? (
                  <ul className="flex flex-col gap-4">
                    {pip.checkIns.map((checkIn, idx) => (
                      <li key={checkIn.id || idx} className="flex flex-col gap-1 rounded-lg border border-border p-4">
                        <p className="text-sm font-medium text-text-1">{formatPipDate(checkIn.checkInDate)}</p>
                        {checkIn.progressNotes && (
                          <p className="text-sm text-text-1">
                            <span className="text-text-3">Progress: </span>{checkIn.progressNotes}
                          </p>
                        )}
                        {checkIn.managerComments && (
                          <p className="text-sm text-text-1">
                            <span className="text-text-3">Manager: </span>{checkIn.managerComments}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-text-2">No check-ins yet</p>
                )}

                {pip.status === 'ACTIVE' && (
                  <form onSubmit={handleCheckInSubmit(submitCheckIn)} noValidate
                        className="flex flex-col gap-4 border-t border-border pt-4">
                    <Textarea
                      aria-label="Employee progress notes..."
                      placeholder="Employee progress notes..."
                      rows={2}
                      error={checkInErrors.progressNotes?.message}
                      {...registerCheckIn('progressNotes')}
                    />
                    <Textarea
                      aria-label="Manager comments..."
                      placeholder="Manager comments..."
                      rows={2}
                      error={checkInErrors.managerComments?.message}
                      {...registerCheckIn('managerComments')}
                    />
                    <Button type="submit" fullWidth loading={checkInPending}
                            leftSection={<Clock className="h-4 w-4" aria-hidden/>}>
                      Add Check-in
                    </Button>
                  </form>
                )}
              </section>

              {pip.status === 'ACTIVE' && (
                <form onSubmit={handleCloseSubmit(submitClose)} noValidate
                      className="flex flex-col gap-4 border-t border-border pt-4">
                  <p className="text-sm font-medium text-text-2">Update Status</p>
                  <NativeSelect
                    aria-label="PIP status"
                    data={CLOSE_STATUS_OPTIONS}
                    error={closeErrors.status?.message}
                    {...registerClose('status')}
                  />
                  <Textarea
                    aria-label="Closing notes..."
                    placeholder="Closing notes..."
                    rows={2}
                    error={closeErrors.notes?.message}
                    {...registerClose('notes')}
                  />
                  <Button type="submit" color="red" fullWidth loading={closePending}
                          leftSection={<CheckCircle2 className="h-4 w-4" aria-hidden/>}>
                    Update Status
                  </Button>
                </form>
              )}
            </ModalBody>
          </>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!pendingTermination}
        onClose={() => setPendingTermination(null)}
        onConfirm={() => (pendingTermination ? runClose(pendingTermination) : undefined)}
        title="Terminate PIP?"
        message={`This will close the PIP for ${pip?.employeeName ?? 'this employee'} as terminated.`}
        confirmText="Terminate"
        type="danger"
        loading={closeMutation.isPending}
      />
    </>
  );
}
