'use client';

import { useQuery } from '@tanstack/react-query';
import { publicApiClient } from '@/lib/api/public-client';

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

interface JobsResponse {
  jobs: Job[];
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
 * This is a public endpoint that doesn't require authentication.
 * Uses publicApiClient which points to the Spring Boot backend (localhost:8080/api/v1).
 */
export function usePublicJobs(filters: CareersFilters) {
  return useQuery({
    queryKey: careersKeys.jobsList(filters),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters.department) params.department = filters.department;
      if (filters.location) params.location = filters.location;
      if (filters.type) params.type = filters.type;
      if (filters.q) params.q = filters.q;

      const response = await publicApiClient.get<JobsResponse>('/public/careers/jobs', { params });
      return response.data.jobs ?? [];
    },
    staleTime: 30_000, // public page, cache for 30s
  });
}
