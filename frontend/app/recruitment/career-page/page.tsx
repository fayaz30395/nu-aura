'use client';

import React, {useEffect, useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {notifications} from '@mantine/notifications';
import {AppLayout} from '@/components/layout';
import {Card, CardContent} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {Badge} from '@/components/ui/Badge';
import {Skeleton} from '@/components/ui/Skeleton';
import {
  Briefcase,
  Building2,
  CheckCircle,
  Edit2,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Info,
  RefreshCw,
  Save,
  Sparkles,
  Star,
  Users,
  XCircle,
} from 'lucide-react';
import {useJobOpenings, useUpdateJobOpening} from '@/lib/hooks/queries/useRecruitment';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import type {CreateJobOpeningRequest, JobOpening, JobStatus} from '@/lib/types/hire/recruitment';

// ==================== Career Page Content Schema ====================
// Stored in localStorage under key 'nu-aura:career-page-content'
// until a backend CMS endpoint is provisioned.

const careerContentSchema = z.object({
  companyTagline: z.string().max(200).optional().or(z.literal('')),
  aboutUs: z.string().max(3000).optional().or(z.literal('')),
  whyJoinUs: z.string().max(3000).optional().or(z.literal('')),
  benefits: z.string().max(2000).optional().or(z.literal('')),
  culture: z.string().max(2000).optional().or(z.literal('')),
  careerPageUrl: z.string().url('Enter a valid URL').optional().or(z.literal('')),
});

type CareerContentFormData = z.infer<typeof careerContentSchema>;

const STORAGE_KEY = 'nu-aura:career-page-content';

function loadStoredContent(): CareerContentFormData {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CareerContentFormData) : {};
  } catch {
    return {};
  }
}

// ==================== Status helpers ====================

function JobStatusBadge({status}: { status: JobStatus }) {
  const map: Record<JobStatus, { label: string; variant: string }> = {
    OPEN: {label: 'Live', variant: 'success'},
    DRAFT: {label: 'Draft', variant: 'info'},
    ON_HOLD: {label: 'On Hold', variant: 'warning'},
    CLOSED: {label: 'Closed', variant: 'danger'},
    CANCELLED: {label: 'Cancelled', variant: 'danger'},
  };
  const {label, variant} = map[status] ?? {label: status, variant: 'info'};
  return (
    <Badge variant={variant as 'success' | 'danger' | 'warning' | 'info'} className="text-xs">
      {label}
    </Badge>
  );
}

// ==================== Job Postings Panel ====================

