'use client';

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { X } from 'lucide-react';
import { Candidate } from '@/lib/types/hire/recruitment';
import { CreateCandidateFormData } from '@/lib/validations/recruitment';

interface JobOpeningOption {
  id: string;
  jobTitle: string;
}

interface RecruiterOption {
  id: string;
  fullName: string;
}

interface CandidateFormModalProps {
  open: boolean;
  editingCandidate: Candidate | null;
  candidateForm: UseFormReturn<CreateCandidateFormData>;
  jobOpenings: JobOpeningOption[];
  recruiters: RecruiterOption[];
  isSubmitting: boolean;
  onSubmit: (data: CreateCandidateFormData) => void;
  onClose: () => void;
}

export function CandidateFormModal({
  open,
  editingCandidate,
  candidateForm,
  jobOpenings,
  recruiters,
  isSubmitting,
  onSubmit,
  onClose,
}: CandidateFormModalProps) {
  if (!open) return null;

  const inputCls = 'w-full px-4 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500';

  return (
    <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-[var(--border-main)] shadow-xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">
              {editingCandidate ? 'Edit Candidate' : 'Add Candidate'}
            </h2>
            <button onClick={onClose} aria-label="Close modal" className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={candidateForm.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Candidate Code *</label>
                <input
                  type="text"
                  {...candidateForm.register('candidateCode')}
                  className={inputCls}
                  placeholder="CAN-001"
                />
                {candidateForm.formState.errors.candidateCode && (
                  <p className="text-xs text-danger-500 mt-1">{candidateForm.formState.errors.candidateCode.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Job Opening *</label>
                <select
                  {...candidateForm.register('jobOpeningId')}
                  className={inputCls}
                >
                  <option value="">Select Job Opening</option>
                  {jobOpenings.map((job) => (
                    <option key={job.id} value={job.id}>{job.jobTitle}</option>
                  ))}
                </select>
                {candidateForm.formState.errors.jobOpeningId && (
                  <p className="text-xs text-danger-500 mt-1">{candidateForm.formState.errors.jobOpeningId.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">First Name *</label>
                <input
                  type="text"
                  {...candidateForm.register('firstName')}
                  className={inputCls}
                />
                {candidateForm.formState.errors.firstName && (
                  <p className="text-xs text-danger-500 mt-1">{candidateForm.formState.errors.firstName.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Last Name *</label>
                <input
                  type="text"
                  {...candidateForm.register('lastName')}
                  className={inputCls}
                />
                {candidateForm.formState.errors.lastName && (
                  <p className="text-xs text-danger-500 mt-1">{candidateForm.formState.errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Email *</label>
                <input
                  type="email"
                  {...candidateForm.register('email')}
                  className={inputCls}
                />
                {candidateForm.formState.errors.email && (
                  <p className="text-xs text-danger-500 mt-1">{candidateForm.formState.errors.email.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Phone</label>
                <input
                  type="tel"
                  {...candidateForm.register('phone')}
                  className={inputCls}
                />
                {candidateForm.formState.errors.phone && (
                  <p className="text-xs text-danger-500 mt-1">{candidateForm.formState.errors.phone.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Current Company</label>
                <input type="text" {...candidateForm.register('currentCompany')} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Current Designation</label>
                <input type="text" {...candidateForm.register('currentDesignation')} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Location</label>
                <input type="text" {...candidateForm.register('currentLocation')} className={inputCls} />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Experience (years)</label>
                <input
                  type="number"
                  step="0.5"
                  {...candidateForm.register('totalExperience', { valueAsNumber: true })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Current CTC</label>
                <input
                  type="number"
                  {...candidateForm.register('currentCtc', { valueAsNumber: true })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Expected CTC</label>
                <input
                  type="number"
                  {...candidateForm.register('expectedCtc', { valueAsNumber: true })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Notice (days)</label>
                <input
                  type="number"
                  {...candidateForm.register('noticePeriodDays', { valueAsNumber: true })}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Source</label>
                <select {...candidateForm.register('source')} className={inputCls}>
                  <option value="JOB_PORTAL">Job Portal</option>
                  <option value="REFERRAL">Referral</option>
                  <option value="LINKEDIN">LinkedIn</option>
                  <option value="COMPANY_WEBSITE">Company Website</option>
                  <option value="WALK_IN">Walk In</option>
                  <option value="CAMPUS">Campus</option>
                  <option value="CONSULTANT">Consultant</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Status</label>
                <select {...candidateForm.register('status')} className={inputCls}>
                  <option value="NEW">New</option>
                  <option value="SCREENING">Screening</option>
                  <option value="INTERVIEW">Interview</option>
                  <option value="SELECTED">Selected</option>
                  <option value="OFFER_EXTENDED">Offer Extended</option>
                  <option value="OFFER_ACCEPTED">Offer Accepted</option>
                  <option value="OFFER_DECLINED">Offer Declined</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="WITHDRAWN">Withdrawn</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Current Stage</label>
                <select {...candidateForm.register('currentStage')} className={inputCls}>
                  <option value="RECRUITERS_PHONE_CALL">Phone Call</option>
                  <option value="PANEL_REVIEW">Panel Review</option>
                  <option value="PANEL_SHORTLISTED">Shortlisted</option>
                  <option value="TECHNICAL_INTERVIEW_SCHEDULED">Tech Interview Scheduled</option>
                  <option value="TECHNICAL_INTERVIEW_COMPLETED">Tech Interview Done</option>
                  <option value="MANAGEMENT_INTERVIEW_SCHEDULED">Mgmt Interview Scheduled</option>
                  <option value="MANAGEMENT_INTERVIEW_COMPLETED">Mgmt Interview Done</option>
                  <option value="CLIENT_INTERVIEW_SCHEDULED">Client Interview Scheduled</option>
                  <option value="CLIENT_INTERVIEW_COMPLETED">Client Interview Done</option>
                  <option value="HR_FINAL_INTERVIEW_COMPLETED">HR Final Done</option>
                  <option value="OFFER_NDA_TO_BE_RELEASED">Offer / NDA</option>
                  <option value="PANEL_REJECT">Panel Reject</option>
                  <option value="CANDIDATE_REJECTED">Rejected</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Assigned Recruiter</label>
                <select {...candidateForm.register('assignedRecruiterId')} className={inputCls}>
                  <option value="">Select Recruiter</option>
                  {recruiters.map((recruiter) => (
                    <option key={recruiter.id} value={recruiter.id}>{recruiter.fullName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Resume URL</label>
                <input
                  type="url"
                  {...candidateForm.register('resumeUrl')}
                  className={inputCls}
                  placeholder="https://..."
                />
                {candidateForm.formState.errors.resumeUrl && (
                  <p className="text-xs text-danger-500 mt-1">{candidateForm.formState.errors.resumeUrl.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Notes</label>
              <textarea
                rows={3}
                {...candidateForm.register('notes')}
                className={inputCls}
                placeholder="Additional notes..."
              />
            </div>

            <div className="flex gap-4 pt-4 border-t border-[var(--border-main)]">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {editingCandidate ? 'Update Candidate' : 'Add Candidate'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
