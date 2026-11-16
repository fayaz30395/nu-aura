'use client';

import {useState} from 'react';
import {Banknote} from 'lucide-react';
import {NumberInput, Textarea} from '@mantine/core';
import {Button} from '@/components/ui/Button';
import {Callout} from '@/components/ui/Callout';
import {Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui/Modal';
import {useRequestLeaveEncashment} from '@/lib/hooks/queries/useLeaves';
import type {LeaveBalance} from '@/lib/types/hrms/leave';

interface EncashModalProps {
  balance: LeaveBalance;
  leaveTypeName?: string;
  onClose: () => void;
  onDone: () => void;
}

export function EncashModal({balance, leaveTypeName, onClose, onDone}: EncashModalProps) {
  const encashmentMutation = useRequestLeaveEncashment();
  const [encashDays, setEncashDays] = useState<number>(1);
  const [encashReason, setEncashReason] = useState('');

  const invalid = encashDays < 1 || encashDays > balance.available;

  const submit = async () => {
    try {
      await encashmentMutation.mutateAsync({
        leaveBalanceId: balance.id,
        daysToEncash: encashDays,
        reason: encashReason || undefined,
      });
      onDone();
    } catch {
      // The global MutationCache handler shows the error toast.
    }
  };

  return (
    <Modal isOpen onClose={onClose} size="sm">
      <ModalHeader onClose={onClose}>
        <div className="flex items-center gap-4">
          <div className="rounded-lg bg-status-ok-bg p-2 text-status-ok-fg">
            <Banknote className="h-5 w-5" aria-hidden="true"/>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-1">Leave Encashment</h2>
            <p className="text-sm text-text-2">Convert leave balance to salary payout</p>
          </div>
        </div>
      </ModalHeader>

      <ModalBody className="flex flex-col gap-4">
        <div className="rounded-lg border border-status-ok-bd bg-status-ok-bg p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-status-ok-fg">{leaveTypeName || 'Leave Type'}</span>
            <span className="text-base font-bold tabular-nums text-status-ok-fg">{balance.available} days available</span>
          </div>
          {balance.encashed > 0 && (
            <p className="mt-2 text-xs text-status-ok-fg">Previously encashed: {balance.encashed} days</p>
          )}
        </div>

        <NumberInput
          id="encash-days"
          label="Days to Encash"
          withAsterisk
          min={1}
          max={balance.available}
          allowDecimal={false}
          value={encashDays}
          onChange={(value) => setEncashDays(Math.min(Number(value), balance.available))}
          description={`Maximum encashable: ${balance.available} days`}
          inputWrapperOrder={['label', 'input', 'description', 'error']}
        />

        <Textarea
          id="encash-reason"
          label="Reason"
          rows={2}
          placeholder="Reason for encashment request"
          value={encashReason}
          onChange={(e) => setEncashReason(e.currentTarget.value)}
        />

        <Callout tone="warning">
          Encashment will be processed as part of your next payroll cycle. The amount will be calculated based
          on your current basic salary and applicable tax deductions.
        </Callout>
      </ModalBody>

      <ModalFooter className="gap-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={submit}
          disabled={invalid}
          isLoading={encashmentMutation.isPending}
          loadingText="Processing..."
          leftIcon={<Banknote className="h-4 w-4" aria-hidden="true"/>}
        >
          Request Encashment
        </Button>
      </ModalFooter>
    </Modal>
  );
}
