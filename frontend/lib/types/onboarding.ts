
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
    templateId?: string;
}

export interface OnboardingChecklistTemplate {
    id: string;
    name: string;
    description?: string;
    applicableFor: 'ALL' | 'DEPARTMENT_SPECIFIC' | 'ROLE_SPECIFIC' | 'LEVEL_SPECIFIC';
    departmentId?: string;
    jobLevel?: string;
    isActive: boolean;
    isDefault: boolean;
    estimatedDays?: number;
}

export interface OnboardingTemplateTask {
    id: string;
    templateId: string;
    taskName: string;
    description?: string;
    category: string;
    isMandatory: boolean;
    orderSequence: number;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    estimatedDaysFromStart?: number;
}

export interface OnboardingTask {
    id: string;
    processId: string;
    employeeId: string;
    taskName: string;
    description?: string;
    category: string;
    assignedTo?: string;
    assignedToName?: string;
    dueDate?: string;
    completedDate?: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'BLOCKED';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    isMandatory: boolean;
    orderSequence: number;
    remarks?: string;
}

export interface OnboardingUpdateProgressRequest {
    processId: string;
    completionPercentage: number;
}

export interface OnboardingUpdateStatusRequest {
    status: OnboardingStatus;
}
