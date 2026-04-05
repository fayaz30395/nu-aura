'use client';

import React from 'react';
import {FieldErrors, UseFormRegister} from 'react-hook-form';
import {Button, Input, Modal, ModalBody, ModalFooter, ModalHeader, Select, Textarea,} from '@/components/ui';
import type {TrainingProgram} from '@/lib/types/grow/training';
import {DeliveryMode, ProgramStatus, TrainingCategory} from '@/lib/types/grow/training';
import {z} from 'zod';

const categoryOptions = [
  {value: TrainingCategory.TECHNICAL, label: 'Technical'},
  {value: TrainingCategory.SOFT_SKILLS, label: 'Soft Skills'},
  {value: TrainingCategory.LEADERSHIP, label: 'Leadership'},
  {value: TrainingCategory.COMPLIANCE, label: 'Compliance'},
  {value: TrainingCategory.SAFETY, label: 'Safety'},
  {value: TrainingCategory.PRODUCT, label: 'Product'},
  {value: TrainingCategory.SALES, label: 'Sales'},
  {value: TrainingCategory.CUSTOMER_SERVICE, label: 'Customer Service'},
  {value: TrainingCategory.OTHER, label: 'Other'},
];

const deliveryModeOptions = [
  {value: DeliveryMode.IN_PERSON, label: 'In-Person'},
  {value: DeliveryMode.VIRTUAL, label: 'Virtual'},
  {value: DeliveryMode.HYBRID, label: 'Hybrid'},
  {value: DeliveryMode.SELF_PACED, label: 'Self-Paced'},
  {value: DeliveryMode.WORKSHOP, label: 'Workshop'},
];

const statusOptions = [
  {value: ProgramStatus.DRAFT, label: 'Draft'},
  {value: ProgramStatus.SCHEDULED, label: 'Scheduled'},
  {value: ProgramStatus.IN_PROGRESS, label: 'In Progress'},
  {value: ProgramStatus.COMPLETED, label: 'Completed'},
  {value: ProgramStatus.CANCELLED, label: 'Cancelled'},
];

export const trainingProgramSchema = z.object({
  programCode: z.string().min(1, 'Program code is required'),
  programName: z.string().min(1, 'Program name is required'),
  description: z.string().default(''),
  category: z.enum([
    TrainingCategory.TECHNICAL,
    TrainingCategory.SOFT_SKILLS,
    TrainingCategory.LEADERSHIP,
    TrainingCategory.COMPLIANCE,
    TrainingCategory.SAFETY,
    TrainingCategory.PRODUCT,
    TrainingCategory.SALES,
    TrainingCategory.CUSTOMER_SERVICE,
    TrainingCategory.OTHER,
  ]),
  deliveryMode: z.enum([
    DeliveryMode.IN_PERSON,
    DeliveryMode.VIRTUAL,
    DeliveryMode.HYBRID,
    DeliveryMode.SELF_PACED,
    DeliveryMode.WORKSHOP,
  ]),
  status: z.enum([
    ProgramStatus.DRAFT,
    ProgramStatus.SCHEDULED,
    ProgramStatus.IN_PROGRESS,
    ProgramStatus.COMPLETED,
    ProgramStatus.CANCELLED,
  ]),
  durationHours: z.number({coerce: true}).default(0),
  startDate: z.string().default(''),
  endDate: z.string().default(''),
  trainerName: z.string().default(''),
  trainerEmail: z.string().email('Invalid email').default(''),
  location: z.string().default(''),
  maxParticipants: z.number({coerce: true}).default(0),
  costPerParticipant: z.number({coerce: true}).default(0),
  prerequisites: z.string().default(''),
  learningObjectives: z.string().default(''),
  isMandatory: z.boolean().default(false),
});

export type TrainingProgramFormData = z.infer<typeof trainingProgramSchema>;

interface ProgramFormModalProps {
  isOpen: boolean;
  editingProgram: TrainingProgram | null;
  register: UseFormRegister<TrainingProgramFormData>;
  errors: FieldErrors<TrainingProgramFormData>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const ProgramFormModal = React.memo(function ProgramFormModal({
                                                                       isOpen,
                                                                       editingProgram,
                                                                       register,
                                                                       errors,
                                                                       onClose,
                                                                       onSubmit,
                                                                     }: ProgramFormModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <form onSubmit={onSubmit}>
        <ModalHeader>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            {editingProgram ? 'Edit Training Program' : 'Create Training Program'}
          </h2>
        </ModalHeader>
        <ModalBody>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Program Code *
              </label>
              <Input {...register('programCode')} placeholder="e.g., TRN-001"/>
              {errors.programCode && (
                <p className="text-xs text-danger-600 mt-1">{errors.programCode.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Program Name *
              </label>
              <Input {...register('programName')} placeholder="Enter program name"/>
              {errors.programName && (
                <p className="text-xs text-danger-600 mt-1">{errors.programName.message}</p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Description
              </label>
              <Textarea
                {...register('description')}
                placeholder="Enter program description"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Category *
              </label>
              <Select {...register('category')}>
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Delivery Mode *
              </label>
              <Select {...register('deliveryMode')}>
                {deliveryModeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Status
              </label>
              <Select {...register('status')}>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Duration (Hours)
              </label>
              <Input
                type="number"
                {...register('durationHours', {valueAsNumber: true})}
                placeholder="Enter duration"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Start Date
              </label>
              <Input type="date" {...register('startDate')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                End Date
              </label>
              <Input type="date" {...register('endDate')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Trainer Name
              </label>
              <Input {...register('trainerName')} placeholder="Enter trainer name"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Trainer Email
              </label>
              <Input
                type="email"
                {...register('trainerEmail')}
                placeholder="Enter trainer email"
              />
              {errors.trainerEmail && (
                <p className="text-xs text-danger-600 mt-1">{errors.trainerEmail.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Location
              </label>
              <Input {...register('location')} placeholder="Enter location"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Max Participants
              </label>
              <Input
                type="number"
                {...register('maxParticipants', {valueAsNumber: true})}
                placeholder="Enter max participants"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Cost per Participant ($)
              </label>
              <Input
                type="number"
                {...register('costPerParticipant', {valueAsNumber: true})}
                placeholder="Enter cost"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Learning Objectives
              </label>
              <Textarea
                {...register('learningObjectives')}
                placeholder="Enter learning objectives"
                rows={2}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('isMandatory')}
                  className="rounded border-[var(--border-main)] text-accent-700 focus:ring-accent-500"
                />
                <span className="text-sm font-medium text-[var(--text-secondary)]">
                  Mandatory Training
                </span>
              </label>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            {editingProgram ? 'Update Program' : 'Create Program'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
});
