import {apiClient} from '../../api/client';
import {
  BenefitClaim,
  BenefitEnrollment,
  BenefitPlan,
  BenefitPlanEnhanced,
  BenefitPlanRequest,
  BenefitType,
  BenefitsDashboard,
  ClaimRequest,
  EmployeeBenefitsSummary,
  EnrollmentRequest,
  FlexAllocation,
} from '../../types/hrms/benefits';
import {Page} from '../../types/hrms/payroll';

type EnhancedPlanResponse = Omit<BenefitPlanEnhanced, 'code' | 'isActive'> & {
  code?: string;
  providerCode?: string;
  coverageAmount?: number;
  employeeContribution?: number;
  employerContribution?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  isActive?: boolean;
  active?: boolean;
  eligibleGrades?: string[] | string;
  tenantId?: string;
  createdAt?: string;
  updatedAt?: string;
};

const BENEFIT_TYPE_BY_PLAN_TYPE: Record<string, BenefitType> = {
  HEALTH_INSURANCE: 'HEALTH',
  DENTAL_INSURANCE: 'DENTAL',
  VISION_INSURANCE: 'VISION',
  LIFE_INSURANCE: 'LIFE',
  DISABILITY_INSURANCE: 'DISABILITY',
  RETIREMENT_401K: 'RETIREMENT',
  PENSION: 'RETIREMENT',
  PROVIDENT_FUND: 'RETIREMENT',
  FLEXIBLE_SPENDING_ACCOUNT: 'FSA',
  HEALTH_SAVINGS_ACCOUNT: 'HSA',
};

// Reverse mapping for writes: BenefitType -> backend PlanType + required PlanCategory.
// Default for anything unmapped is OTHER / INSURANCE (OTHER is a valid PlanType; INSURANCE a valid category).
const ENHANCED_BY_BENEFIT_TYPE: Record<BenefitType, {planType: string; category: string}> = {
  HEALTH: {planType: 'HEALTH_INSURANCE', category: 'HEALTH'},
  DENTAL: {planType: 'DENTAL_INSURANCE', category: 'HEALTH'},
  VISION: {planType: 'VISION_INSURANCE', category: 'HEALTH'},
  LIFE: {planType: 'LIFE_INSURANCE', category: 'INSURANCE'},
  DISABILITY: {planType: 'DISABILITY_INSURANCE', category: 'INSURANCE'},
  RETIREMENT: {planType: 'PROVIDENT_FUND', category: 'RETIREMENT'},
  FSA: {planType: 'FLEXIBLE_SPENDING_ACCOUNT', category: 'FINANCIAL'},
  HSA: {planType: 'HEALTH_SAVINGS_ACCOUNT', category: 'FINANCIAL'},
  OTHER: {planType: 'OTHER', category: 'INSURANCE'},
};

function toEnhancedRequest(d: BenefitPlanRequest) {
  const mapped = ENHANCED_BY_BENEFIT_TYPE[d.benefitType] ?? ENHANCED_BY_BENEFIT_TYPE.OTHER;
  return {
    name: d.planName,
    description: d.description,
    planType: mapped.planType,
    category: mapped.category,
    providerCode: d.planCode,
    coverageAmount: d.coverageAmount,
    employeeContribution: d.employeeContribution,
    employerContribution: d.employerContribution,
    effectiveFrom: d.effectiveDate,
    effectiveTo: d.expiryDate,
    eligibleGrades: d.eligibilityCriteria,
  };
}

function toBenefitPlan(p: EnhancedPlanResponse): BenefitPlan {
  return {
    id: p.id,
    tenantId: p.tenantId ?? '',
    planCode: p.code ?? p.providerCode ?? '',
    planName: p.name,
    description: p.description ?? '',
    benefitType: BENEFIT_TYPE_BY_PLAN_TYPE[p.planType] ?? 'OTHER',
    providerName: p.providerName,
    coverageAmount: p.coverageAmount ?? p.baseCoverageAmount ?? 0,
    employeeContribution: p.employeeContribution ?? p.baseEmployeeContribution ?? 0,
    employerContribution: p.employerContribution ?? p.baseEmployerContribution ?? 0,
    effectiveDate: p.effectiveFrom ?? p.effectiveDate ?? '',
    expiryDate: p.effectiveTo ?? p.terminationDate,
    isActive: p.isActive ?? p.active ?? true,
    eligibilityCriteria: Array.isArray(p.eligibleGrades) ? p.eligibleGrades.join(', ') : p.eligibleGrades,
    createdAt: p.createdAt ?? '',
    updatedAt: p.updatedAt ?? '',
  };
}

class BenefitsService {
  // ==================== BENEFIT PLANS (Basic API) ====================

