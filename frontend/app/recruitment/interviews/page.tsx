'use client';

import React, {Suspense, useEffect, useMemo, useRef, useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {notifications} from '@mantine/notifications';
import {AppLayout} from '@/components/layout';
import {Card, CardContent} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {
  CreateInterviewRequest,
  Interview,
  InterviewResult,
  InterviewStatus,
  InterviewType
} from '@/lib/types/hire/recruitment';
import {Employee} from '@/lib/types/hrms/employee';
import {CreateInterviewFormData, createInterviewSchema} from '@/lib/validations/recruitment';
import {
  useAllInterviews,
  useCandidates,
  useDeleteInterview,
  useGenerateInterviewQuestions,
  useInterviewsByCandidate,
  useJobOpenings,
  useScheduleInterview,
  useUpdateInterview
} from '@/lib/hooks/queries/useRecruitment';
import {useEmployees} from '@/lib/hooks/queries/useEmployees';
import {
  BehavioralQuestion,
  CulturalFitQuestion,
  InterviewQuestionsResponse,
  RoleSpecificQuestion,
  SituationalQuestion,
  TechnicalQuestion
} from '@/lib/types/hire/ai-recruitment';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  ChevronDown,
  Clock,
  Copy,
  Edit2,
  MapPin,
  Phone,
  Plus,
  Save,
  Search,
  Sparkles,
  Star,
  Trash2,
  User,
  Video,
  X
} from 'lucide-react';
import {getGoogleToken, hasValidGoogleToken} from '@/lib/utils/googleToken';

// ==================== Searchable Select Component ====================
interface SearchableSelectOption {
  value: string;
  label: string;
  subtitle?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  className?: string;
}

