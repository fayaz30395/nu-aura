// Maps the public careers API summary DTO (jobTitle, descriptionTeaser, ...) to the shape the careers UI renders.
export interface PublicCareerJob {
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

const EMPLOYMENT_LABELS: Record<string, PublicCareerJob['employmentType']> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  INTERNSHIP: 'Internship',
};

const toLines = (v: unknown): string[] =>
  typeof v === 'string' ? v.split(/\r?\n/).map((s) => s.trim()).filter(Boolean) : [];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapPublicJobs(data: any): PublicCareerJob[] {
  const rows: Record<string, unknown>[] = Array.isArray(data?.content) ? data.content : [];
  return rows.map((r) => {
    const desc = String(r.jobDescription ?? r.descriptionTeaser ?? '');
    const exp = Number(r.experienceRequired ?? 0);
    return {
      id: String(r.id),
      title: String(r.jobTitle ?? ''),
      department: String(r.departmentName ?? 'General'),
      location: String(r.location ?? ''),
      employmentType: EMPLOYMENT_LABELS[String(r.employmentType)] ?? 'Full-time',
      postedDate: String(r.postedDate ?? ''),
      description: String(r.descriptionTeaser ?? desc),
      fullDescription: desc,
      requirements: toLines(r.requirements),
      responsibilities: [],
      experience: exp >= 8 ? 'Lead' : exp >= 5 ? 'Senior' : exp >= 2 ? 'Mid-level' : 'Entry-level',
    };
  });
}
