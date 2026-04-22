'use client';

import {useState} from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  ClipboardCheck,
  Clock,
  Eye,
  Pencil,
  Play,
  Plus,
  Share2,
  Square,
  Star,
  Trash2,
  Users,
} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {
  CycleRequest,
  Feedback360Cycle,
  Feedback360Request,
  FeedbackResponse,
} from '@/lib/services/grow/feedback360.service';
import {
  useActivateFeedback360Cycle,
  useActiveFeedback360Cycles,
  useCloseFeedback360Cycle,
  useCreateFeedback360Cycle,
  useDeleteFeedback360Cycle,
  useMyFeedback360Summaries,
  useMyPending360Reviews,
  useShareFeedback360Summary,
  useSubmitFeedback360Response,
} from '@/lib/hooks/queries/usePerformance';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {createLogger} from '@/lib/utils/logger';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';

const log = createLogger('FeedbackPage');


const getStatusColor = (status: string) => {
  switch (status) {
    case 'DRAFT':
      return 'bg-[var(--bg-surface)] text-[var(--text-primary)]';
    case 'ACTIVE':
    case 'IN_PROGRESS':
      return 'bg-accent-100 text-accent-800';
    case 'NOMINATION':
      return 'bg-warning-100 text-warning-800';
    case 'COMPLETED':
      return 'bg-success-100 text-success-800';
    case 'CLOSED':
      return 'bg-[var(--bg-surface)] text-[var(--text-muted)]';
    default:
      return 'bg-[var(--bg-surface)] text-[var(--text-primary)]';
  }
};

const getRequestStatusIcon = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return <CheckCircle className='h-5 w-5 text-status-success-text'/>;
    case 'IN_PROGRESS':
      return <Clock className='h-5 w-5 text-accent'/>;
    case 'DECLINED':
      return <AlertTriangle className='h-5 w-5 text-status-danger-text'/>;
    default:
      return <Clock className="h-5 w-5 text-[var(--text-muted)]"/>;
  }
};

