'use client';

import React from 'react';
import {Button} from '@/components/ui/Button';
import {MessageSquare, X} from 'lucide-react';
import {FeedbackSynthesisResponse} from '@/lib/types/hire/ai-recruitment';

interface FeedbackSynthesisModalProps {
  open: boolean;
  feedbackSynthesis: FeedbackSynthesisResponse | null;
  onClose: () => void;
}

export function FeedbackSynthesisModal({
                                         open,
                                         feedbackSynthesis,
                                         onClose,
                                       }: FeedbackSynthesisModalProps) {
  if (!open || !feedbackSynthesis) return null;

  return (
    <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center p-4 z-50">
      <div
        className="bg-[var(--bg-card)] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[var(--border-main)] shadow-[var(--shadow-dropdown)]">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              <MessageSquare className='h-6 w-6 text-status-success-text'/>
              Feedback Synthesis
            </h2>
            <button onClick={onClose} aria-label="Close modal"
                    className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
              <X className="h-6 w-6"/>
            </button>
          </div>

          <div className="space-y-6">
            <div className="p-4 bg-[var(--bg-secondary)] rounded-xl">
              <p className="text-caption mb-1">Candidate</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">{feedbackSynthesis.candidateName}</p>
            </div>

            <div className="p-4 bg-[var(--bg-secondary)] rounded-xl">
              <p className="text-caption mb-2">Candidate Narrative</p>
              <p className="text-sm text-[var(--text-primary)]">{feedbackSynthesis.candidateNarrative}</p>
            </div>

            {feedbackSynthesis.themes && feedbackSynthesis.themes.length > 0 && (
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)] mb-2">Key Themes</p>
                <ul className="list-disc list-inside space-y-1">
                  {feedbackSynthesis.themes.map((theme, idx) => (
                    <li key={idx} className="text-body-secondary">{theme}</li>
                  ))}
                </ul>
              </div>
            )}

            {feedbackSynthesis.agreements && feedbackSynthesis.agreements.length > 0 && (
              <div className='p-4 bg-status-success-bg rounded-xl'>
                <p className='text-sm font-medium text-status-success-text mb-2'>Agreements</p>
                <ul className="list-disc list-inside space-y-1">
                  {feedbackSynthesis.agreements.map((agreement, idx) => (
                    <li key={idx} className='text-sm text-status-success-text'>{agreement}</li>
                  ))}
                </ul>
              </div>
            )}

            {feedbackSynthesis.disagreements && feedbackSynthesis.disagreements.length > 0 && (
              <div className='p-4 bg-status-warning-bg rounded-xl'>
                <p className='text-sm font-medium text-status-warning-text mb-2'>Disagreements</p>
                <ul className="list-disc list-inside space-y-1">
                  {feedbackSynthesis.disagreements.map((disagreement, idx) => (
                    <li key={idx} className='text-sm text-status-warning-text'>{disagreement}</li>
                  ))}
                </ul>
              </div>
            )}

            {feedbackSynthesis.missingData && feedbackSynthesis.missingData.length > 0 && (
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)] mb-2">Missing Data</p>
                <ul className="list-disc list-inside space-y-1">
                  {feedbackSynthesis.missingData.map((missing, idx) => (
                    <li key={idx} className="text-body-secondary">{missing}</li>
                  ))}
                </ul>
              </div>
            )}

            {feedbackSynthesis.openQuestions && feedbackSynthesis.openQuestions.length > 0 && (
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)] mb-2">Open Questions</p>
                <ul className="list-disc list-inside space-y-1">
                  {feedbackSynthesis.openQuestions.map((question, idx) => (
                    <li key={idx} className="text-body-secondary">{question}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="p-4 bg-[var(--bg-secondary)] rounded-xl">
              <p className="text-caption mb-2">Recommended Next Step</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">{feedbackSynthesis.recommendedNextStep}</p>
            </div>

            <div className="flex gap-4 pt-4 border-t border-[var(--border-main)]">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
