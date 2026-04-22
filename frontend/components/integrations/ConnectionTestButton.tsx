'use client';

import React, {useState} from 'react';
import {CheckCircle2, Loader2, TestTube, XCircle} from 'lucide-react';
import {Button} from '@/components/ui/Button';
import {useConnectionTest} from '@/lib/hooks/queries/useConnectors';
import {useToast} from '@/components/notifications/ToastProvider';

interface ConnectionTestButtonProps {
  connectorId: string;
  isDisabled?: boolean;
}

interface TestResult {
  success: boolean;
  message: string;
  latencyMs: number;
}

export function ConnectionTestButton({connectorId, isDisabled}: ConnectionTestButtonProps) {
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
            <Loader2 className="h-4 w-4 animate-spin"/>
          ) : (
            <TestTube className="h-4 w-4"/>
          )
        }
      >
        {testMutation.isPending ? 'Testing...' : 'Test Connection'}
      </Button>
      {testResult && (
        <div
          className={`flex items-start gap-4 p-4 rounded-lg ${
            testResult.success
              ? "bg-status-success-bg"
              : "bg-status-danger-bg"
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className='h-5 w-5 flex-shrink-0 mt-0.5 text-status-success-text'/>
          ) : (
            <XCircle className='h-5 w-5 flex-shrink-0 mt-0.5 text-status-danger-text'/>
          )}
          <div
            className={testResult.success ? 'text-status-success-text' : 'text-status-danger-text'}>
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
