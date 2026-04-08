'use client';

import React from 'react';
import {Loader2, Plus} from 'lucide-react';
import {Badge, Button, Modal, ModalBody, ModalFooter, ModalHeader,} from '@/components/ui';
import type {TrainingEnrollment, TrainingProgram} from '@/lib/types/grow/training';
import {EnrollmentStatus} from '@/lib/types/grow/training';
import {toBadgeVariant} from '@/lib/utils/type-guards';

interface ViewProgramModalProps {
  isOpen: boolean;
  program: TrainingProgram | null;
  enrollments: TrainingEnrollment[];
  isEnrolled: (programId: string) => boolean;
  enrolling: boolean;
  onClose: () => void;
  onSelfEnroll: (program: TrainingProgram) => void;
}

export function ViewProgramModal({
                                   isOpen,
                                   program,
                                   enrollments,
                                   isEnrolled,
                                   enrolling,
                                   onClose,
                                   onSelfEnroll,
                                 }: ViewProgramModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">
          {program?.programName}
        </h2>
      </ModalHeader>
      <ModalBody>
        {program && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-[var(--text-muted)]">Program Code:</span>
                <p className="font-medium text-[var(--text-primary)]">{program.programCode}</p>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">Status:</span>
                <p>
                  <Badge variant={toBadgeVariant(program.status)}>
                    {program.status ? program.status.replace('_', ' ') : '-'}
                  </Badge>
                </p>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">Category:</span>
                <p className="font-medium text-[var(--text-primary)]">
                  {program.category ? program.category.replace('_', ' ') : '-'}
                </p>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">Delivery Mode:</span>
                <p className="font-medium text-[var(--text-primary)]">
                  {program.deliveryMode ? program.deliveryMode.replace('_', ' ') : '-'}
                </p>
              </div>
            </div>

            {program.description && (
              <div>
                <h4 className="font-medium text-[var(--text-primary)] mb-2">Description</h4>
                <p className="text-body-secondary">{program.description}</p>
              </div>
            )}

            {program.learningObjectives && (
              <div>
                <h4 className="font-medium text-[var(--text-primary)] mb-2">Learning Objectives</h4>
                <p className="text-body-secondary">{program.learningObjectives}</p>
              </div>
            )}

            <div>
              <h4 className="font-medium text-[var(--text-primary)] mb-2">
                Enrollments ({enrollments.length})
              </h4>
              {enrollments.length === 0 ? (
                <p className="text-body-muted">No enrollments yet</p>
              ) : (
                <div className="space-y-2">
                  {enrollments.map((enrollment) => (
                    <div
                      key={enrollment.id}
                      className="row-between p-2 card-aura rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">
                          {enrollment.employeeName || enrollment.employeeId}
                        </p>
                        <p className="text-caption">
                          Enrolled: {new Date(enrollment.enrollmentDate || '').toLocaleDateString()}
                        </p>
                      </div>
                      <Badge
                        variant={
                          enrollment.status === EnrollmentStatus.COMPLETED
                            ? 'success'
                            : enrollment.status === EnrollmentStatus.IN_PROGRESS
                              ? 'warning'
                              : 'default'
                        }
                      >
                        {enrollment.status ? enrollment.status.replace('_', ' ') : '-'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        {program && !isEnrolled(program.id) && (
          <Button onClick={() => onSelfEnroll(program)} disabled={enrolling}>
            {enrolling ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2"/>
            ) : (
              <Plus className="mr-2 h-4 w-4"/>
            )}
            Enroll
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
}
