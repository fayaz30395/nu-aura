/**
 * Resource Management Types
 * Handles capacity tracking, allocation approvals, availability calendar, and workload dashboard
 */

// ============================================
// ALLOCATION STATUS CONSTANTS
// ============================================

export const ALLOCATION_THRESHOLDS = {
  OVER_ALLOCATED: 100,
  OPTIMAL_MIN: 75,
  UNDER_UTILIZED: 50,
  WARNING: 90,
} as const;

export const AVAILABILITY_COLORS = {
  AVAILABLE: '#10b981',    // Green
  ALLOCATED: '#3b82f6',    // Blue
  ON_LEAVE: '#8b5cf6',     // Purple
  PARTIAL: '#f59e0b',      // Orange
  HOLIDAY: '#6b7280',      // Gray
} as const;

export const WORKLOAD_STATUS_COLORS = {
  OVER_ALLOCATED: '#ef4444',   // Red
  OPTIMAL: '#10b981',          // Green
  UNDER_UTILIZED: '#f59e0b',   // Yellow
  UNASSIGNED: '#6b7280',       // Gray
} as const;

// ============================================
// CAPACITY & ALLOCATION TYPES
// ============================================

export type AllocationStatus = 'OVER_ALLOCATED' | 'OPTIMAL' | 'UNDER_UTILIZED' | 'UNASSIGNED';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AllocationBreakdown {
  projectId: string;
  projectName: string;
  projectCode: string;
  projectStatus: string;
  allocationPercentage: number;
  role: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  isPendingApproval: boolean;
}

export interface EmployeeCapacity {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentId?: string;
  departmentName?: string;
  designation?: string;
  avatarUrl?: string;
  totalAllocation: number;
  approvedAllocation: number;
  pendingAllocation: number;
  availableCapacity: number; // 100 - totalAllocation (can be negative)
  isOverAllocated: boolean;
  hasPendingApprovals: boolean;
  allocationStatus: AllocationStatus;
  allocations: AllocationBreakdown[];
  effectiveDate: string;
}

export interface AllocationApprovalRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  projectId: string;
  projectName: string;
  projectCode: string;
  requestedAllocation: number;
  role: string;
  startDate: string;
  endDate?: string;
  currentTotalAllocation: number;
  resultingAllocation: number;
  requestedById: string;
  requestedByName: string;
  approverId: string;
  approverName: string;
  status: ApprovalStatus;
  requestReason?: string;
  approvalComment?: string;
  rejectionReason?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface CreateAllocationApprovalRequest {
  employeeId: string;
  projectId: string;
  allocationPercentage: number;
  role?: string;
  startDate: string;
  endDate?: string;
  reason?: string;
}

export interface ApproveAllocationRequest {
  comment?: string;
}

export interface RejectAllocationRequest {
  reason: string;
}

export interface AllocationValidationResult {
  isValid: boolean;
  requiresApproval: boolean;
  currentTotalAllocation: number;
  proposedAllocation: number;
  resultingAllocation: number;
  message: string;
  existingAllocations: AllocationBreakdown[];
}

// ============================================
// RESOURCE AVAILABILITY CALENDAR TYPES
// ============================================

export type AvailabilityStatus = 'AVAILABLE' | 'ALLOCATED' | 'ON_LEAVE' | 'PARTIAL' | 'HOLIDAY';

export type CalendarEventType = 'PROJECT_ASSIGNMENT' | 'LEAVE_APPROVED' | 'LEAVE_PENDING' | 'HOLIDAY';

export interface ResourceCalendarEvent {
  id: string;
  type: CalendarEventType;
  title: string;
  startDate: string;
  endDate: string;
  allocationPercentage?: number;
  projectId?: string;
  projectName?: string;
  leaveType?: string;
  leaveStatus?: 'PENDING' | 'APPROVED';
  color: string;
  isAllDay: boolean;
}

export interface ResourceAvailabilityDay {
  date: string;
  dayOfWeek: number;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
  status: AvailabilityStatus;
  allocatedCapacity: number;
  availableCapacity: number;
  events: ResourceCalendarEvent[];
}

export interface EmployeeAvailability {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentId?: string;
  departmentName?: string;
  designation?: string;
  avatarUrl?: string;
  availability: ResourceAvailabilityDay[];
  summary: AvailabilitySummary;
}

export interface AvailabilitySummary {
  periodStart: string;
  periodEnd: string;
  totalDays: number;
  workingDays: number;
  availableDays: number;
  partialDays: number;
  fullyAllocatedDays: number;
  leaveDays: number;
  holidays: number;
  averageAvailability: number;
}

export interface TeamAvailabilityView {
  departmentId?: string;
  departmentName?: string;
  employees: EmployeeAvailability[];
  periodStart: string;
  periodEnd: string;
  aggregatedAvailability: AggregatedAvailability[];
}

export interface AggregatedAvailability {
  date: string;
  totalEmployees: number;
  availableCount: number;
  partialCount: number;
  fullyAllocatedCount: number;
  onLeaveCount: number;
  averageCapacity: number;
}

