'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { notFound } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { AppLayout } from '@/components/layout';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Award,
  RefreshCw,
  Home,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';

interface Question {
  id: string;
  title: string;
  description?: string;
  questionType: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'FILL_IN_BLANK';
  options?: { id: string; text: string }[];
  correctAnswer?: string;
  correctAnswers?: string[];
  orderIndex: number;
  markingPoints: number;
}

interface Quiz {
  id: string;
  title: string;
  description?: string;
  totalQuestions: number;
  timeLimit?: number;
  passingScore: number;
  status: 'AVAILABLE' | 'COMPLETED' | 'PASSED' | 'FAILED';
  questions: Question[];
  createdAt: string;
}

interface QuizAttempt {
  id: string;
  quizId: string;
  status: 'IN_PROGRESS' | 'SUBMITTED';
  startedAt: string;
  submittedAt?: string;
  score?: number;
  passed?: boolean;
}

interface QuizAnswer {
  questionId: string;
  answer: string | string[];
}

type QuizState = 'intro' | 'taking' | 'submitted';

interface QuizResultDetail {
  questionId: string;
  isCorrect: boolean;
  userAnswer?: string;
  correctAnswer?: string;
  explanation?: string;
}

interface QuizResult {
  score: number;
  correctAnswers: number;
  timeTaken?: string;
  details: QuizResultDetail[];
}

