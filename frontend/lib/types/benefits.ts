export type BenefitType = 'HEALTH' | 'DENTAL' | 'VISION' | 'LIFE' | 'DISABILITY' | 'RETIREMENT' | 'FSA' | 'HSA' | 'OTHER';

export type PlanType = 'HEALTH_INSURANCE' | 'DENTAL' | 'VISION' | 'LIFE_INSURANCE' | 'DISABILITY' | 'RETIREMENT' | 'FSA' | 'HSA' | 'WELLNESS' | 'EAP' | 'OTHER';

export type PlanCategory = 'CORE' | 'VOLUNTARY' | 'FLEX' | 'SUPPLEMENTAL';

export type EnrollmentStatus = 'PENDING' | 'APPROVED' | 'ACTIVE' | 'TERMINATED' | 'WAIVED' | 'COBRA_ACTIVE';

export type CoverageLevel = 'EMPLOYEE_ONLY' | 'EMPLOYEE_SPOUSE' | 'EMPLOYEE_CHILDREN' | 'FAMILY';

export interface BenefitPlan {
  id: string;
  tenantId: string;
  planCode: string;
  planName: string;
  description: string;
  benefitType: BenefitType;
  providerId?: string;
  providerName?: string;
  coverageAmount: number;
  employeeContribution: number;
  employerContribution: number;
  effectiveDate: string;
  expiryDate?: string;
  isActive: boolean;
  eligibilityCriteria?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BenefitPlanEnhanced {
  id: string;
  name: string;
  code: string;
  description?: string;
  planType: PlanType;
  category: PlanCategory;
  providerName?: string;
  providerContact?: string;
  policyNumber?: string;

  // Cost
  baseEmployeeContribution: number;
  baseEmployerContribution: number;
  baseCoverageAmount: number;

  // Dates
  effectiveDate: string;
  terminationDate?: string;
  enrollmentStartDate?: string;
  enrollmentEndDate?: string;

  // Coverage
  coverageLevelsAvailable: CoverageLevel[];
  dependentsAllowed: boolean;
  maxDependents?: number;

  // Eligibility
  eligibleGrades?: string[];
  eligibleLocations?: string[];
  waitingPeriodDays: number;

  // Status
  isActive: boolean;
  isFlexEligible: boolean;
  flexCreditAmount: number;

  // Analytics
  totalEnrollments: number;

  createdAt: string;
  updatedAt: string;
}

export interface BenefitPlanRequest {
  planCode: string;
  planName: string;
  description: string;
  benefitType: BenefitType;
  providerId?: string;
  coverageAmount: number;
  employeeContribution: number;
  employerContribution: number;
  effectiveDate: string;
  expiryDate?: string;
  eligibilityCriteria?: string;
}

export interface BenefitEnrollment {
  id: string;
  benefitPlanId: string;
  benefitPlanName: string;
  planType: PlanType;
  employeeId: string;
  status: EnrollmentStatus;
  coverageLevel: CoverageLevel;

  // Dates
  enrollmentDate: string;
  effectiveDate: string;
  terminationDate?: string;

  // Cost
  employeeContribution: number;
  employerContribution: number;
  totalPremium: number;
  flexCreditsUsed: number;
  outOfPocketCost: number;

  // Coverage
  selectedOptions?: string;
  membershipId?: string;
  policyCardNumber?: string;
  nomineeDetails?: string;
  currentCoverage: number;
  claimsUtilized: number;
  remainingCoverage: number;

  // Dependents
  dependents?: BenefitDependent[];
  dependentCount: number;

  // COBRA
  cobraActive: boolean;
  cobraStartDate?: string;
  cobraEndDate?: string;
  cobraPremium?: number;

  // Waiver
  waived: boolean;
  waiverReason?: string;
  waiverDate?: string;

  // Approval
  approvedBy?: string;
  approvedAt?: string;
  approvalComments?: string;

  createdAt: string;
  updatedAt: string;
}

export interface BenefitDependent {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  relationship: 'SPOUSE' | 'CHILD' | 'DOMESTIC_PARTNER' | 'PARENT' | 'OTHER';
  dateOfBirth: string;
  age: number;
  gender: string;
  isCovered: boolean;
  coverageStartDate?: string;
  coverageEndDate?: string;
  membershipId?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
}

export interface EnrollmentRequest {
  benefitPlanId: string;
  employeeId: string;
  coverageLevel: CoverageLevel;
  effectiveDate: string;
  selectedOptions?: string;
  nomineeDetails?: string;
  useFlexCredits?: boolean;
}

export interface BenefitClaim {
  id: string;
  enrollmentId: string;
  employeeId: string;
  claimNumber: string;
  claimType: 'MEDICAL' | 'DENTAL' | 'VISION' | 'PRESCRIPTION' | 'OTHER';
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PAID' | 'APPEALED';

  // Amount
  claimAmount: number;
  approvedAmount?: number;
  deductibleApplied: number;
  coPayApplied: number;
  finalPayoutAmount?: number;

  // Details
  claimDate: string;
  serviceDate: string;
  serviceProvider: string;
  description: string;

  // Documents
  receiptUrl?: string;

  // Processing
  processedBy?: string;
  processedAt?: string;
  processingComments?: string;
  rejectionReason?: string;

  // Payment
  paymentStatus?: string;
  paymentReference?: string;
  paymentDate?: string;

  // Appeal
  appealDate?: string;
  appealReason?: string;

  createdAt: string;
  updatedAt: string;
}

export interface ClaimRequest {
  enrollmentId: string;
  claimType: 'MEDICAL' | 'DENTAL' | 'VISION' | 'PRESCRIPTION' | 'OTHER';
  claimAmount: number;
  serviceDate: string;
  serviceProvider: string;
  description: string;
  receiptUrl?: string;
}

export interface FlexAllocation {
  id: string;
  employeeId: string;
  fiscalYear: number;
  totalAmount: number;
  usedAmount: number;
  remainingAmount: number;
  status: 'ACTIVE' | 'EXPIRED' | 'EXHAUSTED';
  effectiveDate: string;
  expiryDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface BenefitsSummary {
  totalEnrolled: number;
  monthlyPremium: number;
  totalCoverage: number;
  availablePlans: number;
}

export interface BenefitsDashboard {
  totalPlans: number;
  activePlans: number;
  totalEnrollments: number;
  activeEnrollments: number;
  pendingEnrollments: number;
  totalClaims: number;
  pendingClaims: number;
  totalClaimsAmount: number;
  approvedClaimsAmount: number;
  enrollmentsByPlanType: Record<string, number>;
  claimsByStatus: Record<string, number>;
}

export interface EmployeeBenefitsSummary {
  totalEnrollments: number;
  activeEnrollments: number;
  monthlyContribution: number;
  totalCoverage: number;
  claimsSubmitted: number;
  claimsPaid: number;
  flexCreditsAvailable: number;
  flexCreditsUsed: number;
}
