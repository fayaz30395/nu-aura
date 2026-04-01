'use client';

import React, { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Send,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Card,
  CardContent,
  Button,
  Textarea,
  Badge,
} from '@/components/ui';
import { Permissions } from '@/lib/hooks/usePermissions';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { useSurveyDetail } from '@/lib/hooks/queries/useSurveys';
import {
  useSurveyQuestions,
  useSubmitSurveyResponse,
} from '@/lib/hooks/queries/useSurveyQuestions';
import { QuestionType } from '@/lib/types/grow/survey';
import type { SurveyQuestion } from '@/lib/types/grow/survey';
import {
  motion as dsMotion,
  typography,
  iconSize,
} from '@/lib/design-system';

// ─── Per-question answer state ─────────────────────────────────────────────
interface AnswerState {
  answerText?: string;
  selectedOptions?: string[];
  ratingValue?: number;
}

// ─── Question Renderers ────────────────────────────────────────────────────

function TextQuestion({
  answer,
  onChange,
}: {
  question: SurveyQuestion;
  answer: AnswerState;
  onChange: (a: AnswerState) => void;
}) {
  return (
    <Textarea
      value={answer.answerText ?? ''}
      onChange={(e) => onChange({ answerText: e.target.value })}
      placeholder="Type your answer..."
      rows={4}
    />
  );
}

function SingleChoiceQuestion({
  question,
  answer,
  onChange,
}: {
  question: SurveyQuestion;
  answer: AnswerState;
  onChange: (a: AnswerState) => void;
}) {
  const options = question.options ?? [];
  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <label
          key={opt}
          className={`flex items-center gap-4 rounded-lg border p-4 cursor-pointer transition-colors ${
            answer.selectedOptions?.[0] === opt
              ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20'
              : 'border-[var(--border-main)] hover:bg-[var(--bg-card-hover)]'
          }`}
        >
          <input
            type="radio"
            name={`q-${question.id}`}
            value={opt}
            checked={answer.selectedOptions?.[0] === opt}
            onChange={() => onChange({ selectedOptions: [opt] })}
            className="text-sky-700 focus:ring-sky-500"
          />
          <span className={typography.body}>{opt}</span>
        </label>
      ))}
    </div>
  );
}

function MultipleChoiceQuestion({
  question,
  answer,
  onChange,
}: {
  question: SurveyQuestion;
  answer: AnswerState;
  onChange: (a: AnswerState) => void;
}) {
  const options = question.options ?? [];
  const selected = answer.selectedOptions ?? [];

  const toggle = (opt: string) => {
    const next = selected.includes(opt)
      ? selected.filter((s) => s !== opt)
      : [...selected, opt];
    onChange({ selectedOptions: next });
  };

  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <label
          key={opt}
          className={`flex items-center gap-4 rounded-lg border p-4 cursor-pointer transition-colors ${
            selected.includes(opt)
              ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20'
              : 'border-[var(--border-main)] hover:bg-[var(--bg-card-hover)]'
          }`}
        >
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={() => toggle(opt)}
            className="rounded text-sky-700 focus:ring-sky-500"
          />
          <span className={typography.body}>{opt}</span>
        </label>
      ))}
    </div>
  );
}

function LikertQuestion({
  answer,
  onChange,
}: {
  question: SurveyQuestion;
  answer: AnswerState;
  onChange: (a: AnswerState) => void;
}) {
  const labels = ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];
  return (
    <div className="flex flex-wrap gap-2">
      {[1, 2, 3, 4, 5].map((val) => (
        <button
          key={val}
          type="button"
          onClick={() => onChange({ ratingValue: val })}
          className={`flex flex-col items-center gap-1 rounded-lg border p-4 min-w-[80px] transition-colors ${
            answer.ratingValue === val
              ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300'
              : 'border-[var(--border-main)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)]'
          }`}
        >
          <span className="text-lg font-bold">{val}</span>
          <span className="text-xs text-[var(--text-muted)]">{labels[val - 1]}</span>
        </button>
      ))}
    </div>
  );
}

function NpsQuestion({
  answer,
  onChange,
}: {
  question: SurveyQuestion;
  answer: AnswerState;
  onChange: (a: AnswerState) => void;
}) {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 11 }, (_, i) => i).map((val) => (
          <button
            key={val}
            type="button"
            onClick={() => onChange({ ratingValue: val })}
            className={`flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-semibold transition-colors ${
              answer.ratingValue === val
                ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300'
                : 'border-[var(--border-main)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)]'
            }`}
          >
            {val}
          </button>
        ))}
      </div>
      <div className="flex justify-between mt-2">
        <span className={typography.caption}>Not likely</span>
        <span className={typography.caption}>Extremely likely</span>
      </div>
    </div>
  );
}

