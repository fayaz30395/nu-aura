'use client';

import {Check, SendHorizonal} from 'lucide-react';
import {Textarea, TextInput} from '@mantine/core';
import type {UseFormReturn} from 'react-hook-form';
import {Button, Callout} from '@/components/ui';
import {Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui/Modal';
import type {BankChangeFormData} from '../_hooks/useProfileForms';

interface BankChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: UseFormReturn<BankChangeFormData>;
  submitting: boolean;
  submitted: boolean;
  onSubmit: () => void;
}

export function BankChangeModal({isOpen, onClose, form, submitting, submitted, onSubmit}: BankChangeModalProps) {
  const {register, formState: {errors}} = form;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>
        <div className="flex items-center gap-4">
          <div className="rounded-lg bg-status-warn-bg p-2 text-status-warn-fg">
            <SendHorizonal className="h-5 w-5" aria-hidden="true"/>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-1">Request Bank Details Change</h2>
            <p className="text-sm text-text-2">Changes to bank details require HR approval</p>
          </div>
        </div>
      </ModalHeader>

      {submitted ? (
        <ModalBody>
          <div role="status" className="py-4 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-status-ok-bg">
              <Check className="h-8 w-8 text-status-ok-fg" aria-hidden="true"/>
            </div>
            <h3 className="text-lg font-semibold text-text-1">Request Submitted</h3>
            <p className="mt-2 text-sm text-text-2">
              Your bank details change request has been submitted for HR approval.
              You will be notified once it is processed.
            </p>
          </div>
        </ModalBody>
      ) : (
        <form onSubmit={onSubmit} noValidate>
          <ModalBody className="flex flex-col gap-4">
            <Callout tone="warning">
              Bank detail changes are sensitive and go through an approval workflow. Your current details will
              remain active until the change is approved.
            </Callout>
            <TextInput
              id="profile-bank-name"
              label="New Bank Name"
              withAsterisk
              placeholder="e.g., State Bank of India"
              error={errors.bankName?.message}
              {...register('bankName')}
            />
            <TextInput
              id="profile-bank-account-number"
              label="New Account Number"
              withAsterisk
              placeholder="Enter full account number"
              classNames={{input: 'font-mono'}}
              error={errors.bankAccountNumber?.message}
              {...register('bankAccountNumber')}
            />
            <TextInput
              id="profile-bank-ifsc-code"
              label="New IFSC Code"
              withAsterisk
              placeholder="e.g., SBIN0001234"
              classNames={{input: 'font-mono uppercase'}}
              error={errors.bankIfscCode?.message}
              {...register('bankIfscCode')}
            />
            <Textarea
              id="profile-bank-change-reason"
              label="Reason for Change"
              withAsterisk
              rows={3}
              placeholder="e.g., Changed salary account to new bank"
              error={errors.reason?.message}
              {...register('reason')}
            />
          </ModalBody>
          <ModalFooter className="gap-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={submitting}
              loadingText="Submitting..."
              leftIcon={<SendHorizonal className="h-4 w-4" aria-hidden="true"/>}
            >
              Submit Request
            </Button>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}
