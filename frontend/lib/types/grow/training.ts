// Training Program Types

export enum TrainingCategory {
  TECHNICAL = 'TECHNICAL',
  SOFT_SKILLS = 'SOFT_SKILLS',
  LEADERSHIP = 'LEADERSHIP',
  COMPLIANCE = 'COMPLIANCE',
  SAFETY = 'SAFETY',
  PRODUCT = 'PRODUCT',
  SALES = 'SALES',
  CUSTOMER_SERVICE = 'CUSTOMER_SERVICE',
  OTHER = 'OTHER',
}

export enum DeliveryMode {
  IN_PERSON = 'IN_PERSON',
  VIRTUAL = 'VIRTUAL',
  HYBRID = 'HYBRID',
  SELF_PACED = 'SELF_PACED',
  WORKSHOP = 'WORKSHOP',
}

export enum ProgramStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum EnrollmentStatus {
  ENROLLED = 'ENROLLED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  DROPPED = 'DROPPED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export interface TrainingProgram {
  id: string;
  programCode: string;
  programName: string;
  description?: string;
  category: TrainingCategory;
  deliveryMode: DeliveryMode;
  instructorId?: string;
  durationHours?: number;
  startDate?: string;
  endDate?: string;
  trainerName?: string;
  trainerEmail?: string;
  location?: string;
  maxParticipants?: number;
  costPerParticipant?: number;
  cost?: number;
  prerequisites?: string;
  learningObjectives?: string;
  isMandatory: boolean;
  status: ProgramStatus;
  materialsUrl?: string;
  certificateTemplateUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingProgramRequest {
  programCode: string;
  programName: string;
  description?: string;
  category: TrainingCategory;
  deliveryMode: DeliveryMode;
  instructorId?: string;
  durationHours?: number;
  startDate?: string;
  endDate?: string;
  trainerName?: string;
  trainerEmail?: string;
  location?: string;
  maxParticipants?: number;
  costPerParticipant?: number;
  cost?: number;
  prerequisites?: string;
  learningObjectives?: string;
  isMandatory?: boolean;
  status?: ProgramStatus;
  materialsUrl?: string;
  certificateTemplateUrl?: string;
}

export interface TrainingEnrollment {
  id: string;
  programId: string;
  programName?: string;
  employeeId: string;
  employeeName?: string;
  enrollmentDate?: string;
  completionDate?: string;
  status: EnrollmentStatus;
  scorePercentage?: number;
  feedback?: string;
  notes?: string;
  certificateUrl?: string;
  enrolledAt?: string;
  completedAt?: string;
  attendancePercentage?: number;
  assessmentScore?: number;
  certificateIssued: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingEnrollmentRequest {
  programId: string;
  employeeId: string;
  enrollmentDate?: string;
  notes?: string;
}

export interface TrainingEnrollmentUpdateRequest {
  status: EnrollmentStatus;
  scorePercentage?: number;
  feedback?: string;
  attendancePercentage?: number;
  assessmentScore?: number;
}
