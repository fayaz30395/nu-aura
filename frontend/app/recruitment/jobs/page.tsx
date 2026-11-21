'use client';

import {useCallback, useEffect, useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {notifications} from '@mantine/notifications';
import {Button, Select, TextInput} from '@mantine/core';
import {Plus, Search} from 'lucide-react';
import {PageTransition} from '@/components/motion';
import {AppLayout} from '@/components/layout';
import {PageHeader} from '@/components/ui/PageHeader';
import {QueryState} from '@/components/ui/QueryState';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import type {RowActionItem} from '@/components/ui/ResponsiveTable';
import {ListPageSkeleton} from '@/components/ui/skeletons';
import {CreateJobOpeningFormData, createJobOpeningSchema} from '@/lib/validations/recruitment';
import {
  useCreateJobOpening,
  useDeleteJobOpening,
  useGenerateJobDescription,
  useJobOpenings,
  useUpdateJobOpening,
} from '@/lib/hooks/queries/useRecruitment';
import {useActiveDepartments} from '@/lib/hooks/queries/useDepartments';
import {useEmployees} from '@/lib/hooks/queries/useEmployees';
import {CreateJobOpeningRequest, JobOpening} from '@/lib/types/hire/recruitment';
import {Department} from '@/lib/types/hrms/employee';
import {JobDescriptionResponse} from '@/lib/types/hire/ai-recruitment';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {emptyJobForm, JOB_STATUS_OPTIONS} from './_components/job-options';
import {JobFormModal} from './_components/JobFormModal';
import {AiJobDescriptionModal} from './_components/AiJobDescriptionModal';
import {JobsTable} from './_components/JobsTable';

const BREADCRUMBS = [{label: 'NU-Hire', href: '/recruitment'}, {label: 'Job Openings'}];
const TABLE_SKELETON = <ListPageSkeleton rows={8} columns={6} showHeader={false} showFilters={false}/>;

export default function JobOpeningsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {hasPermission} = usePermissions();
  const [showAddModal, setShowAddModal] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<JobOpening | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingJob, setEditingJob] = useState<JobOpening | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiGeneratedJD, setAiGeneratedJD] = useState<JobDescriptionResponse | null>(null);

  const jobOpeningsQuery = useJobOpenings(0, 100);
  const {data: departments} = useActiveDepartments();
  const {data: employeesData} = useEmployees(0, 100);
  const createMutation = useCreateJobOpening();
  const updateMutation = useUpdateJobOpening();
  const deleteMutation = useDeleteJobOpening();
  const generateJDMutation = useGenerateJobDescription();

  const managers = employeesData?.content || [];
  const canCreate = hasPermission(Permissions.RECRUITMENT_CREATE);
  const canDelete = hasPermission(Permissions.RECRUITMENT_MANAGE);

  const form = useForm<CreateJobOpeningFormData>({
    resolver: zodResolver(createJobOpeningSchema),
    mode: 'onChange',
    defaultValues: emptyJobForm(),
  });
  const {watch, setValue, reset} = form;

  useEffect(() => {
    document.title = 'Job Openings | NU-AURA';
  }, []);

  const openCreate = useCallback(() => {
    reset();
    setEditingJob(null);
    setShowAddModal(true);
  }, [reset]);

  useEffect(() => {
    if (searchParams.get('new') === '1' && canCreate) {
      openCreate();
      router.replace('/recruitment/jobs');
    }
  }, [searchParams, canCreate, openCreate, router]);

  const closeForm = () => {
    setShowAddModal(false);
    reset();
    setEditingJob(null);
  };

  const onSubmit = async (data: CreateJobOpeningFormData) => {
    // Only for new jobs: editing a job that has already passed its closing date must still save.
    if (!editingJob && data.closingDate && data.closingDate < new Date().toLocaleDateString('en-CA')) {
      form.setError('closingDate', {message: 'Closing date cannot be in the past'});
      return;
    }
    try {
      const payload: CreateJobOpeningRequest = {
        jobCode: data.jobCode ?? '',
        jobTitle: data.jobTitle ?? '',
        departmentId: data.departmentId,
        location: data.location,
        employmentType: data.employmentType,
        experienceRequired: data.experienceRequired,
        minSalary: data.minSalary,
        maxSalary: data.maxSalary,
        numberOfOpenings: data.numberOfOpenings,
        jobDescription: data.jobDescription,
        requirements: data.requirements,
        skillsRequired: data.skillsRequired,
        status: data.status,
        priority: data.priority,
        isActive: data.isActive,
        hiringManagerId: data.hiringManagerId || undefined,
        closingDate: data.closingDate || undefined,
        postedDate: data.postedDate || undefined,
      };
      if (editingJob) {
        await updateMutation.mutateAsync({id: editingJob.id, data: payload});
        notifications.show({title: 'Success', message: 'Job opening updated successfully', color: 'green'});
      } else {
        await createMutation.mutateAsync(payload);
        notifications.show({title: 'Success', message: 'Job opening created successfully', color: 'green'});
      }
      closeForm();
    } catch {
      // The global MutationCache handler shows the error toast.
    }
  };

  const handleEdit = useCallback((job: JobOpening) => {
    setEditingJob(job);
    reset({
      jobCode: job.jobCode,
      jobTitle: job.jobTitle,
      departmentId: job.departmentId || '',
      location: job.location || '',
      employmentType: job.employmentType || 'FULL_TIME',
      experienceRequired: job.experienceRequired || '',
      minSalary: job.minSalary,
      maxSalary: job.maxSalary,
      numberOfOpenings: job.numberOfOpenings || 1,
      jobDescription: job.jobDescription || '',
      requirements: job.requirements || '',
      skillsRequired: job.skillsRequired || '',
      hiringManagerId: job.hiringManagerId || '',
      status: job.status,
      postedDate: job.postedDate || '',
      closingDate: job.closingDate || '',
      priority: job.priority || 'MEDIUM',
      isActive: job.isActive,
    });
    setShowAddModal(true);
  }, [reset]);

  const handleDelete = async () => {
    if (!jobToDelete) return;
    try {
      await deleteMutation.mutateAsync(jobToDelete.id);
      setJobToDelete(null);
      notifications.show({title: 'Success', message: 'Job opening deleted successfully', color: 'green'});
    } catch {
      // The global MutationCache handler shows the error toast.
    }
  };

  const handleGenerateJobDescription = async () => {
    const jobTitle = watch('jobTitle');
    const department = watch('departmentId');
    const experienceRequired = watch('experienceRequired');
    const skillsRequired = watch('skillsRequired');

    if (!jobTitle) {
      notifications.show({title: 'Error', message: 'Please enter a job title first', color: 'red'});
      return;
    }

    try {
      setShowAiModal(true);
      const result = await generateJDMutation.mutateAsync({
        jobTitle,
        department: (departments || []).find((d: Department) => d.id === department)?.name,
        experienceRange: experienceRequired,
        keySkills: skillsRequired?.split(',').map((s: string) => s.trim()).filter((s: string) => s),
      });
      setAiGeneratedJD(result);
    } catch {
      setShowAiModal(false);
    }
  };

  const applyGeneratedDescription = () => {
    if (aiGeneratedJD?.fullDescription) {
      setValue('jobDescription', aiGeneratedJD.fullDescription);
      if (aiGeneratedJD.requirements) {
        setValue('requirements', aiGeneratedJD.requirements.join('\n'));
      }
    }
    setShowAiModal(false);
    setAiGeneratedJD(null);
  };

  const viewCandidates = useCallback(
    (job: JobOpening) => router.push(`/recruitment/candidates?jobId=${job.id}`),
    [router],
  );

  const rowActions = useCallback((job: JobOpening): RowActionItem[] => {
    const items: RowActionItem[] = [
      {label: 'View candidates', onClick: () => viewCandidates(job)},
      {label: 'Edit', onClick: () => handleEdit(job)},
    ];
    if (canDelete) items.push({label: 'Delete', color: 'red', onClick: () => setJobToDelete(job)});
    return items;
  }, [viewCandidates, handleEdit, canDelete]);

  const jobOpenings = jobOpeningsQuery.data?.content || [];
  const query = searchQuery.toLowerCase();
  const filteredJobs = jobOpenings
    .filter((job) => !statusFilter || job.status === statusFilter)
    .filter((job) => job.jobTitle.toLowerCase().includes(query) || job.jobCode.toLowerCase().includes(query));
  const hasFilters = Boolean(searchQuery || statusFilter);

  const stats = [
    {label: 'Total jobs', value: jobOpenings.length},
    {label: 'Open', value: jobOpenings.filter((j) => j.status === 'OPEN').length},
    {label: 'Draft', value: jobOpenings.filter((j) => j.status === 'DRAFT').length},
    {label: 'Closed', value: jobOpenings.filter((j) => j.status === 'CLOSED').length},
  ];

  return (
    <AppLayout activeMenuItem="recruitment">
      <PageTransition className="flex flex-col gap-6">
        <PageHeader
          title="Job Openings"
          description="Manage job openings and recruitment positions"
          breadcrumbs={BREADCRUMBS}
          actions={
            <PermissionGate permission={Permissions.RECRUITMENT_CREATE}>
              <Button leftSection={<Plus className="h-4 w-4" aria-hidden="true"/>} onClick={openCreate}>
                Create Job Opening
              </Button>
            </PermissionGate>
          }
        />

        {jobOpeningsQuery.data && (
          <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4">
                <dt className="text-xs font-medium uppercase tracking-wider text-text-2">{s.label}</dt>
                <dd className="text-2xl font-semibold tabular-nums text-text-1">{s.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <section aria-label="Job openings" className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex flex-col gap-2 border-b border-border p-4 sm:flex-row sm:items-center">
            <TextInput
              className="flex-1"
              aria-label="Search job openings"
              placeholder="Search job openings..."
              leftSection={<Search className="h-4 w-4" aria-hidden="true"/>}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
            />
            <Select
              className="sm:w-48"
              aria-label="Filter by status"
              placeholder="All Status"
              clearable
              data={JOB_STATUS_OPTIONS}
              value={statusFilter || null}
              onChange={(value) => setStatusFilter(value ?? '')}
            />
          </div>

          <QueryState
            query={jobOpeningsQuery}
            skeleton={TABLE_SKELETON}
            errorTitle="Couldn't load job openings"
            isEmpty={() => filteredJobs.length === 0}
            empty={
              hasFilters
                ? {
                  title: 'No job openings found',
                  description: 'No job openings match your search or filters.',
                  action: {label: 'Clear filters', onClick: () => {
                    setSearchQuery('');
                    setStatusFilter('');
                  }},
                }
                : {
                  title: 'No job openings found',
                  description: canCreate ? 'Get started by creating your first job opening.' : 'There are no job openings yet.',
                  action: canCreate ? {label: 'Create job opening', onClick: openCreate} : undefined,
                }
            }
          >
            {() => <JobsTable jobs={filteredJobs} onOpen={viewCandidates} rowActions={rowActions}/>}
          </QueryState>
        </section>

        <JobFormModal
          isOpen={showAddModal}
          isEditing={!!editingJob}
          form={form}
          departments={departments || []}
          managers={managers}
          submitting={createMutation.isPending || updateMutation.isPending}
          generating={generateJDMutation.isPending}
          onGenerate={handleGenerateJobDescription}
          onSubmit={onSubmit}
          onClose={closeForm}
        />

        <AiJobDescriptionModal
          isOpen={showAiModal}
          generating={generateJDMutation.isPending}
          result={aiGeneratedJD}
          onApply={applyGeneratedDescription}
          onClose={() => {
            setShowAiModal(false);
            setAiGeneratedJD(null);
          }}
        />

        <ConfirmDialog
          isOpen={!!jobToDelete}
          onClose={() => setJobToDelete(null)}
          onConfirm={handleDelete}
          title="Delete Job Opening?"
          message={`This action cannot be undone. Job opening "${jobToDelete?.jobTitle ?? ''}" will be permanently deleted.`}
          confirmText="Delete"
          type="danger"
          loading={deleteMutation.isPending}
        />
      </PageTransition>
    </AppLayout>
  );
}
