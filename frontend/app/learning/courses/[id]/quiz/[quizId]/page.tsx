'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  Download,
  RefreshCw,
  Home,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';

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
  const router = useRouter();

  // Quiz data
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [answers, setAnswers] = useState<Map<string, string | string[]>>(new Map());

  // UI state
  const [state, setState] = useState<QuizState>('intro');
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);

  // Timer
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showTimeWarning, setShowTimeWarning] = useState(false);

  useEffect(() => {
    loadQuiz();
  }, [quizId]);

  async function loadQuiz() {
    try {
      setLoading(true);
      const response = await apiClient.get<Quiz>(`/lms/quizzes/${quizId}`);
      setQuiz(response.data);
      if (response.data.timeLimit) {
        setTimeRemaining(response.data.timeLimit * 60);
      }
    } catch (err) {
      setError('Failed to load quiz');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleStartQuiz = useCallback(async () => {
    try {
      setSubmitting(true);
      const response = await apiClient.post<QuizAttempt>(`/lms/quizzes/${quizId}/start`);
      setAttempt(response.data);
      setState('taking');
      // Reset answers
      setAnswers(new Map());
      setCurrentQuestionIdx(0);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to start quiz');
    } finally {
      setSubmitting(false);
    }
  }, [quizId]);

  const handleAnswer = useCallback((questionId: string, answer: string | string[]) => {
    setAnswers(prev => new Map(prev).set(questionId, answer));
  }, []);

  const handleSubmitQuiz = useCallback(async () => {
    if (!attempt) return;

    try {
      setSubmitting(true);
      const quizAnswers: QuizAnswer[] = quiz!.questions.map(q => ({
        questionId: q.id,
        answer: answers.get(q.id) || '',
      }));

      const response = await apiClient.post(`/lms/quizzes/attempts/${attempt.id}/submit`, {
        answers: quizAnswers,
      });

      setResult(response.data);
      setState('submitted');
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  }, [attempt, quiz, answers]);

  const handleRetry = useCallback(async () => {
    setAnswers(new Map());
    setCurrentQuestionIdx(0);
    setResult(null);
    await handleStartQuiz();
  }, [handleStartQuiz]);

  // Timer countdown
  useEffect(() => {
    if (state !== 'taking' || !timeRemaining) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Auto-submit when time is up
          handleSubmitQuiz();
          return 0;
        }
        setShowTimeWarning(prev < 300); // Show warning when less than 5 min
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [state, timeRemaining, handleSubmitQuiz]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-gray-500">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-surface-50 p-6">
        <div className="max-w-2xl mx-auto">
          <Link href={`/learning/courses/${courseId}`} className="flex items-center gap-1 text-blue-600 hover:text-blue-700 mb-6 w-fit">
            <ArrowLeft className="h-4 w-4" /> Back to Course
          </Link>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-3" />
            <p className="text-red-600 font-medium">{error || 'Quiz not found'}</p>
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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
        <div className="max-w-2xl mx-auto">
          <Link href={`/learning/courses/${courseId}`} className="flex items-center gap-1 text-gray-600 hover:text-gray-900 mb-8 w-fit">
            <ArrowLeft className="h-4 w-4" /> Back to Course
          </Link>

          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-8">
              <h1 className="text-3xl font-bold mb-2">{quiz.title}</h1>
              {quiz.description && (
                <p className="text-blue-100">{quiz.description}</p>
              )}
            </div>

            {/* Content */}
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="text-2xl font-bold text-blue-700">{quiz.totalQuestions}</div>
                  <div className="text-sm text-gray-600">Total Questions</div>
                </div>
                {quiz.timeLimit && (
                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-yellow-600" />
                      <div>
                        <div className="text-lg font-bold text-yellow-700">{quiz.timeLimit}</div>
                        <div className="text-xs text-gray-600">Minutes</div>
                      </div>
                    </div>
                  </div>
                )}
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="text-2xl font-bold text-green-700">{quiz.passingScore}%</div>
                  <div className="text-sm text-gray-600">Passing Score</div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">Instructions:</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>Answer all questions before submitting</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>You can review and change your answers before submission</span>
                  </li>
                  {quiz.timeLimit && (
                    <li className="flex gap-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span>The quiz will auto-submit when time expires</span>
                    </li>
                  )}
                  <li className="flex gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>You need a score of {quiz.passingScore}% or higher to pass</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={handleStartQuiz}
                disabled={submitting}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting ? (
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
    const isAnswered = answerValue !== '';
    const isLastQuestion = currentQuestionIdx === quiz.questions.length - 1;

    return (
      <AppLayout>
      <div className="min-h-screen bg-surface-50 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">{quiz.title}</h2>
              <p className="text-xs text-gray-500">Question {currentQuestionIdx + 1} of {quiz.questions.length}</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Progress:</span>
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${((currentQuestionIdx + 1) / quiz.questions.length) * 100}%` }}
                  />
                </div>
              </div>
              {quiz.timeLimit && (
                <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${
                  showTimeWarning ? 'bg-red-50 border border-red-200' : 'bg-gray-100'
                }`}>
                  <Clock className={`h-4 w-4 ${showTimeWarning ? 'text-red-600' : 'text-gray-600'}`} />
                  <span className={`text-sm font-medium ${showTimeWarning ? 'text-red-600' : 'text-gray-600'}`}>
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
            <div className="bg-white rounded-lg shadow p-8 mb-6">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{currentQuestion.title}</h3>
                {currentQuestion.description && (
                  <p className="text-gray-600">{currentQuestion.description}</p>
                )}
              </div>

              {/* Question options based on type */}
              <div className="space-y-4">
                {currentQuestion.questionType === 'SINGLE_CHOICE' && currentQuestion.options && (
                  <div className="space-y-3">
                    {currentQuestion.options.map(option => (
                      <label key={option.id} className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-blue-50 transition-colors" style={{
                        borderColor: answerValue === option.id ? '#3b82f6' : '#e5e7eb',
                        backgroundColor: answerValue === option.id ? '#eff6ff' : '',
                      }}>
                        <input
                          type="radio"
                          name={currentQuestion.id}
                          value={option.id}
                          checked={answerValue === option.id}
                          onChange={e => handleAnswer(currentQuestion.id, e.target.value)}
                          className="mt-1"
                        />
                        <span className="text-gray-700">{option.text}</span>
                      </label>
                    ))}
                  </div>
                )}

                {currentQuestion.questionType === 'MULTIPLE_CHOICE' && currentQuestion.options && (
                  <div className="space-y-3">
                    {currentQuestion.options.map(option => {
                      const selectedAnswers = Array.isArray(answerValue) ? answerValue : (answerValue ? [answerValue] : []);
                      return (
                        <label key={option.id} className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-blue-50 transition-colors" style={{
                          borderColor: selectedAnswers.includes(option.id) ? '#3b82f6' : '#e5e7eb',
                          backgroundColor: selectedAnswers.includes(option.id) ? '#eff6ff' : '',
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
                          <span className="text-gray-700">{option.text}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {currentQuestion.questionType === 'TRUE_FALSE' && (
                  <div className="space-y-3">
                    {['True', 'False'].map(option => (
                      <label key={option} className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-blue-50 transition-colors" style={{
                        borderColor: answerValue === option ? '#3b82f6' : '#e5e7eb',
                        backgroundColor: answerValue === option ? '#eff6ff' : '',
                      }}>
                        <input
                          type="radio"
                          name={currentQuestion.id}
                          value={option}
                          checked={answerValue === option}
                          onChange={e => handleAnswer(currentQuestion.id, e.target.value)}
                          className="mt-1"
                        />
                        <span className="text-gray-700 font-medium">{option}</span>
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                )}
              </div>
            </div>

            {/* Question navigator */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Questions ({questionsAnswered}/{quiz.questions.length} answered)</h4>
              <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-12 gap-2">
                {quiz.questions.map((q, idx) => {
                  const qAnswered = answers.has(q.id) && answers.get(q.id) !== '';
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIdx(idx)}
                      className={`w-full h-10 rounded-lg font-medium text-sm transition-colors ${
                        idx === currentQuestionIdx
                          ? 'bg-blue-600 text-white'
                          : qAnswered
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
        <div className="bg-white border-t border-gray-200 sticky bottom-0 z-40">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => setCurrentQuestionIdx(Math.max(0, currentQuestionIdx - 1))}
              disabled={currentQuestionIdx === 0}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>

            <button
              onClick={() => setCurrentQuestionIdx(Math.min(quiz.questions.length - 1, currentQuestionIdx + 1))}
              disabled={isLastQuestion}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>

            <button
              onClick={handleSubmitQuiz}
              disabled={submitting || questionsAnswered < quiz.questions.length}
              className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? (
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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Result Card */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
            <div className={`bg-gradient-to-r ${passed ? 'from-green-600 to-green-700' : 'from-red-600 to-red-700'} text-white p-8 text-center`}>
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
              <h1 className="text-4xl font-bold mb-2">{Math.round(score)}%</h1>
              <p className="text-xl font-semibold mb-1">{passed ? 'Quiz Passed!' : 'Quiz Failed'}</p>
              <p className="text-white/90">Passing score: {quiz.passingScore}%</p>
            </div>

            {/* Score details */}
            <div className="p-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="text-sm text-gray-600">Total Questions</div>
                  <div className="text-2xl font-bold text-blue-700">{quiz.totalQuestions}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="text-sm text-gray-600">Correct</div>
                  <div className="text-2xl font-bold text-green-700">{result.correctAnswers || 0}</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <div className="text-sm text-gray-600">Incorrect</div>
                  <div className="text-2xl font-bold text-red-700">{quiz.totalQuestions - (result.correctAnswers || 0)}</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <div className="text-sm text-gray-600">Time Taken</div>
                  <div className="text-2xl font-bold text-yellow-700">{result.timeTaken || '-'}</div>
                </div>
              </div>

              {/* Detailed feedback */}
              {result.details && result.details.length > 0 && (
                <div className="mb-8">
                  <h3 className="font-semibold text-gray-900 mb-4">Detailed Feedback</h3>
                  <div className="space-y-4">
                    {result.details.map((detail: QuizResultDetail, idx: number) => (
                      <div key={idx} className={`border rounded-lg p-4 ${detail.isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                        <div className="flex items-start gap-3">
                          {detail.isCorrect ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">Q{idx + 1}: {detail.questionTitle}</p>
                            <p className="text-sm text-gray-600 mt-1">Your answer: <span className="font-medium">{detail.userAnswer || 'Not answered'}</span></p>
                            {!detail.isCorrect && detail.correctAnswer && (
                              <p className="text-sm text-gray-600">Correct answer: <span className="font-medium text-green-700">{detail.correctAnswer}</span></p>
                            )}
                            {detail.explanation && (
                              <p className="text-sm text-gray-700 mt-2 italic">{detail.explanation}</p>
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
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                  >
                    <RefreshCw className="h-4 w-4" /> Retry Quiz
                  </button>
                )}
                {passed && (
                  <button
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
                  >
                    <Award className="h-4 w-4" /> View Certificate
                  </button>
                )}
                <Link
                  href={`/learning/courses/${courseId}`}
                  className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
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
