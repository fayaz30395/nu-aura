'use client';

import React from 'react';
import {UseFormReturn} from 'react-hook-form';
import {Button} from '@/components/ui/Button';
import {Input, Select, Textarea} from '@/components/ui';
import {Modal, ModalBody, ModalHeader} from '@/components/ui/Modal';
import {Candidate} from '@/lib/types/hire/recruitment';
import {CreateCandidateFormData} from '@/lib/validations/recruitment';

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
  return (
    <Modal isOpen={open} onClose={onClose} size="xl">
      <ModalHeader onClose={onClose}>
        {editingCandidate ? 'Edit candidate' : 'Add candidate'}
      </ModalHeader>
      <ModalBody>
          <form onSubmit={candidateForm.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Input
                  id="candidate-code"
                  type="text"
                  {...candidateForm.register('candidateCode')}
                  label="Candidate code"
                  placeholder="CAN-001"
                  aria-invalid={candidateForm.formState.errors.candidateCode ? 'true' : 'false'}
                  aria-describedby={candidateForm.formState.errors.candidateCode ? 'candidate-code-error' : undefined}
                  error={candidateForm.formState.errors.candidateCode?.message}
                />
              </div>
              <div>
                <Select
                  id="candidate-job-opening"
                  {...candidateForm.register('jobOpeningId')}
                  label="Job opening"
                  aria-invalid={candidateForm.formState.errors.jobOpeningId ? 'true' : 'false'}
                  aria-describedby={candidateForm.formState.errors.jobOpeningId ? 'candidate-job-opening-error' : undefined}
                  error={candidateForm.formState.errors.jobOpeningId?.message}
                >
                  <option value="">Select job opening</option>
                  {jobOpenings.map((job) => (
                    <option key={job.id} value={job.id}>{job.jobTitle}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Input
                  id="candidate-first-name"
                  type="text"
                  {...candidateForm.register('firstName')}
                  label="First name"
                  aria-invalid={candidateForm.formState.errors.firstName ? 'true' : 'false'}
                  aria-describedby={candidateForm.formState.errors.firstName ? 'candidate-first-name-error' : undefined}
                  error={candidateForm.formState.errors.firstName?.message}
                />
              </div>
              <div>
                <Input
                  id="candidate-last-name"
                  type="text"
                  {...candidateForm.register('lastName')}
                  label="Last name"
                  aria-invalid={candidateForm.formState.errors.lastName ? 'true' : 'false'}
                  aria-describedby={candidateForm.formState.errors.lastName ? 'candidate-last-name-error' : undefined}
                  error={candidateForm.formState.errors.lastName?.message}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Input
                  id="candidate-email"
                  type="email"
                  {...candidateForm.register('email')}
                  label="Email"
                  aria-invalid={candidateForm.formState.errors.email ? 'true' : 'false'}
                  aria-describedby={candidateForm.formState.errors.email ? 'candidate-email-error' : undefined}
                  error={candidateForm.formState.errors.email?.message}
                />
              </div>
              <div>
                <Input
                  id="candidate-phone"
                  type="tel"
                  {...candidateForm.register('phone')}
                  label="Phone"
                  aria-invalid={candidateForm.formState.errors.phone ? 'true' : 'false'}
                  aria-describedby={candidateForm.formState.errors.phone ? 'candidate-phone-error' : undefined}
                  error={candidateForm.formState.errors.phone?.message}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <Input id="candidate-current-company" type="text" {...candidateForm.register('currentCompany')} label="Current company"/>
              </div>
              <div>
                <Input id="candidate-current-designation" type="text" {...candidateForm.register('currentDesignation')} label="Current designation"/>
              </div>
              <div>
                <Input id="candidate-current-location" type="text" {...candidateForm.register('currentLocation')} label="Location"/>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <Input
                  id="candidate-total-experience"
                  type="number"
                  step="0.5"
                  {...candidateForm.register('totalExperience', {valueAsNumber: true})}
                  label="Experience years"
                />
              </div>
              <div>
                <Input
                  id="candidate-current-ctc"
                  type="number"
                  {...candidateForm.register('currentCtc', {valueAsNumber: true})}
                  label="Current CTC"
                />
              </div>
              <div>
                <Input
                  id="candidate-expected-ctc"
                  type="number"
                  {...candidateForm.register('expectedCtc', {valueAsNumber: true})}
                  label="Expected CTC"
                />
              </div>
              <div>
                <Input
                  id="candidate-notice-period"
                  type="number"
                  {...candidateForm.register('noticePeriodDays', {valueAsNumber: true})}
                  label="Notice days"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <Select id="candidate-source" {...candidateForm.register('source')} label="Source">
                  <option value="JOB_PORTAL">Job portal</option>
                  <option value="REFERRAL">Referral</option>
                  <option value="LINKEDIN">LinkedIn</option>
                  <option value="COMPANY_WEBSITE">Company website</option>
                  <option value="WALK_IN">Walk in</option>
                  <option value="CAMPUS">Campus</option>
                  <option value="CONSULTANT">Consultant</option>
                  <option value="OTHER">Other</option>
                </Select>
              </div>
              <div>
                <Select id="candidate-status" {...candidateForm.register('status')} label="Status">
                  <option value="NEW">New</option>
                  <option value="SCREENING">Screening</option>
                  <option value="INTERVIEW">Interview</option>
                  <option value="SELECTED">Selected</option>
                  <option value="OFFER_EXTENDED">Offer extended</option>
                  <option value="OFFER_ACCEPTED">Offer accepted</option>
                  <option value="OFFER_DECLINED">Offer declined</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="WITHDRAWN">Withdrawn</option>
                </Select>
              </div>
              <div>
                <Select id="candidate-current-stage" {...candidateForm.register('currentStage')} label="Current stage">
                  <option value="RECRUITERS_PHONE_CALL">Phone call</option>
                  <option value="PANEL_REVIEW">Panel review</option>
                  <option value="PANEL_SHORTLISTED">Shortlisted</option>
                  <option value="TECHNICAL_INTERVIEW_SCHEDULED">Tech interview scheduled</option>
                  <option value="TECHNICAL_INTERVIEW_COMPLETED">Tech interview done</option>
                  <option value="MANAGEMENT_INTERVIEW_SCHEDULED">Mgmt interview scheduled</option>
                  <option value="MANAGEMENT_INTERVIEW_COMPLETED">Mgmt interview done</option>
                  <option value="CLIENT_INTERVIEW_SCHEDULED">Client interview scheduled</option>
                  <option value="CLIENT_INTERVIEW_COMPLETED">Client interview done</option>
                  <option value="HR_FINAL_INTERVIEW_COMPLETED">HR final done</option>
                  <option value="OFFER_NDA_TO_BE_RELEASED">Offer / NDA</option>
                  <option value="PANEL_REJECT">Panel reject</option>
                  <option value="CANDIDATE_REJECTED">Rejected</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Select id="candidate-assigned-recruiter" {...candidateForm.register('assignedRecruiterId')} label="Assigned recruiter">
                  <option value="">Select recruiter</option>
                  {recruiters.map((recruiter) => (
                    <option key={recruiter.id} value={recruiter.id}>{recruiter.fullName}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Input
                  id="candidate-resume-url"
                  type="url"
                  {...candidateForm.register('resumeUrl')}
                  label="Resume URL"
                  placeholder="https://..."
                  aria-invalid={candidateForm.formState.errors.resumeUrl ? 'true' : 'false'}
                  aria-describedby={candidateForm.formState.errors.resumeUrl ? 'candidate-resume-url-error' : undefined}
                  error={candidateForm.formState.errors.resumeUrl?.message}
                />
              </div>
            </div>

            <div>
              <Textarea
                id="candidate-notes"
                aria-label="Notes"
                rows={3}
                {...candidateForm.register('notes')}
                placeholder="Additional notes"
              />
            </div>

            <div className="flex gap-4 pt-4 border-t border-[var(--border-main)]">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {editingCandidate ? 'Update candidate' : 'Add candidate'}
              </Button>
            </div>
          </form>
      </ModalBody>
    </Modal>
  );
}
