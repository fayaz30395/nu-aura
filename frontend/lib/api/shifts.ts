import {
  assignShift as assignShiftGenerated,
  cancelAssignment as cancelAssignmentGenerated,
  createShift as createShiftGenerated,
  deleteShift as deleteShiftGenerated,
  getActiveShifts as getActiveShiftsGenerated,
  getAllShifts as getAllShiftsGenerated,
  getAssignmentsForDate as getAssignmentsForDateGenerated,
  getEmployeeAssignments as getEmployeeAssignmentsGenerated,
  getShiftById as getShiftByIdGenerated,
  updateShift as updateShiftGenerated,
} from '@/lib/generated/api/shift-management-controller/shift-management-controller';
import {
  CreateShiftAssignmentRequest,
  CreateShiftRequest,
  PagedResponse,
  Shift,
  ShiftAssignment,
  UpdateShiftRequest,
} from '../types/hrms/shifts';

/**
 * T3-12 migration (wave 3): thin facade over the orval-generated
 * `shift-management-controller` client. Public `shiftsApi` surface is
 * preserved (9 methods, identical signatures) so existing callers do not
 * change.
 *
 * Generated calls route through `apiClient` via `orvalMutator`, preserving
 * cookie auth, CSRF double-submit, the 401 refresh mutex, and tenant
 * headers. `orvalMutator` already unwraps to the response body, so the
 * generated functions return the payload directly — no `.data` access.
 *
 * The generated `GetAllShiftsParams` widens `sortDirection` to `string`
 * (vs. the original `'ASC' | 'DESC'` union); we keep the tighter union on
 * the facade and pass through unchanged.
 */
export const shiftsApi = {
  // Shift CRUD operations
  getAllShifts: async (params?: {
    page?: number;
    size?: number;
    sortBy?: string;
    sortDirection?: 'ASC' | 'DESC';
  }): Promise<PagedResponse<Shift>> => {
    const response = await getAllShiftsGenerated(params);
    return response as unknown as PagedResponse<Shift>;
  },

  getActiveShifts: async (): Promise<Shift[]> => {
    const response = await getActiveShiftsGenerated();
    return response as unknown as Shift[];
  },

  getShiftById: async (shiftId: string): Promise<Shift> => {
    const response = await getShiftByIdGenerated(shiftId);
    return response as unknown as Shift;
  },

  createShift: async (request: CreateShiftRequest): Promise<Shift> => {
    const response = await createShiftGenerated(
      request as unknown as Parameters<typeof createShiftGenerated>[0]
    );
    return response as unknown as Shift;
  },

  updateShift: async (shiftId: string, request: UpdateShiftRequest): Promise<Shift> => {
    const response = await updateShiftGenerated(
      shiftId,
      request as unknown as Parameters<typeof updateShiftGenerated>[1]
    );
    return response as unknown as Shift;
  },

  deleteShift: async (shiftId: string): Promise<void> => {
    await deleteShiftGenerated(shiftId);
  },

  // Shift Assignment operations
  assignShift: async (request: CreateShiftAssignmentRequest): Promise<ShiftAssignment> => {
    const response = await assignShiftGenerated(
      request as unknown as Parameters<typeof assignShiftGenerated>[0]
    );
    return response as unknown as ShiftAssignment;
  },

  getEmployeeAssignments: async (
    employeeId: string,
    params?: { page?: number; size?: number }
  ): Promise<PagedResponse<ShiftAssignment>> => {
    const response = await getEmployeeAssignmentsGenerated(employeeId, params);
    return response as unknown as PagedResponse<ShiftAssignment>;
  },

  getAssignmentsForDate: async (date: string): Promise<ShiftAssignment[]> => {
    const response = await getAssignmentsForDateGenerated(date);
    return response as unknown as ShiftAssignment[];
  },

  cancelAssignment: async (assignmentId: string): Promise<void> => {
    await cancelAssignmentGenerated(assignmentId);
  },
};
