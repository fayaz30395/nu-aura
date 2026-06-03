'use client';

import React, {useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle,
  ClipboardList,
  Edit,
  Eye,
  FileText,
  Pause,
  Play,
  Plus,
  Search,
  Send,
  Trash2,
  Users,
} from 'lucide-react';
import {AppLayout} from '@/components/layout/AppLayout';
import {
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  EmptyState,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  Stat,
  StatusBadge,
  Textarea,
} from '@/components/ui';
import {SkeletonCard} from '@/components/ui/Skeleton';
import {PageTransition, Reveal, Stagger, StaggerItem} from '@/components/motion';
import type {Survey, SurveyRequest} from '@/lib/types/grow/survey';
import {SurveyStatus, SurveyType} from '@/lib/types/grow/survey';
import {SURVEY_STATUS, SURVEY_TYPE} from '@/lib/status/vocabulary';
import {
  useAllSurveys,
  useCompleteSurvey,
  useCreateSurvey,
  useDeleteSurvey,
  useLaunchSurvey,
  useUpdateSurvey,
} from '@/lib/hooks/queries/useSurveys';
import {formatDate} from '@/lib/utils/format/date';

const surveyTypeOptions = [
  {value: SurveyType.ENGAGEMENT, label: 'Engagement'},
  {value: SurveyType.SATISFACTION, label: 'Satisfaction'},
  {value: SurveyType.PULSE, label: 'Pulse'},
  {value: SurveyType.EXIT, label: 'Exit'},
  {value: SurveyType.FEEDBACK, label: 'Feedback'},
  {value: SurveyType.CUSTOM, label: 'Custom'},
];

const statusOptions = [
  {value: SurveyStatus.DRAFT, label: 'Draft'},
  {value: SurveyStatus.ACTIVE, label: 'Active'},
  {value: SurveyStatus.PAUSED, label: 'Paused'},
  {value: SurveyStatus.COMPLETED, label: 'Completed'},
  {value: SurveyStatus.ARCHIVED, label: 'Archived'},
];

// Form validation schema
const surveyFormSchema = z.object({
  surveyCode: z.string().min(1, 'Survey code is required'),
  title: z.string().min(1, 'Title is required').min(3, 'Title must be at least 3 characters'),
  description: z.string().optional().default(''),
  surveyType: z.nativeEnum(SurveyType),
  isAnonymous: z.boolean().default(false),
  startDate: z.string().optional().default(''),
  endDate: z.string().optional().default(''),
  status: z.nativeEnum(SurveyStatus),
  targetAudience: z.string().default('ALL'),
});

type SurveyFormData = z.infer<typeof surveyFormSchema>;

