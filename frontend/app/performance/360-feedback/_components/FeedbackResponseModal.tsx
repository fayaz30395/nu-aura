'use client';

import {useEffect} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Button, Textarea} from '@mantine/core';
import {Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui/Modal';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import type {Feedback360Request, FeedbackResponse} from '@/lib/services/grow/feedback360.service';
import {RatingStars} from './RatingStars';

const rating = z.number().int().min(0).max(5);

const responseFormSchema = z.object({
  overallRating: rating,
  communicationRating: rating,
  teamworkRating: rating,
  leadershipRating: rating,
  problemSolvingRating: rating,
  technicalSkillsRating: rating,
  strengths: z.string(),
  areasForImprovement: z.string(),
  additionalComments: z.string(),
});

type ResponseFormData = z.infer<typeof responseFormSchema>;

const EMPTY_RESPONSE: ResponseFormData = {
  overallRating: 0,
  communicationRating: 0,
  teamworkRating: 0,
  leadershipRating: 0,
  problemSolvingRating: 0,
  technicalSkillsRating: 0,
  strengths: '',
  areasForImprovement: '',
  additionalComments: '',
};

const RATING_FIELDS = [
  {name: 'overallRating', label: 'Overall Performance'},
  {name: 'communicationRating', label: 'Communication'},
  {name: 'teamworkRating', label: 'Teamwork'},
  {name: 'leadershipRating', label: 'Leadership'},
  {name: 'problemSolvingRating', label: 'Problem Solving'},
  {name: 'technicalSkillsRating', label: 'Technical Skills'},
] as const;

const TEXT_FIELDS = [
  {name: 'strengths', id: 'response-strengths', label: 'Strengths', placeholder: 'What does this person do well?'},
  {
    name: 'areasForImprovement',
    id: 'response-areas-for-improvement',
    label: 'Areas for Improvement',
    placeholder: 'What areas could they improve?',
  },
  {
    name: 'additionalComments',
    id: 'response-additional-comments',
    label: 'Additional Comments',
    placeholder: 'Any other feedback or observations?',
  },
] as const;

interface FeedbackResponseModalProps {
  request: Feedback360Request | null;
  isSaving: boolean;
  onClose: () => void;
  /** Resolves true when the response was saved. */
  onSubmit: (data: FeedbackResponse) => Promise<boolean>;
}

export function FeedbackResponseModal({request, isSaving, onClose, onSubmit}: FeedbackResponseModalProps) {
  const {register, control, handleSubmit, reset, watch, formState: {isSubmitting}} = useForm<ResponseFormData>({
    resolver: zodResolver(responseFormSchema),
    defaultValues: EMPTY_RESPONSE,
  });

  useEffect(() => {
    if (request) reset(EMPTY_RESPONSE);
  }, [request, reset]);

  const save = (isDraft: boolean) => handleSubmit(async (data) => {
    if (!request) return;
    if (await onSubmit({...data, requestId: request.id, isDraft})) onClose();
  });

  const pending = isSaving || isSubmitting;
  const overallRating = watch('overallRating');

  return (
    <Modal isOpen={!!request} onClose={onClose} size="lg">
      {request && (
        <form onSubmit={save(false)} noValidate className="flex min-h-0 flex-1 flex-col">
          <ModalHeader onClose={onClose}>
            <div>
              <h2 className="text-xl font-semibold text-text-1">Provide Feedback</h2>
              <p className="mt-1 text-sm text-text-2">
                {request.reviewerType} review for Employee #{request.subjectEmployeeId.slice(0, 8)}
              </p>
            </div>
          </ModalHeader>
          <ModalBody className="flex flex-col gap-6">
            <section className="flex flex-col gap-4">
              <h3 className="text-sm font-medium text-text-1">Competency Ratings</h3>
              {RATING_FIELDS.map(({name, label}) => (
                <div key={name} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-text-2">{label}</span>
                  <Controller
                    name={name}
                    control={control}
                    render={({field}) => <RatingStars rating={field.value} onChange={field.onChange} label={label}/>}
                  />
                </div>
              ))}
            </section>
            {TEXT_FIELDS.map(({name, id, label, placeholder}) => (
              <Textarea key={name} id={id} label={label} placeholder={placeholder} rows={3} {...register(name)}/>
            ))}
          </ModalBody>
          <ModalFooter className="!justify-between">
            <Button type="button" variant="default" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <div className="flex gap-2">
              <PermissionGate permission={Permissions.FEEDBACK_360_SUBMIT}>
                <Button type="button" variant="default" onClick={save(true)} disabled={pending}>
                  Save Draft
                </Button>
              </PermissionGate>
              <PermissionGate permission={Permissions.FEEDBACK_360_SUBMIT}>
                <Button type="submit" loading={pending} disabled={!overallRating}>
                  Submit Feedback
                </Button>
              </PermissionGate>
            </div>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}
