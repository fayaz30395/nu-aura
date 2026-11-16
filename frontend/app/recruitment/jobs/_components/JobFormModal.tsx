'use client';

import {Button, NativeSelect, SimpleGrid, Textarea, TextInput} from '@mantine/core';
import {Sparkles} from 'lucide-react';
import type {UseFormReturn} from 'react-hook-form';
import {Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui/Modal';
import type {CreateJobOpeningFormData} from '@/lib/validations/recruitment';
import type {Department} from '@/lib/types/hrms/employee';
import {EMPLOYMENT_TYPE_OPTIONS, JOB_STATUS_OPTIONS, PRIORITY_OPTIONS} from './job-options';

interface JobFormModalProps {
  isOpen: boolean;
  isEditing: boolean;
  form: UseFormReturn<CreateJobOpeningFormData>;
  departments: Department[];
  managers: {id: string; fullName: string}[];
  submitting: boolean;
  generating: boolean;
  onGenerate: () => void;
  onSubmit: (data: CreateJobOpeningFormData) => void;
  onClose: () => void;
}

export function JobFormModal({
  isOpen,
  isEditing,
  form,
  departments,
  managers,
  submitting,
  generating,
  onGenerate,
  onSubmit,
  onClose,
}: JobFormModalProps) {
  const {register, handleSubmit, formState: {errors}} = form;
  const title = isEditing ? 'Edit Job Opening' : 'Create Job Opening';

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalHeader onClose={onClose}>{title}</ModalHeader>
      <form onSubmit={handleSubmit(onSubmit)} noValidate aria-label={title} className="flex min-h-0 flex-1 flex-col">
        <ModalBody>
          <div className="flex flex-col gap-4">
            <SimpleGrid cols={{base: 1, sm: 2}} spacing="md">
              <TextInput id="job-form-code" label="Job Code" withAsterisk placeholder="JOB-001"
                         {...register('jobCode')} error={errors.jobCode?.message}/>
              <TextInput id="job-form-title" label="Job Title" withAsterisk placeholder="Senior Software Engineer"
                         {...register('jobTitle')} error={errors.jobTitle?.message}/>
              <NativeSelect
                id="job-form-department"
                label="Department"
                withAsterisk
                {...register('departmentId')}
                error={errors.departmentId?.message}
                data={[{value: '', label: 'Select Department'}, ...departments.map((d) => ({value: d.id, label: d.name}))]}
              />
              <NativeSelect
                id="job-form-hiring-manager"
                label="Hiring Manager"
                {...register('hiringManagerId')}
                error={errors.hiringManagerId?.message}
                data={[{value: '', label: 'Select Manager'}, ...managers.map((m) => ({value: m.id, label: m.fullName}))]}
              />
            </SimpleGrid>

            <SimpleGrid cols={{base: 1, sm: 3}} spacing="md">
              <TextInput id="job-form-location" label="Location" placeholder="Remote / City"
                         {...register('location')} error={errors.location?.message}/>
              <NativeSelect id="job-form-employment-type" label="Employment Type" data={EMPLOYMENT_TYPE_OPTIONS}
                            {...register('employmentType')} error={errors.employmentType?.message}/>
              <TextInput id="job-form-number-of-openings" label="No. of Openings" type="number" min={1}
                         {...register('numberOfOpenings')} error={errors.numberOfOpenings?.message}/>
              <TextInput id="job-form-min-salary" label="Min Salary" type="number" placeholder="50000"
                         {...register('minSalary')} error={errors.minSalary?.message}/>
              <TextInput id="job-form-max-salary" label="Max Salary" type="number" placeholder="80000"
                         {...register('maxSalary')} error={errors.maxSalary?.message}/>
              <TextInput id="job-form-experience-required" label="Experience Required" placeholder="3-5 years"
                         {...register('experienceRequired')} error={errors.experienceRequired?.message}/>
              <NativeSelect id="job-form-status" label="Status" data={JOB_STATUS_OPTIONS}
                            {...register('status')} error={errors.status?.message}/>
              <NativeSelect id="job-form-priority" label="Priority" data={PRIORITY_OPTIONS}
                            {...register('priority')} error={errors.priority?.message}/>
              <TextInput id="job-form-closing-date" label="Closing Date" type="date"
                         {...register('closingDate')} error={errors.closingDate?.message}/>
            </SimpleGrid>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="job-form-description" className="text-sm font-medium text-text-1">Job Description</label>
                <Button
                  variant="subtle"
                  size="compact-sm"
                  leftSection={<Sparkles className="h-4 w-4" aria-hidden="true"/>}
                  onClick={onGenerate}
                  loading={generating}
                >
                  Generate with AI
                </Button>
              </div>
              <Textarea id="job-form-description" rows={4} placeholder="Describe the job role and responsibilities..."
                        {...register('jobDescription')} error={errors.jobDescription?.message}/>
            </div>
            <Textarea id="job-form-requirements" label="Requirements" rows={3} placeholder="List the requirements..."
                      {...register('requirements')} error={errors.requirements?.message}/>
            <Textarea id="job-form-skills-required" label="Skills Required" rows={2} placeholder="React, TypeScript, Node.js..."
                      {...register('skillsRequired')} error={errors.skillsRequired?.message}/>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="default" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button type="submit" loading={submitting}>{isEditing ? 'Update Job' : 'Create Job'}</Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
