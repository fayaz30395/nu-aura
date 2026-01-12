// Travel Management Types

// Travel Request Types
export type TravelType =
  | 'BUSINESS'
  | 'TRAINING'
  | 'CLIENT_VISIT'
  | 'CONFERENCE'
  | 'RELOCATION'
  | 'OTHER';

export type TransportMode =
  | 'FLIGHT'
  | 'TRAIN'
  | 'BUS'
  | 'CAR'
  | 'SELF_ARRANGED';

export type TravelStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'BOOKED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface TravelRequest {
  id: string;
  tenantId?: string;
  employeeId: string;
  employeeName?: string;
  requestNumber: string;
  travelType: TravelType;
  purpose: string;
  projectId?: string;
  projectName?: string;
  clientName?: string;

  // Travel Details
  originCity: string;
  destinationCity: string;
  departureDate: string; // YYYY-MM-DD
  returnDate: string; // YYYY-MM-DD
  departureTime?: string; // ISO 8601 DateTime
  returnTime?: string; // ISO 8601 DateTime

  // Accommodation
  accommodationRequired: boolean;
  hotelPreference?: string;
  checkInDate?: string; // YYYY-MM-DD
  checkOutDate?: string; // YYYY-MM-DD

  // Transport
  transportMode: TransportMode;
  transportClass?: string;
  cabRequired: boolean;

  // Budget
  estimatedCost: number;
  advanceRequired: number;
  advanceApproved: number;
  advanceDisbursedDate?: string; // YYYY-MM-DD

  // Status
  status: TravelStatus;
  submittedDate?: string; // YYYY-MM-DD
  approvedBy?: string;
  approverName?: string;
  approvedDate?: string; // YYYY-MM-DD
  rejectionReason?: string;
  specialInstructions?: string;

  // International Travel
  isInternational: boolean;
  visaRequired: boolean;

  createdAt?: string;
  updatedAt?: string;
}

export interface TravelRequestRequest {
  employeeId: string;
  travelType: TravelType;
  purpose: string;
  projectId?: string;
  clientName?: string;
  originCity: string;
  destinationCity: string;
  departureDate: string;
  returnDate: string;
  departureTime?: string;
  returnTime?: string;
  accommodationRequired: boolean;
  hotelPreference?: string;
  checkInDate?: string;
  checkOutDate?: string;
  transportMode: TransportMode;
  transportClass?: string;
  cabRequired: boolean;
  estimatedCost: number;
  advanceRequired: number;
  specialInstructions?: string;
  isInternational: boolean;
  visaRequired: boolean;
}

// Travel Expense Types
export type ExpenseType =
  | 'AIRFARE'
  | 'TRAIN_FARE'
  | 'BUS_FARE'
  | 'CAB_TAXI'
  | 'HOTEL'
  | 'MEALS'
  | 'LOCAL_TRANSPORT'
  | 'VISA_FEE'
  | 'TRAVEL_INSURANCE'
  | 'COMMUNICATION'
  | 'MISCELLANEOUS';

export type ExpenseStatus =
  | 'PENDING'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'PARTIALLY_APPROVED'
  | 'REJECTED'
  | 'REIMBURSED';

export interface TravelExpense {
  id: string;
  tenantId?: string;
  travelRequestId: string;
  employeeId: string;
  employeeName?: string;
  expenseType: ExpenseType;
  description: string;
  expenseDate: string; // YYYY-MM-DD
  amount: number;
  currency: string;
  exchangeRate: number;
  amountInBaseCurrency: number;
  receiptPath?: string;
  receiptNumber?: string;
  status: ExpenseStatus;
  approvedAmount?: number;
  approvedBy?: string;
  approverName?: string;
  approvedDate?: string; // YYYY-MM-DD
  rejectionReason?: string;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TravelExpenseRequest {
  travelRequestId: string;
  employeeId: string;
  expenseType: ExpenseType;
  description: string;
  expenseDate: string;
  amount: number;
  currency?: string;
  exchangeRate?: number;
  receiptPath?: string;
  receiptNumber?: string;
  remarks?: string;
}

// Pagination
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

// Filter Types
export interface TravelRequestFilters {
  status?: TravelStatus;
  travelType?: TravelType;
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}
