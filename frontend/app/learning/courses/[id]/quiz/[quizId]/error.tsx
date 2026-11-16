'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function QuizIdError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="learning/courses/[id]/quiz/[quizId]"/>;
}
