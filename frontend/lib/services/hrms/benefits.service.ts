import { apiClient } from '../../api/client';
import {
  BenefitPlan,
  BenefitPlanEnhanced,
  BenefitPlanRequest,
  BenefitEnrollment,
  EnrollmentRequest,
  BenefitClaim,
  ClaimRequest,
  FlexAllocation,
  BenefitsDashboard,
  EmployeeBenefitsSummary,
} from '../../types/hrms/benefits';
import { Page } from '../../types/hrms/payroll';

class BenefitsService {
  // ==================== BENEFIT PLANS (Basic API) ====================

  async createPlan(data: BenefitPlanRequest): Promise<BenefitPlan> {
    const response = await apiClient.post<BenefitPlan>('/benefits/plans', data);
    return response.data;
  }

  async updatePlan(planId: string, data: BenefitPlanRequest): Promise<BenefitPlan> {
    const response = await apiClient.put<BenefitPlan>(`/benefits/plans/${planId}`, data);
    return response.data;
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

  async getAllPlans(page: number = 0, size: number = 20): Promise<Page<BenefitPlan>> {
    const response = await apiClient.get<Page<BenefitPlan>>('/benefits/plans', {
      params: { page, size },
    });
    return response.data;
  }

  async getActivePlans(): Promise<BenefitPlan[]> {
    const response = await apiClient.get<BenefitPlan[]>('/benefits/plans/active');
    return response.data;
  }

  async getPlansByType(benefitType: string): Promise<BenefitPlan[]> {
    const response = await apiClient.get<BenefitPlan[]>(`/benefits/plans/type/${benefitType}`);
    return response.data;
  }

  async deletePlan(planId: string): Promise<void> {
    await apiClient.delete(`/benefits/plans/${planId}`);
  }

  // ==================== ENHANCED PLANS ====================

  async getEnhancedPlans(page: number = 0, size: number = 20): Promise<Page<BenefitPlanEnhanced>> {
    const response = await apiClient.get<Page<BenefitPlanEnhanced>>('/benefits-enhanced/plans', {
      params: { page, size },
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
      params: { grade },
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
      { params: { comments } }
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
      { params: { reason } }
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
      { params: { approvedAmount, comments } }
    );
    return response.data;
  }

  async rejectClaim(claimId: string, reason: string): Promise<BenefitClaim> {
    const response = await apiClient.post<BenefitClaim>(
      `/benefits-enhanced/claims/${claimId}/reject`,
      null,
      { params: { reason } }
    );
    return response.data;
  }

  async appealClaim(claimId: string, reason: string): Promise<BenefitClaim> {
    const response = await apiClient.post<BenefitClaim>(
      `/benefits-enhanced/claims/${claimId}/appeal`,
      null,
      { params: { reason } }
    );
    return response.data;
  }

  async getEmployeeClaims(employeeId: string, page: number = 0, size: number = 20): Promise<Page<BenefitClaim>> {
    const response = await apiClient.get<Page<BenefitClaim>>(
      `/benefits-enhanced/claims/employee/${employeeId}`,
      { params: { page, size } }
    );
    return response.data;
  }

  async getPendingClaims(): Promise<BenefitClaim[]> {
    const response = await apiClient.get<BenefitClaim[]>('/benefits-enhanced/claims/pending');
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
