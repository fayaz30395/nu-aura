'use client';

import {CalendarDays, ChevronRight, FileText, Plus} from 'lucide-react';

export interface LeaveQuickActionsProps {
  onApply: () => void;
  onMyLeaves: () => void;
  onCalendar: () => void;
}

export function LeaveQuickActions({onApply, onMyLeaves, onCalendar}: LeaveQuickActionsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <button
        onClick={onApply}
        className='group card-interactive bg-[var(--bg-card)] rounded-xl border border-[var(--border-main)] p-6 hover:border-[var(--accent-primary)] transition-all duration-200 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
      >
        <div
          className="row-between mb-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
          <div
            className="p-4 rounded-xl bg-gradient-to-br from-accent-500 to-accent-700 group-hover:scale-110 transition-transform cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
            <Plus className='h-5 w-5 text-inverse'/>
          </div>
          <ChevronRight
            className='h-5 w-5 text-[var(--text-muted)] group-hover:text-accent group-hover:translate-x-1 transition-all'/>
        </div>
        <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-1">
          Apply for Leave
        </h3>
        <p className="text-body-secondary">
          Submit a new leave request
        </p>
      </button>
      <button
        onClick={onMyLeaves}
        className='group card-interactive bg-[var(--bg-card)] rounded-xl border border-[var(--border-main)] p-6 hover:border-status-success-border transition-all duration-200 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
      >
        <div
          className="row-between mb-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
          <div
            className="p-4 rounded-xl bg-gradient-to-br from-success-500 to-success-600 group-hover:scale-110 transition-transform cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
            <FileText className='h-5 w-5 text-inverse'/>
          </div>
          <ChevronRight
            className='h-5 w-5 text-[var(--text-muted)] group-hover:text-status-success-text group-hover:translate-x-1 transition-all'/>
        </div>
        <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-1">
          My Leaves
        </h3>
        <p className="text-body-secondary">
          View all your leave history
        </p>
      </button>
      <button
        onClick={onCalendar}
        className='group card-interactive bg-[var(--bg-card)] rounded-xl border border-[var(--border-main)] p-6 hover:border-[var(--accent-primary)] transition-all duration-200 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
      >
        <div
          className="row-between mb-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
          <div
            className="p-4 rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 group-hover:scale-110 transition-transform cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
            <CalendarDays className='h-5 w-5 text-inverse'/>
          </div>
          <ChevronRight
            className='h-5 w-5 text-[var(--text-muted)] group-hover:text-accent group-hover:translate-x-1 transition-all'/>
        </div>
        <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-1">
          Leave Calendar
        </h3>
        <p className="text-body-secondary">
          View team leave calendar
        </p>
      </button>
    </div>
  );
}