export default function SurveysPage() {
  const {data: surveysResponse, isLoading, isError, refetch} = useAllSurveys();
  const surveys = surveysResponse?.content || [];

  const createMutation = useCreateSurvey();
  const updateMutation = useUpdateSurvey();
  const launchMutation = useLaunchSurvey();
  const completeMutation = useCompleteSurvey();
  const deleteMutation = useDeleteSurvey();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);

  // Form state with React Hook Form
  const {
    register,
    handleSubmit,
    reset,
    formState: {errors},
  } = useForm<SurveyFormData>({
    resolver: zodResolver(surveyFormSchema),
    defaultValues: {
      surveyCode: '',
      title: '',
      description: '',
      surveyType: SurveyType.ENGAGEMENT,
      isAnonymous: false,
      startDate: '',
      endDate: '',
      status: SurveyStatus.DRAFT,
      targetAudience: 'ALL',
    },
  });

  const handleCreateSurvey = () => {
    setEditingSurvey(null);
    reset({
      surveyCode: '',
      title: '',
      description: '',
      surveyType: SurveyType.ENGAGEMENT,
      isAnonymous: false,
      startDate: '',
      endDate: '',
      status: SurveyStatus.DRAFT,
      targetAudience: 'ALL',
    });
    setIsModalOpen(true);
  };

  const handleEditSurvey = (survey: Survey) => {
    setEditingSurvey(survey);
    reset({
      surveyCode: survey.surveyCode,
      title: survey.title,
      description: survey.description || '',
      surveyType: survey.surveyType,
      isAnonymous: survey.isAnonymous,
      startDate: survey.startDate?.split('T')[0] || '',
      endDate: survey.endDate?.split('T')[0] || '',
      status: survey.status,
      targetAudience: survey.targetAudience || 'ALL',
    });
    setIsModalOpen(true);
  };

  const handleViewSurvey = (survey: Survey) => {
    setSelectedSurvey(survey);
    setIsViewModalOpen(true);
  };

  const onSubmitSurvey = async (formData: SurveyFormData) => {
    const submitData: SurveyRequest = {
      ...formData,
      startDate: formData.startDate ? `${formData.startDate}T00:00:00` : undefined,
      endDate: formData.endDate ? `${formData.endDate}T23:59:59` : undefined,
    } as SurveyRequest;

    if (editingSurvey) {
      updateMutation.mutate({surveyId: editingSurvey.id, data: submitData});
    } else {
      createMutation.mutate(submitData);
    }
    setIsModalOpen(false);
  };

  const handleLaunchSurvey = (surveyId: string) => {
    launchMutation.mutate(surveyId);
  };

  const handlePauseSurvey = async (surveyId: string) => {
    // Pause uses updateStatus with PAUSED status
    const survey = surveys.find(s => s.id === surveyId);
    if (survey) {
      updateMutation.mutate({surveyId, data: {...survey, status: SurveyStatus.PAUSED} as SurveyRequest});
    }
  };

  const handleCompleteSurvey = (surveyId: string) => {
    completeMutation.mutate(surveyId);
  };

  const handleDeleteSurvey = (surveyId: string) => {
    setDeleteConfirmId(surveyId);
  };

  const filteredSurveys = surveys.filter((survey) => {
    const matchesSearch =
      survey.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      survey.surveyCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || survey.status === statusFilter;
    const matchesType = !typeFilter || survey.surveyType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Stats
  const stats = {
    total: surveys.length,
    active: surveys.filter((s) => s.status === SurveyStatus.ACTIVE).length,
    draft: surveys.filter((s) => s.status === SurveyStatus.DRAFT).length,
    completed: surveys.filter((s) => s.status === SurveyStatus.COMPLETED).length,
    totalResponses: surveys.reduce((sum, s) => sum + (s.totalResponses || 0), 0),
  };

  const breadcrumbs = [
    {label: 'Dashboard', href: '/dashboard'},
    {label: 'Surveys'},
  ];

  return (
    <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="surveys">
      <PageTransition className="space-y-6">
        {/* Header */}
        <Reveal className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2 max-w-2xl">
            <p className="text-aura-micro text-[var(--text-3)]">
              Employee Engagement
            </p>
            <h1 className="text-aura-title text-[var(--text-1)]">
              Employee Surveys
            </h1>
            <p className="text-body-secondary text-[var(--text-2)] max-w-[55ch]">
              Create and manage employee surveys and feedback collection
            </p>
          </div>
          <PermissionGate permission={Permissions.SURVEY_MANAGE}>
            <Button variant="primary" onClick={handleCreateSurvey}>
              <Plus className="mr-2 h-4 w-4"/>
              Create Survey
            </Button>
          </PermissionGate>
        </Reveal>

        {/* Stats Cards */}
        <Stagger className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-0 border-y border-[var(--border)] divide-x divide-[var(--border-soft)]">
          <StaggerItem className="px-5 py-6 sm:px-7 sm:py-8 first:pl-0 last:pr-0">
            <div className="flex items-center gap-2 text-[var(--text-3)]">
              <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="text-aura-micro">Total Surveys</span>
            </div>
            <p className="mt-3 num text-aura-stat text-[var(--text-1)]">{stats.total}</p>
          </StaggerItem>
          <StaggerItem className="px-5 py-6 sm:px-7 sm:py-8 first:pl-0 last:pr-0">
            <div className="flex items-center gap-2 text-[var(--text-3)]">
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="text-aura-micro">Active</span>
            </div>
            <p className="mt-3 num text-aura-stat text-[var(--ok-fg)]">{stats.active}</p>
          </StaggerItem>
          <StaggerItem className="px-5 py-6 sm:px-7 sm:py-8 first:pl-0 last:pr-0">
            <div className="flex items-center gap-2 text-[var(--text-3)]">
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="text-aura-micro">Drafts</span>
            </div>
            <p className="mt-3 num text-aura-stat text-[var(--text-1)]">{stats.draft}</p>
          </StaggerItem>
          <StaggerItem className="px-5 py-6 sm:px-7 sm:py-8 first:pl-0 last:pr-0">
            <div className="flex items-center gap-2 text-[var(--text-3)]">
              <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="text-aura-micro">Completed</span>
            </div>
            <p className="mt-3 num text-aura-stat text-[var(--text-1)]">{stats.completed}</p>
          </StaggerItem>
          <StaggerItem className="px-5 py-6 sm:px-7 sm:py-8 first:pl-0 last:pr-0">
            <div className="flex items-center gap-2 text-[var(--text-3)]">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="text-aura-micro">Responses</span>
            </div>
            <p className="mt-3 num text-aura-stat text-[var(--text-1)]">{stats.totalResponses}</p>
          </StaggerItem>
        </Stagger>

        {/* Filters */}
        <div className="border-y border-[var(--border)] py-4 px-0">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-3)]"/>
              <Input
                type="text"
                placeholder="Search surveys..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-40"
            >
              <option value="">All Status</option>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full sm:w-40"
            >
              <option value="">All Types</option>
              {surveyTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Surveys Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({length: 6}).map((_, i) => (
              <SkeletonCard key={i}/>
            ))}
          </div>
        ) : isError ? (
          <div
            className="p-6 rounded-aura-lg border border-[var(--err-bd)] bg-[var(--err-bg)] text-center">
            <AlertCircle className="h-8 w-8 text-[var(--err-fg)] mx-auto mb-2"/>
            <p className="text-sm text-[var(--err-fg)]">Failed to load surveys.</p>
            <button
              onClick={() => refetch()}
              className="mt-2 text-sm text-[var(--accent)] hover:underline cursor-pointer"
            >
              Try again
            </button>
          </div>
        ) : filteredSurveys.length === 0 ? (
          <div className="rounded-aura-lg border border-[var(--border-soft)] bg-[var(--surface)] p-12 text-center">
            <ClipboardList className="h-8 w-8 mx-auto mb-4 text-[var(--text-3)]"/>
            <h3 className="text-base font-semibold text-[var(--text-1)]">No surveys found</h3>
            <p className="mt-1 text-sm text-[var(--text-2)]">Create your first survey to collect employee feedback</p>
            <Button onClick={handleCreateSurvey} className="mt-4">
              <Plus className="mr-2 h-4 w-4"/>
              Create Survey
            </Button>
          </div>
        ) : (
          <Stagger className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredSurveys.map((survey) => (
              <StaggerItem key={survey.id}>
              <div className="rounded-aura-lg border border-[var(--border-soft)] bg-[var(--surface)] overflow-hidden h-full hover:border-[var(--border)] hover:shadow-[var(--sh-sm)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
                <div className="p-4 border-b border-[var(--border-soft)] bg-[var(--surface-aura-2)]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-caption num text-[var(--text-3)]">{survey.surveyCode}</p>
                      <h3 className="text-lg font-semibold text-[var(--text-1)] truncate">{survey.title}</h3>
                    </div>
                    <StatusBadge status={survey.status} domain={SURVEY_STATUS}/>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={survey.surveyType} domain={SURVEY_TYPE}/>
                    {survey.isAnonymous && (
                      <StatusBadge label="Anonymous" tone="neutral" iconHidden/>
                    )}
                  </div>

                  <p className="text-body-secondary line-clamp-2 text-[var(--text-2)]">
                    {survey.description || 'No description provided'}
                  </p>

                  <div className="space-y-2 text-sm">
                    {survey.startDate && (
                      <div className="flex items-center gap-2 text-[var(--text-2)]">
                        <Calendar className="h-4 w-4"/>
                        <span>
                          {formatDate(survey.startDate)}
                          {survey.endDate && ` - ${formatDate(survey.endDate)}`}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-[var(--text-2)]">
                      <Users className="h-4 w-4"/>
                      <span className="num">{survey.totalResponses || 0} responses</span>
                    </div>
                    <div className="flex items-center gap-2 text-[var(--text-2)]">
                      <BarChart3 className="h-4 w-4"/>
                      <span>Target: {survey.targetAudience || 'All Employees'}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--border)]">
                      <Button size="sm" variant="outline" onClick={() => handleViewSurvey(survey)}>
                        <Eye className="h-4 w-4"/>
                      </Button>
                      {survey.status === SurveyStatus.DRAFT && (
                        <PermissionGate permission={Permissions.SURVEY_MANAGE}>
                          <Button size="sm" variant="outline" onClick={() => handleLaunchSurvey(survey.id)}>
                            <Send className="h-4 w-4"/>
                          </Button>
                        </PermissionGate>
                      )}
                      {survey.status === SurveyStatus.ACTIVE && (
                        <>
                          <PermissionGate permission={Permissions.SURVEY_MANAGE}>
                            <Button size="sm" variant="outline" onClick={() => handlePauseSurvey(survey.id)}>
                              <Pause className="h-4 w-4"/>
                            </Button>
                          </PermissionGate>
                          <PermissionGate permission={Permissions.SURVEY_MANAGE}>
                            <Button size="sm" variant="outline" onClick={() => handleCompleteSurvey(survey.id)}>
                              <CheckCircle className="h-4 w-4"/>
                            </Button>
                          </PermissionGate>
                        </>
                      )}
                      {survey.status === SurveyStatus.PAUSED && (
                        <PermissionGate permission={Permissions.SURVEY_MANAGE}>
                          <Button size="sm" variant="outline" onClick={() => handleLaunchSurvey(survey.id)}>
                            <Play className="h-4 w-4"/>
                          </Button>
                        </PermissionGate>
                      )}
                      <PermissionGate permission={Permissions.SURVEY_MANAGE}>
                        <Button size="sm" variant="outline" onClick={() => handleEditSurvey(survey)}>
                          <Edit className="h-4 w-4"/>
                        </Button>
                      </PermissionGate>
                      <PermissionGate permission={Permissions.SURVEY_MANAGE}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20"
                          onClick={() => handleDeleteSurvey(survey.id)}
                        >
                          <Trash2 className="h-4 w-4"/>
                        </Button>
                      </PermissionGate>
                    </div>
                  </div>
                </div>
              </div>
              </StaggerItem>
            ))}
          </Stagger>
        )}

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={deleteConfirmId !== null}
          onClose={() => setDeleteConfirmId(null)}
          onConfirm={async () => {
            if (deleteConfirmId) {
              deleteMutation.mutate(deleteConfirmId);
              setDeleteConfirmId(null);
            }
          }}
          title="Delete Survey?"
          message="This action cannot be undone. The survey will be permanently deleted."
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
          loading={deleteMutation.isPending}
        />

        {/* Create/Edit Survey Modal */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="lg">
          <ModalHeader>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              {editingSurvey ? 'Edit Survey' : 'Create Survey'}
            </h2>
          </ModalHeader>
          <form onSubmit={handleSubmit(onSubmitSurvey)}>
            <ModalBody>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="survey-code" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Survey Code *
                  </label>
                  <Input
                    id="survey-code"
                    {...register('surveyCode')}
                    placeholder="e.g., SRV-2024-001"
                    className="input-aura"
                  />
                  {errors.surveyCode && (
                    <p className="mt-1 text-sm text-danger-600">{errors.surveyCode.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="survey-type" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Survey Type *
                  </label>
                  <Select
                    id="survey-type"
                    {...register('surveyType')}
                  >
                    {surveyTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                  {errors.surveyType && (
                    <p className="mt-1 text-sm text-danger-600">{errors.surveyType.message}</p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="survey-title" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Title *
                  </label>
                  <Input
                    id="survey-title"
                    {...register('title')}
                    placeholder="Enter survey title"
                    className="input-aura"
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-danger-600">{errors.title.message}</p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="survey-description" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Description
                  </label>
                  <Textarea
                    id="survey-description"
                    {...register('description')}
                    placeholder="Enter survey description"
                    rows={3}
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-danger-600">{errors.description.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="survey-start-date" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Start Date
                  </label>
                  <Input
                    id="survey-start-date"
                    type="date"
                    {...register('startDate')}
                  />
                  {errors.startDate && (
                    <p className="mt-1 text-sm text-danger-600">{errors.startDate.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="survey-end-date" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    End Date
                  </label>
                  <Input
                    id="survey-end-date"
                    type="date"
                    {...register('endDate')}
                  />
                  {errors.endDate && (
                    <p className="mt-1 text-sm text-danger-600">{errors.endDate.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="survey-target-audience" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Target Audience
                  </label>
                  <Select
                    id="survey-target-audience"
                    {...register('targetAudience')}
                  >
                    <option value="ALL">All Employees</option>
                    <option value="DEPARTMENT">By Department</option>
                    <option value="MANAGER">Managers Only</option>
                    <option value="NEW_HIRE">New Hires</option>
                  </Select>
                  {errors.targetAudience && (
                    <p className="mt-1 text-sm text-danger-600">{errors.targetAudience.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="survey-status" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Status
                  </label>
                  <Select
                    id="survey-status"
                    {...register('status')}
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                  {errors.status && (
                    <p className="mt-1 text-sm text-danger-600">{errors.status.message}</p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      {...register('isAnonymous')}
                      className="rounded border-[var(--border-main)] text-accent-700 focus:ring-accent-500"
                    />
                    <span className="text-sm font-medium text-[var(--text-secondary)]">
                      Anonymous Survey (responses will not be linked to employees)
                    </span>
                  </label>
                  {errors.isAnonymous && (
                    <p className="mt-1 text-sm text-danger-600">{errors.isAnonymous.message}</p>
                  )}
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingSurvey ? 'Update Survey' : 'Create Survey'}
              </Button>
            </ModalFooter>
          </form>
        </Modal>

        {/* View Survey Modal */}
        <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} size="lg">
          <ModalHeader>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              {selectedSurvey?.title}
            </h2>
          </ModalHeader>
          <ModalBody>
            {selectedSurvey && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[var(--text-muted)]">Survey Code:</span>
                    <p className="font-medium text-[var(--text-primary)]">{selectedSurvey.surveyCode}</p>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">Status:</span>
                    <p>
                      <StatusBadge status={selectedSurvey.status} domain={SURVEY_STATUS}/>
                    </p>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">Type:</span>
                    <p className="font-medium text-[var(--text-primary)]">{selectedSurvey.surveyType}</p>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">Anonymous:</span>
                    <p className="font-medium text-[var(--text-primary)]">
                      {selectedSurvey.isAnonymous ? 'Yes' : 'No'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">Start Date:</span>
                    <p className="font-medium text-[var(--text-primary)]">
                      {selectedSurvey.startDate
                        ? formatDate(selectedSurvey.startDate)
                        : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">End Date:</span>
                    <p className="font-medium text-[var(--text-primary)]">
                      {selectedSurvey.endDate
                        ? formatDate(selectedSurvey.endDate)
                        : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">Total Responses:</span>
                    <p className="font-medium text-[var(--text-primary)]">{selectedSurvey.totalResponses || 0}</p>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">Target Audience:</span>
                    <p className="font-medium text-[var(--text-primary)]">
                      {selectedSurvey.targetAudience || 'All Employees'}
                    </p>
                  </div>
                </div>

                {selectedSurvey.description && (
                  <div>
                    <h4 className="font-medium text-[var(--text-primary)] mb-2">Description</h4>
                    <p className="text-body-secondary">
                      {selectedSurvey.description}
                    </p>
                  </div>
                )}
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Close
            </Button>
            {selectedSurvey?.status === SurveyStatus.DRAFT && (
              <PermissionGate permission={Permissions.SURVEY_MANAGE}>
                <Button onClick={() => {
                  handleLaunchSurvey(selectedSurvey.id);
                  setIsViewModalOpen(false);
                }}>
                  <Send className="mr-2 h-4 w-4"/>
                  Launch Survey
                </Button>
              </PermissionGate>
            )}
          </ModalFooter>
        </Modal>
      </PageTransition>
    </AppLayout>
  );
}
