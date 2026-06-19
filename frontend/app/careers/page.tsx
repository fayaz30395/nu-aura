import type {Metadata} from 'next';
import CareersClient from './CareersClient';

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

async function fetchPublicJobs(): Promise<Job[]> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';
  try {
    const res = await fetch(`${apiBase}/public/careers/jobs`, {
      next: {revalidate: 60}, // ISR — revalidate every 60 seconds
    });
    if (!res.ok) return [];
    const data: JobsResponse = await res.json();
    return data.jobs ?? [];
  } catch {
    return [];
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const jobs = await fetchPublicJobs();
  const count = jobs.length;
  const description =
    count > 0
      ? `Browse ${count} open position${count !== 1 ? 's' : ''} at NULogic. Join our team and help build the future of HR management.`
      : 'Explore open positions and join our team. Browse job listings, learn about our culture, and apply today.';

  return {
    title: 'Careers | NU-AURA',
    description,
    openGraph: {
      title: 'Careers | NU-AURA',
      description,
      type: 'website',
    },
  };
}

function buildJobPostingSchema(jobs: Job[], baseUrl: string) {
  if (jobs.length === 0) return null;
  return jobs.map((job) => ({
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.fullDescription || job.description,
    datePosted: job.postedDate,
    employmentType: job.employmentType.toUpperCase().replace('-', '_'),
    hiringOrganization: {
      '@type': 'Organization',
      name: 'NULogic',
      sameAs: baseUrl,
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: job.location,
      },
    },
    ...(job.salaryRange ? {baseSalary: {
      '@type': 'MonetaryAmount',
      description: job.salaryRange,
    }} : {}),
  }));
}

export default async function CareersPage() {
  const jobs = await fetchPublicJobs();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://hrms-frontend-vert.vercel.app';
  const jobPostingSchema = buildJobPostingSchema(jobs, baseUrl);

  return (
    <>
      {jobPostingSchema && jobPostingSchema.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{__html: JSON.stringify(jobPostingSchema)}}
        />
      )}
      <CareersClient initialJobs={jobs} />
    </>
  );
}