function RatingQuestion({
  answer,
  onChange,
}: {
  question: SurveyQuestion;
  answer: AnswerState;
  onChange: (a: AnswerState) => void;
}) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((val) => (
        <button
          key={val}
          type="button"
          onClick={() => onChange({ ratingValue: val })}
          className="transition-transform hover:scale-110"
        >
          <svg
            className={`h-8 w-8 ${
              (answer.ratingValue ?? 0) >= val
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-[var(--text-muted)] fill-none'
            }`}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        </button>
      ))}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function SurveyRespondPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.id as string;

  const { data: survey, isLoading: surveyLoading } = useSurveyDetail(surveyId);
  const { data: questions, isLoading: questionsLoading } = useSurveyQuestions(surveyId);
  const submitMutation = useSubmitSurveyResponse();

  const sortedQuestions = useMemo(
    () => (questions ?? []).sort((a, b) => a.orderIndex - b.orderIndex),
    [questions]
  );

  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const total = sortedQuestions.length;
  const progress = total > 0 ? Math.round(((currentIndex + 1) / total) * 100) : 0;

  const updateAnswer = (questionId: string, answer: AnswerState) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = () => {
    const formattedAnswers = sortedQuestions.map((q) => {
      const a = answers[q.id] ?? {};
      return {
        questionId: q.id,
        answerText: a.answerText,
        selectedOptions: a.selectedOptions,
        ratingValue: a.ratingValue,
      };
    });

    submitMutation.mutate(
      { surveyId, answers: formattedAnswers },
      { onSuccess: () => setSubmitted(true) }
    );
  };

  const isLoading = surveyLoading || questionsLoading;

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Surveys', href: '/surveys' },
    { label: survey?.title ?? 'Respond' },
  ];

  const renderQuestion = (question: SurveyQuestion) => {
    const answer = answers[question.id] ?? {};
    const onChange = (a: AnswerState) => updateAnswer(question.id, a);

    switch (question.questionType) {
      case QuestionType.TEXT:
        return <TextQuestion question={question} answer={answer} onChange={onChange} />;
      case QuestionType.SINGLE_CHOICE:
        return <SingleChoiceQuestion question={question} answer={answer} onChange={onChange} />;
      case QuestionType.MULTIPLE_CHOICE:
        return <MultipleChoiceQuestion question={question} answer={answer} onChange={onChange} />;
      case QuestionType.SCALE:
        return <LikertQuestion question={question} answer={answer} onChange={onChange} />;
      case QuestionType.NPS:
        return <NpsQuestion question={question} answer={answer} onChange={onChange} />;
      case QuestionType.RATING:
        return <RatingQuestion question={question} answer={answer} onChange={onChange} />;
      default:
        return <TextQuestion question={question} answer={answer} onChange={onChange} />;
    }
  };

  if (submitted) {
    return (
      <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="surveys">
        <motion.div
          className="flex flex-col items-center justify-center py-24"
          {...dsMotion.pageEnter}
        >
          <CheckCircle className="h-16 w-16 text-success-500" />
          <h2 className="mt-6 text-2xl font-bold text-[var(--text-primary)]">
            Thank you!
          </h2>
          <p className={`mt-2 ${typography.bodySecondary}`}>
            Your response has been submitted successfully.
          </p>
          <Button className="mt-8" onClick={() => router.push('/surveys')}>
            Back to Surveys
          </Button>
        </motion.div>
      </AppLayout>
    );
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="surveys">
      <PermissionGate
        permission={Permissions.SURVEY_SUBMIT}
        fallback={
          <div className="flex flex-col items-center justify-center py-24">
            <p className={typography.sectionTitle}>
              You do not have permission to respond to surveys.
            </p>
          </div>
        }
      >
        <motion.div className="mx-auto max-w-3xl space-y-6" {...dsMotion.pageEnter}>
          {/* Survey header */}
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => router.push('/surveys')}>
              <ArrowLeft className={iconSize.button} />
            </Button>
            <div>
              <h1 className={typography.pageTitle}>
                {surveyLoading ? 'Loading...' : survey?.title}
              </h1>
              {survey?.description && (
                <p className={typography.bodySecondary}>{survey.description}</p>
              )}
            </div>
          </div>

          {survey?.isAnonymous && (
            <div className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-900/20">
              <ShieldCheck className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              <span className={typography.body}>
                This is an anonymous survey. Your identity will not be recorded.
              </span>
            </div>
          )}

          {/* Progress bar */}
          {total > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={typography.caption}>
                  Question {currentIndex + 1} of {total}
                </span>
                <span className={typography.caption}>{progress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-[var(--bg-surface)]">
                <div
                  className="h-2 rounded-full bg-sky-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Question card */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-32 animate-pulse rounded-lg bg-[var(--bg-surface)]"
                />
              ))}
            </div>
          ) : total === 0 ? (
            <Card className="card-aura">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className={typography.sectionTitle}>No questions in this survey</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="card-aura">
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="flex items-start gap-2">
                    <h3 className={typography.sectionTitle}>
                      {sortedQuestions[currentIndex].questionText}
                    </h3>
                    {sortedQuestions[currentIndex].isRequired && (
                      <Badge variant="warning" className="shrink-0">
                        Required
                      </Badge>
                    )}
                  </div>

                  {renderQuestion(sortedQuestions[currentIndex])}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          {total > 0 && (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentIndex((p) => Math.max(0, p - 1))}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className={`${iconSize.button} mr-2`} />
                Previous
              </Button>

              {currentIndex < total - 1 ? (
                <Button
                  onClick={() => setCurrentIndex((p) => Math.min(total - 1, p + 1))}
                >
                  Next
                  <ChevronRight className={`${iconSize.button} ml-2`} />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={submitMutation.isPending}
                >
                  <Send className={`${iconSize.button} mr-2`} />
                  {submitMutation.isPending ? 'Submitting...' : 'Submit'}
                </Button>
              )}
            </div>
          )}
        </motion.div>
      </PermissionGate>
    </AppLayout>
  );
}
