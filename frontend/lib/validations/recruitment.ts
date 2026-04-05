import {z} from 'zod';

// ==================== Shared field schemas ====================

const optionalString = z.string().optional();
const optionalUuid = z
  .string()
  .optional()
  .refine(
    (val) => !val || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val),
    'Invalid ID format'
  );
const requiredUuid = z.string().uuid('Invalid ID format');
const optionalNumber = z.coerce.number().optional();
const optionalUrl = z
  .string()
  .optional()
  .refine(
    (val) => !val || /^https?:\/\/.+/.test(val),
    'Please enter a valid URL'
  );

// ==================== Job Opening ====================

export const createJobOpeningSchema = z.object({
  jobCode: z.string().min(1, 'Job code is required').max(50),
  jobTitle: z.string().min(1, 'Job title is required').max(200),
  departmentId: optionalUuid,
  location: optionalString,
  employmentType: z
    .enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERNSHIP'])
    .optional(),
  experienceRequired: optionalString,
  minSalary: optionalNumber,
  maxSalary: optionalNumber,
  numberOfOpenings: z.coerce.number().min(1, 'Must have at least 1 opening').optional(),
  jobDescription: optionalString,
  requirements: optionalString,
  skillsRequired: optionalString,
  hiringManagerId: optionalUuid,
  status: z.enum(['DRAFT', 'OPEN', 'ON_HOLD', 'CLOSED', 'CANCELLED']).optional(),
  postedDate: optionalString,
  closingDate: optionalString,
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  isActive: z.boolean().optional(),
});

export type CreateJobOpeningFormData = z.infer<typeof createJobOpeningSchema>;

// ==================== Candidate ====================

export const createCandidateSchema = z.object({
  candidateCode: z.string().min(1, 'Candidate code is required').max(50),
  jobOpeningId: requiredUuid,
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().min(1, 'Email is required').email('Please enter a valid email'),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^[\d\s\-+()]+$/.test(val),
      'Please enter a valid phone number'
    ),
  currentLocation: optionalString,
  currentCompany: optionalString,
  currentDesignation: optionalString,
  totalExperience: optionalNumber,
  currentCtc: optionalNumber,
  expectedCtc: optionalNumber,
  noticePeriodDays: z.coerce.number().min(0).max(365).optional(),
  resumeUrl: optionalUrl,
  source: z
    .enum([
      'JOB_PORTAL',
      'REFERRAL',
      'LINKEDIN',
      'COMPANY_WEBSITE',
      'WALK_IN',
      'CAMPUS',
      'CONSULTANT',
      'OTHER',
    ])
    .optional(),
  status: z
    .enum([
      'NEW',
      'SCREENING',
      'INTERVIEW',
      'SELECTED',
      'OFFER_EXTENDED',
      'OFFER_ACCEPTED',
      'OFFER_DECLINED',
      'REJECTED',
      'WITHDRAWN',
    ])
    .optional(),
  currentStage: z
    .enum([
      'RECRUITERS_PHONE_CALL',
      'PANEL_REVIEW',
      'PANEL_REJECT',
      'PANEL_SHORTLISTED',
      'TECHNICAL_INTERVIEW_SCHEDULED',
      'TECHNICAL_INTERVIEW_COMPLETED',
      'MANAGEMENT_INTERVIEW_SCHEDULED',
      'MANAGEMENT_INTERVIEW_COMPLETED',
      'CLIENT_INTERVIEW_SCHEDULED',
      'CLIENT_INTERVIEW_COMPLETED',
      'HR_FINAL_INTERVIEW_COMPLETED',
      'CANDIDATE_REJECTED',
      'OFFER_NDA_TO_BE_RELEASED',
    ])
    .optional(),
  appliedDate: optionalString,
  notes: optionalString,
  assignedRecruiterId: optionalUuid,
});

export type CreateCandidateFormData = z.infer<typeof createCandidateSchema>;

// ==================== Interview ====================

export const createInterviewSchema = z.object({
  candidateId: requiredUuid,
  jobOpeningId: requiredUuid,
  interviewRound: z
    .enum(['SCREENING', 'TECHNICAL_1', 'TECHNICAL_2', 'HR', 'MANAGERIAL', 'FINAL'])
    .optional(),
  interviewType: z.enum(['PHONE', 'VIDEO', 'IN_PERSON']).optional(),
  scheduledAt: z.string().min(1, 'Schedule date is required'),
  durationMinutes: z.coerce.number().min(15, 'Minimum 15 minutes').max(240, 'Maximum 4 hours').optional(),
  interviewerId: optionalUuid,
  location: optionalString,
  meetingLink: optionalUrl,
  status: z
    .enum(['SCHEDULED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])
    .optional(),
  feedback: optionalString,
  rating: z.coerce.number().min(1).max(5).optional(),
  result: z.enum(['SELECTED', 'REJECTED', 'ON_HOLD', 'PENDING']).optional(),
  notes: optionalString,
});

export type CreateInterviewFormData = z.infer<typeof createInterviewSchema>;

// ==================== Offer ====================

export const createOfferSchema = z.object({
  offeredSalary: z.coerce.number().min(0, 'Salary must be positive'),
  positionTitle: optionalString,
  joiningDate: z.string().min(1, 'Joining date is required'),
  offerExpiryDate: optionalString,
  notes: optionalString,
});

export type CreateOfferFormData = z.infer<typeof createOfferSchema>;

// ==================== AI: Resume Parse ====================

export const resumeParseRequestSchema = z
  .object({
    resumeText: z.string().optional(),
    resumeUrl: optionalUrl,
  })
  .refine((data) => data.resumeText || data.resumeUrl, {
    message: 'Please provide either resume text or a URL',
    path: ['resumeText'],
  });

export type ResumeParseFormData = z.infer<typeof resumeParseRequestSchema>;

// ==================== AI: Job Description Generation ====================

export const jobDescriptionRequestSchema = z.object({
  jobTitle: z.string().min(1, 'Job title is required'),
  department: optionalString,
  location: optionalString,
  employmentType: optionalString,
  experienceRange: optionalString,
  keySkills: z.array(z.string()).optional(),
  industry: optionalString,
  companyCulture: optionalString,
  salaryRange: optionalString,
  additionalContext: optionalString,
});

export type JobDescriptionFormData = z.infer<typeof jobDescriptionRequestSchema>;

// ==================== AI: Screening Summary ====================

export const screeningSummaryRequestSchema = z.object({
  candidateId: requiredUuid,
  jobOpeningId: requiredUuid,
  context: optionalString,
});

export type ScreeningSummaryFormData = z.infer<typeof screeningSummaryRequestSchema>;

// ==================== AI: Feedback Synthesis ====================

export const feedbackSynthesisRequestSchema = z.object({
  candidateId: requiredUuid,
  jobOpeningId: requiredUuid,
});

export type FeedbackSynthesisFormData = z.infer<typeof feedbackSynthesisRequestSchema>;
