'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsDown } from 'lucide-react';
import { UseFormRegister, FieldErrors, UseFormHandleSubmit } from 'react-hook-form';
import { Button } from '@/components/ui/Button';

export interface RejectReasonData {
  reason: string;
}

interface RejectRequestModalProps {
  open: boolean;
  register: UseFormRegister<RejectReasonData>;
  errors: FieldErrors<RejectReasonData>;
  isSubmitting: boolean;
  isPending: boolean;
  rejectReasonValue: string;
  onClose: () => void;
  onSubmit: (data: RejectReasonData) => void | Promise<void>;
  handleSubmit: UseFormHandleSubmit<RejectReasonData>;
}

export function RejectRequestModal({
  open,
  register,
  errors,
  isSubmitting,
  isPending,
  rejectReasonValue,
  onClose,
  onSubmit,
  handleSubmit,
}: RejectRequestModalProps) {
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
            <div className="card-aura rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl pointer-events-auto flex flex-col border-0">
              {/* Modal Header */}
              <div className="border-b border-[var(--border-main)] p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-card-title">Reject Regularization Request</h2>
                  <motion.button
                    onClick={onClose}
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-2xl leading-none transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    ×
                  </motion.button>
                </div>
              </div>

              {/* Form Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <form onSubmit={handleSubmit(onSubmit)}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-[var(--text-primary)] mb-3">
                        Reason for Rejection <span className="text-danger-500">*</span>
                      </label>
                      <textarea
                        {...register('reason')}
                        rows={4}
                        className="input-aura w-full px-4 py-3"
                        placeholder="Please explain why you are rejecting this regularization request..."
                      />
                      <div className="flex items-center justify-between mt-2">
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
                            rejectReasonValue.length > 450
                              ? 'text-danger-500'
                              : rejectReasonValue.length > 400
                                ? 'text-warning-600 dark:text-warning-400'
                                : 'text-[var(--text-muted)]'
                          }`}
                        >
                          {rejectReasonValue.length}/500
                        </p>
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              {/* Footer with Buttons */}
              <div className="border-t border-[var(--border-main)] p-6 bg-[var(--bg-secondary)]/20">
                <div className="flex gap-4">
                  <motion.div className="flex-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      className="w-full border-[var(--border-main)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                    >
                      Cancel
                    </Button>
                  </motion.div>
                  <motion.div className="flex-1">
                    <Button
                      type="submit"
                      disabled={isPending || isSubmitting}
                      onClick={handleSubmit(onSubmit)}
                      className="w-full bg-danger-600 hover:bg-danger-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ThumbsDown className="h-4 w-4 mr-2" />
                      {isPending || isSubmitting ? 'Rejecting...' : 'Reject Request'}
                    </Button>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
