'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, Send, Check } from 'lucide-react';
import { UseFormRegister, FieldErrors, UseFormHandleSubmit } from 'react-hook-form';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export interface RegularizationFormData {
  attendanceDate: string;
  requestedCheckIn: string;
  requestedCheckOut: string;
  reason: string;
}

interface TimelineStep {
  step: number;
  label: string;
  completed: boolean;
  active: boolean;
}

function getTimelineSteps(step: number): TimelineStep[] {
  return [
    { step: 1, label: 'Select Date', completed: step > 1, active: step === 1 },
    { step: 2, label: 'Add Details', completed: step > 2, active: step === 2 },
    { step: 3, label: 'Provide Reason', completed: step > 3, active: step === 3 },
  ];
}

const QUICK_REASON_TEMPLATES = [
  'Forgot to check in',
  'Forgot to check out',
  'System error',
  'Was on client visit',
  'Biometric not working',
  'Network connectivity issue',
];

interface CreateRequestModalProps {
  open: boolean;
  formStep: 1 | 2 | 3;
  register: UseFormRegister<RegularizationFormData>;
  errors: FieldErrors<RegularizationFormData>;
  isSubmitting: boolean;
  isPending: boolean;
  reasonValue: string;
  managerName?: string;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSubmit: (data: RegularizationFormData) => void | Promise<void>;
  onQuickReason: (template: string) => void;
  handleSubmit: UseFormHandleSubmit<RegularizationFormData>;
}

