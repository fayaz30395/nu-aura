'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Mail, Phone, Building, MapPin, X } from 'lucide-react';
import { Candidate } from '@/lib/types/hire/recruitment';
import { getStatusColor, getStageColor } from '../utils';

interface ViewCandidateModalProps {
  open: boolean;
  candidate: Candidate | null;
  onClose: () => void;
  onEdit: (candidate: Candidate) => void;
  onScheduleInterview: (candidate: Candidate) => void;
}

export function ViewCandidateModal({
  open,
  candidate,
  onClose,
  onEdit,
  onScheduleInterview,
}: ViewCandidateModalProps) {
  if (!open || !candidate) return null;

  return (
    <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[var(--border-main)] shadow-[var(--shadow-dropdown)]">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Candidate Details</h2>
            <button onClick={onClose} aria-label="Close modal" className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-accent-100 dark:bg-accent-900/30 rounded-xl flex items-center justify-center">
                <span className="text-2xl font-bold text-accent-700 dark:text-accent-300">
                  {candidate.firstName.charAt(0)}{candidate.lastName.charAt(0)}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-[var(--text-primary)]">{candidate.fullName}</h3>
                <p className="text-[var(--text-muted)]">{candidate.candidateCode}</p>
                <div className="flex gap-2 mt-2">
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(candidate.status)}`}>
                    {candidate.status.replace(/_/g, ' ')}
                  </span>
                  {candidate.currentStage && (
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStageColor(candidate.currentStage)}`}>
                      {candidate.currentStage.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-4 p-4 bg-[var(--bg-secondary)] rounded-xl">
                <Mail className="h-5 w-5 text-[var(--text-muted)]" />
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Email</p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{candidate.email}</p>
                </div>
              </div>
              {candidate.phone && (
                <div className="flex items-center gap-4 p-4 bg-[var(--bg-secondary)] rounded-xl">
                  <Phone className="h-5 w-5 text-[var(--text-muted)]" />
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Phone</p>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{candidate.phone}</p>
                  </div>
                </div>
              )}
              {candidate.currentLocation && (
                <div className="flex items-center gap-4 p-4 bg-[var(--bg-secondary)] rounded-xl">
                  <MapPin className="h-5 w-5 text-[var(--text-muted)]" />
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Location</p>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{candidate.currentLocation}</p>
                  </div>
                </div>
              )}
              {candidate.currentCompany && (
                <div className="flex items-center gap-4 p-4 bg-[var(--bg-secondary)] rounded-xl">
                  <Building className="h-5 w-5 text-[var(--text-muted)]" />
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Current Company</p>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{candidate.currentCompany}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 bg-[var(--bg-secondary)] rounded-xl text-center">
                <p className="text-xs text-[var(--text-muted)]">Experience</p>
                <p className="text-lg font-semibold text-[var(--text-primary)]">
                  {candidate.totalExperience ? `${candidate.totalExperience}y` : '-'}
                </p>
              </div>
              <div className="p-4 bg-[var(--bg-secondary)] rounded-xl text-center">
                <p className="text-xs text-[var(--text-muted)]">Current CTC</p>
                <p className="text-lg font-semibold text-[var(--text-primary)]">
                  {candidate.currentCtc?.toLocaleString() || '-'}
                </p>
              </div>
              <div className="p-4 bg-[var(--bg-secondary)] rounded-xl text-center">
                <p className="text-xs text-[var(--text-muted)]">Expected CTC</p>
                <p className="text-lg font-semibold text-[var(--text-primary)]">
                  {candidate.expectedCtc?.toLocaleString() || '-'}
                </p>
              </div>
              <div className="p-4 bg-[var(--bg-secondary)] rounded-xl text-center">
                <p className="text-xs text-[var(--text-muted)]">Notice Period</p>
                <p className="text-lg font-semibold text-[var(--text-primary)]">
                  {candidate.noticePeriodDays ? `${candidate.noticePeriodDays}d` : '-'}
                </p>
              </div>
            </div>

            {candidate.notes && (
              <div className="p-4 bg-[var(--bg-secondary)] rounded-xl">
                <p className="text-xs text-[var(--text-muted)] mb-2">Notes</p>
                <p className="text-sm text-[var(--text-primary)]">{candidate.notes}</p>
              </div>
            )}

            <div className="flex gap-4 pt-4 border-t border-[var(--border-main)]">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Close
              </Button>
              <Button onClick={() => { onClose(); onEdit(candidate); }} className="flex-1">
                Edit Candidate
              </Button>
              <Button onClick={() => onScheduleInterview(candidate)} className="flex-1">
                Schedule Interview
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
