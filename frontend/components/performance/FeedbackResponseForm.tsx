'use client';

import { useState } from 'react';
import { Star, Save, Send, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FeedbackResponseDetailed } from '@/lib/types/performance-360';

interface FeedbackResponseFormProps {
  requestId: string;
  subjectEmployeeName: string;
  reviewerType: string;
  isAnonymous: boolean;
  onSubmit: (response: FeedbackResponseDetailed, isDraft: boolean) => Promise<void>;
  onCancel: () => void;
  initialData?: FeedbackResponseDetailed;
}

interface RatingCategory {
  key: keyof FeedbackResponseDetailed;
  label: string;
  description: string;
}

const ratingCategories: RatingCategory[] = [
  {
    key: 'communicationRating',
    label: 'Communication',
    description: 'Clarity, listening, and information sharing',
  },
  {
    key: 'teamworkRating',
    label: 'Teamwork & Collaboration',
    description: 'Working effectively with others',
  },
  {
    key: 'leadershipRating',
    label: 'Leadership',
    description: 'Inspiring and guiding others',
  },
  {
    key: 'problemSolvingRating',
    label: 'Problem Solving',
    description: 'Analytical thinking and decision making',
  },
  {
    key: 'technicalSkillsRating',
    label: 'Technical Skills',
    description: 'Job-specific expertise and knowledge',
  },
  {
    key: 'innovationRating',
    label: 'Innovation',
    description: 'Creative thinking and new ideas',
  },
  {
    key: 'accountabilityRating',
    label: 'Accountability',
    description: 'Taking ownership and responsibility',
  },
  {
    key: 'customerFocusRating',
    label: 'Customer Focus',
    description: 'Understanding and serving customer needs',
  },
];

const RatingStars = ({
  rating,
  onChange,
  disabled = false,
}: {
  rating: number;
  onChange?: (r: number) => void;
  disabled?: boolean;
}) => {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          disabled={!onChange || disabled}
          className={`${
            onChange && !disabled ? 'cursor-pointer hover:scale-110' : 'cursor-default'
          } transition-transform`}
        >
          <Star
            className={`h-6 w-6 ${
              star <= rating ? 'fill-warning-400 text-warning-400' : 'text-[var(--text-muted)]'
            }`}
          />
        </button>
      ))}
    </div>
  );
};