export const CreateRequestModal = React.memo(function CreateRequestModal({
  open,
  formStep,
  register,
  errors,
  isSubmitting,
  isPending,
  reasonValue,
  managerName,
  onClose,
  onNext,
  onPrev,
  onSubmit,
  onQuickReason,
  handleSubmit,
}: CreateRequestModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-0 flex items-center justify-center p-4 z-50 pointer-events-none"
          >
            <div className="card-aura rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-[var(--shadow-elevated)] pointer-events-auto flex flex-col border-0">
              {/* Modal Header */}
              <div className="border-b border-[var(--border-main)] p-6">
                <div className="row-between mb-6">
                  <h2 className="text-card-title">Request Attendance Regularization</h2>
                  <motion.button
                    onClick={onClose}
                    aria-label="Close modal"
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-2xl leading-none transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    ×
                  </motion.button>
                </div>

                {/* Step Indicator with Connected Line */}
                <div className="relative flex items-center gap-4">
                  {getTimelineSteps(formStep).map((step, index) => (
                    <div key={step.step} className="flex items-center flex-1">
                      <motion.div
                        className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          step.completed
                            ? 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] ring-2 ring-[var(--status-success-border)]'
                            : step.active
                              ? 'bg-accent-500 text-white ring-4 ring-accent-500/30'
                              : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                        }`}
                        animate={step.active ? { scale: [1, 1.08, 1] } : {}}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        {step.completed ? <Check className="h-3.5 w-3.5" /> : step.step}
                      </motion.div>
                      <div className="hidden sm:block ml-4">
                        <p
                          className={`text-xs font-semibold ${
                            step.active
                              ? 'text-accent-700 dark:text-accent-400'
                              : step.completed
                                ? 'text-[var(--status-success-text)]'
                                : 'text-[var(--text-muted)]'
                          }`}
                        >
                          {step.label}
                        </p>
                      </div>
                      {index < 2 && (
                        <div
                          className={`absolute h-0.5 transition-colors ${
                            step.completed ? 'bg-[var(--status-success-bg)]' : 'bg-[var(--border-main)]'
                          }`}
                          style={{
                            width: 'calc(100% - 40px - 2rem)',
                            left: 'calc(20px + 1rem)',
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6">
                <form onSubmit={handleSubmit(onSubmit)}>
                  <AnimatePresence mode="wait">
                    {/* Step 1: Select Date */}
                    {formStep === 1 && (
                      <motion.div
                        key="step-1"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className="space-y-4"
                      >
                        <div>
                          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-4">
                            Which date do you want to regularize? <span className="text-danger-500">*</span>
                          </label>
                          <input
                            type="date"
                            {...register('attendanceDate')}
                            max={new Date().toISOString().split('T')[0]}
                            className="input-aura w-full px-4 py-2.5"
                          />
                          {errors.attendanceDate && (
                            <motion.p
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-danger-500 text-sm mt-2"
                            >
                              {errors.attendanceDate.message}
                            </motion.p>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {/* Step 2: Add Details */}
                    {formStep === 2 && (
                      <motion.div
                        key="step-2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className="space-y-4"
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-4">
                              Check In Time
                            </label>
                            <input
                              type="time"
                              {...register('requestedCheckIn')}
                              className="input-aura w-full px-4 py-2.5"
                            />
                            {errors.requestedCheckIn && (
                              <motion.p
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-danger-500 text-xs mt-2"
                              >
                                {errors.requestedCheckIn.message}
                              </motion.p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-4">
                              Check Out Time
                            </label>
                            <input
                              type="time"
                              {...register('requestedCheckOut')}
                              className="input-aura w-full px-4 py-2.5"
                            />
                            {errors.requestedCheckOut && (
                              <motion.p
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-danger-500 text-xs mt-2"
                              >
                                {errors.requestedCheckOut.message}
                              </motion.p>
                            )}
                          </div>
                        </div>
                        <div className="card-aura tint-info border-[var(--status-info-border)] p-4">
                          <p className="text-xs text-[var(--status-info-text)]">
                            <span className="font-semibold">Tip:</span> Provide the times you were actually present.
                            Leave blank if only the status needs correction.
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* Step 3: Provide Reason */}
                    {formStep === 3 && (
                      <motion.div
                        key="step-3"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className="space-y-4"
                      >
                        {/* Manager Info */}
                        <Card className="card-aura tint-info border-[var(--status-info-border)]">
                          <CardContent className="p-4">
                            <div className="flex gap-4">
                              <Info className="h-5 w-5 flex-shrink-0 mt-0.5 text-[var(--status-info-text)]" />
                              <div className="text-sm text-[var(--status-info-text)]">
                                <p className="font-semibold mb-1">Approval Routing</p>
                                <p>
                                  This request will be sent to{' '}
                                  <span className="font-medium">
                                    {managerName || 'your reporting manager'}
                                  </span>{' '}
                                  for approval. HR Managers and Admins can also approve requests.
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <div>
                          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-4">
                            Why do you need this regularization? <span className="text-danger-500">*</span>
                          </label>
                          <textarea
                            {...register('reason')}
                            rows={4}
                            className="input-aura w-full px-4 py-4"
                            placeholder="Please explain why you need attendance regularization..."
                          />
                          <div className="row-between mt-2">
                            {errors.reason && (
                              <motion.p
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-danger-500 text-sm"
                              >
                                {errors.reason.message}
                              </motion.p>
                            )}
                            <p
                              className={`text-xs ml-auto font-medium ${
                                reasonValue.length > 450
                                  ? 'text-danger-500'
                                  : reasonValue.length > 400
                                    ? 'text-warning-600 dark:text-warning-400'
                                    : 'text-[var(--text-muted)]'
                              }`}
                            >
                              {reasonValue.length}/500
                            </p>
                          </div>
                        </div>

                        {/* Quick Templates */}
                        <div>
                          <label className="block text-xs font-semibold text-[var(--text-muted)] mb-4 uppercase tracking-wide">
                            Quick Templates
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {QUICK_REASON_TEMPLATES.map((template) => (
                              <motion.button
                                key={template}
                                type="button"
                                onClick={() => onQuickReason(template)}
                                whileHover={{ scale: 1.05, y: -1 }}
                                whileTap={{ scale: 0.95 }}
                                className="px-4 py-2 text-xs font-medium border border-[var(--border-main)] rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:border-accent-400 hover:text-accent-700 dark:hover:text-accent-400 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                              >
                                {template}
                              </motion.button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </form>
              </div>

              {/* Footer with Buttons */}
              <div className="border-t border-[var(--border-main)] p-6 bg-[var(--bg-secondary)]/20">
                <div className="flex gap-4">
                  <motion.div className="flex-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (formStep > 1) {
                          onPrev();
                        } else {
                          onClose();
                        }
                      }}
                      className="w-full border-[var(--border-main)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                    >
                      {formStep === 1 ? 'Cancel' : 'Back'}
                    </Button>
                  </motion.div>
                  <motion.div className="flex-1">
                    {formStep < 3 ? (
                      <Button
                        type="button"
                        onClick={onNext}
                        className="w-full bg-accent-500 hover:bg-accent-700 text-white font-medium"
                      >
                        Next
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        disabled={isPending || isSubmitting}
                        onClick={handleSubmit(onSubmit)}
                        className="w-full bg-accent-500 hover:bg-accent-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {isPending || isSubmitting ? 'Submitting...' : 'Submit Request'}
                      </Button>
                    )}
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});
