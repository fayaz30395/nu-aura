
export type OnboardingStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type ProcessType = 'ONBOARDING' | 'OFFBOARDING';

export interface OnboardingProcess {
    id: string;
    tenantId: string;
    employeeId: string;
    employeeName?: string; // Derived from join if available, or fetch separately
    processType: ProcessType;
    startDate: string; // YYYY-MM-DD
    expectedCompletionDate?: string; // YYYY-MM-DD
    actualCompletionDate?: string; // YYYY-MM-DD
    status: OnboardingStatus;
    assignedBuddyId?: string;
    assignedBuddyName?: string;
    completionPercentage: number;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface OnboardingProcessRequest {
    employeeId: string;
    processType: ProcessType;
    startDate: string;
    expectedCompletionDate?: string;
    assignedBuddyId?: string;
    notes?: string;
}

export interface OnboardingUpdateProgressRequest {
    processId: string;
    completionPercentage: number;
}

export interface OnboardingUpdateStatusRequest {
    status: OnboardingStatus;
}
