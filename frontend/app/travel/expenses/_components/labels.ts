import {CheckCircle, Clock, Send, Wallet, XCircle} from 'lucide-react';
import type {StatusMeta} from '@/lib/status/vocabulary';

export const EXPENSE_TYPE_LABELS: Record<string, string> = {
  AIRFARE: 'Airfare',
  TRAIN_FARE: 'Train',
  BUS_FARE: 'Bus',
  CAB_TAXI: 'Cab/Taxi',
  HOTEL: 'Hotel',
  MEALS: 'Meals',
  LOCAL_TRANSPORT: 'Local Transport',
  VISA_FEE: 'Visa',
  TRAVEL_INSURANCE: 'Insurance',
  COMMUNICATION: 'Communication',
  MISCELLANEOUS: 'Misc',
};

export const TRAVEL_EXPENSE_STATUS: Record<string, StatusMeta> = {
  PENDING: {label: 'Pending', tone: 'neutral', icon: Clock},
  SUBMITTED: {label: 'Submitted', tone: 'info', icon: Send},
  APPROVED: {label: 'Approved', tone: 'success', icon: CheckCircle},
  PARTIALLY_APPROVED: {label: 'Partial', tone: 'warning', icon: CheckCircle},
  REJECTED: {label: 'Rejected', tone: 'danger', icon: XCircle},
  REIMBURSED: {label: 'Reimbursed', tone: 'success', icon: Wallet},
};

/** Currency is free text on this form; Intl throws on codes that are not 3 letters. */
export function safeCurrency(code: string | undefined): string {
  return code && /^[A-Za-z]{3}$/.test(code) ? code.toUpperCase() : 'INR';
}
