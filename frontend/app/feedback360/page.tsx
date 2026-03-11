'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout';
import { feedback360Service, Feedback360Cycle, Feedback360Request, Feedback360Summary } from '@/lib/services/feedback360.service';

export default function Feedback360Page() {
  const [activeTab, setActiveTab] = useState<'pending' | 'received' | 'cycles'>('pending');
  const [pendingReviews, setPendingReviews] = useState<Feedback360Request[]>([]);
  const [mySummaries, setMySummaries] = useState<Feedback360Summary[]>([]);
  const [activeCycles, setActiveCycles] = useState<Feedback360Cycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pending, summaries, cycles, dashboardData] = await Promise.all([
        feedback360Service.getMyPendingReviews(),
        feedback360Service.getMySummaries(),
        feedback360Service.getActiveCycles(),
        feedback360Service.getDashboard()
      ]);
      setPendingReviews(pending);
      setMySummaries(summaries);
      setActiveCycles(cycles);
      setDashboard(dashboardData);
    } catch (error) {
      console.error('Error loading feedback data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRatingColor = (rating: number | undefined) => {
    if (!rating) return 'text-surface-400 dark:text-surface-500';
    if (rating >= 4) return 'text-green-600 dark:text-green-400';
    if (rating >= 3) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <AppLayout activeMenuItem="performance">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-surface-900 dark:text-surface-50">360° Feedback</h1>

        {/* Dashboard Cards */}
        {dashboard && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">{dashboard.pendingReviewsCount || 0}</div>
              <div className="text-surface-600 dark:text-surface-400">Pending Reviews</div>
            </div>
            <div className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">{dashboard.activeCyclesCount || 0}</div>
              <div className="text-surface-600 dark:text-surface-400">Active Cycles</div>
            </div>
            <div className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">{dashboard.receivedFeedbackCount || 0}</div>
              <div className="text-surface-600 dark:text-surface-400">Feedback Received</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b mb-6">
          <button
            className={`px-6 py-3 font-medium ${activeTab === 'pending' ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400' : 'text-surface-600 dark:text-surface-400'}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending Reviews ({pendingReviews.length})
          </button>
          <button
            className={`px-6 py-3 font-medium ${activeTab === 'received' ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400' : 'text-surface-600 dark:text-surface-400'}`}
            onClick={() => setActiveTab('received')}
          >
            My Feedback
          </button>
          <button
            className={`px-6 py-3 font-medium ${activeTab === 'cycles' ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400' : 'text-surface-600 dark:text-surface-400'}`}
            onClick={() => setActiveTab('cycles')}
          >
            Active Cycles
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <>
            {/* Pending Reviews Tab */}
            {activeTab === 'pending' && (
              <div className="space-y-4">
                {pendingReviews.length > 0 ? (
                  pendingReviews.map((review) => (
                    <div key={review.id} className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow-md p-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-semibold">Feedback Request</div>
                          <div className="text-sm text-surface-600 dark:text-surface-400">
                            Review Type: {review.reviewerType}
                          </div>
                          <div className="text-sm text-surface-600 dark:text-surface-400">
                            Status: <span className="text-orange-600">{review.status}</span>
                          </div>
                        </div>
                        <a
                          href={`/feedback360/review/${review.id}`}
                          className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                        >
                          Provide Feedback
                        </a>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow-md p-8 text-center text-surface-500 dark:text-surface-400">
                    No pending reviews. You&apos;re all caught up!
                  </div>
                )}
              </div>
            )}

            {/* My Feedback Tab */}
            {activeTab === 'received' && (
              <div className="space-y-4">
                {mySummaries.length > 0 ? (
                  mySummaries.map((summary) => (
                    <div key={summary.id} className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow-md p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="font-semibold">Feedback Summary</div>
                          <div className="text-sm text-surface-600 dark:text-surface-400">
                            {summary.responsesReceived} of {summary.totalReviewers} reviews received
                          </div>
                        </div>
                        <div className={`text-3xl font-bold ${getRatingColor(summary.finalRating)}`}>
                          {summary.finalRating?.toFixed(1) || '-'}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center p-3 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
                          <div className={`text-xl font-bold ${getRatingColor(summary.avgCommunication)}`}>
                            {summary.avgCommunication?.toFixed(1) || '-'}
                          </div>
                          <div className="text-xs text-surface-600 dark:text-surface-400">Communication</div>
                        </div>
                        <div className="text-center p-3 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
                          <div className={`text-xl font-bold ${getRatingColor(summary.avgTeamwork)}`}>
                            {summary.avgTeamwork?.toFixed(1) || '-'}
                          </div>
                          <div className="text-xs text-surface-600 dark:text-surface-400">Teamwork</div>
                        </div>
                        <div className="text-center p-3 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
                          <div className={`text-xl font-bold ${getRatingColor(summary.avgLeadership)}`}>
                            {summary.avgLeadership?.toFixed(1) || '-'}
                          </div>
                          <div className="text-xs text-surface-600 dark:text-surface-400">Leadership</div>
                        </div>
                        <div className="text-center p-3 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
                          <div className="text-xl font-bold text-green-600">
                            {summary.selfReviewCompleted ? 'Yes' : 'No'}
                          </div>
                          <div className="text-xs text-surface-600 dark:text-surface-400">Self Review</div>
                        </div>
                      </div>

                      {summary.consolidatedStrengths && (
                        <div className="mb-2">
                          <div className="text-sm font-medium text-surface-700 dark:text-surface-300">Strengths:</div>
                          <div className="text-sm text-surface-600 dark:text-surface-400">{summary.consolidatedStrengths}</div>
                        </div>
                      )}

                      {summary.consolidatedImprovements && (
                        <div>
                          <div className="text-sm font-medium text-surface-700 dark:text-surface-300">Areas for Improvement:</div>
                          <div className="text-sm text-surface-600 dark:text-surface-400">{summary.consolidatedImprovements}</div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow-md p-8 text-center text-surface-500 dark:text-surface-400">
                    No feedback summaries available yet.
                  </div>
                )}
              </div>
            )}

            {/* Active Cycles Tab */}
            {activeTab === 'cycles' && (
              <div className="space-y-4">
                {activeCycles.length > 0 ? (
                  activeCycles.map((cycle) => (
                    <div key={cycle.id} className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow-md p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold">{cycle.name}</h3>
                          {cycle.description && (
                            <p className="text-surface-600 dark:text-surface-400 mt-1">{cycle.description}</p>
                          )}
                          <div className="flex gap-4 mt-2 text-sm text-surface-600 dark:text-surface-400">
                            <span>Start: {new Date(cycle.startDate).toLocaleDateString()}</span>
                            <span>End: {new Date(cycle.endDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm ${
                          cycle.status === 'ACTIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' :
                          cycle.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' :
                          'bg-surface-100 text-surface-800 dark:bg-surface-700 dark:text-surface-300'
                        }`}>
                          {cycle.status}
                        </span>
                      </div>
                      <div className="flex gap-4 mt-4 text-sm">
                        <span className={cycle.includeSelfReview ? 'text-green-600 dark:text-green-400' : 'text-surface-400 dark:text-surface-500'}>
                          Self Review: {cycle.includeSelfReview ? 'Yes' : 'No'}
                        </span>
                        <span className={cycle.includeManagerReview ? 'text-green-600 dark:text-green-400' : 'text-surface-400 dark:text-surface-500'}>
                          Manager Review: {cycle.includeManagerReview ? 'Yes' : 'No'}
                        </span>
                        <span className={cycle.includePeerReview ? 'text-green-600 dark:text-green-400' : 'text-surface-400 dark:text-surface-500'}>
                          Peer Review: {cycle.includePeerReview ? 'Yes' : 'No'}
                        </span>
                        <span className={cycle.isAnonymous ? 'text-primary-600 dark:text-primary-400' : 'text-surface-400 dark:text-surface-500'}>
                          {cycle.isAnonymous ? 'Anonymous' : 'Named'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow-md p-8 text-center text-surface-500 dark:text-surface-400">
                    No active feedback cycles at the moment.
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
