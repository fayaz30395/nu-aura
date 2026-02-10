export enum ProjectBillingType {
    TIME_AND_MATERIAL = 'TIME_AND_MATERIAL',
    FIXED_PRICE = 'FIXED_PRICE',
    NON_BILLABLE = 'NON_BILLABLE',
    RETAINER = 'RETAINER',
}

export enum ProjectStatus {
    PLANNED = 'PLANNED',
    ACTIVE = 'ACTIVE',
    ON_HOLD = 'ON_HOLD',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

export enum TimesheetStatus {
    DRAFT = 'DRAFT',
    SUBMITTED = 'SUBMITTED',
    UNDER_REVIEW = 'UNDER_REVIEW',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
}

export enum InvoiceStatus {
    DRAFT = 'DRAFT',
    SENT = 'SENT',
    PARTIALLY_PAID = 'PARTIALLY_PAID',
    PAID = 'PAID',
    OVERDUE = 'OVERDUE',
    CANCELLED = 'CANCELLED',
}

export interface PSAProject {
    id: string; // UUID
    tenantId: string;
    projectCode: string;
    projectName: string;
    clientId?: string;
    projectManagerId?: string;
    startDate?: string;
    endDate?: string;
    billingType: ProjectBillingType;
    billingRate?: number;
    budget?: number;
    isBillable: boolean;
    status: ProjectStatus;
    description?: string;
    createdAt: string;
    updatedAt: string;
}

export interface PSATimeEntry {
    id: string;
    timesheetId: string;
    projectId: string;
    taskId?: string;
    date: string;
    hours: number;
    description?: string;
    isBillable: boolean;
}

export interface PSATimesheet {
    id: string;
    tenantId: string;
    employeeId: string;
    weekStartDate: string;
    weekEndDate: string;
    totalHours: number;
    billableHours?: number;
    nonBillableHours?: number;
    status: TimesheetStatus;
    submittedAt?: string;
    approvedAt?: string;
    approvedBy?: string;
    rejectionReason?: string;
    createdAt: string;
    updatedAt: string;
    entries?: PSATimeEntry[];
}

export interface PSAInvoice {
    id: string;
    tenantId: string;
    invoiceNumber: string;
    projectId: string;
    clientId: string;
    invoiceDate: string;
    dueDate?: string;
    billingPeriodStart: string;
    billingPeriodEnd: string;
    totalHours?: number;
    billableAmount: number;
    taxAmount?: number;
    totalAmount: number;
    status: InvoiceStatus;
    paidAt?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}