function JobPostingsPanel() {
  const {data, isLoading, refetch} = useJobOpenings(0, 100);
  const updateMutation = useUpdateJobOpening();
  const {hasPermission} = usePermissions();
  const canManage = hasPermission(Permissions.RECRUITMENT_MANAGE);

  const jobs: JobOpening[] = (data as unknown as {
    content?: JobOpening[]
  })?.content ?? (Array.isArray(data) ? (data as JobOpening[]) : []);

  const handleToggleVisibility = async (job: JobOpening) => {
    const newStatus: JobStatus = job.status === 'OPEN' ? 'DRAFT' : 'OPEN';
    const updatePayload: CreateJobOpeningRequest = {
      jobCode: job.jobCode ?? '',
      jobTitle: job.jobTitle,
      departmentId: job.departmentId ?? '',
      location: job.location,
      employmentType: job.employmentType,
      experienceRequired: job.experienceRequired,
      minSalary: job.minSalary,
      maxSalary: job.maxSalary,
      numberOfOpenings: job.numberOfOpenings,
      jobDescription: job.jobDescription,
      requirements: job.requirements,
      skillsRequired: job.skillsRequired,
      hiringManagerId: job.hiringManagerId,
      status: newStatus,
      priority: job.priority,
      isActive: job.isActive,
    };
    try {
      await updateMutation.mutateAsync({id: job.id, data: updatePayload});
      notifications.show({
        title: newStatus === 'OPEN' ? 'Job Published' : 'Job Unpublished',
        message: `"${job.jobTitle}" is now ${newStatus === 'OPEN' ? 'visible on the career page' : 'hidden from the career page'}.`,
        color: newStatus === 'OPEN' ? 'green' : 'orange',
      });
    } catch {
      notifications.show({title: 'Error', message: 'Failed to update job status.', color: 'red'});
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((n) => <Skeleton key={n} className="h-16 w-full rounded-xl"/>)}
      </div>
    );
  }

  const openJobs = jobs.filter((j) => j.status === 'OPEN');
  const otherJobs = jobs.filter((j) => j.status !== 'OPEN');

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-success-600">{openJobs.length}</p>
            <p className="text-caption mt-1">Live on Career Page</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-[var(--text-primary)]">{otherJobs.length}</p>
            <p className="text-caption mt-1">Draft / Other</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p
              className="text-2xl font-bold text-[var(--text-primary)]">{jobs.reduce((acc, j) => acc + (j.numberOfOpenings ?? 1), 0)}</p>
            <p className="text-caption mt-1">Total Openings</p>
          </CardContent>
        </Card>
      </div>

      {/* Refresh */}
      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={() => refetch()} className="flex items-center gap-1.5 text-xs">
          <RefreshCw className="h-3.5 w-3.5"/>
          Refresh
        </Button>
      </div>

      {/* Job List */}
      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
          <Briefcase className="h-10 w-10 mb-4 opacity-40"/>
          <p className="text-sm font-medium">No job openings found</p>
          <p className="text-xs mt-1">Create job postings in the Jobs section first.</p>
        </div>
      ) : (
        <div className="border border-[var(--border-main)] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-[var(--bg-secondary)]">
            <tr>
              <th
                className="px-4 py-2 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Job Title
              </th>
              <th
                className="px-4 py-2 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider hidden sm:table-cell">
                Department
              </th>
              <th
                className="px-4 py-2 text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Status
              </th>
              <th
                className="px-4 py-2 text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Openings
              </th>
              {canManage && (
                <th
                  className="px-4 py-2 text-right text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Visibility
                </th>
              )}
            </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-main)]">
            {jobs.map((job) => (
              <tr
                key={job.id}
                className="hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <td className="px-4 py-2">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{job.jobTitle}</p>
                    {job.location && (
                      <p className="text-caption">{job.location}</p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2 text-body-secondary hidden sm:table-cell">
                  {job.departmentName ?? '—'}
                </td>
                <td className="px-4 py-2 text-center">
                  <JobStatusBadge status={job.status}/>
                </td>
                <td className="px-4 py-2 text-center text-body-secondary">
                  {job.numberOfOpenings ?? 1}
                </td>
                {canManage && (
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => handleToggleVisibility(job)}
                      disabled={
                        updateMutation.isPending ||
                        ['CLOSED', 'CANCELLED'].includes(job.status)
                      }
                      aria-label={
                        job.status === 'OPEN'
                          ? `Hide "${job.jobTitle}" from career page`
                          : `Publish "${job.jobTitle}" to career page`
                      }
                      className={`p-2 rounded-md transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] cursor-pointer ${
                        job.status === 'OPEN'
                          ? 'text-success-600 hover:bg-success-50 dark:hover:bg-success-900/20'
                          : 'text-[var(--text-muted)] hover:text-accent-700 hover:bg-[var(--bg-secondary)]'
                      }`}
                      title={job.status === 'OPEN' ? 'Unpublish (move to Draft)' : 'Publish to career page'}
                    >
                      {job.status === 'OPEN' ? (
                        <Eye className="h-4 w-4"/>
                      ) : (
                        <EyeOff className="h-4 w-4"/>
                      )}
                    </button>
                  </td>
                )}
              </tr>
            ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ==================== Career Content Editor ====================

function CareerContentEditor() {
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    formState: {errors, isDirty},
    reset,
  } = useForm<CareerContentFormData>({
    resolver: zodResolver(careerContentSchema),
    defaultValues: loadStoredContent(),
  });

  const textareaCls =
    'w-full px-4 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 text-sm resize-none';
  const inputCls =
    'w-full px-4 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 text-sm';

  const onSave = (data: CareerContentFormData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    reset(data);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    notifications.show({
      title: 'Content Saved',
      message: 'Career page content has been saved locally. Connect a backend CMS endpoint to persist across sessions.',
      color: 'green',
    });
  };

  const fields: {
    name: keyof CareerContentFormData;
    label: string;
    placeholder: string;
    rows?: number;
    Icon: React.ElementType;
  }[] = [
    {
      name: 'companyTagline',
      label: 'Company Tagline',
      placeholder: 'e.g. "Build the future with us"',
      rows: 1,
      Icon: Star,
    },
    {
      name: 'careerPageUrl',
      label: 'External Career Page URL',
      placeholder: 'https://careers.yourcompany.com',
      rows: 1,
      Icon: Globe,
    },
    {
      name: 'aboutUs',
      label: 'About Us',
      placeholder: 'Tell candidates about your company, mission, and vision…',
      rows: 5,
      Icon: Building2,
    },
    {
      name: 'whyJoinUs',
      label: 'Why Join Us',
      placeholder: 'What makes working here special? Growth opportunities, impact, team culture…',
      rows: 5,
      Icon: Sparkles,
    },
    {
      name: 'benefits',
      label: 'Benefits & Perks',
      placeholder: 'Health insurance, flexible working, paid time off, learning budget…',
      rows: 4,
      Icon: CheckCircle,
    },
    {
      name: 'culture',
      label: 'Culture & Values',
      placeholder: 'Our core values, how we work, what we believe in…',
      rows: 4,
      Icon: Users,
    },
  ];

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-6">
      <div
        className="p-4 bg-info-50 dark:bg-info-900/20 rounded-lg text-xs text-info-700 dark:text-info-300 flex gap-2">
        <Info className="h-4 w-4 flex-shrink-0 mt-0.5"/>
        <span>
          This content is stored locally in your browser session. To persist it across devices and
          make it available on the public careers page, a backend CMS endpoint is needed.
        </span>
      </div>

      {fields.map(({name, label, placeholder, rows = 3, Icon}) => (
        <div key={name}>
          <label className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            <Icon className="h-3.5 w-3.5 text-[var(--text-muted)]"/>
            {label}
          </label>
          {rows === 1 ? (
            <input
              {...register(name)}
              placeholder={placeholder}
              className={inputCls}
            />
          ) : (
            <textarea
              {...register(name)}
              rows={rows}
              placeholder={placeholder}
              className={textareaCls}
            />
          )}
          {errors[name] && (
            <p className="text-xs text-danger-500 mt-1">{errors[name]?.message as string}</p>
          )}
        </div>
      ))}

      <div className="flex items-center gap-4 pt-4 border-t border-[var(--border-main)]">
        <Button
          type="submit"
          className="flex items-center gap-2"
          disabled={!isDirty && !saved}
        >
          {saved ? (
            <><CheckCircle className="h-4 w-4"/>Saved</>
          ) : (
            <><Save className="h-4 w-4"/>Save Content</>
          )}
        </Button>
        {isDirty && (
          <p className="text-xs text-warning-600">Unsaved changes</p>
        )}
      </div>
    </form>
  );
}

// ==================== Page ====================

export default function CareerPageCMS() {
  const [activeTab, setActiveTab] = useState<'jobs' | 'content'>('jobs');
  const [careerUrl, setCareerUrl] = useState<string>('');
  const {hasPermission} = usePermissions();
  const canView = hasPermission(Permissions.RECRUITMENT_VIEW);
  const canManage = hasPermission(Permissions.RECRUITMENT_MANAGE);

  useEffect(() => {
    // Load career page URL from stored content for the preview link
    const stored = loadStoredContent();
    if (stored.careerPageUrl) setCareerUrl(stored.careerPageUrl);
  }, []);

  if (!canView) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-[var(--text-muted)]">
          <XCircle className="h-10 w-10 mb-4 text-danger-400"/>
          <p className="text-sm font-medium">You don&apos;t have permission to view this page.</p>
        </div>
      </AppLayout>
    );
  }

  const tabs: { key: 'jobs' | 'content'; label: string; Icon: React.ElementType }[] = [
    {key: 'jobs', label: 'Job Postings', Icon: Briefcase},
    {key: 'content', label: 'Company Content', Icon: Edit2},
  ];

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Globe className="h-6 w-6 text-accent-500"/>
              Career Page CMS
            </h1>
            <p className="text-body-muted mt-1">
              Manage your public career page — job visibility and company content.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {careerUrl ? (
              <a
                href={careerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 text-sm border border-[var(--border-main)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
              >
                <ExternalLink className="h-3.5 w-3.5"/>
                View Career Page
              </a>
            ) : (
              <a
                href="/careers"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 text-sm border border-[var(--border-main)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
              >
                <ExternalLink className="h-3.5 w-3.5"/>
                Preview (/careers)
              </a>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl border border-[var(--border-main)] overflow-hidden w-fit">
          {tabs.map(({key, label, Icon}) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-6 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                activeTab === key
                  ? 'bg-accent-600 text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon className="h-4 w-4"/>
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <Card>
          <CardContent className="p-6">
            {activeTab === 'jobs' && <JobPostingsPanel/>}
            {activeTab === 'content' && (canManage ? <CareerContentEditor/> : (
              <div className="flex flex-col items-center py-12 text-[var(--text-muted)]">
                <Info className="h-8 w-8 mb-2"/>
                <p className="text-sm">You need RECRUITMENT_MANAGE permission to edit career content.</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
