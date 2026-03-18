'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Brain, CheckCircle, AlertTriangle, ShieldAlert, MessageSquare, Sparkles, X } from 'lucide-react';
import { CandidateScreeningSummaryResponse } from '@/lib/types/ai-recruitment';

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
      <div className="bg-[var(--bg-card)] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-[var(--border-main)] shadow-xl">
        <div className="p-6">
          {/* Demo Mode Banner */}
          {screeningSummary.aiModelVersion === 'mock-v1' && (
            <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700 flex items-start gap-4">
              <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Demo Mode</p>
                <p className="text-xs text-amber-700 dark:text-amber-400">Connect OpenAI for real AI scoring</p>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Brain className="h-6 w-6 text-purple-500" />
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
              <span className={`px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap ${
                screeningSummary.fitLevel === 'HIGH' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                screeningSummary.fitLevel === 'MEDIUM' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
              }`}>
                Fit Level: {screeningSummary.fitLevel}
              </span>

              <span className={`px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap ${
                screeningSummary.recommendation === 'ADVANCE' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                screeningSummary.recommendation === 'HOLD' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
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
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                  <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Strengths
                  </p>
                  <ul className="space-y-2">
                    {screeningSummary.strengths.map((strength, idx) => (
                      <li key={idx} className="text-sm text-green-700 dark:text-green-400 flex items-start gap-2">
                        <CheckCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {screeningSummary.followUpQuestions && screeningSummary.followUpQuestions.length > 0 && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Follow-up Questions
                  </p>
                  <ol className="space-y-2 list-inside">
                    {screeningSummary.followUpQuestions.map((q, idx) => (
                      <li key={idx} className="text-sm text-blue-700 dark:text-blue-400 flex gap-2">
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
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                  <p className="text-sm font-medium text-orange-800 dark:text-orange-300 mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Gaps
                  </p>
                  <ul className="space-y-2">
                    {screeningSummary.gaps.map((gap, idx) => (
                      <li key={idx} className="text-sm text-orange-700 dark:text-orange-400 flex items-start gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        <span>{gap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {screeningSummary.riskFlags && screeningSummary.riskFlags.length > 0 && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                  <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-3 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" />
                    Risk Flags
                  </p>
                  <ul className="space-y-2">
                    {screeningSummary.riskFlags.map((flag, idx) => (
                      <li key={idx} className="text-sm text-red-700 dark:text-red-400 flex items-start gap-2">
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
