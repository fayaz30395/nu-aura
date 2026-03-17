'use client';

import React, { memo } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Search } from 'lucide-react';

interface JobOption {
  id: string;
  jobTitle: string;
}

interface CandidateFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  jobFilter: string;
  onJobChange: (value: string) => void;
  jobOpenings: JobOption[];
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'NEW', label: 'New' },
  { value: 'SCREENING', label: 'Screening' },
  { value: 'INTERVIEW', label: 'Interview' },
  { value: 'SELECTED', label: 'Selected' },
  { value: 'OFFER_EXTENDED', label: 'Offer Extended' },
  { value: 'OFFER_ACCEPTED', label: 'Offer Accepted' },
  { value: 'OFFER_DECLINED', label: 'Offer Declined' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
] as const;

/**
 * Search and filter controls for the candidates list.
 * Memoized — only re-renders when filter values or job openings change.
 */
export const CandidateFilters = memo(function CandidateFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  jobFilter,
  onJobChange,
  jobOpenings,
}: CandidateFiltersProps) {
  return (
    <Card className="bg-[var(--bg-card)]">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search candidates..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <select
            value={jobFilter}
            onChange={(e) => onJobChange(e.target.value)}
            className="px-4 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          >
            <option value="">All Job Openings</option>
            {jobOpenings.map((job) => (
              <option key={job.id} value={job.id}>{job.jobTitle}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="px-4 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </CardContent>
    </Card>
  );
});
