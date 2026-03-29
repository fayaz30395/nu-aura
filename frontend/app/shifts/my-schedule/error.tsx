'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Shift page error:', error);
  }, [error]);

  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Something went wrong</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{error.message}</p>
      </div>
      <button
        onClick={reset}
        className="px-4 py-2 bg-accent-700 hover:bg-accent-800 text-white rounded-lg text-sm font-medium transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}
