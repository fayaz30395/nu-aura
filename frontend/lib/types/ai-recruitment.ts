// ==================== Resume Parsing ====================

export interface ResumeParseRequest {
  resumeText?: string;
  resumeUrl?: string;
  fileBase64?: string;
  fileName?: string;
}

export interface EducationDetail {
  degree: string;
  institution: string;
  year?: number;
  score?: string;
}

export interface ExperienceDetail {
  company: string;
  designation: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface ResumeParseResponse {
  success: boolean;
  message?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  currentLocation?: string;
  currentCompany?: string;
  currentDesignation?: string;
  totalExperienceYears?: number;
  skills?: string[];
  education?: EducationDetail[];
  experience?: ExperienceDetail[];
  certifications?: string[];
  languages?: string[];
  summary?: string;
  rawJson?: string;
}

// ==================== Candidate Matching ====================

export type MatchRecommendation =
  | 'HIGHLY_RECOMMENDED'
  | 'RECOMMENDED'
  | 'CONSIDER'
  | 'NOT_RECOMMENDED';

export interface CandidateMatchResponse {
  candidateId: string;
  candidateName: string;
  jobOpeningId: string;
  jobTitle: string;
  overallScore: number;
  skillsScore: number;
  experienceScore: number;
  educationScore: number;
  culturalFitScore: number;
  strengths: string[];
  gaps: string[];
  recommendation: MatchRecommendation;
  summary: string;
  interviewFocus: string[];
  aiModelVersion: string;
}

// ==================== Screening Summary ====================

export type FitLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type ScreeningRecommendation = 'ADVANCE' | 'HOLD' | 'REJECT';

export interface CandidateScreeningSummaryRequest {
  candidateId: string;
  jobOpeningId: string;
  context?: string;
}

export interface CandidateScreeningSummaryResponse {
  candidateId: string;
  candidateName: string;
  jobOpeningId: string;
  jobTitle: string;
  fitLevel: FitLevel;
  strengths: string[];
  gaps: string[];
  followUpQuestions: string[];
  riskFlags: string[];
  recommendation: ScreeningRecommendation;
  summary: string;
  aiModelVersion: string;
}

// ==================== Job Description Generation ====================

export interface JobDescriptionRequest {
  jobTitle: string;
  department?: string;
  location?: string;
  employmentType?: string;
  experienceRange?: string;
  keySkills?: string[];
  industry?: string;
  companyCulture?: string;
  salaryRange?: string;
  additionalContext?: string;
}

export interface JobDescriptionResponse {
  success: boolean;
  message?: string;
  title?: string;
  summary?: string;
  responsibilities?: string[];
  requirements?: string[];
  preferredQualifications?: string[];
  benefits?: string[];
  fullDescription?: string;
}

// ==================== Interview Questions ====================

export interface TechnicalQuestion {
  question: string;
  purpose: string;
  difficulty: 'easy' | 'medium' | 'hard';
  expectedAnswer?: string;
}

export interface BehavioralQuestion {
  question: string;
  competency: string;
  followUpQuestions?: string[];
}

export interface SituationalQuestion {
  question: string;
  scenario: string;
  whatToLookFor?: string;
}

export interface CulturalFitQuestion {
  question: string;
  value: string;
}

export interface RoleSpecificQuestion {
  question: string;
  focus: string;
}

export interface InterviewQuestionsResponse {
  success: boolean;
  message?: string;
  technicalQuestions?: TechnicalQuestion[];
  behavioralQuestions?: BehavioralQuestion[];
  situationalQuestions?: SituationalQuestion[];
  culturalFitQuestions?: CulturalFitQuestion[];
  roleSpecificQuestions?: RoleSpecificQuestion[];
  rawJson?: string;
}

// ==================== Feedback Synthesis ====================

export interface FeedbackSynthesisRequest {
  candidateId: string;
  jobOpeningId: string;
}

export interface FeedbackSynthesisResponse {
  candidateId: string;
  candidateName: string;
  jobOpeningId: string;
  jobTitle: string;
  candidateNarrative: string;
  themes: string[];
  agreements: string[];
  disagreements: string[];
  missingData: string[];
  openQuestions: string[];
  recommendedNextStep: string;
  aiModelVersion: string;
}