export default function FeedbackResponseForm({
  requestId,
  subjectEmployeeName,
  reviewerType,
  isAnonymous,
  onSubmit,
  onCancel,
  initialData,
}: FeedbackResponseFormProps) {
  const [formData, setFormData] = useState<FeedbackResponseDetailed>(
    initialData || {
      requestId,
      isDraft: false,
      overallRating: 0,
      communicationRating: 0,
      teamworkRating: 0,
      leadershipRating: 0,
      problemSolvingRating: 0,
      technicalSkillsRating: 0,
      innovationRating: 0,
      accountabilityRating: 0,
      customerFocusRating: 0,
      strengths: '',
      areasForImprovement: '',
      developmentSuggestions: '',
      additionalComments: '',
    }
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'ratings' | 'feedback'>('ratings');

  const updateRating = (key: keyof FeedbackResponseDetailed, value: number) => {
    setFormData({ ...formData, [key]: value });
    setError(null);
  };

  const updateText = (key: keyof FeedbackResponseDetailed, value: string) => {
    setFormData({ ...formData, [key]: value });
  };

  const handleSubmit = async (isDraft: boolean) => {
    if (!isDraft) {
      // Validate required fields for final submission
      if (!formData.overallRating || formData.overallRating === 0) {
        setError('Please provide an overall rating');
        return;
      }

      const hasAtLeastOneRating = ratingCategories.some(
        (cat) => formData[cat.key] && (formData[cat.key] as number) > 0
      );

      if (!hasAtLeastOneRating) {
        setError('Please provide at least one competency rating');
        return;
      }

      if (!formData.strengths || formData.strengths.trim().length === 0) {
        setError('Please provide feedback on strengths');
        return;
      }

      if (!formData.areasForImprovement || formData.areasForImprovement.trim().length === 0) {
        setError('Please provide feedback on areas for improvement');
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({ ...formData, isDraft }, isDraft);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err) || 'Failed to submit feedback');
      setIsSubmitting(false);
    }
  };

  const completedRatings = ratingCategories.filter(
    (cat) => formData[cat.key] && (formData[cat.key] as number) > 0
  ).length;

  const progressPercentage = Math.round(
    ((completedRatings + (formData.overallRating ? 1 : 0)) / (ratingCategories.length + 1)) * 100
  );

  return (
    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border-main)] sticky top-0 bg-white z-10">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Provide 360 Feedback</h2>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {reviewerType} review for{' '}
              {isAnonymous && reviewerType !== 'SELF' ? 'Team Member' : subjectEmployeeName}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-[var(--text-muted)]">Progress</div>
            <div className="text-2xl font-bold text-accent-600">{progressPercentage}%</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 h-2 bg-[var(--border-main)] rounded-full overflow-hidden">
          <div
            className="h-full bg-accent-500 transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Anonymous Notice */}
        {isAnonymous && reviewerType !== 'SELF' && (
          <div className="mt-3 p-4 bg-accent-250 border border-accent-400 rounded-lg">
            <p className="text-xs text-accent-900 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Your feedback will be anonymous and combined with other responses
            </p>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-[var(--border-main)] px-6">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveSection('ratings')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeSection === 'ratings'
                ? 'border-accent-500 text-accent-600'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
            }`}
          >
            Ratings ({completedRatings + (formData.overallRating ? 1 : 0)}/
            {ratingCategories.length + 1})
          </button>
          <button
            onClick={() => setActiveSection('feedback')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeSection === 'feedback'
                ? 'border-accent-500 text-accent-600'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
            }`}
          >
            Written Feedback
          </button>
        </nav>
      </div>

      <div className="px-6 py-6">
        {/* Ratings Section */}
        {activeSection === 'ratings' && (
          <div className="space-y-6">
            {/* Overall Rating */}
            <div className="p-4 bg-accent-50 rounded-lg border border-accent-100">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">Overall Performance</h3>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    How would you rate this person&apos;s overall performance?
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-4">
                <RatingStars
                  rating={formData.overallRating || 0}
                  onChange={(r) => updateRating('overallRating', r)}
                />
                {formData.overallRating ? (
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {formData.overallRating}/5
                  </span>
                ) : (
                  <span className="text-sm text-[var(--text-muted)]">Not rated</span>
                )}
              </div>
            </div>

            {/* Competency Ratings */}
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4">Competency Ratings</h3>
              <div className="space-y-4">
                {ratingCategories.map((category) => (
                  <div
                    key={category.key}
                    className="p-4 border border-[var(--border-main)] rounded-lg hover:border-[var(--border-strong)] transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-[var(--text-primary)]">{category.label}</h4>
                        <p className="text-xs text-[var(--text-muted)] mt-1">{category.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <RatingStars
                        rating={(formData[category.key] as number) || 0}
                        onChange={(r) => updateRating(category.key, r)}
                      />
                      {formData[category.key] !== undefined && typeof formData[category.key] === 'number' ? (
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {formData[category.key] as number}/5
                        </span>
                      ) : (
                        <span className="text-sm text-[var(--text-muted)]">Optional</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Written Feedback Section */}
        {activeSection === 'feedback' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Key Strengths <span className="text-danger-500">*</span>
              </label>
              <p className="text-xs text-[var(--text-muted)] mb-2">
                What does this person do particularly well? Provide specific examples.
              </p>
              <textarea
                value={formData.strengths}
                onChange={(e) => updateText('strengths', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                placeholder="E.g., Excellent at breaking down complex problems into actionable tasks..."
              />
              <div className="text-xs text-[var(--text-muted)] mt-1 text-right">
                {formData.strengths?.length || 0} characters
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Areas for Improvement <span className="text-danger-500">*</span>
              </label>
              <p className="text-xs text-[var(--text-muted)] mb-2">
                What areas could this person develop or improve?
              </p>
              <textarea
                value={formData.areasForImprovement}
                onChange={(e) => updateText('areasForImprovement', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                placeholder="E.g., Could benefit from more proactive communication with stakeholders..."
              />
              <div className="text-xs text-[var(--text-muted)] mt-1 text-right">
                {formData.areasForImprovement?.length || 0} characters
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Development Suggestions
              </label>
              <p className="text-xs text-[var(--text-muted)] mb-2">
                What specific actions or training would help this person grow?
              </p>
              <textarea
                value={formData.developmentSuggestions}
                onChange={(e) => updateText('developmentSuggestions', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                placeholder="E.g., Leadership training, mentorship in project management..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Additional Comments
              </label>
              <p className="text-xs text-[var(--text-muted)] mb-2">
                Any other observations or feedback you&apos;d like to share?
              </p>
              <textarea
                value={formData.additionalComments}
                onChange={(e) => updateText('additionalComments', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                placeholder="Optional additional feedback..."
              />
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-6 p-4 bg-danger-50 border border-danger-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-danger-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-danger-700">{error}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-6 py-4 border-t border-[var(--border-main)] bg-[var(--bg-surface)] flex justify-between sticky bottom-0">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting}
            leftIcon={<Save className="h-4 w-4" />}
          >
            Save Draft
          </Button>
          <Button
            variant="primary"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
            isLoading={isSubmitting}
            leftIcon={<Send className="h-4 w-4" />}
          >
            Submit Feedback
          </Button>
        </div>
      </div>
    </div>
  );
}
