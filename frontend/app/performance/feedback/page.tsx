'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout';
import { feedbackService } from '@/lib/services/performance.service';
import { Feedback, FeedbackRequest, FeedbackType } from '@/lib/types/performance';

export default function FeedbackPage() {
  const [receivedFeedback, setReceivedFeedback] = useState<Feedback[]>([]);
  const [givenFeedback, setGivenFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [activeTab, setActiveTab] = useState<'received' | 'given'>('received');
  const [filterType, setFilterType] = useState<FeedbackType | 'ALL'>('ALL');
  const [formData, setFormData] = useState<FeedbackRequest>({
    recipientId: '',
    giverId: '',
    feedbackType: 'GENERAL',
    category: '',
    feedbackText: '',
    isAnonymous: false,
    isPublic: false,
    relatedReviewId: undefined,
  });

  useEffect(() => {
    loadFeedback();
  }, []);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      const [received, given] = await Promise.all([
        feedbackService.getByRecipient(user.employeeId),
        feedbackService.getByGiver(user.employeeId),
      ]);

      setReceivedFeedback(received);
      setGivenFeedback(given);
    } catch (error) {
      console.error('Error loading feedback:', error);
      alert('Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const feedbackData = { 
        ...formData, 
        giverId: user.employeeId
      };

      if (selectedFeedback) {
        await feedbackService.update(selectedFeedback.id, feedbackData);
      } else {
        await feedbackService.create(feedbackData);
      }

      setShowModal(false);
      resetForm();
      await loadFeedback();
    } catch (error: unknown) {
      alert((error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save feedback');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedFeedback) return;
    try {
      setLoading(true);
      await feedbackService.delete(selectedFeedback.id);
      setShowDeleteConfirm(false);
      setSelectedFeedback(null);
      await loadFeedback();
    } catch (error: unknown) {
      alert((error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete feedback');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setFormData({
      recipientId: feedback.recipientId,
      giverId: feedback.giverId,
      feedbackType: feedback.feedbackType,
      category: feedback.category || '',
      feedbackText: feedback.feedbackText,
      isAnonymous: feedback.isAnonymous,
      isPublic: feedback.isPublic,
      relatedReviewId: feedback.relatedReviewId,
    });
    setShowModal(true);
  };

  const openDeleteConfirm = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setShowDeleteConfirm(true);
  };

  const resetForm = () => {
    setSelectedFeedback(null);
    setFormData({
      recipientId: '',
      giverId: '',
      feedbackType: 'GENERAL',
      category: '',
      feedbackText: '',
      isAnonymous: false,
      isPublic: false,
      relatedReviewId: undefined,
    });
  };

  const getTypeColor = (type: FeedbackType) => {
    switch (type) {
      case 'PRAISE': return 'bg-green-100 text-green-800';
      case 'CONSTRUCTIVE': return 'bg-yellow-100 text-yellow-800';
      case 'GENERAL': return 'bg-primary-50 dark:bg-primary-950/30 text-primary-800 dark:text-primary-400';
      case 'REQUEST': return 'bg-purple-100 text-purple-800';
      default: return 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200';
    }
  };

  const currentFeedbackList = activeTab === 'received' ? receivedFeedback : givenFeedback;
  const filteredFeedback = currentFeedbackList.filter(feedback => {
    if (filterType !== 'ALL' && feedback.feedbackType !== filterType) return false;
    return true;
  });

  return (
    <AppLayout activeMenuItem="performance">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Feedback</h1>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Give Feedback
          </button>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-md mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('received')}
              className={'flex-1 px-6 py-4 font-semibold transition-colors ' + (activeTab === 'received' ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400' : 'text-surface-600 dark:text-surface-400 hover:text-surface-800 dark:hover:text-surface-200')}
            >
              Received Feedback ({receivedFeedback.length})
            </button>
            <button
              onClick={() => setActiveTab('given')}
              className={'flex-1 px-6 py-4 font-semibold transition-colors ' + (activeTab === 'given' ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400' : 'text-surface-600 dark:text-surface-400 hover:text-surface-800 dark:hover:text-surface-200')}
            >
              Given Feedback ({givenFeedback.length})
            </button>
          </div>

          <div className="p-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                Filter by Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as FeedbackType | 'ALL')}
                className="w-full md:w-1/2 px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="ALL">All Types</option>
                <option value="PRAISE">Praise</option>
                <option value="CONSTRUCTIVE">Constructive</option>
                <option value="GENERAL">General</option>
                <option value="REQUEST">Request</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-surface-600 dark:text-surface-400">Loading feedback...</div>
          </div>
        ) : filteredFeedback.length === 0 ? (
          <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-md p-12 text-center">
            <div className="text-surface-600 dark:text-surface-400 mb-4">
              No {activeTab === 'received' ? 'received' : 'given'} feedback found
            </div>
            {activeTab === 'given' && (
              <button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Give Your First Feedback
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFeedback.map((feedback) => (
              <div key={feedback.id} className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex gap-2 mb-3 flex-wrap">
                      <span className={'px-2 py-1 rounded text-xs font-medium ' + getTypeColor(feedback.feedbackType)}>
                        {feedback.feedbackType}
                      </span>
                      {feedback.category && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200">
                          {feedback.category}
                        </span>
                      )}
                      {feedback.isAnonymous && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          Anonymous
                        </span>
                      )}
                      {feedback.isPublic && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                          Public
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-surface-600 dark:text-surface-400 mb-2">
                      {feedback.createdAt ? new Date(feedback.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }) : 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-surface-800 dark:text-surface-200 whitespace-pre-wrap">{feedback.feedbackText}</p>
                </div>

                {activeTab === 'given' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(feedback)}
                      className="flex-1 px-3 py-2 bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 rounded hover:bg-primary-100 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => openDeleteConfirm(feedback)}
                      className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-surface-light dark:bg-surface-dark rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-6">
                  {selectedFeedback ? 'Edit Feedback' : 'Give Feedback'}
                </h2>
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                        Recipient Employee ID *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.recipientId}
                        onChange={(e) => setFormData({ ...formData, recipientId: e.target.value })}
                        className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Enter employee ID"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                        Feedback Type *
                      </label>
                      <select
                        required
                        value={formData.feedbackType}
                        onChange={(e) => setFormData({ ...formData, feedbackType: e.target.value as FeedbackType })}
                        className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="PRAISE">Praise</option>
                        <option value="CONSTRUCTIVE">Constructive</option>
                        <option value="GENERAL">General</option>
                        <option value="REQUEST">Request</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                        Category
                      </label>
                      <input
                        type="text"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="e.g., Communication, Leadership, Technical Skills"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                        Feedback *
                      </label>
                      <textarea
                        required
                        value={formData.feedbackText}
                        onChange={(e) => setFormData({ ...formData, feedbackText: e.target.value })}
                        rows={6}
                        className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Provide detailed feedback..."
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.isAnonymous}
                          onChange={(e) => setFormData({ ...formData, isAnonymous: e.target.checked })}
                          className="w-4 h-4 text-primary-600 border-surface-300 dark:border-surface-600 rounded focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-surface-700 dark:text-surface-300">
                          Submit as anonymous
                        </span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.isPublic}
                          onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                          className="w-4 h-4 text-primary-600 border-surface-300 dark:border-surface-600 rounded focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-surface-700 dark:text-surface-300">
                          Make this feedback public
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-4 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        resetForm();
                      }}
                      className="flex-1 px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : selectedFeedback ? 'Update' : 'Submit'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {showDeleteConfirm && selectedFeedback && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-surface-light dark:bg-surface-dark rounded-lg max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-4">Delete Feedback</h2>
              <p className="text-surface-600 dark:text-surface-400 mb-6">
                Are you sure you want to delete this feedback? This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setSelectedFeedback(null);
                  }}
                  className="flex-1 px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
