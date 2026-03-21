'use client';

import React, { useState } from 'react';
import { TestTube, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useConnectionTest } from '@/lib/hooks/queries/useConnectors';
import { useToast } from '@/components/notifications/ToastProvider';

interface ConnectionTestButtonProps {
  connectorId: string;
  isDisabled?: boolean;
}

interface TestResult {
  success: boolean;
  message: string;
  latencyMs: number;
}

export function ConnectionTestButton({ connectorId, isDisabled }: ConnectionTestButtonProps) {
  const toast = useToast();
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const testMutation = useConnectionTest();

  const handleTest = async () => {
    setTestResult(null);

    testMutation.mutate(connectorId, {
      onSuccess: (result) => {
        setTestResult(result);
        if (result.success) {
          toast.success(`Connection successful! (${result.latencyMs}ms)`);
        } else {
          toast.error(`Connection failed: ${result.message}`);
        }
      },
      onError: (error) => {
        const message = error instanceof Error ? error.message : 'Test failed';
        setTestResult({
          success: false,
          message,
          latencyMs: 0,
        });
        toast.error(message);
      },
    });
  };

  return (
    <div className="space-y-4">
      <Button
        variant="outline"
        size="sm"
        onClick={handleTest}
        disabled={isDisabled || testMutation.isPending}
        leftIcon={
          testMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <TestTube className="h-4 w-4" />
          )
        }
      >
        {testMutation.isPending ? 'Testing...' : 'Test Connection'}
      </Button>

      {testResult && (
        <div
          className={`flex items-start gap-3 p-4 rounded-lg ${
            testResult.success
              ? 'bg-emerald-50 dark:bg-emerald-900/20'
              : 'bg-red-50 dark:bg-red-900/20'
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
          )}
          <div className={testResult.success ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}>
            <p className="text-sm font-medium">{testResult.message}</p>
            {testResult.latencyMs > 0 && (
              <p className="text-xs mt-1 opacity-75">Latency: {testResult.latencyMs}ms</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
