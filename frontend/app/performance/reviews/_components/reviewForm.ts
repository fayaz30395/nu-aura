import {z} from 'zod';
import type {PerformanceReview, ReviewStatus, ReviewType} from '@/lib/types/grow/performance';

// Standard competency framework used for self-assessments
export const SELF_ASSESSMENT_COMPETENCIES: Array<{name: string; label: string}> = [
  {name: 'Technical Skills', label: 'Technical Skills'},
  {name: 'Behavioral Skills', label: 'Behavioral Skills'},
  {name: 'Leadership', label: 'Leadership'},
  {name: 'Domain Knowledge', label: 'Domain Knowledge'},
  {name: 'Problem Solving', label: 'Problem Solving'},
];

export const defaultCompetencyRatings = (): Record<string, number> =>
  Object.fromEntries(SELF_ASSESSMENT_COMPETENCIES.map((c) => [c.name, 3]));

export const reviewFormSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  reviewerId: z.string().min(1, 'Reviewer ID is required'),
  cycleId: z.string().optional().or(z.literal('')),
  reviewType: z.enum(['SELF', 'MANAGER', 'PEER', 'SUBORDINATE', 'SKIP_LEVEL'] as const) as z.ZodType<ReviewType>,
  status: z.enum(['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'COMPLETED', 'APPROVED', 'REJECTED'] as const) as z.ZodType<ReviewStatus>,
  reviewPeriodStart: z.string().min(1, 'Review period start is required'),
  reviewPeriodEnd: z.string().min(1, 'Review period end is required'),
  overallRating: z.coerce.number().min(1, 'Rating must be at least 1').max(5, 'Max 5'),
  strengths: z.string().optional().or(z.literal('')),
  areasForImprovement: z.string().optional().or(z.literal('')),
  goals: z.string().optional().or(z.literal('')),
  reviewerComments: z.string().optional().or(z.literal('')),
  employeeComments: z.string().optional().or(z.literal('')),
}).refine(data => new Date(data.reviewPeriodEnd) > new Date(data.reviewPeriodStart), {
  message: 'Review period end must be after start',
  path: ['reviewPeriodEnd'],
});

export type ReviewFormData = z.infer<typeof reviewFormSchema>;

export const EMPTY_REVIEW_FORM: ReviewFormData = {
  employeeId: '',
  reviewerId: '',
  cycleId: '',
  reviewType: 'SELF',
  status: 'DRAFT',
  reviewPeriodStart: '',
  reviewPeriodEnd: '',
  overallRating: 0,
  strengths: '',
  areasForImprovement: '',
  goals: '',
  reviewerComments: '',
  employeeComments: '',
};

export function toReviewFormValues(review: PerformanceReview | null): Partial<ReviewFormData> {
  if (!review) return EMPTY_REVIEW_FORM;
  return {
    employeeId: review.employeeId,
    reviewerId: review.reviewerId,
    cycleId: review.cycleId || '',
    reviewType: review.reviewType,
    status: review.status,
    reviewPeriodStart: review.reviewPeriodStart,
    reviewPeriodEnd: review.reviewPeriodEnd,
    overallRating: review.overallRating,
    strengths: review.strengths || '',
    areasForImprovement: review.areasForImprovement || '',
    goals: review.goals || '',
    reviewerComments: review.reviewerComments || '',
    employeeComments: review.employeeComments || '',
  };
}

export const REVIEW_TYPE_OPTIONS = [
  {value: 'SELF', label: 'Self Review'},
  {value: 'MANAGER', label: 'Manager Review'},
  {value: 'PEER', label: 'Peer Review'},
  {value: 'SUBORDINATE', label: 'Subordinate Review'},
  {value: 'SKIP_LEVEL', label: 'Skip Level'},
];

export const REVIEW_STATUS_OPTIONS = [
  {value: 'DRAFT', label: 'Draft'},
  {value: 'SUBMITTED', label: 'Submitted'},
  {value: 'IN_REVIEW', label: 'In Review'},
  {value: 'COMPLETED', label: 'Completed'},
  {value: 'APPROVED', label: 'Approved'},
  {value: 'REJECTED', label: 'Rejected'},
];
