'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { notifications } from '@mantine/notifications';
import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { createJobOpeningSchema, CreateJobOpeningFormData } from '@/lib/validations/recruitment';
import {
  useJobOpenings,
  useCreateJobOpening,
  useUpdateJobOpening,
  useDeleteJobOpening,
  useGenerateJobDescription,
} from '@/lib/hooks/queries/useRecruitment';
import { useActiveDepartments } from '@/lib/hooks/queries/useDepartments';
import { useEmployees } from '@/lib/hooks/queries/useEmployees';
import { JobOpening, JobStatus, Priority, CreateJobOpeningRequest } from '@/lib/types/recruitment';
import { Department } from '@/lib/types/employee';
import { JobDescriptionResponse } from '@/lib/types/ai-recruitment';
import { Briefcase, MapPin, Users, Calendar, DollarSign, Plus, Search, Eye, Edit2, Trash2, X, Sparkles } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';

export default function JobOpeningsPage() {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<JobOpening | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingJob, setEditingJob] = useState<JobOpening | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiGeneratedJD, setAiGeneratedJD] = useState<JobDescriptionResponse | null>(null);

  // React Query hooks (already being used)
  const jobOpeningsQuery = useJobOpenings(0, 100);
  const { data: departments } = useActiveDepartments();
  const { data: employeesData } = useEmployees(0, 100);
  const createMutation = useCreateJobOpening();
  const updateMutation = useUpdateJobOpening();
  const deleteMutation = useDeleteJobOpening();
  const generateJDMutation = useGenerateJobDescription();

  const managers = employeesData?.content || [];

  // React Hook Form setup
  const form = useForm<CreateJobOpeningFormData>({
    resolver: zodResolver(createJobOpeningSchema),
    mode: 'onChange',
    defaultValues: {
      jobCode: '',
      jobTitle: '',
      departmentId: '',
      location: '',
      employmentType: 'FULL_TIME',
      experienceRequired: '',
      minSalary: undefined,
      maxSalary: undefined,
      numberOfOpenings: 1,
      jobDescription: '',
      requirements: '',
      skillsRequired: '',
      hiringManagerId: '',
      status: 'DRAFT',
      postedDate: new Date().toISOString().split('T')[0],
      closingDate: '',
      priority: 'MEDIUM',
      isActive: true,
    },
  });

  const { register, handleSubmit, formState: { errors }, watch, setValue, reset } = form;

  const onSubmit = async (data: CreateJobOpeningFormData) => {
    try {
      const payload = data as CreateJobOpeningRequest;
      if (editingJob) {
        await updateMutation.mutateAsync({ id: editingJob.id, data: payload });
        notifications.show({
          title: 'Success',
          message: 'Job opening updated successfully',
          color: 'green',
        });
      } else {
        await createMutation.mutateAsync(payload);
        notifications.show({
          title: 'Success',
          message: 'Job opening created successfully',
          color: 'green',
        });
      }
      setShowAddModal(false);
      reset();
      setEditingJob(null);
    } catch (err: unknown) {
      notifications.show({
        title: 'Error',
        message: (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save job opening',
        color: 'red',
      });
    }
  };

  const handleEdit = (job: JobOpening) => {
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
  };

  const handleDelete = async () => {
    if (!jobToDelete) return;
    try {
      await deleteMutation.mutateAsync(jobToDelete.id);
      setShowDeleteModal(false);
      setJobToDelete(null);
      notifications.show({
        title: 'Success',
        message: 'Job opening deleted successfully',
        color: 'green',
      });
    } catch (err: unknown) {
      notifications.show({
        title: 'Error',
        message: (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete job opening',
        color: 'red',
      });
    }
  };

  const handleGenerateJobDescription = async () => {
    const jobTitle = watch('jobTitle');
    const department = watch('departmentId');
    const experienceRequired = watch('experienceRequired');
    const skillsRequired = watch('skillsRequired');

    if (!jobTitle) {
      notifications.show({
        title: 'Error',
        message: 'Please enter a job title first',
        color: 'red',
      });
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
    } catch (err: unknown) {
      notifications.show({
        title: 'Error',
        message: (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to generate job description',
        color: 'red',
      });
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

  // Filter and transform data for display
  const jobOpenings = jobOpeningsQuery.data?.content || [];
  const filteredJobs = jobOpenings
    .filter(job => !statusFilter || job.status === statusFilter)
    .filter(job =>
      job.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.jobCode.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const stats = {
    total: jobOpenings.length,
    open: jobOpenings.filter(j => j.status === 'OPEN').length,
    draft: jobOpenings.filter(j => j.status === 'DRAFT').length,
    closed: jobOpenings.filter(j => j.status === 'CLOSED').length,
  };

  const getStatusColor = (status: JobStatus) => {
    switch (status) {
      case 'OPEN': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'DRAFT': return 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] dark:text-[var(--text-muted)]';
      case 'ON_HOLD': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'CLOSED': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'CANCELLED': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      default: return 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] dark:text-[var(--text-muted)]';
    }
  };

  const getPriorityColor = (priority?: Priority) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      case 'HIGH': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300';
      case 'MEDIUM': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'LOW': return 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] dark:text-[var(--text-muted)]';
      default: return 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] dark:text-[var(--text-muted)]';
    }
  };

  return (
    <AppLayout activeMenuItem="recruitment">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="p-6 space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">Job Openings</h1>
            <p className="text-[var(--text-secondary)] mt-1 skeuo-deboss">Manage job openings and recruitment positions</p>
          </div>
          <PermissionGate permission={Permissions.RECRUITMENT_CREATE}>
            <Button onClick={() => { reset(); setEditingJob(null); setShowAddModal(true); }} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Job Opening
            </Button>
          </PermissionGate>
        </div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, staggerChildren: 0.05, delayChildren: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <Card className="bg-[var(--bg-card)] skeuo-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-950/30 flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Total Jobs</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
            </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <Card className="bg-[var(--bg-card)] skeuo-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-950/30 flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Open</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.open}</p>
                </div>
              </div>
            </CardContent>
          </Card>
            </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <Card className="bg-[var(--bg-card)] skeuo-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-[var(--text-secondary)]" />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Draft</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.draft}</p>
                </div>
              </div>
            </CardContent>
          </Card>
            </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <Card className="bg-[var(--bg-card)] skeuo-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Closed</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.closed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
            </motion.div>
        </motion.div>

        {/* Error */}
        {jobOpeningsQuery.error && (
          <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-sm text-red-600 dark:text-red-400">
              {jobOpeningsQuery.error instanceof Error ? jobOpeningsQuery.error.message : 'Failed to load job openings'}
            </p>
          </div>
        )}

        {/* Search and Filters */}
        <Card className="bg-[var(--bg-card)]">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Search job openings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              >
                <option value="">All Status</option>
                <option value="OPEN">Open</option>
                <option value="DRAFT">Draft</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="CLOSED">Closed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Job Openings Grid */}
        {jobOpeningsQuery.isLoading ? (
          <div className="text-center py-12 text-[var(--text-muted)]">Loading job openings...</div>
        ) : filteredJobs.length === 0 ? (
          <EmptyState
            icon={<Briefcase className="h-8 w-8" />}
            title="No job openings found"
            description={searchQuery || statusFilter ? "Try adjusting your search filters or create a new job opening" : "Get started by creating your first job opening"}
            action={{
              label: 'Create Job Opening',
              onClick: () => { reset(); setEditingJob(null); setShowAddModal(true); },
            }}
            iconColor="gray"
            iconSize={64}
          />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, staggerChildren: 0.05, delayChildren: 0.15 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredJobs.map((job, _index) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
              <Card className="bg-[var(--bg-card)] hover:shadow-lg transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-[var(--text-primary)] text-lg">{job.jobTitle}</h3>
                      <p className="text-sm text-[var(--text-muted)]">{job.jobCode}</p>
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    {job.departmentName && (
                      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <Users className="h-4 w-4" />
                        <span>{job.departmentName}</span>
                      </div>
                    )}
                    {job.location && (
                      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <MapPin className="h-4 w-4" />
                        <span>{job.location}</span>
                      </div>
                    )}
                    {(job.minSalary || job.maxSalary) && (
                      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <DollarSign className="h-4 w-4" />
                        <span>
                          {job.minSalary && job.maxSalary
                            ? `${job.minSalary.toLocaleString()} - ${job.maxSalary.toLocaleString()}`
                            : job.minSalary?.toLocaleString() || job.maxSalary?.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {job.closingDate && (
                      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <Calendar className="h-4 w-4" />
                        <span>Closes: {new Date(job.closingDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[var(--border-main)]">
                    <div className="flex items-center gap-2">
                      {job.priority && (
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${getPriorityColor(job.priority)}`}>
                          {job.priority}
                        </span>
                      )}
                      {job.numberOfOpenings && (
                        <span className="text-xs text-[var(--text-muted)]">
                          {job.numberOfOpenings} position{job.numberOfOpenings > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => router.push(`/recruitment/candidates?jobId=${job.id}`)}
                        className="p-2 text-[var(--text-muted)] hover:text-primary-600 dark:text-[var(--text-muted)] dark:hover:text-primary-400 transition-colors"
                        title="View Candidates"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(job)}
                        className="p-2 text-[var(--text-muted)] hover:text-primary-600 dark:text-[var(--text-muted)] dark:hover:text-primary-400 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <PermissionGate permission={Permissions.RECRUITMENT_MANAGE}>
                        <button
                          onClick={() => { setJobToDelete(job); setShowDeleteModal(true); }}
                          className="p-2 text-[var(--text-muted)] hover:text-red-600 dark:text-[var(--text-muted)] dark:hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </PermissionGate>
                    </div>
                  </div>
                </CardContent>
              </Card>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center p-4 z-50">
            <div className="bg-[var(--bg-card)] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-[var(--border-main)] shadow-xl">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                    {editingJob ? 'Edit Job Opening' : 'Create Job Opening'}
                  </h2>
                  <button onClick={() => { setShowAddModal(false); reset(); setEditingJob(null); }} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)]">
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Job Code *</label>
                      <input
                        type="text"
                        {...register('jobCode')}
                        className="input-aura"
                        placeholder="JOB-001"
                      />
                      {errors.jobCode && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.jobCode.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Job Title *</label>
                      <input
                        type="text"
                        {...register('jobTitle')}
                        className="input-aura"
                        placeholder="Senior Software Engineer"
                      />
                      {errors.jobTitle && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.jobTitle.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Department</label>
                      <select
                        {...register('departmentId')}
                        className="input-aura"
                      >
                        <option value="">Select Department</option>
                        {(departments || []).map((dept: Department) => (
                          <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                      </select>
                      {errors.departmentId && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.departmentId.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Hiring Manager</label>
                      <select
                        {...register('hiringManagerId')}
                        className="input-aura"
                      >
                        <option value="">Select Manager</option>
                        {managers.map((mgr) => (
                          <option key={mgr.id} value={mgr.id}>{mgr.fullName}</option>
                        ))}
                      </select>
                      {errors.hiringManagerId && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.hiringManagerId.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Location</label>
                      <input
                        type="text"
                        {...register('location')}
                        className="input-aura"
                        placeholder="Remote / City"
                      />
                      {errors.location && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.location.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Employment Type</label>
                      <select
                        {...register('employmentType')}
                        className="input-aura"
                      >
                        <option value="FULL_TIME">Full Time</option>
                        <option value="PART_TIME">Part Time</option>
                        <option value="CONTRACT">Contract</option>
                        <option value="TEMPORARY">Temporary</option>
                        <option value="INTERNSHIP">Internship</option>
                      </select>
                      {errors.employmentType && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.employmentType.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">No. of Openings</label>
                      <input
                        type="number"
                        min="1"
                        {...register('numberOfOpenings')}
                        className="input-aura"
                      />
                      {errors.numberOfOpenings && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.numberOfOpenings.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Min Salary</label>
                      <input
                        type="number"
                        {...register('minSalary')}
                        className="input-aura"
                        placeholder="50000"
                      />
                      {errors.minSalary && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.minSalary.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Max Salary</label>
                      <input
                        type="number"
                        {...register('maxSalary')}
                        className="input-aura"
                        placeholder="80000"
                      />
                      {errors.maxSalary && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.maxSalary.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Experience Required</label>
                      <input
                        type="text"
                        {...register('experienceRequired')}
                        className="input-aura"
                        placeholder="3-5 years"
                      />
                      {errors.experienceRequired && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.experienceRequired.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Status</label>
                      <select
                        {...register('status')}
                        className="input-aura"
                      >
                        <option value="DRAFT">Draft</option>
                        <option value="OPEN">Open</option>
                        <option value="ON_HOLD">On Hold</option>
                        <option value="CLOSED">Closed</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                      {errors.status && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.status.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Priority</label>
                      <select
                        {...register('priority')}
                        className="input-aura"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="URGENT">Urgent</option>
                      </select>
                      {errors.priority && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.priority.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Closing Date</label>
                      <input
                        type="date"
                        {...register('closingDate')}
                        className="input-aura"
                      />
                      {errors.closingDate && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.closingDate.message}</p>}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-[var(--text-secondary)]">Job Description</label>
                      <button
                        type="button"
                        onClick={handleGenerateJobDescription}
                        disabled={generateJDMutation.isPending}
                        className="flex items-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 disabled:opacity-50"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Generate with AI
                      </button>
                    </div>
                    <textarea
                      rows={4}
                      {...register('jobDescription')}
                      className="w-full px-3 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      placeholder="Describe the job role and responsibilities..."
                    />
                    {errors.jobDescription && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.jobDescription.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Requirements</label>
                    <textarea
                      rows={3}
                      {...register('requirements')}
                      className="w-full px-3 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      placeholder="List the requirements..."
                    />
                    {errors.requirements && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.requirements.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Skills Required</label>
                    <textarea
                      rows={2}
                      {...register('skillsRequired')}
                      className="w-full px-3 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      placeholder="React, TypeScript, Node.js..."
                    />
                    {errors.skillsRequired && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.skillsRequired.message}</p>}
                  </div>

                  <div className="flex gap-4 pt-4 border-t border-[var(--border-main)]">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { setShowAddModal(false); reset(); setEditingJob(null); }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="flex-1"
                    >
                      {editingJob ? 'Update Job' : 'Create Job'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {showDeleteModal && jobToDelete && (
          <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center p-4 z-50">
            <div className="bg-[var(--bg-card)] rounded-2xl max-w-md w-full p-6 border border-[var(--border-main)] shadow-xl">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="ml-4 text-lg font-medium text-[var(--text-primary)]">Delete Job Opening</h3>
              </div>
              <p className="text-sm text-[var(--text-muted)] mb-6">
                Are you sure you want to delete <strong className="text-[var(--text-secondary)]">{jobToDelete.jobTitle}</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => { setShowDeleteModal(false); setJobToDelete(null); }}
                  className="flex-1"
                  disabled={deleteMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  className="flex-1"
                  disabled={deleteMutation.isPending}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* AI Generated Job Description Modal */}
        {showAiModal && (
          <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center p-4 z-50">
            <div className="bg-[var(--bg-card)] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[var(--border-main)] shadow-xl">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                    Generated Job Description
                  </h2>
                  <button
                    onClick={() => { setShowAiModal(false); setAiGeneratedJD(null); }}
                    className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)]"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {generateJDMutation.isPending ? (
                  <div className="py-12 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-[var(--text-muted)]">Generating job description with AI...</p>
                  </div>
                ) : aiGeneratedJD ? (
                  <div className="space-y-6">
                    {aiGeneratedJD.summary && (
                      <div>
                        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">Summary</h3>
                        <p className="text-sm text-[var(--text-secondary)]">{aiGeneratedJD.summary}</p>
                      </div>
                    )}

                    {aiGeneratedJD.responsibilities && aiGeneratedJD.responsibilities.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">Responsibilities</h3>
                        <ul className="list-disc list-inside space-y-1 text-sm text-[var(--text-secondary)]">
                          {aiGeneratedJD.responsibilities.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {aiGeneratedJD.requirements && aiGeneratedJD.requirements.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">Requirements</h3>
                        <ul className="list-disc list-inside space-y-1 text-sm text-[var(--text-secondary)]">
                          {aiGeneratedJD.requirements.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {aiGeneratedJD.preferredQualifications && aiGeneratedJD.preferredQualifications.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">Preferred Qualifications</h3>
                        <ul className="list-disc list-inside space-y-1 text-sm text-[var(--text-secondary)]">
                          {aiGeneratedJD.preferredQualifications.map((q, i) => (
                            <li key={i}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {aiGeneratedJD.benefits && aiGeneratedJD.benefits.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">Benefits</h3>
                        <ul className="list-disc list-inside space-y-1 text-sm text-[var(--text-secondary)]">
                          {aiGeneratedJD.benefits.map((b, i) => (
                            <li key={i}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex gap-4 pt-4 border-t border-[var(--border-main)]">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => { setShowAiModal(false); setAiGeneratedJD(null); }}
                        className="flex-1"
                      >
                        Discard
                      </Button>
                      <Button type="button" onClick={applyGeneratedDescription} className="flex-1">
                        Apply to Form
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </AppLayout>
  );
}