function SearchableSelect({
                            options,
                            value,
                            onChange,
                            placeholder = 'Search...',
                            error,
                            className
                          }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(o => o.value === value);

  const filtered = useMemo(() => {
    if (!search) return options;
    const lower = search.toLowerCase();
    return options.filter(
      o => o.label.toLowerCase().includes(lower) || o.subtitle?.toLowerCase().includes(lower)
    );
  }, [options, search]);

  const handleSelect = (val: string) => {
    onChange(val);
    setSearch('');
    setIsOpen(false);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    setSearch('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  // Close on click outside
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className || ''}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? search : (selectedOption?.label || '')}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={selectedOption ? selectedOption.label : placeholder}
          className="w-full px-4 py-2.5 pr-8 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
        />
        <ChevronDown
          className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)] pointer-events-none"/>
      </div>
      {isOpen && (
        <div
          className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto bg-[var(--bg-input)] border border-[var(--border-main)] rounded-xl shadow-[var(--shadow-dropdown)]">
          {filtered.length === 0 ? (
            <div className="px-4 py-2 text-body-muted">No results found</div>
          ) : (
            filtered.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-accent-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                  option.value === value ? 'bg-accent-50 text-accent-700' : 'text-[var(--text-primary)]'
                }`}
              >
                <div className="font-medium">{option.label}</div>
                {option.subtitle && (
                  <div className="text-caption">{option.subtitle}</div>
                )}
              </button>
            ))
          )}
        </div>
      )}
      {error && <p className="text-danger-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

// Loading fallback
function InterviewsPageLoading() {
  return (
    <AppLayout>
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-[var(--bg-secondary)] rounded w-1/4"/>
        <div className="h-64 bg-[var(--bg-secondary)] rounded"/>
      </div>
    </AppLayout>
  );
}

// Wrap with Suspense for useSearchParams
export default function InterviewsPageWrapper() {
  return (
    <Suspense fallback={<InterviewsPageLoading/>}>
      <InterviewsPage/>
    </Suspense>
  );
}

function InterviewsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const candidateIdFilter = searchParams.get('candidateId');
  const {hasAnyPermission, isReady} = usePermissions();

  const hasAccess = hasAnyPermission(
    Permissions.RECRUITMENT_VIEW,
    Permissions.RECRUITMENT_VIEW_ALL,
    Permissions.RECRUITMENT_MANAGE,
  );

  useEffect(() => {
    if (isReady && !hasAccess) {
      router.replace('/me/dashboard');
    }
  }, [isReady, hasAccess, router]);

  // Query hooks
  const {data: candidatesData} = useCandidates(0, 100);
  const {data: jobOpeningsData} = useJobOpenings(0, 100);
  const {data: employeesData} = useEmployees(0, 100);

  const scheduleInterviewMutation = useScheduleInterview();
  const updateInterviewMutation = useUpdateInterview();
  const deleteInterviewMutation = useDeleteInterview();
  const generateQuestionsMutation = useGenerateInterviewQuestions();

  // Interview data from React Query (replaces broken raw fetch)
  const allInterviewsQuery = useAllInterviews(0, 200);
  const candidateInterviewsQuery = useInterviewsByCandidate(candidateIdFilter || '', !!candidateIdFilter);

  const interviews: Interview[] = useMemo(() => {
    if (candidateIdFilter) {
      return candidateInterviewsQuery.data || [];
    }
    return allInterviewsQuery.data?.content || [];
  }, [candidateIdFilter, candidateInterviewsQuery.data, allInterviewsQuery.data]);

  // Local state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
  const [interviewToDelete, setInterviewToDelete] = useState<Interview | null>(null);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingInterview, setEditingInterview] = useState<Interview | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<InterviewQuestionsResponse | null>(null);
  const [createMeetToggle, setCreateMeetToggle] = useState(false);

  // React Hook Form for create/edit modal
  const {
    register: registerCreate,
    watch: watchCreate,
    setValue: setValueCreate,
    handleSubmit: handleSubmitCreate,
    reset: resetCreate,
    formState: {errors: errorsCreate},
  } = useForm<CreateInterviewFormData>({
    resolver: zodResolver(createInterviewSchema),
    mode: 'onBlur',
  });

  // React Hook Form for feedback modal
  const {
    register: registerFeedback,
    watch: watchFeedback,
    setValue: setValueFeedback,
    handleSubmit: handleSubmitFeedback,
    reset: resetFeedback,
    formState: {errors: errorsFeedback},
  } = useForm<CreateInterviewFormData>({
    resolver: zodResolver(createInterviewSchema),
    mode: 'onBlur',
  });

  if (!isReady || !hasAccess) return null;

  const candidates = candidatesData?.content || [];
  const jobOpenings = jobOpeningsData?.content || [];
  const interviewers = employeesData?.content || [];

  // Data is now loaded via React Query hooks above — no manual fetch needed

  const onSubmitCreate = async (data: CreateInterviewFormData) => {
    try {
      const googleToken = createMeetToggle ? getGoogleToken() : null;
      const submitData: CreateInterviewRequest = {
        candidateId: data.candidateId,
        jobOpeningId: data.jobOpeningId,
        interviewRound: data.interviewRound,
        interviewType: data.interviewType,
        scheduledAt: data.scheduledAt,
        durationMinutes: data.durationMinutes,
        interviewerId: data.interviewerId,
        location: data.location,
        meetingLink: data.meetingLink,
        status: data.status,
        feedback: data.feedback,
        rating: data.rating,
        result: data.result,
        notes: data.notes,
        createGoogleMeet: createMeetToggle && !!googleToken,
        googleAccessToken: googleToken || undefined,
      };

      if (editingInterview) {
        await updateInterviewMutation.mutateAsync({
          id: editingInterview.id,
          data: submitData,
        });
        notifications.show({
          title: 'Success',
          message: 'Interview updated successfully',
          color: 'green',
        });
      } else {
        await scheduleInterviewMutation.mutateAsync(submitData);
        notifications.show({
          title: 'Success',
          message: 'Interview scheduled successfully',
          color: 'green',
        });
      }
      setShowAddModal(false);
      resetCreate();
      setEditingInterview(null);
      setCreateMeetToggle(false);
      // React Query auto-refetches via invalidateQueries in the mutation hook
    } catch (_err) {
      notifications.show({
        title: 'Error',
        message: 'Failed to save interview',
        color: 'red',
      });
    }
  };

  const onSubmitFeedback = async (data: CreateInterviewFormData) => {
    if (!selectedInterview) return;
    try {
      const submitData: CreateInterviewRequest = {
        candidateId: data.candidateId,
        jobOpeningId: data.jobOpeningId,
        status: 'COMPLETED',
        feedback: data.feedback,
        rating: data.rating,
        result: data.result,
        notes: data.notes,
        interviewRound: data.interviewRound,
        interviewType: data.interviewType,
        scheduledAt: data.scheduledAt,
        durationMinutes: data.durationMinutes,
        interviewerId: data.interviewerId,
        location: data.location,
        meetingLink: data.meetingLink,
      };
      await updateInterviewMutation.mutateAsync({
        id: selectedInterview.id,
        data: submitData,
      });
      notifications.show({
        title: 'Success',
        message: 'Feedback submitted successfully',
        color: 'green',
      });
      setShowFeedbackModal(false);
      setSelectedInterview(null);
      resetFeedback();
      // React Query auto-refetches via invalidateQueries in the mutation hook
    } catch (_err) {
      notifications.show({
        title: 'Error',
        message: 'Failed to submit feedback',
        color: 'red',
      });
    }
  };

  const handleEdit = (interview: Interview) => {
    setEditingInterview(interview);
    const formValues: CreateInterviewFormData = {
      candidateId: interview.candidateId,
      jobOpeningId: interview.jobOpeningId,
      interviewRound: interview.interviewRound || 'SCREENING',
      interviewType: interview.interviewType || 'VIDEO',
      scheduledAt: interview.scheduledAt || '',
      durationMinutes: interview.durationMinutes || 60,
      interviewerId: interview.interviewerId,
      location: interview.location,
      meetingLink: interview.meetingLink,
      status: interview.status,
      feedback: interview.feedback,
      rating: interview.rating,
      result: interview.result || 'PENDING',
      notes: interview.notes,
    };
    resetCreate(formValues);
    setShowAddModal(true);
  };

  const handleProvideFeedback = (interview: Interview) => {
    setSelectedInterview(interview);
    const feedbackValues: CreateInterviewFormData = {
      candidateId: interview.candidateId,
      jobOpeningId: interview.jobOpeningId,
      interviewRound: interview.interviewRound || 'SCREENING',
      interviewType: interview.interviewType || 'VIDEO',
      scheduledAt: interview.scheduledAt || '',
      durationMinutes: interview.durationMinutes || 60,
      interviewerId: interview.interviewerId,
      location: interview.location,
      meetingLink: interview.meetingLink,
      status: 'COMPLETED',
      feedback: interview.feedback,
      rating: interview.rating,
      result: interview.result || 'PENDING',
      notes: interview.notes,
    };
    resetFeedback(feedbackValues);
    setShowFeedbackModal(true);
  };

  const handleDelete = async () => {
    if (!interviewToDelete) return;
    try {
      await deleteInterviewMutation.mutateAsync(interviewToDelete.id);
      notifications.show({
        title: 'Success',
        message: 'Interview deleted successfully',
        color: 'green',
      });
      setShowDeleteModal(false);
      setInterviewToDelete(null);
      // React Query auto-refetches via invalidateQueries in the mutation hook
    } catch (_err) {
      notifications.show({
        title: 'Error',
        message: 'Failed to delete interview',
        color: 'red',
      });
    }
  };

  const handleGenerateQuestions = async () => {
    const jobOpeningId = watchCreate('jobOpeningId');
    const candidateId = watchCreate('candidateId');

    if (!jobOpeningId || !candidateId) {
      notifications.show({
        title: 'Error',
        message: 'Please select both a job opening and candidate',
        color: 'red',
      });
      return;
    }

    try {
      const response = await generateQuestionsMutation.mutateAsync({
        jobOpeningId,
        candidateId,
      });
      setGeneratedQuestions(response);
      setShowQuestionsModal(true);
    } catch (_err) {
      notifications.show({
        title: 'Error',
        message: 'Failed to generate interview questions',
        color: 'red',
      });
    }
  };

  const handleCopyQuestions = () => {
    if (!generatedQuestions) return;

    const formatted = formatQuestionsForCopy(generatedQuestions);
    navigator.clipboard.writeText(formatted);
    notifications.show({
      title: 'Success',
      message: 'Questions copied to clipboard',
      color: 'green',
    });
  };

  const handleSaveQuestionsToNotes = () => {
    if (!generatedQuestions) return;

    const formatted = formatQuestionsForCopy(generatedQuestions);
    const currentNotes = watchCreate('notes') || '';
    const newNotes = currentNotes
      ? `${currentNotes}\n\n--- AI Generated Questions ---\n${formatted}`
      : `--- AI Generated Questions ---\n${formatted}`;

    setValueCreate('notes', newNotes);
    setShowQuestionsModal(false);
    notifications.show({
      title: 'Success',
      message: 'Questions added to interview notes',
      color: 'green',
    });
  };

  const formatQuestionsForCopy = (questions: InterviewQuestionsResponse): string => {
    let result = '';

    if (questions.technicalQuestions && questions.technicalQuestions.length > 0) {
      result += '## Technical Questions\n';
      questions.technicalQuestions.forEach((q: TechnicalQuestion) => {
        result += `\n- ${q.question}\n`;
        result += `  Difficulty: ${q.difficulty}\n`;
        if (q.purpose) result += `  Purpose: ${q.purpose}\n`;
      });
    }

    if (questions.behavioralQuestions && questions.behavioralQuestions.length > 0) {
      result += '\n\n## Behavioral Questions\n';
      questions.behavioralQuestions.forEach((q: BehavioralQuestion) => {
        result += `\n- ${q.question}\n`;
        result += `  Competency: ${q.competency}\n`;
      });
    }

    if (questions.situationalQuestions && questions.situationalQuestions.length > 0) {
      result += '\n\n## Situational Questions\n';
      questions.situationalQuestions.forEach((q: SituationalQuestion) => {
        result += `\n- ${q.question}\n`;
        result += `  Scenario: ${q.scenario}\n`;
      });
    }

    if (questions.culturalFitQuestions && questions.culturalFitQuestions.length > 0) {
      result += '\n\n## Cultural Fit Questions\n';
      questions.culturalFitQuestions.forEach((q: CulturalFitQuestion) => {
        result += `\n- ${q.question}\n`;
        result += `  Value: ${q.value}\n`;
      });
    }

    if (questions.roleSpecificQuestions && questions.roleSpecificQuestions.length > 0) {
      result += '\n\n## Role-Specific Questions\n';
      questions.roleSpecificQuestions.forEach((q: RoleSpecificQuestion) => {
        result += `\n- ${q.question}\n`;
        result += `  Focus: ${q.focus}\n`;
      });
    }

    return result;
  };

  const getStatusColor = (status: InterviewStatus): string => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-accent-100 text-accent-800';
      case 'RESCHEDULED':
        return 'bg-warning-100 text-warning-800';
      case 'COMPLETED':
        return 'bg-success-100 text-success-800';
      case 'CANCELLED':
        return 'bg-danger-100 text-danger-800';
      case 'NO_SHOW':
        return 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]';
      default:
        return 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]';
    }
  };

  const getResultColor = (result?: InterviewResult): string => {
    switch (result) {
      case 'SELECTED':
        return 'bg-success-100 text-success-800';
      case 'REJECTED':
        return 'bg-danger-100 text-danger-800';
      case 'ON_HOLD':
        return 'bg-warning-100 text-warning-800';
      case 'PENDING':
        return 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]';
      default:
        return 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]';
    }
  };

  const getTypeIcon = (type?: InterviewType): React.ReactNode => {
    switch (type) {
      case 'VIDEO':
        return <Video className="h-4 w-4"/>;
      case 'PHONE':
        return <Phone className="h-4 w-4"/>;
      case 'IN_PERSON':
        return <MapPin className="h-4 w-4"/>;
      default:
        return <Calendar className="h-4 w-4"/>;
    }
  };

  const filteredInterviews = interviews.filter(interview => {
    const matchesStatus = !statusFilter || interview.status === statusFilter;
    const matchesSearch = !searchQuery ||
      interview.candidateName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      interview.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = {
    total: interviews.length,
    scheduled: interviews.filter(i => i.status === 'SCHEDULED').length,
    completed: interviews.filter(i => i.status === 'COMPLETED').length,
    pending: interviews.filter(i => i.result === 'PENDING').length,
  };

  const formatDateTime = (dateString?: string): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AppLayout activeMenuItem="recruitment">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="row-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">Interviews</h1>
            <p className="text-[var(--text-secondary)] mt-1 skeuo-deboss">Schedule and manage candidate interviews</p>
          </div>
          <Button onClick={() => {
            resetCreate();
            setEditingInterview(null);
            setShowAddModal(true);
          }} className="flex items-center gap-2">
            <Plus className="h-4 w-4"/>
            Schedule Interview
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-[var(--bg-card)] skeuo-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent-50 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-accent-700"/>
                </div>
                <div>
                  <p className="text-body-muted">Total</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[var(--bg-card)] skeuo-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent-50 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-accent-600"/>
                </div>
                <div>
                  <p className="text-body-muted">Scheduled</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.scheduled}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[var(--bg-card)] skeuo-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-success-50 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-success-600"/>
                </div>
                <div>
                  <p className="text-body-muted">Completed</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[var(--bg-card)] skeuo-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-warning-50 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-warning-600"/>
                </div>
                <div>
                  <p className="text-body-muted">Pending Decision</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="bg-[var(--bg-card)]">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]"/>
                <input
                  type="text"
                  placeholder="Search interviews..."
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
                <option value="SCHEDULED">Scheduled</option>
                <option value="RESCHEDULED">Rescheduled</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="NO_SHOW">No Show</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Interviews List */}
        <Card className="bg-[var(--bg-card)]">
          <CardContent className="p-0">
            {filteredInterviews.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4"/>
                <p className="text-[var(--text-muted)]">No interviews found</p>
                <Button onClick={() => {
                  resetCreate();
                  setEditingInterview(null);
                  setShowAddModal(true);
                }} className="mt-4">
                  Schedule First Interview
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-aura">
                  <thead className="bg-[var(--bg-secondary)]/50">
                  <tr>
                    <th
                      className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Candidate
                    </th>
                    <th
                      className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Job
                    </th>
                    <th
                      className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Round
                    </th>
                    <th
                      className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Scheduled
                    </th>
                    <th
                      className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Interviewer
                    </th>
                    <th
                      className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Status
                    </th>
                    <th
                      className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Result
                    </th>
                    <th
                      className="px-6 py-2 text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Actions
                    </th>
                  </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-main)]">
                  {filteredInterviews.map((interview) => (
                    <tr key={interview.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div
                            className="flex-shrink-0 h-10 w-10 bg-accent-100 rounded-xl flex items-center justify-center">
                            <User className="h-5 w-5 text-accent-700"/>
                          </div>
                          <div className="ml-4">
                            <div
                              className="text-sm font-medium text-[var(--text-primary)]">{interview.candidateName || 'Unknown'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-body-secondary">
                        {interview.jobTitle || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(interview.interviewType)}
                          <span className="text-sm text-[var(--text-primary)]">
                              {interview.interviewRound?.replace(/_/g, ' ') || '-'}
                            </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div
                          className="text-sm text-[var(--text-primary)]">{formatDateTime(interview.scheduledAt)}</div>
                        <div className="text-caption">{interview.durationMinutes} min</div>
                      </td>
                      <td className="px-6 py-4 text-body-secondary">
                        <div>{interview.interviewerName || '-'}</div>
                        {(interview.googleMeetLink || interview.meetingLink) && (
                          <a
                            href={interview.googleMeetLink || interview.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-1 text-xs text-accent-600 hover:underline"
                          >
                            <Video className="h-3 w-3"/>
                            Join Meet
                          </a>
                        )}
                      </td>
                      <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(interview.status)}`}>
                            {interview.status}
                          </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {interview.result && (
                            <span
                              className={`px-2.5 py-1 text-xs font-medium rounded-full ${getResultColor(interview.result)}`}>
                                {interview.result}
                              </span>
                          )}
                          {interview.rating && (
                            <span className="flex items-center gap-1 text-sm text-warning-600">
                                <Star className="h-4 w-4 fill-current"/>
                              {interview.rating}/5
                              </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {interview.status === 'SCHEDULED' && (
                            <button
                              onClick={() => handleProvideFeedback(interview)}
                              className="p-2 text-[var(--text-muted)] hover:text-success-600 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                              title="Provide Feedback"
                              aria-label="Provide feedback"
                            >
                              <CheckCircle className="h-4 w-4"/>
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(interview)}
                            className="p-2 text-[var(--text-muted)] hover:text-accent-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                            title="Edit"
                            aria-label="Edit interview"
                          >
                            <Edit2 className="h-4 w-4"/>
                          </button>
                          <button
                            onClick={() => {
                              setInterviewToDelete(interview);
                              setShowDeleteModal(true);
                            }}
                            className="p-2 text-[var(--text-muted)] hover:text-danger-600 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                            title="Delete"
                            aria-label="Delete interview"
                          >
                            <Trash2 className="h-4 w-4"/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center p-4 z-50">
            <div
              className="bg-[var(--bg-card)] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[var(--border-main)] shadow-[var(--shadow-dropdown)]">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                    {editingInterview ? 'Edit Interview' : 'Schedule Interview'}
                  </h2>
                  <button onClick={() => {
                    setShowAddModal(false);
                    resetCreate();
                    setEditingInterview(null);
                  }} aria-label="Close modal"
                          className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
                    <X className="h-6 w-6"/>
                  </button>
                </div>

                <form onSubmit={handleSubmitCreate(onSubmitCreate)} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Candidate *</label>
                      <SearchableSelect
                        options={candidates.map(c => ({
                          value: c.id,
                          label: c.fullName,
                          subtitle: c.jobTitle || c.email
                        }))}
                        value={watchCreate('candidateId') || ''}
                        onChange={(val) => {
                          setValueCreate('candidateId', val);
                          const candidate = candidates.find(c => c.id === val);
                          if (candidate?.jobOpeningId) {
                            setValueCreate('jobOpeningId', candidate.jobOpeningId);
                          }
                        }}
                        placeholder="Search candidates..."
                        error={errorsCreate.candidateId?.message}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Job Opening
                        *</label>
                      <SearchableSelect
                        options={jobOpenings.map(j => ({
                          value: j.id,
                          label: j.jobTitle,
                          subtitle: j.departmentName || j.location
                        }))}
                        value={watchCreate('jobOpeningId') || ''}
                        onChange={(val) => setValueCreate('jobOpeningId', val)}
                        placeholder="Search job openings..."
                        error={errorsCreate.jobOpeningId?.message}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Interview
                        Round</label>
                      <select
                        {...registerCreate('interviewRound')}
                        className="input-aura"
                      >
                        <option value="SCREENING">Screening</option>
                        <option value="TECHNICAL_1">Technical 1</option>
                        <option value="TECHNICAL_2">Technical 2</option>
                        <option value="HR">HR</option>
                        <option value="MANAGERIAL">Managerial</option>
                        <option value="FINAL">Final</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Interview
                        Type</label>
                      <select
                        {...registerCreate('interviewType')}
                        className="input-aura"
                      >
                        <option value="VIDEO">Video Call</option>
                        <option value="PHONE">Phone</option>
                        <option value="IN_PERSON">In Person</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Scheduled Date &
                        Time *</label>
                      <input
                        type="datetime-local"
                        {...registerCreate('scheduledAt')}
                        className="input-aura"
                      />
                      {errorsCreate.scheduledAt &&
                        <p className="text-danger-500 text-xs mt-1">{errorsCreate.scheduledAt.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Duration
                        (minutes)</label>
                      <input
                        type="number"
                        min="15"
                        step="15"
                        {...registerCreate('durationMinutes')}
                        className="input-aura"
                      />
                      {errorsCreate.durationMinutes &&
                        <p className="text-danger-500 text-xs mt-1">{errorsCreate.durationMinutes.message}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Interviewer</label>
                    <SearchableSelect
                      options={interviewers.map((emp: Employee) => ({
                        value: emp.id,
                        label: emp.fullName,
                        subtitle: emp.designation || emp.departmentName
                      }))}
                      value={watchCreate('interviewerId') || ''}
                      onChange={(val) => setValueCreate('interviewerId', val)}
                      placeholder="Search interviewers..."
                    />
                  </div>

                  {/* Google Meet Toggle */}
                  {!editingInterview && (
                    <div
                      className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border-main)] bg-[var(--bg-secondary)]/50">
                      <div className="flex items-center gap-2 flex-1">
                        <Video className="h-5 w-5 text-accent-500"/>
                        <div>
                          <span
                            className="text-sm font-medium text-[var(--text-secondary)]">Auto-create Google Meet</span>
                          <p className="text-caption">
                            {hasValidGoogleToken()
                              ? 'Creates a Calendar event with Meet link automatically'
                              : 'Sign in with Google to enable Meet link generation'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (hasValidGoogleToken()) {
                            const newState = !createMeetToggle;
                            setCreateMeetToggle(newState);
                            // Auto-set duration to 60 minutes when enabling Meet and no duration is set
                            if (newState && !watchCreate('durationMinutes')) {
                              setValueCreate('durationMinutes', 60);
                            }
                          } else {
                            notifications.show({
                              title: 'Google Sign-in Required',
                              message: 'Please sign in with Google (with calendar permissions) to auto-create Meet links.',
                              color: 'yellow',
                            });
                          }
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                          createMeetToggle ? 'bg-accent-500' : 'bg-[var(--bg-secondary)]'
                        } ${!hasValidGoogleToken() ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={!hasValidGoogleToken()}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[var(--bg-card)] shadow ring-0 transition duration-200 ease-in-out ${
                            createMeetToggle ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  )}

                  {/* Time Slot Preview when Google Meet is enabled */}
                  {createMeetToggle && watchCreate('scheduledAt') && (
                    <div
                      className="px-4 py-2 rounded-lg bg-accent-50 border border-accent-200 text-xs text-accent-700 flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 flex-shrink-0"/>
                      <span>
                        Calendar event: {new Date(watchCreate('scheduledAt')).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                        {' — '}
                        {watchCreate('durationMinutes')
                          ? new Date(new Date(watchCreate('scheduledAt')).getTime() + (watchCreate('durationMinutes') as number) * 60000).toLocaleTimeString('en-IN', {timeStyle: 'short'})
                          : '(set duration)'}
                        {watchCreate('durationMinutes') ? ` (${watchCreate('durationMinutes')} min)` : ''}
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                        {createMeetToggle ? 'Meeting Link (auto-generated)' : 'Meeting Link'}
                      </label>
                      <input
                        type="url"
                        {...registerCreate('meetingLink')}
                        placeholder={createMeetToggle ? 'Will be auto-generated via Google Meet' : 'https://meet.google.com/...'}
                        disabled={createMeetToggle}
                        className={`w-full px-4 py-2.5 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 ${
                          createMeetToggle ? 'opacity-60 cursor-not-allowed' : ''
                        }`}
                      />
                      {errorsCreate.meetingLink &&
                        <p className="text-danger-500 text-xs mt-1">{errorsCreate.meetingLink.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Location</label>
                      <input
                        type="text"
                        {...registerCreate('location')}
                        placeholder="Conference Room A"
                        className="input-aura"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="row-between mb-1">
                      <label className="block text-sm font-medium text-[var(--text-secondary)]">Notes</label>
                      <button
                        type="button"
                        onClick={handleGenerateQuestions}
                        disabled={generateQuestionsMutation.isPending}
                        className="flex items-center gap-1 text-xs text-accent-700 hover:text-accent-700 disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                      >
                        <Sparkles className="h-3 w-3"/>
                        Generate AI Questions
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      {...registerCreate('notes')}
                      placeholder="Additional notes..."
                      className="input-aura"
                    />
                  </div>

                  <div className="flex gap-4 pt-4 border-t border-[var(--border-main)]">
                    <Button type="button" variant="outline" onClick={() => {
                      setShowAddModal(false);
                      resetCreate();
                      setEditingInterview(null);
                    }} className="flex-1">
                      Cancel
                    </Button>
                    <Button type="submit"
                            disabled={scheduleInterviewMutation.isPending || updateInterviewMutation.isPending}
                            className="flex-1">
                      {editingInterview ? 'Update Interview' : 'Schedule Interview'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Modal */}
        {showFeedbackModal && selectedInterview && (
          <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center p-4 z-50">
            <div
              className="bg-[var(--bg-card)] rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto border border-[var(--border-main)] shadow-[var(--shadow-dropdown)]">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-[var(--text-primary)]">Interview Feedback</h2>
                  <button onClick={() => {
                    setShowFeedbackModal(false);
                    setSelectedInterview(null);
                    resetFeedback();
                  }} aria-label="Close modal"
                          className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
                    <X className="h-6 w-6"/>
                  </button>
                </div>

                <div className="mb-4 p-4 bg-[var(--bg-secondary)] rounded-xl">
                  <p className="text-body-muted">Candidate</p>
                  <p className="font-medium text-[var(--text-primary)]">{selectedInterview.candidateName}</p>
                  <p
                    className="text-body-muted mt-1">{selectedInterview.interviewRound} - {formatDateTime(selectedInterview.scheduledAt)}</p>
                </div>

                <form onSubmit={handleSubmitFeedback(onSubmitFeedback)} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Rating (1-5)</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => setValueFeedback('rating', rating)}
                          className={`p-2 rounded-xl transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                            watchFeedback('rating') === rating
                              ? 'bg-warning-100 text-warning-600'
                              : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-warning-500'
                          }`}
                        >
                          <Star
                            className={`h-6 w-6 ${watchFeedback('rating') && watchFeedback('rating') >= rating ? 'fill-current' : ''}`}/>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Result</label>
                    <select
                      {...registerFeedback('result')}
                      className="input-aura"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="SELECTED">Selected</option>
                      <option value="REJECTED">Rejected</option>
                      <option value="ON_HOLD">On Hold</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Feedback *</label>
                    <textarea
                      rows={4}
                      {...registerFeedback('feedback')}
                      placeholder="Provide detailed feedback about the candidate's performance..."
                      className="input-aura"
                    />
                    {errorsFeedback.feedback &&
                      <p className="text-danger-500 text-xs mt-1">{errorsFeedback.feedback.message}</p>}
                  </div>

                  <div className="flex gap-4 pt-4 border-t border-[var(--border-main)]">
                    <Button type="button" variant="outline" onClick={() => {
                      setShowFeedbackModal(false);
                      setSelectedInterview(null);
                      resetFeedback();
                    }} className="flex-1">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateInterviewMutation.isPending} className="flex-1">
                      Submit Feedback
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {showDeleteModal && interviewToDelete && (
          <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center p-4 z-50">
            <div
              className="bg-[var(--bg-card)] rounded-lg max-w-md w-full p-6 border border-[var(--border-main)] shadow-[var(--shadow-dropdown)]">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-danger-100 flex items-center justify-center">
                  <Trash2 className="h-6 w-6 text-danger-600"/>
                </div>
                <h3 className="ml-4 text-lg font-medium text-[var(--text-primary)]">Delete Interview</h3>
              </div>
              <p className="text-body-muted mb-6">
                Are you sure you want to delete this interview for <strong
                className="text-[var(--text-secondary)]">{interviewToDelete.candidateName}</strong>? This action cannot
                be undone.
              </p>
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => {
                  setShowDeleteModal(false);
                  setInterviewToDelete(null);
                }} className="flex-1">
                  Cancel
                </Button>
                <Button variant="danger" onClick={handleDelete} disabled={deleteInterviewMutation.isPending}
                        className="flex-1">
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* AI Interview Questions Modal */}
        {showQuestionsModal && generatedQuestions && (
          <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center p-4 z-50">
            <div
              className="bg-[var(--bg-card)] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[var(--border-main)] shadow-[var(--shadow-dropdown)]">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-accent-500"/>
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">AI Interview Questions</h2>
                  </div>
                  <button onClick={() => {
                    setShowQuestionsModal(false);
                    setGeneratedQuestions(null);
                  }} aria-label="Close modal"
                          className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2">
                    <X className="h-6 w-6"/>
                  </button>
                </div>

                <div className="space-y-6 max-h-[calc(90vh-200px)] overflow-y-auto">
                  {/* Technical Questions */}
                  {generatedQuestions.technicalQuestions && generatedQuestions.technicalQuestions.length > 0 && (
                    <div>
                      <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Technical Questions</h3>
                      <div className="space-y-4">
                        {generatedQuestions.technicalQuestions.map((q: TechnicalQuestion, idx: number) => (
                          <div key={idx} className="p-4 bg-[var(--bg-secondary)] rounded-xl">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm text-[var(--text-primary)]">{q.question}</p>
                              <span className={`px-2 py-1 text-xs font-medium rounded whitespace-nowrap ${
                                q.difficulty === 'easy' ? 'bg-success-100 text-success-700' :
                                  q.difficulty === 'medium' ? 'bg-warning-100 text-warning-700' :
                                    'bg-danger-100 text-danger-700'
                              }`}>
                                {q.difficulty}
                              </span>
                            </div>
                            {q.purpose && <p className="text-caption mt-2">Purpose: {q.purpose}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Behavioral Questions */}
                  {generatedQuestions.behavioralQuestions && generatedQuestions.behavioralQuestions.length > 0 && (
                    <div>
                      <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Behavioral Questions</h3>
                      <div className="space-y-4">
                        {generatedQuestions.behavioralQuestions.map((q: BehavioralQuestion, idx: number) => (
                          <div key={idx} className="p-4 bg-[var(--bg-secondary)] rounded-xl">
                            <p className="text-sm text-[var(--text-primary)]">{q.question}</p>
                            <span className="text-caption mt-2 block">Competency: {q.competency}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Situational Questions */}
                  {generatedQuestions.situationalQuestions && generatedQuestions.situationalQuestions.length > 0 && (
                    <div>
                      <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Situational Questions</h3>
                      <div className="space-y-4">
                        {generatedQuestions.situationalQuestions.map((q: SituationalQuestion, idx: number) => (
                          <div key={idx} className="p-4 bg-[var(--bg-secondary)] rounded-xl">
                            <p className="text-sm text-[var(--text-primary)]">{q.question}</p>
                            <p className="text-caption mt-2">Scenario: {q.scenario}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cultural Fit Questions */}
                  {generatedQuestions.culturalFitQuestions && generatedQuestions.culturalFitQuestions.length > 0 && (
                    <div>
                      <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Cultural Fit Questions</h3>
                      <div className="space-y-4">
                        {generatedQuestions.culturalFitQuestions.map((q: CulturalFitQuestion, idx: number) => (
                          <div key={idx} className="p-4 bg-[var(--bg-secondary)] rounded-xl">
                            <p className="text-sm text-[var(--text-primary)]">{q.question}</p>
                            <span className="text-caption mt-2 block">Value: {q.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Role-Specific Questions */}
                  {generatedQuestions.roleSpecificQuestions && generatedQuestions.roleSpecificQuestions.length > 0 && (
                    <div>
                      <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Role-Specific Questions</h3>
                      <div className="space-y-4">
                        {generatedQuestions.roleSpecificQuestions.map((q: RoleSpecificQuestion, idx: number) => (
                          <div key={idx} className="p-4 bg-[var(--bg-secondary)] rounded-xl">
                            <p className="text-sm text-[var(--text-primary)]">{q.question}</p>
                            <span className="text-caption mt-2 block">Focus: {q.focus}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-4 pt-4 border-t border-[var(--border-main)] mt-6">
                  <Button type="button" variant="outline" onClick={() => {
                    setShowQuestionsModal(false);
                    setGeneratedQuestions(null);
                  }} className="flex-1">
                    Close
                  </Button>
                  <Button type="button" onClick={handleCopyQuestions}
                          className="flex-1 flex items-center justify-center gap-2">
                    <Copy className="h-4 w-4"/>
                    Copy All
                  </Button>
                  <Button type="button" onClick={handleSaveQuestionsToNotes}
                          className="flex-1 flex items-center justify-center gap-2">
                    <Save className="h-4 w-4"/>
                    Save to Notes
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
