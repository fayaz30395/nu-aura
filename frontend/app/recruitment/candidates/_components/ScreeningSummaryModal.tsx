'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Brain, CheckCircle, AlertTriangle, ShieldAlert, MessageSquare, Sparkles, X } from 'lucide-react';
import { CandidateScreeningSummaryResponse } from '@/lib/types/hire/ai-recruitment';

interface ScreeningSummaryModalProps {
  open: boolean;
  screeningSummary: CandidateScreeningSummaryResponse | null;
  onClose: () => void;
}

export function ScreeningSummaryModal({
  open,
  screeningSummary,
  onClose,
}: ScreeningSummaryModalProps) {
  if (!open || !screeningSummary) return null;

  return (
    <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-[var(--border-main)] shadow-xl">
        <div className="p-6">
          {/* Demo Mode Banner */}
          {screeningSummary.aiModelVersion === 'mock-v1' && (
            <div className="mb-4 p-4 bg-warning-50 dark:bg-warning-900/20 rounded-lg border border-warning-200 dark:border-warning-700 flex items-start gap-4">
              <Sparkles className="h-5 w-5 text-warning-600 dark:text-warning-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-warning-800 dark:text-warning-300">Demo Mode</p>
                <p className="text-xs text-warning-700 dark:text-warning-400">Connect OpenAI for real AI scoring</p>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Brain className="h-6 w-6 text-accent-700" />
              AI Screening Summary
            </h2>
            <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)]">
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Info Bar */}
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[var(--bg-secondary)] rounded-xl">
                <p className="text-xs text-[var(--text-muted)] mb-1">Candidate</p>
                <p className="text-sm font-medium text-[var(--text-primary)]">{screeningSummary.candidateName}</p>
              </div>
              <div className="p-4 bg-[var(--bg-secondary)] rounded-xl">
                <p className="text-xs text-[var(--text-muted)] mb-1">Job Title</p>
                <p className="text-sm font-medium text-[var(--text-primary)]">{screeningSummary.jobTitle}</p>
              </div>
            </div>

            <div className="flex gap-4 items-center">
              <span className={`px-4 py-1.5 text-sm font-medium rounded-full whitespace-nowrap ${
                screeningSummary.fitLevel === 'HIGH' ? 'bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-300' :
                screeningSummary.fitLevel === 'MEDIUM' ? 'bg-warning-100 dark:bg-warning-900/30 text-warning-800 dark:text-warning-300' :
                'bg-danger-100 dark:bg-danger-900/30 text-danger-800 dark:text-danger-300'
              }`}>
                Fit Level: {screeningSummary.fitLevel}
              </span>

              <span className={`px-4 py-1.5 text-sm font-medium rounded-full whitespace-nowrap ${
                screeningSummary.recommendation === 'ADVANCE' ? 'bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-300' :
                screeningSummary.recommendation === 'HOLD' ? 'bg-warning-100 dark:bg-warning-900/30 text-warning-800 dark:text-warning-300' :
                'bg-danger-100 dark:bg-danger-900/30 text-danger-800 dark:text-danger-300'
              }`}>
                {screeningSummary.recommendation}
              </span>
            </div>
          </div>

          {/* Two-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Left Column */}
            <div className="space-y-4">
              {screeningSummary.strengths && screeningSummary.strengths.length > 0 && (
                <div className="p-4 bg-success-50 dark:bg-success-900/20 rounded-xl border border-success-200 dark:border-success-800">
                  <p className="text-sm font-medium text-success-800 dark:text-success-300 mb-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Strengths
                  </p>
                  <ul className="space-y-2">
                    {screeningSummary.strengths.map((strength, idx) => (
                      <li key={idx} className="text-sm text-success-700 dark:text-success-400 flex items-start gap-2">
                        <CheckCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {screeningSummary.followUpQuestions && screeningSummary.followUpQuestions.length > 0 && (
                <div className="p-4 bg-accent-50 dark:bg-accent-900/20 rounded-xl border border-accent-200 dark:border-accent-800">
                  <p className="text-sm font-medium text-accent-800 dark:text-accent-300 mb-3 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Follow-up Questions
                  </p>
                  <ol className="space-y-2 list-inside">
                    {screeningSummary.followUpQuestions.map((q, idx) => (
                      <li key={idx} className="text-sm text-accent-700 dark:text-accent-400 flex gap-2">
                        <span className="flex-shrink-0 font-medium">{idx + 1}.</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {screeningSummary.gaps && screeningSummary.gaps.length > 0 && (
                <div className="p-4 bg-warning-50 dark:bg-warning-900/20 rounded-xl border border-warning-200 dark:border-warning-800">
                  <p className="text-sm font-medium text-warning-800 dark:text-warning-300 mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Gaps
                  </p>
                  <ul className="space-y-2">
                    {screeningSummary.gaps.map((gap, idx) => (
                      <li key={idx} className="text-sm text-warning-700 dark:text-warning-400 flex items-start gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        <span>{gap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {screeningSummary.riskFlags && screeningSummary.riskFlags.length > 0 && (
                <div className="p-4 bg-danger-50 dark:bg-danger-900/20 rounded-xl border border-danger-200 dark:border-danger-800">
                  <p className="text-sm font-medium text-danger-800 dark:text-danger-300 mb-3 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" />
                    Risk Flags
                  </p>
                  <ul className="space-y-2">
                    {screeningSummary.riskFlags.map((flag, idx) => (
                      <li key={idx} className="text-sm text-danger-700 dark:text-danger-400 flex items-start gap-2">
                        <ShieldAlert className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        <span>{flag}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Summary Section */}
          <div className="mb-6 p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-main)]">
            <p className="text-sm font-medium text-[var(--text-primary)] mb-3">Summary</p>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{screeningSummary.summary}</p>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center pt-4 border-t border-[var(--border-main)]">
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Powered by AI</span>
              <span className="px-2 py-1 rounded bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-mono">
                {screeningSummary.aiModelVersion}
              </span>
            </div>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