  async createPlan(data: BenefitPlanRequest): Promise<BenefitPlan> {
    const response = await apiClient.post<EnhancedPlanResponse>('/benefits-enhanced/plans', toEnhancedRequest(data));
    return toBenefitPlan(response.data);
  }

  async updatePlan(planId: string, data: BenefitPlanRequest): Promise<BenefitPlan> {
    const response = await apiClient.put<EnhancedPlanResponse>(`/benefits-enhanced/plans/${planId}`, toEnhancedRequest(data));
    return toBenefitPlan(response.data);
  }

  async activatePlan(planId: string): Promise<BenefitPlan> {
    const response = await apiClient.post<BenefitPlan>(`/benefits/plans/${planId}/activate`);
    return response.data;
  }

  async deactivatePlan(planId: string): Promise<BenefitPlan> {
    const response = await apiClient.post<BenefitPlan>(`/benefits/plans/${planId}/deactivate`);
    return response.data;
  }

  async getPlanById(planId: string): Promise<BenefitPlan> {
    const response = await apiClient.get<BenefitPlan>(`/benefits/plans/${planId}`);
    return response.data;
  }

  // Reads go to /benefits-enhanced (there is no /api/v1/benefits controller) and are mapped to the BenefitPlan shape.
  // create/update go to /benefits-enhanced. The backend has no activate/deactivate/delete/get-by-id plan endpoints;
  // those methods still target /benefits and will 404 (no UI caller).
  async getAllPlans(page: number = 0, size: number = 20): Promise<Page<BenefitPlan>> {
    const response = await apiClient.get<Page<EnhancedPlanResponse>>('/benefits-enhanced/plans', {
      params: {page, size},
    });
    return {...response.data, content: response.data.content.map(toBenefitPlan)};
  }

  async getActivePlans(): Promise<BenefitPlan[]> {
    const response = await apiClient.get<EnhancedPlanResponse[]>('/benefits-enhanced/plans/active');
    return response.data.map(toBenefitPlan);
  }

  async getPlansByType(planType: string): Promise<BenefitPlan[]> {
    const response = await apiClient.get<EnhancedPlanResponse[]>(`/benefits-enhanced/plans/type/${planType}`);
    return response.data.map(toBenefitPlan);
  }

  async deletePlan(planId: string): Promise<void> {
    await apiClient.delete(`/benefits/plans/${planId}`);
  }

  // ==================== ENHANCED PLANS ====================

  async getEnhancedPlans(page: number = 0, size: number = 20): Promise<Page<BenefitPlanEnhanced>> {
    const response = await apiClient.get<Page<BenefitPlanEnhanced>>('/benefits-enhanced/plans', {
      params: {page, size},
    });
    return response.data;
  }

  async getActiveEnhancedPlans(): Promise<BenefitPlanEnhanced[]> {
    const response = await apiClient.get<BenefitPlanEnhanced[]>('/benefits-enhanced/plans/active');
    return response.data;
  }

  async getEnhancedPlanById(planId: string): Promise<BenefitPlanEnhanced> {
    const response = await apiClient.get<BenefitPlanEnhanced>(`/benefits-enhanced/plans/${planId}`);
    return response.data;
  }

  async getEnhancedPlansByType(planType: string): Promise<BenefitPlanEnhanced[]> {
    const response = await apiClient.get<BenefitPlanEnhanced[]>(`/benefits-enhanced/plans/type/${planType}`);
    return response.data;
  }

  async getEnhancedPlansByCategory(category: string): Promise<BenefitPlanEnhanced[]> {
    const response = await apiClient.get<BenefitPlanEnhanced[]>(`/benefits-enhanced/plans/category/${category}`);
    return response.data;
  }

  async getEligiblePlans(grade: string): Promise<BenefitPlanEnhanced[]> {
    const response = await apiClient.get<BenefitPlanEnhanced[]>('/benefits-enhanced/plans/eligible', {
      params: {grade},
    });
    return response.data;
  }

  // ==================== ENROLLMENTS ====================

  async enrollEmployee(data: EnrollmentRequest): Promise<BenefitEnrollment> {
    const response = await apiClient.post<BenefitEnrollment>('/benefits-enhanced/enrollments', data);
    return response.data;
  }

  async approveEnrollment(enrollmentId: string, comments?: string): Promise<BenefitEnrollment> {
    const response = await apiClient.post<BenefitEnrollment>(
      `/benefits-enhanced/enrollments/${enrollmentId}/approve`,
      null,
      {params: {comments}}
    );
    return response.data;
  }

  async activateEnrollment(enrollmentId: string): Promise<BenefitEnrollment> {
    const response = await apiClient.post<BenefitEnrollment>(
      `/benefits-enhanced/enrollments/${enrollmentId}/activate`
    );
    return response.data;
  }

