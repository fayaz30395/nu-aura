'use client';

import { useEffect } from 'react';
import { RefreshCw, Home } from 'lucide-react';
import { handleError, getUserMessage, categorizeError } from '@/lib/utils/error-handler';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function PageError({ error, reset }: ErrorProps) {
  useEffect(() => {
    handleError(error, { source: 'page-error-boundary', digest: error.digest });
  }, [error]);

  const category = categorizeError(error);
  const userMessage = getUserMessage(category, error.message);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <span className="text-red-600 dark:text-red-400 text-xl">!</span>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Something went wrong</h2>
        <p className="text-gray-600 dark:text-gray-400">{userMessage}</p>
        <div className="flex flex-col gap-2">
          <button onClick={reset} className="flex items-center justify-center gap-2 px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-sm font-medium">
            <RefreshCw className="h-4 w-4" /> Try Again
          </button>
          <button onClick={() => (window.location.href = '/me/dashboard')} className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            <Home className="h-4 w-4" /> Go to Home
          </button>
        </div>
      </div>
    </div>
  );
}