export interface ResourceCalendarFilter {
  employeeIds?: string[];
  departmentIds?: string[];
  startDate: string;
  endDate: string;
  includeLeaves?: boolean;
  includeHolidays?: boolean;
  includeProjectAssignments?: boolean;
  availabilityStatus?: AvailabilityStatus[];
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  isOptional: boolean;
  locationIds?: string[];
}

// ============================================
// WORKLOAD DASHBOARD TYPES
// ============================================

export interface WorkloadSummary {
  totalEmployees: number;
  activeProjects: number;
  averageAllocation: number;
  medianAllocation: number;
  overAllocatedCount: number;
  optimalCount: number;
  underUtilizedCount: number;
  unassignedCount: number;
  pendingApprovals: number;
  totalAllocatedHours: number;
  periodStart: string;
  periodEnd: string;
}

export interface ProjectAllocationDetail {
  projectId: string;
  projectName: string;
  projectCode: string;
  projectStatus: string;
  role: string;
  allocationPercentage: number;
  startDate: string;
  endDate?: string;
  estimatedHours?: number;
  loggedHours?: number;
  isPendingApproval: boolean;
}

export interface WeeklyAllocation {
  weekStart: string;
  weekEnd: string;
  weekNumber: number;
  totalAllocation: number;
  projectBreakdown: {
    projectId: string;
    projectName: string;
    allocation: number;
  }[];
}

export interface EmployeeWorkload {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentId?: string;
  departmentName?: string;
  designation?: string;
  avatarUrl?: string;
  totalAllocation: number;
  approvedAllocation: number;
  pendingAllocation: number;
  allocationStatus: AllocationStatus;
  projectCount: number;
  allocations: ProjectAllocationDetail[];
  weeklyBreakdown?: WeeklyAllocation[];
  hasPendingApprovals: boolean;
}

export interface DepartmentWorkload {
  departmentId: string;
  departmentName: string;
  employeeCount: number;
  averageAllocation: number;
  overAllocatedCount: number;
  optimalCount: number;
  underUtilizedCount: number;
  unassignedCount: number;
  activeProjects: number;
  totalAllocatedHours: number;
}

export interface ProjectWorkloadSummary {
  projectId: string;
  projectName: string;
  projectCode: string;
  projectStatus: string;
  teamSize: number;
  totalAllocatedPercentage: number;
  averageAllocation: number;
  startDate: string;
  endDate?: string;
}

export interface WorkloadHeatmapCell {
  weekStart: string;
  weekEnd: string;
  allocation: number;
  status: AllocationStatus;
  projectCount: number;
}

export interface WorkloadHeatmapRow {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentName?: string;
  cells: WorkloadHeatmapCell[];
}

export interface WorkloadTrend {
  period: string;
  periodLabel: string;
  averageAllocation: number;
  overAllocatedCount: number;
  optimalCount: number;
  underUtilizedCount: number;
  totalEmployees: number;
}

export interface WorkloadDashboardData {
  summary: WorkloadSummary;
  employeeWorkloads: EmployeeWorkload[];
  departmentWorkloads: DepartmentWorkload[];
  projectWorkloads: ProjectWorkloadSummary[];
  heatmapData: WorkloadHeatmapRow[];
  trends: WorkloadTrend[];
}

export interface WorkloadFilterOptions {
  startDate?: string;
  endDate?: string;
  departmentIds?: string[];
  projectIds?: string[];
  allocationStatus?: AllocationStatus[];
  minAllocation?: number;
  maxAllocation?: number;
  includePendingApprovals?: boolean;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getAllocationStatus(allocation: number): AllocationStatus {
  if (allocation > ALLOCATION_THRESHOLDS.OVER_ALLOCATED) return 'OVER_ALLOCATED';
  if (allocation >= ALLOCATION_THRESHOLDS.OPTIMAL_MIN) return 'OPTIMAL';
  if (allocation > 0) return 'UNDER_UTILIZED';
  return 'UNASSIGNED';
}

export function getAllocationStatusColor(status: AllocationStatus): string {
  return WORKLOAD_STATUS_COLORS[status];
}

export function getAllocationStatusLabel(status: AllocationStatus): string {
  switch (status) {
    case 'OVER_ALLOCATED':
      return 'Over Allocated';
    case 'OPTIMAL':
      return 'Optimal';
    case 'UNDER_UTILIZED':
      return 'Under Utilized';
    case 'UNASSIGNED':
      return 'Unassigned';
  }
}

export function getAvailabilityStatusColor(status: AvailabilityStatus): string {
  return AVAILABILITY_COLORS[status];
}

export function getAvailabilityStatusLabel(status: AvailabilityStatus): string {
  switch (status) {
    case 'AVAILABLE':
      return 'Available';
    case 'ALLOCATED':
      return 'Allocated';
    case 'ON_LEAVE':
      return 'On Leave';
    case 'PARTIAL':
      return 'Partially Available';
    case 'HOLIDAY':
      return 'Holiday';
  }
}

export function formatAllocationPercentage(value: number): string {
  return `${Math.round(value)}%`;
}

export function isOverAllocated(allocation: number): boolean {
  return allocation > ALLOCATION_THRESHOLDS.OVER_ALLOCATED;
}

export function requiresApproval(currentTotal: number, newAllocation: number): boolean {
  return (currentTotal + newAllocation) > ALLOCATION_THRESHOLDS.OVER_ALLOCATED;
}
