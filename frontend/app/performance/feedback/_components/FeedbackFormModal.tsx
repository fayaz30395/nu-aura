'use client';

import {useEffect} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Button, Checkbox, NativeSelect, Textarea, TextInput} from '@mantine/core';
import {Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui/Modal';
import {EmployeeSearchAutocomplete} from '@/components/ui/EmployeeSearchAutocomplete';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import type {Feedback, FeedbackType} from '@/lib/types/grow/performance';
import {FEEDBACK_TYPE_OPTIONS} from './feedbackOptions';

const feedbackFormSchema = z.object({
  recipientId: z.string().min(1, 'Recipient is required'),
  giverId: z.string().min(1, 'Giver ID is required'),
  feedbackType: z.enum(['PRAISE', 'CONSTRUCTIVE', 'GENERAL', 'REQUEST'] as const) as z.ZodType<FeedbackType>,
  category: z.string().optional().or(z.literal('')),
  feedbackText: z.string().min(1, 'Feedback is required').max(5000),
  isAnonymous: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  relatedReviewId: z.string().optional().or(z.literal('')),
});

export type FeedbackFormData = z.infer<typeof feedbackFormSchema>;

function toFormValues(feedback: Feedback | null, giverId: string): FeedbackFormData {
  if (!feedback) {
    return {
      recipientId: '',
      giverId,
      feedbackType: 'GENERAL',
      category: '',
      feedbackText: '',
      isAnonymous: false,
      isPublic: false,
      relatedReviewId: '',
    };
  }
  return {
    recipientId: feedback.recipientId,
    giverId: feedback.giverId,
    feedbackType: feedback.feedbackType,
    category: feedback.category || '',
    feedbackText: feedback.feedbackText,
    isAnonymous: feedback.isAnonymous,
    isPublic: feedback.isPublic,
    relatedReviewId: feedback.relatedReviewId || '',
  };
}

interface FeedbackFormModalProps {
  isOpen: boolean;
  /** Feedback being edited; null when giving new feedback. */
  feedback: Feedback | null;
  currentUserId: string;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (data: FeedbackFormData) => void | Promise<void>;
}

export function FeedbackFormModal({isOpen, feedback, currentUserId, isSaving, onClose, onSubmit}: FeedbackFormModalProps) {
  const {register, control, handleSubmit, reset, formState: {errors, isSubmitting}} = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: toFormValues(null, currentUserId),
  });

  useEffect(() => {
    if (isOpen) reset(toFormValues(feedback, currentUserId));
  }, [isOpen, feedback, currentUserId, reset]);

  const pending = isSaving || isSubmitting;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex min-h-0 flex-1 flex-col">
        <ModalHeader onClose={onClose}>{feedback ? 'Edit Feedback' : 'Give Feedback'}</ModalHeader>
        <ModalBody className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Controller
              control={control}
              name="recipientId"
              render={({field}) => (
                <EmployeeSearchAutocomplete
                  label="Recipient *"
                  value={field.value ? {id: field.value, name: field.value} : null}
                  onChange={(employee) => field.onChange(employee?.id || '')}
                  placeholder="Search for a recipient..."
                  required
                />
              )}
            />
            {errors.recipientId && (
              <p role="alert" className="text-xs text-danger-600">{errors.recipientId.message}</p>
            )}
          </div>

          <NativeSelect
            id="feedback-type"
            label="Feedback Type *"
            data={FEEDBACK_TYPE_OPTIONS}
            error={errors.feedbackType?.message}
            {...register('feedbackType')}
          />

          <TextInput
            id="feedback-category"
            label="Category"
            placeholder="e.g., Communication, Leadership, Technical Skills"
            error={errors.category?.message}
            {...register('category')}
          />

          <Textarea
            id="feedback-text"
            label="Feedback *"
            rows={6}
            placeholder="Provide detailed feedback..."
            error={errors.feedbackText?.message}
            {...register('feedbackText')}
          />

          <div className="flex flex-col gap-2">
            <Controller
              control={control}
              name="isAnonymous"
              render={({field}) => (
                <Checkbox
                  label="Submit as anonymous"
                  checked={!!field.value}
                  onChange={(e) => field.onChange(e.currentTarget.checked)}
                  onBlur={field.onBlur}
                  ref={field.ref}
                />
              )}
            />
            <Controller
              control={control}
              name="isPublic"
              render={({field}) => (
                <Checkbox
                  label="Make this feedback public"
                  checked={!!field.value}
                  onChange={(e) => field.onChange(e.currentTarget.checked)}
                  onBlur={field.onBlur}
                  ref={field.ref}
                />
              )}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="default" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <PermissionGate permission={feedback ? Permissions.REVIEW_UPDATE : Permissions.REVIEW_CREATE}>
            <Button type="submit" loading={pending}>
              {feedback ? 'Update' : 'Submit'}
            </Button>
          </PermissionGate>
        </ModalFooter>
      </form>
    </Modal>
  );
}
