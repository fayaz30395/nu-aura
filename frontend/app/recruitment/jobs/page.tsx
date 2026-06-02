'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {notifications} from '@mantine/notifications';
import {PageTransition, Stagger, StaggerItem} from '@/components/motion';
import {AppLayout} from '@/components/layout';
import {Card, CardContent} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
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
import {CreateJobOpeningRequest, JobOpening, Priority} from '@/lib/types/hire/recruitment';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {JOB_STATUS} from '@/lib/status/vocabulary';
import {Department} from '@/lib/types/hrms/employee';
import {JobDescriptionResponse} from '@/lib/types/hire/ai-recruitment';
import {
  Briefcase,
  Calendar,
  DollarSign,
  Edit2,
  Eye,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Users
} from 'lucide-react';
import {EmptyState} from '@/components/ui/EmptyState';
import {Modal, ModalBody, ModalHeader} from '@/components/ui/Modal';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {formatDate} from '@/lib/utils/format/date';

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
  const {data: departments} = useActiveDepartments();
  const {data: employeesData} = useEmployees(0, 100);
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

  const {register, handleSubmit, formState: {errors}, watch, setValue, reset} = form;

  const onSubmit = async (data: CreateJobOpeningFormData) => {
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
        message: (err as {
          response?: { data?: { message?: string } }
        })?.response?.data?.message || 'Failed to save job opening',
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
        message: (err as {
          response?: { data?: { message?: string } }
        })?.response?.data?.message || 'Failed to delete job opening',
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
        message: (err as {
          response?: { data?: { message?: string } }
        })?.response?.data?.message || 'Failed to generate job description',
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

  const getPriorityColor = (priority?: Priority) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-danger-100 text-danger-800';
      case 'HIGH':
        return 'bg-warning-100 text-warning-800';
      case 'MEDIUM':
        return 'bg-accent-100 text-accent-800';
      case 'LOW':
        return 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]';
      default:
        return 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]';
    }
  };

  return (
    <AppLayout activeMenuItem="recruitment">
      <PageTransition className="p-6 space-y-6">
        {/* Header */}
        <div className="row-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Job Openings</h1>
            <p className="text-[var(--text-secondary)] mt-1">Manage job openings and recruitment
              positions</p>
          </div>
          <PermissionGate permission={Permissions.RECRUITMENT_CREATE}>
            <Button onClick={() => {
              reset();
              setEditingJob(null);
              setShowAddModal(true);
            }} className="flex items-center gap-2">
              <Plus className="h-4 w-4"/>
              Create Job Opening
            </Button>
          </PermissionGate>
        </div>

        {/* Stats Cards */}
        <Stagger className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StaggerItem>
            <Card className="bg-[var(--bg-card)] skeuo-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent-50 flex items-center justify-center">
                    <Briefcase className="h-6 w-6 text-accent-700"/>
                  </div>
                  <div>
                    <p className="text-body-muted">Total Jobs</p>
                    <p className="text-xl font-bold text-[var(--text-primary)]">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="bg-[var(--bg-card)] skeuo-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-success-50 flex items-center justify-center">
                    <Briefcase className="h-6 w-6 text-success-600"/>
                  </div>
                  <div>
                    <p className="text-body-muted">Open</p>
                    <p className="text-xl font-bold text-[var(--text-primary)]">{stats.open}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="bg-[var(--bg-card)] skeuo-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center">
                    <Briefcase className="h-6 w-6 text-[var(--text-secondary)]"/>
                  </div>
                  <div>
                    <p className="text-body-muted">Draft</p>
                    <p className="text-xl font-bold text-[var(--text-primary)]">{stats.draft}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="bg-[var(--bg-card)] skeuo-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent-50 flex items-center justify-center">
                    <Briefcase className="h-6 w-6 text-accent-600"/>
                  </div>
                  <div>
                    <p className="text-body-muted">Closed</p>
                    <p className="text-xl font-bold text-[var(--text-primary)]">{stats.closed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        </Stagger>

        {/* Error */}
        {jobOpeningsQuery.error && (
          <div className="p-4 bg-danger-50 border border-danger-200 rounded-xl">
            <p className="text-sm text-danger-600">
              {jobOpeningsQuery.error instanceof Error ? jobOpeningsQuery.error.message : 'Failed to load job openings'}
            </p>
          </div>
        )}

        {/* Search and Filters */}
        <Card className="bg-[var(--bg-card)]">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]"/>
                <input
                  type="text"
                  placeholder="Search job openings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
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
            icon={<Briefcase className="h-8 w-8"/>}
            title="No job openings found"
            description={searchQuery || statusFilter ? "Try adjusting your search filters or create a new job opening" : "Get started by creating your first job opening"}
            action={{
              label: 'Create job opening',
              onClick: () => {
                reset();
                setEditingJob(null);
                setShowAddModal(true);
              },
            }}
            iconColor="gray"
            iconSize={64}
          />
        ) : (
          <Stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredJobs.map((job, _index) => (
              <StaggerItem key={job.id}>
                <Card className="hover-lift bg-[var(--bg-card)] hover:shadow-[var(--shadow-dropdown)] transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h2 className="font-semibold text-[var(--text-primary)] text-lg">{job.jobTitle}</h2>
                        <p className="text-body-muted">{job.jobCode}</p>
                      </div>
                      <StatusBadge status={job.status} domain={JOB_STATUS} />
                    </div>

                    <div className="space-y-2 mb-4">
                      {job.departmentName && (
                        <div className="flex items-center gap-2 text-body-secondary">
                          <Users className="h-4 w-4"/>
                          <span>{job.departmentName}</span>
                        </div>
                      )}
                      {job.location && (
                        <div className="flex items-center gap-2 text-body-secondary">
                          <MapPin className="h-4 w-4"/>
                          <span>{job.location}</span>
                        </div>
                      )}
                      {(job.minSalary || job.maxSalary) && (
                        <div className="flex items-center gap-2 text-body-secondary">
                          <DollarSign className="h-4 w-4"/>
                          <span>
                          {job.minSalary && job.maxSalary
                            ? `${job.minSalary.toLocaleString()} - ${job.maxSalary.toLocaleString()}`
                            : job.minSalary?.toLocaleString() || job.maxSalary?.toLocaleString()}
                        </span>
                        </div>
                      )}
                      {job.closingDate && (
                        <div className="flex items-center gap-2 text-body-secondary">
                          <Calendar className="h-4 w-4"/>
                          <span>Closes: {formatDate(job.closingDate)}</span>
                        </div>
                      )}
                    </div>

                    <div className="row-between pt-4 border-t border-[var(--border-main)]">
                      <div className="flex items-center gap-2">
                        {job.priority && (
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${getPriorityColor(job.priority)}`}>
                          {job.priority}
                        </span>
                        )}
                        {job.numberOfOpenings && (
                          <span className="text-caption">
                          {job.numberOfOpenings} position{job.numberOfOpenings > 1 ? 's' : ''}
                        </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => router.push(`/recruitment/candidates?jobId=${job.id}`)}
                          className="p-2 text-[var(--text-muted)] hover:text-accent-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                          title="View Candidates"
                          aria-label="View candidates"
                        >
                          <Eye className="h-4 w-4"/>
                        </button>
                        <button
                          onClick={() => handleEdit(job)}
                          className="p-2 text-[var(--text-muted)] hover:text-accent-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                          title="Edit"
                          aria-label="Edit job"
                        >
                          <Edit2 className="h-4 w-4"/>
                        </button>
                        <PermissionGate permission={Permissions.RECRUITMENT_MANAGE}>
                          <button
                            onClick={() => {
                              setJobToDelete(job);
                              setShowDeleteModal(true);
                            }}
                            className="p-2 text-[var(--text-muted)] hover:text-danger-600 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                            title="Delete"
                            aria-label="Delete job"
                          >
                            <Trash2 className="h-4 w-4"/>
                          </button>
                        </PermissionGate>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        )}

        {/* Add/Edit Modal */}
        {showAddModal && (
          <Modal isOpen={showAddModal} onClose={() => {
            setShowAddModal(false);
            reset();
            setEditingJob(null);
          }} size="xl">
            <ModalHeader onClose={() => {
              setShowAddModal(false);
              reset();
              setEditingJob(null);
            }}>
              {editingJob ? 'Edit Job Opening' : 'Create Job Opening'}
            </ModalHeader>
            <ModalBody>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="job-form-code" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Job Code *</label>
                      <input
                        id="job-form-code"
                        type="text"
                        {...register('jobCode')}
                        aria-invalid={errors.jobCode ? 'true' : 'false'}
                        aria-describedby={errors.jobCode ? 'job-form-code-error' : undefined}
                        className="input-aura"
                        placeholder="JOB-001"
                      />
                      {errors.jobCode && <p id="job-form-code-error" className="text-xs text-danger-600 mt-1">{errors.jobCode.message}</p>}
                    </div>
                    <div>
                      <label htmlFor="job-form-title" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Job Title *</label>
                      <input
                        id="job-form-title"
                        type="text"
                        {...register('jobTitle')}
                        aria-invalid={errors.jobTitle ? 'true' : 'false'}
                        aria-describedby={errors.jobTitle ? 'job-form-title-error' : undefined}
                        className="input-aura"
                        placeholder="Senior Software Engineer"
                      />
                      {errors.jobTitle && <p id="job-form-title-error" className="text-xs text-danger-600 mt-1">{errors.jobTitle.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="job-form-department" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Department *</label>
                      <select
                        id="job-form-department"
                        {...register('departmentId')}
                        aria-invalid={errors.departmentId ? 'true' : 'false'}
                        aria-describedby={errors.departmentId ? 'job-form-department-error' : undefined}
                        className="input-aura"
                      >
                        <option value="">Select Department</option>
                        {(departments || []).map((dept: Department) => (
                          <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                      </select>
                      {errors.departmentId &&
                        <p id="job-form-department-error" className="text-xs text-danger-600 mt-1">{errors.departmentId.message}</p>}
                    </div>
                    <div>
                      <label htmlFor="job-form-hiring-manager" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Hiring
                        Manager</label>
                      <select
                        id="job-form-hiring-manager"
                        {...register('hiringManagerId')}
                        aria-invalid={errors.hiringManagerId ? 'true' : 'false'}
                        aria-describedby={errors.hiringManagerId ? 'job-form-hiring-manager-error' : undefined}
                        className="input-aura"
                      >
                        <option value="">Select Manager</option>
                        {managers.map((mgr) => (
                          <option key={mgr.id} value={mgr.id}>{mgr.fullName}</option>
                        ))}
                      </select>
                      {errors.hiringManagerId &&
                        <p id="job-form-hiring-manager-error" className="text-xs text-danger-600 mt-1">{errors.hiringManagerId.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="job-form-location" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Location</label>
                      <input
                        id="job-form-location"
                        type="text"
                        {...register('location')}
                        aria-invalid={errors.location ? 'true' : 'false'}
                        aria-describedby={errors.location ? 'job-form-location-error' : undefined}
                        className="input-aura"
                        placeholder="Remote / City"
                      />
                      {errors.location && <p id="job-form-location-error" className="text-xs text-danger-600 mt-1">{errors.location.message}</p>}
                    </div>
                    <div>
                      <label htmlFor="job-form-employment-type" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Employment
                        Type</label>
                      <select
                        id="job-form-employment-type"
                        {...register('employmentType')}
                        aria-invalid={errors.employmentType ? 'true' : 'false'}
                        aria-describedby={errors.employmentType ? 'job-form-employment-type-error' : undefined}
                        className="input-aura"
                      >
                        <option value="FULL_TIME">Full Time</option>
                        <option value="PART_TIME">Part Time</option>
                        <option value="CONTRACT">Contract</option>
                        <option value="TEMPORARY">Temporary</option>
                        <option value="INTERNSHIP">Internship</option>
                      </select>
                      {errors.employmentType &&
                        <p id="job-form-employment-type-error" className="text-xs text-danger-600 mt-1">{errors.employmentType.message}</p>}
                    </div>
                    <div>
                      <label htmlFor="job-form-number-of-openings" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">No. of
                        Openings</label>
                      <input
                        id="job-form-number-of-openings"
                        type="number"
                        min="1"
                        {...register('numberOfOpenings')}
                        aria-invalid={errors.numberOfOpenings ? 'true' : 'false'}
                        aria-describedby={errors.numberOfOpenings ? 'job-form-number-of-openings-error' : undefined}
                        className="input-aura"
                      />
                      {errors.numberOfOpenings &&
                        <p id="job-form-number-of-openings-error" className="text-xs text-danger-600 mt-1">{errors.numberOfOpenings.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="job-form-min-salary" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Min Salary</label>
                      <input
                        id="job-form-min-salary"
                        type="number"
                        {...register('minSalary')}
                        aria-invalid={errors.minSalary ? 'true' : 'false'}
                        aria-describedby={errors.minSalary ? 'job-form-min-salary-error' : undefined}
                        className="input-aura"
                        placeholder="50000"
                      />
                      {errors.minSalary && <p id="job-form-min-salary-error" className="text-xs text-danger-600 mt-1">{errors.minSalary.message}</p>}
                    </div>
                    <div>
                      <label htmlFor="job-form-max-salary" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Max Salary</label>
                      <input
                        id="job-form-max-salary"
                        type="number"
                        {...register('maxSalary')}
                        aria-invalid={errors.maxSalary ? 'true' : 'false'}
                        aria-describedby={errors.maxSalary ? 'job-form-max-salary-error' : undefined}
                        className="input-aura"
                        placeholder="80000"
                      />
                      {errors.maxSalary && <p id="job-form-max-salary-error" className="text-xs text-danger-600 mt-1">{errors.maxSalary.message}</p>}
                    </div>
                    <div>
                      <label htmlFor="job-form-experience-required" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Experience
                        Required</label>
                      <input
                        id="job-form-experience-required"
                        type="text"
                        {...register('experienceRequired')}
                        aria-invalid={errors.experienceRequired ? 'true' : 'false'}
                        aria-describedby={errors.experienceRequired ? 'job-form-experience-required-error' : undefined}
                        className="input-aura"
                        placeholder="3-5 years"
                      />
                      {errors.experienceRequired &&
                        <p id="job-form-experience-required-error" className="text-xs text-danger-600 mt-1">{errors.experienceRequired.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="job-form-status" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Status</label>
                      <select
                        id="job-form-status"
                        {...register('status')}
                        aria-invalid={errors.status ? 'true' : 'false'}
                        aria-describedby={errors.status ? 'job-form-status-error' : undefined}
                        className="input-aura"
                      >
                        <option value="DRAFT">Draft</option>
                        <option value="OPEN">Open</option>
                        <option value="ON_HOLD">On Hold</option>
                        <option value="CLOSED">Closed</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                      {errors.status && <p id="job-form-status-error" className="text-xs text-danger-600 mt-1">{errors.status.message}</p>}
                    </div>
                    <div>
                      <label htmlFor="job-form-priority" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Priority</label>
                      <select
                        id="job-form-priority"
                        {...register('priority')}
                        aria-invalid={errors.priority ? 'true' : 'false'}
                        aria-describedby={errors.priority ? 'job-form-priority-error' : undefined}
                        className="input-aura"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="URGENT">Urgent</option>
                      </select>
                      {errors.priority && <p id="job-form-priority-error" className="text-xs text-danger-600 mt-1">{errors.priority.message}</p>}
                    </div>
                    <div>
                      <label htmlFor="job-form-closing-date" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Closing
                        Date</label>
                      <input
                        id="job-form-closing-date"
                        type="date"
                        {...register('closingDate')}
                        aria-invalid={errors.closingDate ? 'true' : 'false'}
                        aria-describedby={errors.closingDate ? 'job-form-closing-date-error' : undefined}
                        className="input-aura"
                      />
                      {errors.closingDate &&
                        <p id="job-form-closing-date-error" className="text-xs text-danger-600 mt-1">{errors.closingDate.message}</p>}
                    </div>
                  </div>

                  <div>
                    <div className="row-between mb-1">
                      <label htmlFor="job-form-description" className="block text-sm font-medium text-[var(--text-secondary)]">Job Description</label>
                      <button
                        type="button"
                        onClick={handleGenerateJobDescription}
                        disabled={generateJDMutation.isPending}
                        className="flex items-center gap-1 text-xs font-medium text-accent-700 hover:text-accent-700 disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                      >
                        <Sparkles className="h-3.5 w-3.5"/>
                        Generate with AI
                      </button>
                    </div>
                    <textarea
                      id="job-form-description"
                      rows={4}
                      {...register('jobDescription')}
                      aria-invalid={errors.jobDescription ? 'true' : 'false'}
                      aria-describedby={errors.jobDescription ? 'job-form-description-error' : undefined}
                      className="w-full px-4 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
                      placeholder="Describe the job role and responsibilities..."
                    />
                    {errors.jobDescription &&
                      <p id="job-form-description-error" className="text-xs text-danger-600 mt-1">{errors.jobDescription.message}</p>}
                  </div>

                  <div>
                    <label htmlFor="job-form-requirements" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Requirements</label>
                    <textarea
                      id="job-form-requirements"
                      rows={3}
                      {...register('requirements')}
                      aria-invalid={errors.requirements ? 'true' : 'false'}
                      aria-describedby={errors.requirements ? 'job-form-requirements-error' : undefined}
                      className="w-full px-4 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
                      placeholder="List the requirements..."
                    />
                    {errors.requirements &&
                      <p id="job-form-requirements-error" className="text-xs text-danger-600 mt-1">{errors.requirements.message}</p>}
                  </div>

                  <div>
                    <label htmlFor="job-form-skills-required" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Skills
                      Required</label>
                    <textarea
                      id="job-form-skills-required"
                      rows={2}
                      {...register('skillsRequired')}
                      aria-invalid={errors.skillsRequired ? 'true' : 'false'}
                      aria-describedby={errors.skillsRequired ? 'job-form-skills-required-error' : undefined}
                      className="w-full px-4 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
                      placeholder="React, TypeScript, Node.js..."
                    />
                    {errors.skillsRequired &&
                      <p id="job-form-skills-required-error" className="text-xs text-danger-600 mt-1">{errors.skillsRequired.message}</p>}
                  </div>

                  <div className="flex gap-4 pt-4 border-t border-[var(--border-main)]">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAddModal(false);
                        reset();
                        setEditingJob(null);
                      }}
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
            </ModalBody>
          </Modal>
        )}

        {/* Delete Modal */}
        {showDeleteModal && jobToDelete && (
          <Modal isOpen={showDeleteModal} onClose={() => {
            setShowDeleteModal(false);
            setJobToDelete(null);
          }} size="md">
            <ModalBody>
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-danger-100 flex items-center justify-center">
                  <Trash2 className="h-6 w-6 text-danger-600"/>
                </div>
                <h2 className="ml-4 text-lg font-medium text-[var(--text-primary)]">Delete Job Opening?</h2>
              </div>
              <p className="text-body-muted mb-6">
                This action cannot be undone. Job opening <strong
                className="text-[var(--text-secondary)]">{jobToDelete.jobTitle}</strong> will be permanently deleted.
              </p>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setJobToDelete(null);
                  }}
                  className="flex-1"
                  disabled={deleteMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDelete}
                  className="flex-1"
                  disabled={deleteMutation.isPending}
                >
                  Delete
                </Button>
              </div>
            </ModalBody>
          </Modal>
        )}

        {/* AI Generated Job Description Modal */}
        {showAiModal && (
          <Modal isOpen={showAiModal} onClose={() => {
            setShowAiModal(false);
            setAiGeneratedJD(null);
          }} size="lg">
            <ModalHeader onClose={() => {
              setShowAiModal(false);
              setAiGeneratedJD(null);
            }}>
              Generated Job Description
            </ModalHeader>
            <ModalBody>
                {generateJDMutation.isPending ? (
                  <div className="py-12 text-center">
                    <div
                      className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-700 mx-auto mb-4"></div>
                    <p className="text-[var(--text-muted)]">Generating job description with AI...</p>
                  </div>
                ) : aiGeneratedJD ? (
                  <div className="space-y-6">
                    {aiGeneratedJD.summary && (
                      <section aria-labelledby="ai-jd-summary-heading">
                        <h3 id="ai-jd-summary-heading" className="text-sm font-medium text-[var(--text-secondary)] mb-2">Summary</h3>
                        <p className="text-body-secondary">{aiGeneratedJD.summary}</p>
                      </section>
                    )}

                    {aiGeneratedJD.responsibilities && aiGeneratedJD.responsibilities.length > 0 && (
                      <section aria-labelledby="ai-jd-responsibilities-heading">
                        <h3 id="ai-jd-responsibilities-heading" className="text-sm font-medium text-[var(--text-secondary)] mb-2">Responsibilities</h3>
                        <ul className="list-disc list-inside space-y-1 text-body-secondary">
                          {aiGeneratedJD.responsibilities.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </section>
                    )}

                    {aiGeneratedJD.requirements && aiGeneratedJD.requirements.length > 0 && (
                      <section aria-labelledby="ai-jd-requirements-heading">
                        <h3 id="ai-jd-requirements-heading" className="text-sm font-medium text-[var(--text-secondary)] mb-2">Requirements</h3>
                        <ul className="list-disc list-inside space-y-1 text-body-secondary">
                          {aiGeneratedJD.requirements.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </section>
                    )}

                    {aiGeneratedJD.preferredQualifications && aiGeneratedJD.preferredQualifications.length > 0 && (
                      <section aria-labelledby="ai-jd-preferred-quals-heading">
                        <h3 id="ai-jd-preferred-quals-heading" className="text-sm font-medium text-[var(--text-secondary)] mb-2">Preferred
                          Qualifications</h3>
                        <ul className="list-disc list-inside space-y-1 text-body-secondary">
                          {aiGeneratedJD.preferredQualifications.map((q, i) => (
                            <li key={i}>{q}</li>
                          ))}
                        </ul>
                      </section>
                    )}

                    {aiGeneratedJD.benefits && aiGeneratedJD.benefits.length > 0 && (
                      <section aria-labelledby="ai-jd-benefits-heading">
                        <h3 id="ai-jd-benefits-heading" className="text-sm font-medium text-[var(--text-secondary)] mb-2">Benefits</h3>
                        <ul className="list-disc list-inside space-y-1 text-body-secondary">
                          {aiGeneratedJD.benefits.map((b, i) => (
                            <li key={i}>{b}</li>
                          ))}
                        </ul>
                      </section>
                    )}

                    <div className="flex gap-4 pt-4 border-t border-[var(--border-main)]">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowAiModal(false);
                          setAiGeneratedJD(null);
                        }}
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
            </ModalBody>
          </Modal>
        )}
      </PageTransition>
    </AppLayout>
  );
}
