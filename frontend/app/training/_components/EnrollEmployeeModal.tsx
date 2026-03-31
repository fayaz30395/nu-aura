'use client';

import React from 'react';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
} from '@/components/ui';
import type { TrainingEnrollmentRequest } from '@/lib/types/grow/training';

interface EnrollEmployeeModalProps {
  isOpen: boolean;
  programName: string;
  enrollFormData: Partial<TrainingEnrollmentRequest>;
  onClose: () => void;
  onEnrollFormChange: (data: Partial<TrainingEnrollmentRequest>) => void;
  onSubmit: () => void;
}

export function EnrollEmployeeModal({
  isOpen,
  programName,
  enrollFormData,
  onClose,
  onEnrollFormChange,
  onSubmit,
}: EnrollEmployeeModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalHeader>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Enroll Employee</h2>
      </ModalHeader>
      <ModalBody>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Program
            </label>
            <Input value={programName} disabled />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Employee ID *
            </label>
            <Input
              value={enrollFormData.employeeId ?? ''}
              onChange={(e) => onEnrollFormChange({ ...enrollFormData, employeeId: e.target.value })}
              placeholder="Enter employee ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Enrollment Date
            </label>
            <Input
              type="date"
              value={enrollFormData.enrollmentDate ?? ''}
              onChange={(e) =>
                onEnrollFormChange({ ...enrollFormData, enrollmentDate: e.target.value })
              }
            />
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onSubmit}>Enroll</Button>
      </ModalFooter>
    </Modal>
  );
}