  async terminateEnrollment(enrollmentId: string, reason: string): Promise<BenefitEnrollment> {
    const response = await apiClient.post<BenefitEnrollment>(
      `/benefits-enhanced/enrollments/${enrollmentId}/terminate`,
      null,
      {params: {reason}}
    );
    return response.data;
  }

  async getEmployeeEnrollments(employeeId: string): Promise<BenefitEnrollment[]> {
    const response = await apiClient.get<BenefitEnrollment[]>(
      `/benefits-enhanced/enrollments/employee/${employeeId}`
    );
    return response.data;
  }

  async getActiveEnrollments(employeeId: string): Promise<BenefitEnrollment[]> {
    const response = await apiClient.get<BenefitEnrollment[]>(
      `/benefits-enhanced/enrollments/employee/${employeeId}/active`
    );
    return response.data;
  }

  async getPendingEnrollments(): Promise<BenefitEnrollment[]> {
    const response = await apiClient.get<BenefitEnrollment[]>('/benefits-enhanced/enrollments/pending');
    return response.data;
  }

  // ==================== CLAIMS ====================

  async submitClaim(data: ClaimRequest): Promise<BenefitClaim> {
    const response = await apiClient.post<BenefitClaim>('/benefits-enhanced/claims', data);
    return response.data;
  }

  async getClaim(claimId: string): Promise<BenefitClaim> {
    const response = await apiClient.get<BenefitClaim>(`/benefits-enhanced/claims/${claimId}`);
    return response.data;
  }

  async processClaim(claimId: string, approvedAmount: number, comments?: string): Promise<BenefitClaim> {
    const response = await apiClient.post<BenefitClaim>(
      `/benefits-enhanced/claims/${claimId}/process`,
      null,
      {params: {approvedAmount, comments}}
    );
    return response.data;
  }

  async rejectClaim(claimId: string, reason: string): Promise<BenefitClaim> {
    const response = await apiClient.post<BenefitClaim>(
      `/benefits-enhanced/claims/${claimId}/reject`,
      null,
      {params: {reason}}
    );
    return response.data;
  }

  async appealClaim(claimId: string, reason: string): Promise<BenefitClaim> {
    const response = await apiClient.post<BenefitClaim>(
      `/benefits-enhanced/claims/${claimId}/appeal`,
      null,
      {params: {reason}}
    );
    return response.data;
  }

  async getEmployeeClaims(employeeId: string, page: number = 0, size: number = 20): Promise<Page<BenefitClaim>> {
    const response = await apiClient.get<Page<BenefitClaim>>(
      `/benefits-enhanced/claims/employee/${employeeId}`,
      {params: {page, size}}
    );
    return response.data;
  }

  async getPendingClaims(): Promise<BenefitClaim[]> {
    const response = await apiClient.get<BenefitClaim[]>('/benefits-enhanced/claims/pending');
    return response.data;
  }

  async initiateClaimPayment(claimId: string): Promise<BenefitClaim> {
    const response = await apiClient.post<BenefitClaim>(
      `/benefits-enhanced/claims/${claimId}/initiate-payment`
    );
    return response.data;
  }

  async completeClaimPayment(claimId: string, paymentReference: string): Promise<BenefitClaim> {
    const response = await apiClient.post<BenefitClaim>(
      `/benefits-enhanced/claims/${claimId}/complete-payment`,
      null,
      {params: {paymentReference}}
    );
    return response.data;
  }

  // ==================== FLEX BENEFITS ====================

  async getActiveFlexAllocation(employeeId: string): Promise<FlexAllocation> {
    const response = await apiClient.get<FlexAllocation>(
      `/benefits-enhanced/flex/allocations/employee/${employeeId}/active`
    );
    return response.data;
  }

  async getFlexAllocationHistory(employeeId: string): Promise<FlexAllocation[]> {
    const response = await apiClient.get<FlexAllocation[]>(
      `/benefits-enhanced/flex/allocations/employee/${employeeId}/history`
    );
    return response.data;
  }

  // ==================== ANALYTICS ====================

  async getBenefitsDashboard(): Promise<BenefitsDashboard> {
    const response = await apiClient.get<BenefitsDashboard>('/benefits-enhanced/dashboard');
    return response.data;
  }

  async getEmployeeBenefitsSummary(employeeId: string): Promise<EmployeeBenefitsSummary> {
    const response = await apiClient.get<EmployeeBenefitsSummary>(
      `/benefits-enhanced/summary/employee/${employeeId}`
    );
    return response.data;
  }
}

export const benefitsService = new BenefitsService();
