'use client';

import React, {memo} from 'react';
import {Card, CardContent} from '@/components/ui/Card';
import {Search} from 'lucide-react';

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
  {value: '', label: 'All Status'},
  {value: 'NEW', label: 'New'},
  {value: 'SCREENING', label: 'Screening'},
  {value: 'INTERVIEW', label: 'Interview'},
  {value: 'SELECTED', label: 'Selected'},
  {value: 'OFFER_EXTENDED', label: 'Offer Extended'},
  {value: 'OFFER_ACCEPTED', label: 'Offer Accepted'},
  {value: 'OFFER_DECLINED', label: 'Offer Declined'},
  {value: 'REJECTED', label: 'Rejected'},
  {value: 'WITHDRAWN', label: 'Withdrawn'},
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
    <Card className="skeuo-card">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" aria-hidden="true"/>
            <label htmlFor="candidate-search" className="sr-only">Search candidates</label>
            <input
              id="candidate-search"
              type="text"
              placeholder="Search candidates..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Search candidates by name, email, or code"
              className="w-full input-aura pl-10 pr-4 py-2.5 rounded-xl"
            />
          </div>
          <label htmlFor="candidate-job-filter" className="sr-only">Filter by job opening</label>
          <select
            id="candidate-job-filter"
            value={jobFilter}
            onChange={(e) => onJobChange(e.target.value)}
            aria-label="Filter candidates by job opening"
            className="input-aura px-4 py-2.5 rounded-xl"
          >
            <option value="">All Job Openings</option>
            {jobOpenings.map((job) => (
              <option key={job.id} value={job.id}>{job.jobTitle}</option>
            ))}
          </select>
          <label htmlFor="candidate-status-filter" className="sr-only">Filter by status</label>
          <select
            id="candidate-status-filter"
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            aria-label="Filter candidates by status"
            className="input-aura px-4 py-2.5 rounded-xl"
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