const RatingStars = ({rating, onChange}: { rating: number; onChange?: (r: number) => void }) => {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          disabled={!onChange}
          className={`${onChange ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
        >
          <Star
            className={`h-5 w-5 ${
              star <= rating ? 'fill-warning-400 text-warning-400' : 'text-[var(--text-muted)]'
            }`}
          />
        </button>
      ))}
    </div>
  );
};

export default function Feedback360Page() {
  const [activeTab, setActiveTab] = useState<'cycles' | 'pending' | 'summaries'>('cycles');

  // React Query hooks
  const {data: cyclesData, isLoading: cyclesLoading} = useActiveFeedback360Cycles();
  const {data: pendingData, isLoading: pendingLoading} = useMyPending360Reviews();
  const {data: summariesData, isLoading: summariesLoading} = useMyFeedback360Summaries();

  // Mutation hooks
  const createCycleMutation = useCreateFeedback360Cycle();
  const activateCycleMutation = useActivateFeedback360Cycle();
  const closeCycleMutation = useCloseFeedback360Cycle();
  const deleteCycleMutation = useDeleteFeedback360Cycle();
  const submitResponseMutation = useSubmitFeedback360Response();
  const shareSummaryMutation = useShareFeedback360Summary();

  const cycles = cyclesData || [];
  const pendingReviews = pendingData || [];
  const summaries = summariesData || [];
  const loading = cyclesLoading || pendingLoading || summariesLoading;
  const [error, setError] = useState<string | null>(null);

  const [showCycleModal, setShowCycleModal] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [, setEditingCycle] = useState<Feedback360Cycle | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<Feedback360Request | null>(null);
  const [activateConfirm, setActivateConfirm] = useState<string | null>(null);
  const [closeConfirm, setCloseConfirm] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [shareConfirm, setShareConfirm] = useState<string | null>(null);

  const [cycleForm, setCycleForm] = useState<CycleRequest>({
    name: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    minPeersRequired: 3,
    maxPeersAllowed: 5,
    isAnonymous: true,
    includeSelfReview: true,
    includeManagerReview: true,
    includePeerReview: true,
    includeUpwardReview: false,
  });

  const [responseForm, setResponseForm] = useState<FeedbackResponse>({
    requestId: '',
    isDraft: false,
    overallRating: 0,
    communicationRating: 0,
    teamworkRating: 0,
    leadershipRating: 0,
    problemSolvingRating: 0,
    technicalSkillsRating: 0,
    strengths: '',
    areasForImprovement: '',
    additionalComments: '',
  });


  const handleCreateCycle = async () => {
    try {
      await createCycleMutation.mutateAsync(cycleForm);
      setShowCycleModal(false);
      resetCycleForm();
    } catch (err) {
      log.error('Error creating cycle:', err);
      setError('Failed to create cycle');
    }
  };

  const handleActivateCycle = async (id: string) => {
    try {
      await activateCycleMutation.mutateAsync(id);
    } catch (err) {
      log.error('Error activating cycle:', err);
      setError('Failed to activate cycle');
    }
  };

  const handleCloseCycle = async (id: string) => {
    try {
      await closeCycleMutation.mutateAsync(id);
    } catch (err) {
      log.error('Error closing cycle:', err);
      setError('Failed to close cycle');
    }
  };

  const handleDeleteCycle = async (id: string) => {
    try {
      await deleteCycleMutation.mutateAsync(id);
    } catch (err) {
      log.error('Error deleting cycle:', err);
      setError('Failed to delete cycle');
    }
  };

  const handleSubmitResponse = async (isDraft: boolean = false) => {
    try {
      await submitResponseMutation.mutateAsync({
        ...responseForm,
        isDraft,
      });
      setShowResponseModal(false);
      setSelectedRequest(null);
      resetResponseForm();
    } catch (err) {
      log.error('Error submitting response:', err);
      setError('Failed to submit response');
    }
  };

  const handleShareSummary = async (summaryId: string) => {
    try {
      await shareSummaryMutation.mutateAsync(summaryId);
    } catch (err) {
      log.error('Error sharing summary:', err);
      setError('Failed to share summary');
    }
  };

  const resetCycleForm = () => {
    setCycleForm({
      name: '',
      description: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      minPeersRequired: 3,
      maxPeersAllowed: 5,
      isAnonymous: true,
      includeSelfReview: true,
      includeManagerReview: true,
      includePeerReview: true,
      includeUpwardReview: false,
    });
    setEditingCycle(null);
  };

  const resetResponseForm = () => {
    setResponseForm({
      requestId: '',
      isDraft: false,
      overallRating: 0,
      communicationRating: 0,
      teamworkRating: 0,
      leadershipRating: 0,
      problemSolvingRating: 0,
      technicalSkillsRating: 0,
      strengths: '',
      areasForImprovement: '',
      additionalComments: '',
    });
  };

  const openResponseModal = (request: Feedback360Request) => {
    setSelectedRequest(request);
    setResponseForm({
      ...responseForm,
      requestId: request.id,
    });
    setShowResponseModal(true);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-primary)]'></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">360-Degree Feedback</h1>
            <p className="text-body-muted mt-1">
              Multi-rater feedback and performance assessment
            </p>
          </div>
          {activeTab === 'cycles' && (
            <PermissionGate permission={Permissions.FEEDBACK_360_CREATE}>
              <button
                onClick={() => {
                  resetCycleForm();
                  setShowCycleModal(true);
                }}
                className='inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-[var(--shadow-card)] text-sm font-medium text-inverse bg-accent hover:bg-accent'
              >
                <Plus className="h-5 w-5 mr-2"/>
                New Cycle
              </button>
            </PermissionGate>
          )}
        </div>

        {error && (
          <div className='mb-4 p-4 bg-status-danger-bg border border-status-danger-border rounded-md'>
            <p className='text-sm text-status-danger-text'>{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-[var(--border-main)] mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('cycles')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'cycles'
                  ? 'border-accent-500 text-accent-600'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
              }`}
            >
              <Users className="h-5 w-5"/>
              Feedback Cycles ({cycles.length})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'pending'
                  ? 'border-accent-500 text-accent-600'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
              }`}
            >
              <ClipboardCheck className="h-5 w-5"/>
              Pending Reviews ({pendingReviews.length})
              {pendingReviews.length > 0 && (
                <span
                  className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-status-danger-bg text-status-danger-text'>
                {pendingReviews.length}
              </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('summaries')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'summaries'
                  ? 'border-accent-500 text-accent-600'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
              }`}
            >
              <BarChart3 className="h-5 w-5"/>
              My Results ({summaries.length})
            </button>
          </nav>
        </div>

        {/* Cycles Tab */}
        {activeTab === 'cycles' && (
          <div className="space-y-4">
            {cycles.length === 0 ? (
              <div className="text-center py-12 bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)]">
                <Users className="mx-auto h-12 w-12 text-[var(--text-muted)]"/>
                <h3 className="mt-2 text-sm font-medium text-[var(--text-primary)]">No feedback cycles</h3>
                <p className="mt-1 text-body-muted">
                  Create a new 360-degree feedback cycle to get started.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {cycles.map((cycle) => (
                  <div
                    key={cycle.id}
                    className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)] shadow-[var(--shadow-card)] p-6"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-medium text-[var(--text-primary)]">{cycle.name}</h3>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          cycle.status
                        )}`}
                      >
                      {cycle.status}
                    </span>
                    </div>
                    {cycle.description && (
                      <p className="text-body-muted mb-4 line-clamp-2">
                        {cycle.description}
                      </p>
                    )}
                    <div className="space-y-2 text-caption mb-4">
                      <div className="flex justify-between">
                        <span>Period:</span>
                        <span>
                        {new Date(cycle.startDate).toLocaleDateString()} -{' '}
                          {new Date(cycle.endDate).toLocaleDateString()}
                      </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Peer reviewers:</span>
                        <span>
                        {cycle.minPeersRequired} - {cycle.maxPeersAllowed}
                      </span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {cycle.includeSelfReview && (
                          <span className="px-2 py-0.5 bg-[var(--bg-surface)] rounded text-xs">Self</span>
                        )}
                        {cycle.includeManagerReview && (
                          <span className="px-2 py-0.5 bg-[var(--bg-surface)] rounded text-xs">Manager</span>
                        )}
                        {cycle.includePeerReview && (
                          <span className="px-2 py-0.5 bg-[var(--bg-surface)] rounded text-xs">Peer</span>
                        )}
                        {cycle.includeUpwardReview && (
                          <span className="px-2 py-0.5 bg-[var(--bg-surface)] rounded text-xs">Upward</span>
                        )}
                        {cycle.isAnonymous && (
                          <span className='px-2 py-0.5 bg-accent-subtle text-accent rounded text-xs'>
                          Anonymous
                        </span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-subtle)]">
                      {cycle.status === 'DRAFT' && (
                        <>
                          <PermissionGate permission={Permissions.FEEDBACK_360_MANAGE}>
                            <button
                              onClick={() => setActivateConfirm(cycle.id)}
                              className='p-2 text-status-success-text hover:bg-status-success-bg rounded'
                              title="Activate"
                            >
                              <Play className="h-5 w-5"/>
                            </button>
                          </PermissionGate>
                          <PermissionGate permission={Permissions.FEEDBACK_360_MANAGE}>
                            <button
                              onClick={() => setDeleteConfirm(cycle.id)}
                              className='p-2 text-status-danger-text hover:bg-status-danger-bg rounded'
                              title="Delete"
                            >
                              <Trash2 className="h-5 w-5"/>
                            </button>
                          </PermissionGate>
                        </>
                      )}
                      {(cycle.status === 'ACTIVE' || cycle.status === 'IN_PROGRESS') && (
                        <PermissionGate permission={Permissions.FEEDBACK_360_MANAGE}>
                          <button
                            onClick={() => setCloseConfirm(cycle.id)}
                            className="p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] rounded"
                            title="Close"
                          >
                            <Square className="h-5 w-5"/>
                          </button>
                        </PermissionGate>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pending Reviews Tab */}
        {activeTab === 'pending' && (
          <div className="space-y-4">
            {pendingReviews.length === 0 ? (
              <div className="text-center py-12 bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)]">
                <CheckCircle className='mx-auto h-12 w-12 text-status-success-text'/>
                <h3 className="mt-2 text-sm font-medium text-[var(--text-primary)]">All caught up!</h3>
                <p className="mt-1 text-body-muted">
                  You have no pending feedback reviews.
                </p>
              </div>
            ) : (
              <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)]">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-[var(--border-main)]">
                    <thead className="bg-[var(--bg-surface)]">
                    <tr>
                      <th
                        className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                        Subject
                      </th>
                      <th
                        className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                        Review Type
                      </th>
                      <th
                        className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                        Status
                      </th>
                      <th
                        className="px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                        Created
                      </th>
                      <th
                        className="px-6 py-2 text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                    </thead>
                    <tbody className="bg-[var(--bg-card)] divide-y divide-[var(--border-main)]">
                    {pendingReviews.map((request) => (
                      <tr key={request.id} className="hover:bg-[var(--bg-surface)]">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-[var(--text-primary)]">
                            Employee #{request.subjectEmployeeId.slice(0, 8)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent-subtle text-accent'>
                            {request.reviewerType}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getRequestStatusIcon(request.status)}
                            <span className="text-body-muted">{request.status}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-body-muted">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <PermissionGate permission={Permissions.FEEDBACK_360_SUBMIT}>
                            <button
                              onClick={() => openResponseModal(request)}
                              className='inline-flex items-center px-4 py-1.5 border border-transparent text-sm font-medium rounded text-inverse bg-accent hover:bg-accent'
                            >
                              <Pencil className="h-4 w-4 mr-1"/>
                              Provide Feedback
                            </button>
                          </PermissionGate>
                        </td>
                      </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Summaries Tab */}
        {activeTab === 'summaries' && (
          <div className="space-y-4">
            {summaries.length === 0 ? (
              <div className="text-center py-12 bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)]">
                <BarChart3 className="mx-auto h-12 w-12 text-[var(--text-muted)]"/>
                <h3 className="mt-2 text-sm font-medium text-[var(--text-primary)]">No results yet</h3>
                <p className="mt-1 text-body-muted">
                  Your feedback summaries will appear here once reviews are complete.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {summaries.map((summary) => (
                  <div
                    key={summary.id}
                    className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)] shadow-[var(--shadow-card)] p-6"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-[var(--text-primary)]">
                          Feedback Summary
                        </h3>
                        <p className="text-body-muted">
                          Cycle: {summary.cycleId.slice(0, 8)}
                        </p>
                      </div>
                      {summary.finalRating && (
                        <div className="text-right">
                          <div className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">
                            {summary.finalRating.toFixed(1)}
                          </div>
                          <RatingStars rating={Math.round(summary.finalRating)}/>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Responses:</span>
                        <span className="font-medium">
                        {summary.responsesReceived}/{summary.totalReviewers}
                      </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Self Review:</span>
                        <span className="font-medium">
                        {summary.selfReviewCompleted ? (
                          <CheckCircle className='h-5 w-5 text-status-success-text inline'/>
                        ) : (
                          <Clock className="h-5 w-5 text-[var(--text-muted)] inline"/>
                        )}
                      </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Manager Review:</span>
                        <span className="font-medium">
                        {summary.managerReviewCompleted ? (
                          <CheckCircle className='h-5 w-5 text-status-success-text inline'/>
                        ) : (
                          <Clock className="h-5 w-5 text-[var(--text-muted)] inline"/>
                        )}
                      </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Peer Reviews:</span>
                        <span className="font-medium">{summary.peerReviewsCompleted}</span>
                      </div>
                    </div>

                    {/* Competency Ratings */}
                    {(summary.avgCommunication || summary.avgTeamwork || summary.avgLeadership) && (
                      <div className="space-y-2 border-t border-[var(--border-subtle)] pt-4 mb-4">
                        <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase">
                          Competency Ratings
                        </h4>
                        {summary.avgCommunication && (
                          <div className="flex justify-between items-center">
                            <span className="text-body-secondary">Communication</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                                <div
                                  className='h-full bg-accent'
                                  style={{width: `${(summary.avgCommunication / 5) * 100}%`}}
                                />
                              </div>
                              <span className="text-sm font-medium">
                              {summary.avgCommunication.toFixed(1)}
                            </span>
                            </div>
                          </div>
                        )}
                        {summary.avgTeamwork && (
                          <div className="flex justify-between items-center">
                            <span className="text-body-secondary">Teamwork</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                                <div
                                  className='h-full bg-status-success-bg'
                                  style={{width: `${(summary.avgTeamwork / 5) * 100}%`}}
                                />
                              </div>
                              <span className="text-sm font-medium">
                              {summary.avgTeamwork.toFixed(1)}
                            </span>
                            </div>
                          </div>
                        )}
                        {summary.avgLeadership && (
                          <div className="flex justify-between items-center">
                            <span className="text-body-secondary">Leadership</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                                <div
                                  className='h-full bg-accent'
                                  style={{width: `${(summary.avgLeadership / 5) * 100}%`}}
                                />
                              </div>
                              <span className="text-sm font-medium">
                              {summary.avgLeadership.toFixed(1)}
                            </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Strengths & Improvements */}
                    {(summary.consolidatedStrengths || summary.consolidatedImprovements) && (
                      <div className="space-y-4 border-t border-[var(--border-subtle)] pt-4">
                        {summary.consolidatedStrengths && (
                          <div>
                            <h4 className='text-xs font-medium text-status-success-text mb-1'>Strengths</h4>
                            <p className="text-body-secondary line-clamp-2">
                              {summary.consolidatedStrengths}
                            </p>
                          </div>
                        )}
                        {summary.consolidatedImprovements && (
                          <div>
                            <h4 className='text-xs font-medium text-status-warning-text mb-1'>
                              Areas for Improvement
                            </h4>
                            <p className="text-body-secondary line-clamp-2">
                              {summary.consolidatedImprovements}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-subtle)] mt-4">
                      <button
                        className="inline-flex items-center px-4 py-1.5 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-strong)] rounded hover:bg-[var(--bg-surface)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                      >
                        <Eye className="h-4 w-4 mr-1"/>
                        View Details
                      </button>
                      {!summary.sharedWithEmployee && (
                        <PermissionGate permission={Permissions.FEEDBACK_360_MANAGE}>
                          <button
                            onClick={() => setShareConfirm(summary.id)}
                            className='inline-flex items-center px-4 py-1.5 text-sm font-medium text-inverse bg-accent rounded hover:bg-accent'
                          >
                            <Share2 className="h-4 w-4 mr-1"/>
                            Share
                          </button>
                        </PermissionGate>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Cycle Modal */}
        {showCycleModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div
              className="bg-[var(--bg-elevated)] rounded-lg shadow-[var(--shadow-dropdown)] max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-[var(--border-main)]">
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                  Create 360 Feedback Cycle
                </h2>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Cycle Name *
                  </label>
                  <input
                    type="text"
                    value={cycleForm.name}
                    onChange={(e) => setCycleForm({...cycleForm, name: e.target.value})}
                    className="w-full px-4 py-2 border border-[var(--border-strong)] rounded-md"
                    placeholder="Q4 2024 Performance Review"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Description
                  </label>
                  <textarea
                    value={cycleForm.description}
                    onChange={(e) => setCycleForm({...cycleForm, description: e.target.value})}
                    className="w-full px-4 py-2 border border-[var(--border-strong)] rounded-md"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={cycleForm.startDate}
                      onChange={(e) => setCycleForm({...cycleForm, startDate: e.target.value})}
                      className="w-full px-4 py-2 border border-[var(--border-strong)] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={cycleForm.endDate}
                      onChange={(e) => setCycleForm({...cycleForm, endDate: e.target.value})}
                      className="w-full px-4 py-2 border border-[var(--border-strong)] rounded-md"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                      Nomination Deadline
                    </label>
                    <input
                      type="date"
                      value={cycleForm.nominationDeadline || ''}
                      onChange={(e) =>
                        setCycleForm({...cycleForm, nominationDeadline: e.target.value})
                      }
                      className="w-full px-4 py-2 border border-[var(--border-strong)] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                      Self Review Deadline
                    </label>
                    <input
                      type="date"
                      value={cycleForm.selfReviewDeadline || ''}
                      onChange={(e) =>
                        setCycleForm({...cycleForm, selfReviewDeadline: e.target.value})
                      }
                      className="w-full px-4 py-2 border border-[var(--border-strong)] rounded-md"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                      Peer Review Deadline
                    </label>
                    <input
                      type="date"
                      value={cycleForm.peerReviewDeadline || ''}
                      onChange={(e) =>
                        setCycleForm({...cycleForm, peerReviewDeadline: e.target.value})
                      }
                      className="w-full px-4 py-2 border border-[var(--border-strong)] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                      Manager Review Deadline
                    </label>
                    <input
                      type="date"
                      value={cycleForm.managerReviewDeadline || ''}
                      onChange={(e) =>
                        setCycleForm({...cycleForm, managerReviewDeadline: e.target.value})
                      }
                      className="w-full px-4 py-2 border border-[var(--border-strong)] rounded-md"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                      Min Peer Reviewers
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={cycleForm.minPeersRequired}
                      onChange={(e) =>
                        setCycleForm({...cycleForm, minPeersRequired: parseInt(e.target.value)})
                      }
                      className="w-full px-4 py-2 border border-[var(--border-strong)] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                      Max Peer Reviewers
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={cycleForm.maxPeersAllowed}
                      onChange={(e) =>
                        setCycleForm({...cycleForm, maxPeersAllowed: parseInt(e.target.value)})
                      }
                      className="w-full px-4 py-2 border border-[var(--border-strong)] rounded-md"
                    />
                  </div>
                </div>
                <div className="space-y-4 border-t border-[var(--border-main)] pt-4">
                  <h4 className="text-sm font-medium text-[var(--text-primary)]">Review Types</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={cycleForm.includeSelfReview}
                        onChange={(e) =>
                          setCycleForm({...cycleForm, includeSelfReview: e.target.checked})
                        }
                        className='h-4 w-4 text-accent border-[var(--border-strong)] rounded'
                      />
                      <span className="ml-2 text-sm text-[var(--text-primary)]">Self Review</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={cycleForm.includeManagerReview}
                        onChange={(e) =>
                          setCycleForm({...cycleForm, includeManagerReview: e.target.checked})
                        }
                        className='h-4 w-4 text-accent border-[var(--border-strong)] rounded'
                      />
                      <span className="ml-2 text-sm text-[var(--text-primary)]">Manager Review</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={cycleForm.includePeerReview}
                        onChange={(e) =>
                          setCycleForm({...cycleForm, includePeerReview: e.target.checked})
                        }
                        className='h-4 w-4 text-accent border-[var(--border-strong)] rounded'
                      />
                      <span className="ml-2 text-sm text-[var(--text-primary)]">Peer Review</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={cycleForm.includeUpwardReview}
                        onChange={(e) =>
                          setCycleForm({...cycleForm, includeUpwardReview: e.target.checked})
                        }
                        className='h-4 w-4 text-accent border-[var(--border-strong)] rounded'
                      />
                      <span className="ml-2 text-sm text-[var(--text-primary)]">Upward Review</span>
                    </label>
                  </div>
                  <label className="flex items-center mt-2">
                    <input
                      type="checkbox"
                      checked={cycleForm.isAnonymous}
                      onChange={(e) =>
                        setCycleForm({...cycleForm, isAnonymous: e.target.checked})
                      }
                      className='h-4 w-4 text-accent border-[var(--border-strong)] rounded'
                    />
                    <span className="ml-2 text-sm text-[var(--text-primary)]">
                    Anonymous peer feedback
                  </span>
                  </label>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-[var(--border-main)] flex justify-end gap-4">
                <button
                  onClick={() => {
                    setShowCycleModal(false);
                    resetCycleForm();
                  }}
                  className="px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-md hover:bg-[var(--bg-surface)]"
                >
                  Cancel
                </button>
                <PermissionGate permission={Permissions.FEEDBACK_360_CREATE}>
                  <button
                    onClick={handleCreateCycle}
                    disabled={!cycleForm.name || !cycleForm.startDate || !cycleForm.endDate}
                    className='px-4 py-2 text-sm font-medium text-inverse bg-accent rounded-md hover:bg-accent disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
                  >
                    Create Cycle
                  </button>
                </PermissionGate>
              </div>
            </div>
          </div>
        )}

        {/* Submit Response Modal */}
        {showResponseModal && selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div
              className="bg-[var(--bg-elevated)] rounded-lg shadow-[var(--shadow-dropdown)] max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-[var(--border-main)]">
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">Provide Feedback</h2>
                <p className="text-body-muted mt-1">
                  {selectedRequest.reviewerType} review for Employee #
                  {selectedRequest.subjectEmployeeId.slice(0, 8)}
                </p>
              </div>
              <div className="px-6 py-4 space-y-6">
                {/* Rating Categories */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-[var(--text-primary)]">Competency Ratings</h3>
                  <div className="grid gap-4">
                    <div className="flex justify-between items-center">
                      <label className="text-body-secondary">Overall Performance</label>
                      <RatingStars
                        rating={responseForm.overallRating || 0}
                        onChange={(r) => setResponseForm({...responseForm, overallRating: r})}
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <label className="text-body-secondary">Communication</label>
                      <RatingStars
                        rating={responseForm.communicationRating || 0}
                        onChange={(r) =>
                          setResponseForm({...responseForm, communicationRating: r})
                        }
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <label className="text-body-secondary">Teamwork</label>
                      <RatingStars
                        rating={responseForm.teamworkRating || 0}
                        onChange={(r) => setResponseForm({...responseForm, teamworkRating: r})}
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <label className="text-body-secondary">Leadership</label>
                      <RatingStars
                        rating={responseForm.leadershipRating || 0}
                        onChange={(r) =>
                          setResponseForm({...responseForm, leadershipRating: r})
                        }
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <label className="text-body-secondary">Problem Solving</label>
                      <RatingStars
                        rating={responseForm.problemSolvingRating || 0}
                        onChange={(r) =>
                          setResponseForm({...responseForm, problemSolvingRating: r})
                        }
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <label className="text-body-secondary">Technical Skills</label>
                      <RatingStars
                        rating={responseForm.technicalSkillsRating || 0}
                        onChange={(r) =>
                          setResponseForm({...responseForm, technicalSkillsRating: r})
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Text Feedback */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Strengths
                  </label>
                  <textarea
                    value={responseForm.strengths}
                    onChange={(e) =>
                      setResponseForm({...responseForm, strengths: e.target.value})
                    }
                    className="w-full px-4 py-2 border border-[var(--border-strong)] rounded-md"
                    rows={3}
                    placeholder="What does this person do well?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Areas for Improvement
                  </label>
                  <textarea
                    value={responseForm.areasForImprovement}
                    onChange={(e) =>
                      setResponseForm({...responseForm, areasForImprovement: e.target.value})
                    }
                    className="w-full px-4 py-2 border border-[var(--border-strong)] rounded-md"
                    rows={3}
                    placeholder="What areas could they improve?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Additional Comments
                  </label>
                  <textarea
                    value={responseForm.additionalComments}
                    onChange={(e) =>
                      setResponseForm({...responseForm, additionalComments: e.target.value})
                    }
                    className="w-full px-4 py-2 border border-[var(--border-strong)] rounded-md"
                    rows={3}
                    placeholder="Any other feedback or observations?"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-[var(--border-main)] flex justify-between">
                <button
                  onClick={() => {
                    setShowResponseModal(false);
                    setSelectedRequest(null);
                    resetResponseForm();
                  }}
                  className="px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-md hover:bg-[var(--bg-surface)]"
                >
                  Cancel
                </button>
                <div className="flex gap-2">
                  <PermissionGate permission={Permissions.FEEDBACK_360_SUBMIT}>
                    <button
                      onClick={() => handleSubmitResponse(true)}
                      className="px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-md hover:bg-[var(--bg-surface)]"
                    >
                      Save Draft
                    </button>
                  </PermissionGate>
                  <PermissionGate permission={Permissions.FEEDBACK_360_SUBMIT}>
                    <button
                      onClick={() => handleSubmitResponse(false)}
                      disabled={!responseForm.overallRating}
                      className='px-4 py-2 text-sm font-medium text-inverse bg-accent rounded-md hover:bg-accent disabled:opacity-50'
                    >
                      Submit Feedback
                    </button>
                  </PermissionGate>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Activate Cycle Confirmation */}
        <ConfirmDialog
          isOpen={!!activateConfirm}
          onClose={() => setActivateConfirm(null)}
          onConfirm={async () => {
            if (activateConfirm) {
              await handleActivateCycle(activateConfirm);
              setActivateConfirm(null);
            }
          }}
          title="Activate Cycle"
          message="Are you sure you want to activate this feedback cycle? This will notify all reviewers to start providing feedback."
          confirmText="Activate"
          type="warning"
        />

        {/* Close Cycle Confirmation */}
        <ConfirmDialog
          isOpen={!!closeConfirm}
          onClose={() => setCloseConfirm(null)}
          onConfirm={async () => {
            if (closeConfirm) {
              await handleCloseCycle(closeConfirm);
              setCloseConfirm(null);
            }
          }}
          title="Close Cycle"
          message="Are you sure you want to close this feedback cycle? Feedback submission will be disabled."
          confirmText="Close"
          type="warning"
        />

        {/* Delete Cycle Confirmation */}
        <ConfirmDialog
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={async () => {
            if (deleteConfirm) {
              await handleDeleteCycle(deleteConfirm);
              setDeleteConfirm(null);
            }
          }}
          title="Delete Cycle"
          message="Are you sure you want to delete this feedback cycle? This action cannot be undone."
          confirmText="Delete"
          type="danger"
        />

        {/* Share Summary Confirmation */}
        <ConfirmDialog
          isOpen={!!shareConfirm}
          onClose={() => setShareConfirm(null)}
          onConfirm={async () => {
            if (shareConfirm) {
              await handleShareSummary(shareConfirm);
              setShareConfirm(null);
            }
          }}
          title="Share Summary"
          message="Share this feedback summary with the employee? They will be able to view all compiled feedback."
          confirmText="Share"
          type="info"
        />
      </div>
    </AppLayout>
  );
}
