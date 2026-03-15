'use client';

import { useQuery } from '@tanstack/react-query';

interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  employmentType: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
  postedDate: string;
  description: string;
  fullDescription: string;
  requirements: string[];
  responsibilities: string[];
  salaryRange?: string;
  experience: 'Entry-level' | 'Mid-level' | 'Senior' | 'Lead';
}

export interface CareersFilters {
  department?: string;
  location?: string;
  type?: string;
  q?: string;
}

// Query keys for cache management
export const careersKeys = {
  all: ['careers'] as const,
  jobs: () => [...careersKeys.all, 'jobs'] as const,
  jobsList: (filters: CareersFilters) => [...careersKeys.jobs(), filters] as const,
};

/**
 * Fetch public job listings with optional filters
 * This is a public endpoint that doesn't require authentication
 */
export function usePublicJobs(filters: CareersFilters) {
  const params = new URLSearchParams();
  if (filters.department) params.append('department', filters.department);
  if (filters.location) params.append('location', filters.location);
  if (filters.type) params.append('type', filters.type);
  if (filters.q) params.append('q', filters.q);

  return useQuery({
    queryKey: careersKeys.jobsList(filters),
    queryFn: async () => {
      const response = await fetch(`/api/public/careers/jobs?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }
      const data = await response.json();
      return (data.jobs ?? []) as Job[];
    },
    staleTime: 30_000, // public page, cache for 30s
  });
}
