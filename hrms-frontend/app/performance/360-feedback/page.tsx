'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Play,
  Square,
  ClipboardCheck,
  Users,
  BarChart3,
  Star,
  CheckCircle,
  Clock,
  AlertTriangle,
  Eye,
  Share2,
} from 'lucide-react';
import {
  feedback360Service,
  Feedback360Cycle,
  Feedback360Request,
  Feedback360Summary,
  CycleRequest,
  FeedbackResponse,
} from '@/lib/services/feedback360.service';

const CYCLE_STATUSES = ['DRAFT', 'ACTIVE', 'NOMINATION', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'] as const;
const REVIEWER_TYPES = ['SELF', 'MANAGER', 'PEER', 'DIRECT_REPORT', 'EXTERNAL'] as const;

const getStatusColor = (status: string) => {
  switch (status) {
    case 'DRAFT':
      return 'bg-gray-100 text-gray-800';
    case 'ACTIVE':
    case 'IN_PROGRESS':
      return 'bg-blue-100 text-blue-800';
    case 'NOMINATION':
      return 'bg-yellow-100 text-yellow-800';
    case 'COMPLETED':
      return 'bg-green-100 text-green-800';
    case 'CLOSED':
      return 'bg-gray-100 text-gray-500';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getRequestStatusIcon = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'IN_PROGRESS':
      return <Clock className="h-5 w-5 text-blue-500" />;
    case 'DECLINED':
      return <AlertTriangle className="h-5 w-5 text-red-500" />;
    default:
      return <Clock className="h-5 w-5 text-gray-400" />;
  }
};

const RatingStars = ({ rating, onChange }: { rating: number; onChange?: (r: number) => void }) => {
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
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
};

export default function Feedback360Page() {
  const [activeTab, setActiveTab] = useState<'cycles' | 'pending' | 'summaries'>('cycles');
  const [cycles, setCycles] = useState<Feedback360Cycle[]>([]);
  const [pendingReviews, setPendingReviews] = useState<Feedback360Request[]>([]);
  const [summaries, setSummaries] = useState<Feedback360Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCycleModal, setShowCycleModal] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [editingCycle, setEditingCycle] = useState<Feedback360Cycle | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<Feedback360Request | null>(null);

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cyclesData, pendingData, summariesData] = await Promise.all([
        feedback360Service.getCycles(),
        feedback360Service.getMyPendingReviews(),
        feedback360Service.getMySummaries(),
      ]);
      setCycles(cyclesData?.content || []);
      setPendingReviews(pendingData || []);
      setSummaries(summariesData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load 360 feedback data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateCycle = async () => {
    try {
      await feedback360Service.createCycle(cycleForm);
      setShowCycleModal(false);
      resetCycleForm();
      fetchData();
    } catch (err) {
      console.error('Error creating cycle:', err);
      setError('Failed to create cycle');
    }
  };

  const handleActivateCycle = async (id: string) => {
    if (!confirm('Are you sure you want to activate this cycle?')) return;
    try {
      await feedback360Service.activateCycle(id);
      fetchData();
    } catch (err) {
      console.error('Error activating cycle:', err);
      setError('Failed to activate cycle');
    }
  };

  const handleCloseCycle = async (id: string) => {
    if (!confirm('Are you sure you want to close this cycle?')) return;
    try {
      await feedback360Service.closeCycle(id);
      fetchData();
    } catch (err) {
      console.error('Error closing cycle:', err);
      setError('Failed to close cycle');
    }
  };

  const handleDeleteCycle = async (id: string) => {
    if (!confirm('Are you sure you want to delete this cycle?')) return;
    try {
      await feedback360Service.deleteCycle(id);
      fetchData();
    } catch (err) {
      console.error('Error deleting cycle:', err);
      setError('Failed to delete cycle');
    }
  };

  const handleSubmitResponse = async (isDraft: boolean = false) => {
    try {
      await feedback360Service.submitResponse({
        ...responseForm,
        isDraft,
      });
      setShowResponseModal(false);
      setSelectedRequest(null);
      resetResponseForm();
      fetchData();
    } catch (err) {
      console.error('Error submitting response:', err);
      setError('Failed to submit response');
    }
  };

  const handleShareSummary = async (summaryId: string) => {
    if (!confirm('Share this summary with the employee?')) return;
    try {
      await feedback360Service.shareWithEmployee(summaryId);
      fetchData();
    } catch (err) {
      console.error('Error sharing summary:', err);
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">360-Degree Feedback</h1>
          <p className="text-sm text-gray-500 mt-1">
            Multi-rater feedback and performance assessment
          </p>
        </div>
        {activeTab === 'cycles' && (
          <button
            onClick={() => {
              resetCycleForm();
              setShowCycleModal(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Cycle
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('cycles')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'cycles'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="h-5 w-5" />
            Feedback Cycles ({cycles.length})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ClipboardCheck className="h-5 w-5" />
            Pending Reviews ({pendingReviews.length})
            {pendingReviews.length > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                {pendingReviews.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('summaries')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'summaries'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BarChart3 className="h-5 w-5" />
            My Results ({summaries.length})
          </button>
        </nav>
      </div>

      {/* Cycles Tab */}
      {activeTab === 'cycles' && (
        <div className="space-y-4">
          {cycles.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No feedback cycles</h3>
              <p className="mt-1 text-sm text-gray-500">
                Create a new 360-degree feedback cycle to get started.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cycles.map((cycle) => (
                <div
                  key={cycle.id}
                  className="bg-white rounded-lg border border-gray-200 shadow-sm p-5"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-medium text-gray-900">{cycle.name}</h3>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        cycle.status
                      )}`}
                    >
                      {cycle.status}
                    </span>
                  </div>
                  {cycle.description && (
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                      {cycle.description}
                    </p>
                  )}
                  <div className="space-y-2 text-xs text-gray-500 mb-4">
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
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">Self</span>
                      )}
                      {cycle.includeManagerReview && (
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">Manager</span>
                      )}
                      {cycle.includePeerReview && (
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">Peer</span>
                      )}
                      {cycle.includeUpwardReview && (
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">Upward</span>
                      )}
                      {cycle.isAnonymous && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                          Anonymous
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                    {cycle.status === 'DRAFT' && (
                      <>
                        <button
                          onClick={() => handleActivateCycle(cycle.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded"
                          title="Activate"
                        >
                          <Play className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCycle(cycle.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </>
                    )}
                    {(cycle.status === 'ACTIVE' || cycle.status === 'IN_PROGRESS') && (
                      <button
                        onClick={() => handleCloseCycle(cycle.id)}
                        className="p-2 text-gray-600 hover:bg-gray-50 rounded"
                        title="Close"
                      >
                        <Square className="h-5 w-5" />
                      </button>
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
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">All caught up!</h3>
              <p className="mt-1 text-sm text-gray-500">
                You have no pending feedback reviews.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subject
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Review Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingReviews.map((request) => (
                      <tr key={request.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            Employee #{request.subjectEmployeeId.slice(0, 8)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {request.reviewerType}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getRequestStatusIcon(request.status)}
                            <span className="text-sm text-gray-500">{request.status}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => openResponseModal(request)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Provide Feedback
                          </button>
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
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No results yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Your feedback summaries will appear here once reviews are complete.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {summaries.map((summary) => (
                <div
                  key={summary.id}
                  className="bg-white rounded-lg border border-gray-200 shadow-sm p-5"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Feedback Summary
                      </h3>
                      <p className="text-sm text-gray-500">
                        Cycle: {summary.cycleId.slice(0, 8)}
                      </p>
                    </div>
                    {summary.finalRating && (
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          {summary.finalRating.toFixed(1)}
                        </div>
                        <RatingStars rating={Math.round(summary.finalRating)} />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Responses:</span>
                      <span className="font-medium">
                        {summary.responsesReceived}/{summary.totalReviewers}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Self Review:</span>
                      <span className="font-medium">
                        {summary.selfReviewCompleted ? (
                          <CheckCircle className="h-5 w-5 text-green-500 inline" />
                        ) : (
                          <Clock className="h-5 w-5 text-gray-400 inline" />
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Manager Review:</span>
                      <span className="font-medium">
                        {summary.managerReviewCompleted ? (
                          <CheckCircle className="h-5 w-5 text-green-500 inline" />
                        ) : (
                          <Clock className="h-5 w-5 text-gray-400 inline" />
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Peer Reviews:</span>
                      <span className="font-medium">{summary.peerReviewsCompleted}</span>
                    </div>
                  </div>

                  {/* Competency Ratings */}
                  {(summary.avgCommunication || summary.avgTeamwork || summary.avgLeadership) && (
                    <div className="space-y-2 border-t border-gray-100 pt-4 mb-4">
                      <h4 className="text-xs font-medium text-gray-500 uppercase">
                        Competency Ratings
                      </h4>
                      {summary.avgCommunication && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Communication</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500"
                                style={{ width: `${(summary.avgCommunication / 5) * 100}%` }}
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
                          <span className="text-sm text-gray-600">Teamwork</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500"
                                style={{ width: `${(summary.avgTeamwork / 5) * 100}%` }}
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
                          <span className="text-sm text-gray-600">Leadership</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-purple-500"
                                style={{ width: `${(summary.avgLeadership / 5) * 100}%` }}
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
                    <div className="space-y-3 border-t border-gray-100 pt-4">
                      {summary.consolidatedStrengths && (
                        <div>
                          <h4 className="text-xs font-medium text-green-600 mb-1">Strengths</h4>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {summary.consolidatedStrengths}
                          </p>
                        </div>
                      )}
                      {summary.consolidatedImprovements && (
                        <div>
                          <h4 className="text-xs font-medium text-orange-600 mb-1">
                            Areas for Improvement
                          </h4>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {summary.consolidatedImprovements}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 mt-4">
                    <button
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </button>
                    {!summary.sharedWithEmployee && (
                      <button
                        onClick={() => handleShareSummary(summary.id)}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                      >
                        <Share2 className="h-4 w-4 mr-1" />
                        Share
                      </button>
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
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Create 360 Feedback Cycle
              </h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cycle Name *
                </label>
                <input
                  type="text"
                  value={cycleForm.name}
                  onChange={(e) => setCycleForm({ ...cycleForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Q4 2024 Performance Review"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={cycleForm.description}
                  onChange={(e) => setCycleForm({ ...cycleForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={cycleForm.startDate}
                    onChange={(e) => setCycleForm({ ...cycleForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={cycleForm.endDate}
                    onChange={(e) => setCycleForm({ ...cycleForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nomination Deadline
                  </label>
                  <input
                    type="date"
                    value={cycleForm.nominationDeadline || ''}
                    onChange={(e) =>
                      setCycleForm({ ...cycleForm, nominationDeadline: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Self Review Deadline
                  </label>
                  <input
                    type="date"
                    value={cycleForm.selfReviewDeadline || ''}
                    onChange={(e) =>
                      setCycleForm({ ...cycleForm, selfReviewDeadline: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Peer Review Deadline
                  </label>
                  <input
                    type="date"
                    value={cycleForm.peerReviewDeadline || ''}
                    onChange={(e) =>
                      setCycleForm({ ...cycleForm, peerReviewDeadline: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Manager Review Deadline
                  </label>
                  <input
                    type="date"
                    value={cycleForm.managerReviewDeadline || ''}
                    onChange={(e) =>
                      setCycleForm({ ...cycleForm, managerReviewDeadline: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Peer Reviewers
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={cycleForm.minPeersRequired}
                    onChange={(e) =>
                      setCycleForm({ ...cycleForm, minPeersRequired: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Peer Reviewers
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={cycleForm.maxPeersAllowed}
                    onChange={(e) =>
                      setCycleForm({ ...cycleForm, maxPeersAllowed: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <div className="space-y-3 border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-700">Review Types</h4>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={cycleForm.includeSelfReview}
                      onChange={(e) =>
                        setCycleForm({ ...cycleForm, includeSelfReview: e.target.checked })
                      }
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Self Review</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={cycleForm.includeManagerReview}
                      onChange={(e) =>
                        setCycleForm({ ...cycleForm, includeManagerReview: e.target.checked })
                      }
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Manager Review</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={cycleForm.includePeerReview}
                      onChange={(e) =>
                        setCycleForm({ ...cycleForm, includePeerReview: e.target.checked })
                      }
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Peer Review</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={cycleForm.includeUpwardReview}
                      onChange={(e) =>
                        setCycleForm({ ...cycleForm, includeUpwardReview: e.target.checked })
                      }
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Upward Review</span>
                  </label>
                </div>
                <label className="flex items-center mt-2">
                  <input
                    type="checkbox"
                    checked={cycleForm.isAnonymous}
                    onChange={(e) =>
                      setCycleForm({ ...cycleForm, isAnonymous: e.target.checked })
                    }
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Anonymous peer feedback
                  </span>
                </label>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCycleModal(false);
                  resetCycleForm();
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCycle}
                disabled={!cycleForm.name || !cycleForm.startDate || !cycleForm.endDate}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Create Cycle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Response Modal */}
      {showResponseModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Provide Feedback</h2>
              <p className="text-sm text-gray-500 mt-1">
                {selectedRequest.reviewerType} review for Employee #
                {selectedRequest.subjectEmployeeId.slice(0, 8)}
              </p>
            </div>
            <div className="px-6 py-4 space-y-6">
              {/* Rating Categories */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700">Competency Ratings</h3>
                <div className="grid gap-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm text-gray-600">Overall Performance</label>
                    <RatingStars
                      rating={responseForm.overallRating || 0}
                      onChange={(r) => setResponseForm({ ...responseForm, overallRating: r })}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <label className="text-sm text-gray-600">Communication</label>
                    <RatingStars
                      rating={responseForm.communicationRating || 0}
                      onChange={(r) =>
                        setResponseForm({ ...responseForm, communicationRating: r })
                      }
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <label className="text-sm text-gray-600">Teamwork</label>
                    <RatingStars
                      rating={responseForm.teamworkRating || 0}
                      onChange={(r) => setResponseForm({ ...responseForm, teamworkRating: r })}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <label className="text-sm text-gray-600">Leadership</label>
                    <RatingStars
                      rating={responseForm.leadershipRating || 0}
                      onChange={(r) =>
                        setResponseForm({ ...responseForm, leadershipRating: r })
                      }
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <label className="text-sm text-gray-600">Problem Solving</label>
                    <RatingStars
                      rating={responseForm.problemSolvingRating || 0}
                      onChange={(r) =>
                        setResponseForm({ ...responseForm, problemSolvingRating: r })
                      }
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <label className="text-sm text-gray-600">Technical Skills</label>
                    <RatingStars
                      rating={responseForm.technicalSkillsRating || 0}
                      onChange={(r) =>
                        setResponseForm({ ...responseForm, technicalSkillsRating: r })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Text Feedback */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Strengths
                </label>
                <textarea
                  value={responseForm.strengths}
                  onChange={(e) =>
                    setResponseForm({ ...responseForm, strengths: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  placeholder="What does this person do well?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Areas for Improvement
                </label>
                <textarea
                  value={responseForm.areasForImprovement}
                  onChange={(e) =>
                    setResponseForm({ ...responseForm, areasForImprovement: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  placeholder="What areas could they improve?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Comments
                </label>
                <textarea
                  value={responseForm.additionalComments}
                  onChange={(e) =>
                    setResponseForm({ ...responseForm, additionalComments: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  placeholder="Any other feedback or observations?"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
              <button
                onClick={() => {
                  setShowResponseModal(false);
                  setSelectedRequest(null);
                  resetResponseForm();
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSubmitResponse(true)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Save Draft
                </button>
                <button
                  onClick={() => handleSubmitResponse(false)}
                  disabled={!responseForm.overallRating}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Submit Feedback
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
