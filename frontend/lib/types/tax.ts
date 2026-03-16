
export enum TaxRegimeType {
    OLD_REGIME = 'OLD_REGIME',
    NEW_REGIME = 'NEW_REGIME',
}

export enum DeclarationStatus {
    DRAFT = 'DRAFT',
    SUBMITTED = 'SUBMITTED',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    LOCKED = 'LOCKED',
}

export interface TaxProofRequest {
    declarationId: string;
    documentId: string;
    documentName: string;
    section: string;
    amount: number;
    description?: string;
}

export interface TaxProofResponse {
    id: string;
    declarationId: string;
    documentId: string;
    documentName: string;
    section: string;
    amount: number;
    approvedAmount?: number;
    status: 'PENDING' | 'VERIFIED' | 'REJECTED';
    verifiedBy?: string;
    verifiedAt?: string;
    rejectionReason?: string;
    description?: string;
    uploadDate: string;
}

export interface TaxDeclarationRequest {
    employeeId: string; // UUID
    financialYear: string;
    taxRegime: TaxRegimeType;

    // Section 80C
    sec80cPpf?: number;
    sec80cEpf?: number;
    sec80cLifeInsurance?: number;
    sec80cElss?: number;
    sec80cNsc?: number;
    sec80cHomeLoanPrincipal?: number;
    sec80cTuitionFees?: number;
    sec80cSukanyaSamriddhi?: number;
    sec80cNpsEmployee?: number;

    // Other deductions
    sec80ccd1bNpsAdditional?: number;
    sec80dSelfFamily?: number;
    sec80dParents?: number;
    sec80dPreventiveHealth?: number;
    sec80eEducationLoan?: number;
    sec80gDonations?: number;
    sec80ggRentPaid?: number;
    sec24HomeLoanInterest?: number;

    // HRA
    hraMetroCity?: boolean;
    hraRentPaid?: number;

    // Other income
    otherIncomeInterest?: number;
    otherIncomeRental?: number;
    otherIncomeCapitalGains?: number;

    // Previous employment
    previousEmployerName?: string;
    previousEmployerPan?: string;
    previousEmployerIncome?: number;
    previousEmployerTax?: number;

    notes?: string;
}

export interface TaxDeclarationResponse {
    id: string; // UUID
    tenantId: string; // UUID
    employeeId: string; // UUID
    employeeName: string;
    financialYear: string;
    taxRegime: TaxRegimeType;
    status: DeclarationStatus;

    // Section 80C
    sec80cTotal: number;
    sec80ccd1bNpsAdditional?: number;

    // Section 80D
    sec80dTotal: number;

    // Other sections
    sec80eEducationLoan?: number;
    sec80gDonations?: number;
    sec80ggRentPaid?: number;
    sec24HomeLoanInterest?: number;
    hraExemption?: number;

    // Other income
    otherIncomeTotal?: number;

    // Previous employment
    previousEmployerName?: string;
    previousEmployerIncome?: number;
    previousEmployerTax?: number;

    // Calculated fields
    totalDeductions: number;
    taxableIncome: number;
    estimatedTax: number;

    // Workflow
    submittedAt?: string;
    approvedBy?: string;
    approvedByName?: string;
    approvedAt?: string;
    rejectedBy?: string;
    rejectedByName?: string;
    rejectedAt?: string;
    rejectionReason?: string;
    lockedAt?: string;
    notes?: string;

    createdAt: string;
    updatedAt: string;

    proofs?: TaxProofResponse[];
}

export interface TaxRegimeComparisonResponse {
    financialYear: string;
    oldRegimeTax: number;
    newRegimeTax: number;
    recommendedRegime: TaxRegimeType;
    savings: number;
}
