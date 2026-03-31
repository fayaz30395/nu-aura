'use client';

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Sparkles, Loader2, X } from 'lucide-react';
import { ResumeParseFormData } from '@/lib/validations/recruitment';
import { ResumeParseResponse } from '@/lib/types/hire/ai-recruitment';

interface ParseResumeModalProps {
  open: boolean;
  parsedResume: ResumeParseResponse | null;
  aiLoadingState: string | null;
  resumeParseForm: UseFormReturn<ResumeParseFormData>;
  onSubmit: (data: ResumeParseFormData) => void;
  onApply: (parsed: ResumeParseResponse) => void;
  onClose: () => void;
}

export function ParseResumeModal({
  open,
  parsedResume,
  aiLoadingState,
  resumeParseForm,
  onSubmit,
  onApply,
  onClose,
}: ParseResumeModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto border border-[var(--border-main)] shadow-xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-accent-500" />
              Parse Resume
            </h2>
            <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)]">
              <X className="h-6 w-6" />
            </button>
          </div>

          {!parsedResume ? (
            <form onSubmit={resumeParseForm.handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Resume Text</label>
                <textarea
                  {...resumeParseForm.register('resumeText')}
                  rows={6}
                  placeholder="Paste resume content here..."
                  className="w-full px-4 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
                />
                {resumeParseForm.formState.errors.resumeText && (
                  <p className="text-xs text-danger-500 mt-1">{resumeParseForm.formState.errors.resumeText.message}</p>
                )}
              </div>

              <div className="text-center text-[var(--text-muted)]">OR</div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Resume URL</label>
                <input
                  {...resumeParseForm.register('resumeUrl')}
                  type="url"
                  placeholder="https://example.com/resume.pdf"
                  className="w-full px-4 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
                />
                {resumeParseForm.formState.errors.resumeUrl && (
                  <p className="text-xs text-danger-500 mt-1">{resumeParseForm.formState.errors.resumeUrl.message}</p>
                )}
              </div>

              <div className="flex gap-4 pt-4 border-t border-[var(--border-main)]">
                <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={aiLoadingState === 'parse'} className="flex-1">
                  {aiLoadingState === 'parse' ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Parsing...</> : 'Parse Resume'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="p-4 bg-accent-50 dark:bg-accent-900/20 rounded-xl space-y-4">
                {parsedResume.fullName && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Full Name</p>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{parsedResume.fullName}</p>
                  </div>
                )}
                {parsedResume.email && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Email</p>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{parsedResume.email}</p>
                  </div>
                )}
                {parsedResume.phone && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Phone</p>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{parsedResume.phone}</p>
                  </div>
                )}
                {parsedResume.currentCompany && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Current Company</p>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{parsedResume.currentCompany}</p>
                  </div>
                )}
                {parsedResume.currentDesignation && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Current Designation</p>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{parsedResume.currentDesignation}</p>
                  </div>
                )}
                {parsedResume.totalExperienceYears && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Total Experience</p>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{parsedResume.totalExperienceYears} years</p>
                  </div>
                )}
                {parsedResume.skills && parsedResume.skills.length > 0 && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-2">Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {parsedResume.skills.map((skill, idx) => (
                        <span key={idx} className="px-2.5 py-1 text-xs rounded-full bg-accent-100 dark:bg-accent-900/30 text-accent-800 dark:text-accent-300">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-4 border-t border-[var(--border-main)]">
                <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={() => onApply(parsedResume)} className="flex-1">
                  Apply to Form
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