export default function QuizPage() {
  const { id: courseId, quizId } = useParams<{ id: string; quizId: string }>();
  // Quiz data
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [answers, setAnswers] = useState<Map<string, string | string[]>>(new Map());

  // UI state
  const [state, setState] = useState<QuizState>('intro');
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);

  // Timer
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showTimeWarning, setShowTimeWarning] = useState(false);

  // Query for quiz
  const { data: quiz, isLoading } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: async () => {
      const response = await apiClient.get<Quiz>(`/lms/quizzes/${quizId}`);
      if (response.data.timeLimit) {
        setTimeRemaining(response.data.timeLimit * 60);
      }
      return response.data;
    },
    enabled: !!quizId,
  });

  // Mutations
  const startQuizMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<QuizAttempt>(`/lms/quizzes/${quizId}/start`);
      return response.data;
    },
    onSuccess: (data) => {
      setAttempt(data);
      setState('taking');
      setAnswers(new Map());
      setCurrentQuestionIdx(0);
    },
    onError: (err: unknown) => {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to start quiz');
    },
  });

  const submitQuizMutation = useMutation({
    mutationFn: async (quizAnswers: QuizAnswer[]) => {
      if (!attempt) throw new Error('No attempt in progress');
      const response = await apiClient.post<QuizResult>(`/lms/quizzes/attempts/${attempt.id}/submit`, {
        answers: quizAnswers,
      });
      return response.data;
    },
    onSuccess: (data) => {
      setResult(data);
      setState('submitted');
    },
    onError: (err: unknown) => {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to submit quiz');
    },
  });

  const handleStartQuiz = useCallback(async () => {
    await startQuizMutation.mutateAsync();
  }, [startQuizMutation]);

  const handleAnswer = useCallback((questionId: string, answer: string | string[]) => {
    setAnswers(prev => new Map(prev).set(questionId, answer));
  }, []);

  const handleSubmitQuiz = useCallback(async () => {
    if (!quiz) return;

    const quizAnswers: QuizAnswer[] = quiz.questions.map(q => ({
      questionId: q.id,
      answer: answers.get(q.id) || '',
    }));

    await submitQuizMutation.mutateAsync(quizAnswers);
  }, [quiz, answers, submitQuizMutation]);

  const handleRetry = useCallback(async () => {
    setAnswers(new Map());
    setCurrentQuestionIdx(0);
    setResult(null);
    await handleStartQuiz();
  }, [handleStartQuiz]);

  // Stable ref so the interval callback always sees the latest handleSubmitQuiz
  // without causing the effect to restart every render.
  const handleSubmitQuizRef = useRef(handleSubmitQuiz);
  useEffect(() => {
    handleSubmitQuizRef.current = handleSubmitQuiz;
  }, [handleSubmitQuiz]);

  // BUG-001 FIX: Wire the countdown timer to a useEffect so it actually runs.
  // Starts when state transitions to 'taking' with a positive timeRemaining.
  // Stops and cleans up on unmount or when the quiz is no longer in-progress.
  useEffect(() => {
    if (state !== 'taking' || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitQuizRef.current();
          return 0;
        }
        // Show warning badge when less than 5 minutes remain
        setShowTimeWarning(prev - 1 < 300);
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // Only restart the interval when the quiz state changes or a new quiz begins.
    // timeRemaining is intentionally excluded: we do not want to restart the
    // interval on every tick — only when transitioning into 'taking'.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-secondary)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-accent-600 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-[var(--text-muted)]">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (!isLoading && !error && !quiz) {
    notFound();
  }

  if (error || !quiz) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-[var(--bg-secondary)] p-6">
        <div className="max-w-2xl mx-auto">
          <Link href={`/learning/courses/${courseId}`} className="flex items-center gap-1 text-accent-600 hover:text-accent-700 mb-6 w-fit">
            <ArrowLeft className="h-4 w-4" /> Back to Course
          </Link>
          <div className="bg-danger-50 border border-danger-200 rounded-lg p-6 text-center">
            <AlertCircle className="h-12 w-12 text-danger-600 mx-auto mb-3" />
            <p className="text-danger-600 font-medium">{error || 'Quiz not found'}</p>
          </div>
        </div>
        </div>
      </AppLayout>
    );
  }

  const currentQuestion = state === 'taking' ? quiz.questions[currentQuestionIdx] : null;
  const questionsAnswered = Array.from(answers.values()).filter(a => a !== '').length;
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // ─── INTRO STATE ──────────────────────────────────────────────────────────
  if (state === 'intro') {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-[var(--bg-surface)] to-accent-50 p-6">
        <div className="max-w-2xl mx-auto">
          <Link href={`/learning/courses/${courseId}`} className="flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-8 w-fit">
            <ArrowLeft className="h-4 w-4" /> Back to Course
          </Link>

          <div className="skeuo-card overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-accent-600 to-accent-700 text-white p-8">
              <h1 className="text-2xl font-bold skeuo-emboss mb-2">{quiz.title}</h1>
              {quiz.description && (
                <p className="text-accent-100">{quiz.description}</p>
              )}
            </div>

            {/* Content */}
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-accent-50 rounded-lg p-4 border border-accent-200">
                  <div className="text-2xl font-bold text-accent-700">{quiz.totalQuestions}</div>
                  <div className="text-body-secondary">Total Questions</div>
                </div>
                {quiz.timeLimit && (
                  <div className="bg-warning-50 rounded-lg p-4 border border-warning-200">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-warning-600" />
                      <div>
                        <div className="text-lg font-bold text-warning-700">{quiz.timeLimit}</div>
                        <div className="text-xs text-[var(--text-secondary)]">Minutes</div>
                      </div>
                    </div>
                  </div>
                )}
                <div className="bg-success-50 rounded-lg p-4 border border-success-200">
                  <div className="text-2xl font-bold text-success-700">{quiz.passingScore}%</div>
                  <div className="text-body-secondary">Passing Score</div>
                </div>
              </div>

              <div className="bg-[var(--bg-surface)] rounded-lg p-4 border border-[var(--border-main)]">
                <h3 className="font-semibold text-[var(--text-primary)] mb-3">Instructions:</h3>
                <ul className="space-y-2 text-sm text-[var(--text-primary)]">
                  <li className="flex gap-2">
                    <span className="text-accent-600 font-bold">•</span>
                    <span>Answer all questions before submitting</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-accent-600 font-bold">•</span>
                    <span>You can review and change your answers before submission</span>
                  </li>
                  {quiz.timeLimit && (
                    <li className="flex gap-2">
                      <span className="text-accent-600 font-bold">•</span>
                      <span>The quiz will auto-submit when time expires</span>
                    </li>
                  )}
                  <li className="flex gap-2">
                    <span className="text-accent-600 font-bold">•</span>
                    <span>You need a score of {quiz.passingScore}% or higher to pass</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={handleStartQuiz}
                disabled={startQuizMutation.isPending}
                className="w-full px-6 py-4 bg-accent-600 text-white rounded-lg font-medium hover:bg-accent-700 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              >
                {startQuizMutation.isPending ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Starting...
                  </>
                ) : (
                  'Start Quiz'
                )}
              </button>
            </div>
          </div>
        </div>
        </div>
      </AppLayout>
    );
  }

  // ─── TAKING QUIZ STATE ────────────────────────────────────────────────────
  if (state === 'taking' && currentQuestion) {
    const answerValue = answers.get(currentQuestion.id) || '';
    const _isAnswered = answerValue !== '';
    const isLastQuestion = currentQuestionIdx === quiz.questions.length - 1;

    return (
      <AppLayout>
      <div className="min-h-screen bg-[var(--bg-secondary)] flex flex-col">
        {/* Header */}
        <div className="bg-[var(--bg-card)] border-b border-[var(--border-main)] sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-6 py-4 row-between">
            <div>
              <h2 className="font-semibold text-[var(--text-primary)]">{quiz.title}</h2>
              <p className="text-caption">Question {currentQuestionIdx + 1} of {quiz.questions.length}</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-body-secondary">Progress:</span>
                <div className="w-32 h-2 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent-600 transition-all duration-300"
                    style={{ width: `${((currentQuestionIdx + 1) / quiz.questions.length) * 100}%` }}
                  />
                </div>
              </div>
              {quiz.timeLimit && (
                <div className={`flex items-center gap-2 px-4 py-1 rounded-lg ${
                  showTimeWarning ? 'bg-danger-50 border border-danger-200' : 'bg-[var(--bg-surface)]'
                }`}>
                  <Clock className={`h-4 w-4 ${showTimeWarning ? 'text-danger-600' : 'text-[var(--text-secondary)]'}`} />
                  <span className={`text-sm font-medium ${showTimeWarning ? 'text-danger-600' : 'text-[var(--text-secondary)]'}`}>
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            {/* Question */}
            <div className="skeuo-card p-8 mb-6">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">{currentQuestion.title}</h3>
                {currentQuestion.description && (
                  <p className="text-[var(--text-secondary)]">{currentQuestion.description}</p>
                )}
              </div>

              {/* Question options based on type */}
              <div className="space-y-4">
                {currentQuestion.questionType === 'SINGLE_CHOICE' && currentQuestion.options && (
                  <div className="space-y-4">
                    {currentQuestion.options.map(option => (
                      <label key={option.id} className="flex items-start gap-4 p-4 border rounded-lg cursor-pointer hover:bg-accent-50 transition-colors" style={{
                        borderColor: answerValue === option.id ? 'var(--accent-primary)' : 'var(--border-subtle)',
                        backgroundColor: answerValue === option.id ? 'var(--status-info-bg)' : '',
                      }}>
                        <input
                          type="radio"
                          name={currentQuestion.id}
                          value={option.id}
                          checked={answerValue === option.id}
                          onChange={e => handleAnswer(currentQuestion.id, e.target.value)}
                          className="mt-1"
                        />
                        <span className="text-[var(--text-primary)]">{option.text}</span>
                      </label>
                    ))}
                  </div>
                )}

                {currentQuestion.questionType === 'MULTIPLE_CHOICE' && currentQuestion.options && (
                  <div className="space-y-4">
                    {currentQuestion.options.map(option => {
                      const selectedAnswers = Array.isArray(answerValue) ? answerValue : (answerValue ? [answerValue] : []);
                      return (
                        <label key={option.id} className="flex items-start gap-4 p-4 border rounded-lg cursor-pointer hover:bg-accent-50 transition-colors" style={{
                          borderColor: selectedAnswers.includes(option.id) ? 'var(--accent-primary)' : 'var(--border-subtle)',
                          backgroundColor: selectedAnswers.includes(option.id) ? 'var(--status-info-bg)' : '',
                        }}>
                          <input
                            type="checkbox"
                            value={option.id}
                            checked={selectedAnswers.includes(option.id)}
                            onChange={e => {
                              const current = Array.isArray(answerValue) ? answerValue : (answerValue ? [answerValue] : []);
                              if (e.target.checked) {
                                handleAnswer(currentQuestion.id, [...current, e.target.value]);
                              } else {
                                handleAnswer(currentQuestion.id, current.filter(a => a !== e.target.value));
                              }
                            }}
                            className="mt-1"
                          />
                          <span className="text-[var(--text-primary)]">{option.text}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {currentQuestion.questionType === 'TRUE_FALSE' && (
                  <div className="space-y-4">
                    {['True', 'False'].map(option => (
                      <label key={option} className="flex items-start gap-4 p-4 border rounded-lg cursor-pointer hover:bg-accent-50 transition-colors" style={{
                        borderColor: answerValue === option ? 'var(--accent-primary)' : 'var(--border-subtle)',
                        backgroundColor: answerValue === option ? 'var(--status-info-bg)' : '',
                      }}>
                        <input
                          type="radio"
                          name={currentQuestion.id}
                          value={option}
                          checked={answerValue === option}
                          onChange={e => handleAnswer(currentQuestion.id, e.target.value)}
                          className="mt-1"
                        />
                        <span className="text-[var(--text-primary)] font-medium">{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {currentQuestion.questionType === 'FILL_IN_BLANK' && (
                  <input
                    type="text"
                    value={answerValue}
                    onChange={e => handleAnswer(currentQuestion.id, e.target.value)}
                    placeholder="Type your answer here..."
                    className="w-full px-4 py-2 border border-[var(--border-strong)] rounded-lg focus:outline-none focus:border-accent-600 focus:ring-1 focus:ring-accent-600"
                  />
                )}
              </div>
            </div>

            {/* Question navigator */}
            <div className="skeuo-card p-6 mb-6">
              <h4 className="font-semibold text-[var(--text-primary)] mb-3">Questions ({questionsAnswered}/{quiz.questions.length} answered)</h4>
              <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-12 gap-2">
                {quiz.questions.map((q, idx) => {
                  const qAnswered = answers.has(q.id) && answers.get(q.id) !== '';
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIdx(idx)}
                      className={`w-full h-10 rounded-lg font-medium text-sm transition-colors ${
                        idx === currentQuestionIdx
                          ? 'bg-accent-600 text-white'
                          : qAnswered
                          ? 'bg-success-100 text-success-700 hover:bg-success-200'
                          : 'bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation footer */}
        <div className="bg-[var(--bg-card)] border-t border-[var(--border-main)] sticky bottom-0 z-40">
          <div className="max-w-4xl mx-auto px-6 py-4 row-between">
            <button
              onClick={() => setCurrentQuestionIdx(Math.max(0, currentQuestionIdx - 1))}
              disabled={currentQuestionIdx === 0}
              className="flex items-center gap-2 px-4 py-2 text-[var(--text-primary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>

            <button
              onClick={() => setCurrentQuestionIdx(Math.min(quiz.questions.length - 1, currentQuestionIdx + 1))}
              disabled={isLastQuestion}
              className="flex items-center gap-2 px-4 py-2 text-[var(--text-primary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>

            <PermissionGate permission={Permissions.LMS_ENROLL}>
              <button
                onClick={handleSubmitQuiz}
                disabled={submitQuizMutation.isPending || questionsAnswered < quiz.questions.length}
                className="px-6 py-2 bg-success-600 text-white rounded-lg font-medium hover:bg-success-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              >
                {submitQuizMutation.isPending ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Submit Quiz
                  </>
                )}
              </button>
            </PermissionGate>
          </div>
        </div>
      </div>
      </AppLayout>
    );
  }

  // ─── SUBMITTED STATE ──────────────────────────────────────────────────────
  if (state === 'submitted' && result) {
    const score = result.score || 0;
    const passed = score >= quiz.passingScore;
    const canRetry = (quiz.status === 'AVAILABLE' || quiz.status === 'FAILED') && !passed;

    return (
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-[var(--bg-surface)] to-accent-50 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Result Card */}
          <div className="skeuo-card overflow-hidden mb-6">
            <div className={`bg-gradient-to-r ${passed ? 'from-success-600 to-success-700' : 'from-danger-600 to-danger-700'} text-white p-8 text-center`}>
              <div className="flex justify-center mb-4">
                {passed ? (
                  <div className="p-4 bg-white/20 rounded-full">
                    <CheckCircle2 className="h-16 w-16 text-white" />
                  </div>
                ) : (
                  <div className="p-4 bg-white/20 rounded-full">
                    <XCircle className="h-16 w-16 text-white" />
                  </div>
                )}
              </div>
              <h1 className="text-2xl  font-bold mb-2">{Math.round(score)}%</h1>
              <p className="text-xl font-semibold mb-1">{passed ? 'Quiz Passed!' : 'Quiz Failed'}</p>
              <p className="text-white/90">Passing score: {quiz.passingScore}%</p>
            </div>

            {/* Score details */}
            <div className="p-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-accent-50 rounded-lg p-4 border border-accent-200">
                  <div className="text-body-secondary">Total Questions</div>
                  <div className="text-2xl font-bold text-accent-700">{quiz.totalQuestions}</div>
                </div>
                <div className="bg-success-50 rounded-lg p-4 border border-success-200">
                  <div className="text-body-secondary">Correct</div>
                  <div className="text-2xl font-bold text-success-700">{result.correctAnswers || 0}</div>
                </div>
                <div className="bg-danger-50 rounded-lg p-4 border border-danger-200">
                  <div className="text-body-secondary">Incorrect</div>
                  <div className="text-2xl font-bold text-danger-700">{quiz.totalQuestions - (result.correctAnswers || 0)}</div>
                </div>
                <div className="bg-warning-50 rounded-lg p-4 border border-warning-200">
                  <div className="text-body-secondary">Time Taken</div>
                  <div className="text-2xl font-bold text-warning-700">{result.timeTaken || '-'}</div>
                </div>
              </div>

              {/* Detailed feedback */}
              {result.details && result.details.length > 0 && (
                <div className="mb-8">
                  <h3 className="font-semibold text-[var(--text-primary)] mb-4">Detailed Feedback</h3>
                  <div className="space-y-4">
                    {result.details.map((detail: QuizResultDetail, idx: number) => (
                      <div key={idx} className={`border rounded-lg p-4 ${detail.isCorrect ? 'border-success-200 bg-success-50' : 'border-danger-200 bg-danger-50'}`}>
                        <div className="flex items-start gap-4">
                          {detail.isCorrect ? (
                            <CheckCircle2 className="h-5 w-5 text-success-600 flex-shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="h-5 w-5 text-danger-600 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-[var(--text-primary)]">Q{idx + 1}: {detail.questionId}</p>
                            <p className="text-body-secondary mt-1">Your answer: <span className="font-medium">{detail.userAnswer || 'Not answered'}</span></p>
                            {!detail.isCorrect && detail.correctAnswer && (
                              <p className="text-body-secondary">Correct answer: <span className="font-medium text-success-700">{detail.correctAnswer}</span></p>
                            )}
                            {detail.explanation && (
                              <p className="text-sm text-[var(--text-primary)] mt-2 italic">{detail.explanation}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                {canRetry && (
                  <button
                    onClick={handleRetry}
                    className="flex items-center justify-center gap-2 px-6 py-4 bg-accent-600 text-white rounded-lg font-medium hover:bg-accent-700 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                  >
                    <RefreshCw className="h-4 w-4" /> Retry Quiz
                  </button>
                )}
                {passed && (
                  <button
                    className="flex items-center justify-center gap-2 px-6 py-4 bg-success-600 text-white rounded-lg font-medium hover:bg-success-700 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                  >
                    <Award className="h-4 w-4" /> View Certificate
                  </button>
                )}
                <Link
                  href={`/learning/courses/${courseId}`}
                  className="flex items-center justify-center gap-2 px-6 py-4 border border-[var(--border-strong)] text-[var(--text-primary)] rounded-lg font-medium hover:bg-[var(--bg-surface)]"
                >
                  <Home className="h-4 w-4" /> Back to Course
                </Link>
              </div>
            </div>
          </div>
        </div>
        </div>
      </AppLayout>
    );
  }

  return null;
}
