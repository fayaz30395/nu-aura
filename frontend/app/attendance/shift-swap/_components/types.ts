import {z} from 'zod';
import {AlertTriangle, Ban, CheckCircle, Clock, XCircle} from 'lucide-react';
import type {StatusMeta} from '@/lib/status/vocabulary';

export interface ShiftSwapRequest {
  id: string;
  requesterEmployeeId: string;
  targetEmployeeId?: string;
  requesterShiftDate: string;
  targetShiftDate?: string;
  swapType: 'SWAP' | 'GIVE_AWAY' | 'PICK_UP';
  status: 'PENDING' | 'TARGET_ACCEPTED' | 'TARGET_DECLINED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
  reason?: string;
  requestedAt: string;
}

export interface PagedShiftSwaps {
  content: ShiftSwapRequest[];
  totalPages: number;
  totalElements: number;
}

export type ShiftSwapTab = 'my' | 'incoming' | 'approval';

export type ShiftSwapAction = 'approve' | 'reject' | 'accept' | 'decline' | 'cancel';

export const SWAP_TYPE_LABELS: Record<string, string> = {
  SWAP: 'Shift Swap',
  GIVE_AWAY: 'Give Away',
  PICK_UP: 'Pick Up',
};

export const SHIFT_SWAP_STATUS: Record<string, StatusMeta> = {
  PENDING: {label: 'Pending', tone: 'warning', icon: Clock},
  TARGET_ACCEPTED: {label: 'Target Accepted', tone: 'info', icon: CheckCircle},
  TARGET_DECLINED: {label: 'Target Declined', tone: 'danger', icon: XCircle},
  PENDING_APPROVAL: {label: 'Pending Approval', tone: 'warning', icon: AlertTriangle},
  APPROVED: {label: 'Approved', tone: 'success', icon: CheckCircle},
  REJECTED: {label: 'Rejected', tone: 'danger', icon: XCircle},
  COMPLETED: {label: 'Completed', tone: 'success', icon: CheckCircle},
  CANCELLED: {label: 'Cancelled', tone: 'neutral', icon: Ban},
};

export const shiftSwapSchema = z.object({
  swapType: z.enum(['SWAP', 'GIVE_AWAY', 'PICK_UP']),
  requesterShiftDate: z.string().min(1, 'My shift date is required'),
  targetShiftDate: z.string().optional(),
  requesterAssignmentId: z.string().min(1, 'Please select your shift assignment'),
  targetEmployeeId: z.string().optional(),
  reason: z.string().optional(),
});

export type ShiftSwapFormData = z.infer<typeof shiftSwapSchema>;
