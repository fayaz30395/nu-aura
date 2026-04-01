export interface ProvidentFundConfig {
    id: string;
    tenantId: string;
    effectiveFrom: string;
    effectiveTo?: string;
    employeeContributionPercentage: number;
    employerContributionPercentage: number;
    epsContributionPercentage?: number;
    wageCeiling?: number;
    isVpfAllowed?: boolean;
    maxVpfPercentage?: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ESIConfig {
    id: string;
    tenantId: string;
    effectiveFrom: string;
    effectiveTo?: string;
    employeeContributionPercentage: number;
    employerContributionPercentage: number;
    wageCeiling?: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ProfessionalTaxSlab {
    id: string;
    tenantId: string;
    stateCode: string; // e.g., MH, KA
    effectiveFrom: string;
    effectiveTo?: string;
    minSalary: number;
    maxSalary?: number;
    taxAmount: number;
    deductionMonth?: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export enum PFStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    WITHDRAWN = 'WITHDRAWN',
    TRANSFERRED = 'TRANSFERRED',
}

export interface EmployeePFRecord {
    id: string;
    tenantId: string;
    employeeId: string;
    uanNumber?: string;
    pfNumber?: string;
    enrollmentDate?: string;
    exitDate?: string;
    vpfPercentage?: number;
    isInternationalWorker?: boolean;
    previousPfBalance?: number;
    status: PFStatus;
    createdAt: string;
    updatedAt: string;
}

export interface EmployeeESIRecord {
    id: string;
    tenantId: string;
    employeeId: string;
    insuranceNumber?: string;
    dispensary?: string;
    enrollmentDate?: string;
    exitDate?: string;
    isIpDisabled?: boolean; // Insured Person
    status: 'ACTIVE' | 'INACTIVE'; // Assuming simple status for ESI based on entity (to be confirmed)
    createdAt: string;
    updatedAt: string;
}

export interface MonthlyStatutoryContribution {
    id: string;
    tenantId: string;
    employeeId: string;
    payslipId: string;
    month: number;
    year: number;
    grossSalary: number;
    // PF
    pfWage: number;
    pfEmployeeContribution: number;
    pfEmployerContribution: number;
    epsContribution: number;
    vpfContribution: number;
    // ESI
    esiWage: number;
    esiEmployeeContribution: number;
    esiEmployerContribution: number;
    // PT
    professionalTax: number;
    // TDS
    tdsDeducted: number;
    // LWF
    lwfEmployeeContribution: number;
    lwfEmployerContribution: number;
    createdAt: string;
    updatedAt: string;
}
