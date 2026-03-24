'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppLayout } from '@/components/layout';
import { Settings, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';

// Phase 2 stabilization: payments module gated behind feature flag
const PAYMENTS_ENABLED = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === 'true';
import { useAllPaymentConfigs, useSavePaymentConfig, useTestConnection, useToggleConfigActive } from '@/lib/hooks/queries/usePayments';
import { paymentService } from '@/lib/services/payment.service';
import { PaymentProvider, SavePaymentConfigRequest } from '@/lib/types/payment';

const configFormSchema = z.object({
  provider: z.enum(['RAZORPAY', 'STRIPE', 'BANK_TRANSFER', 'PAYPAL'] as const),
  credentialsJson: z.string().min(2, 'Credentials JSON is required'),
  webhookSecret: z.string().optional(),
  webhookUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  testMode: z.boolean().default(false),
});

type ConfigFormData = z.infer<typeof configFormSchema>;

export default function PaymentConfigPage() {
  const router = useRouter();
  const { hasHydrated } = useAuth();

  // All hooks must be called unconditionally before any early returns
  const { data: configs = [] } = useAllPaymentConfigs();
  const saveConfigMutation = useSavePaymentConfig();
  const testConnectionMutation = useTestConnection();
  const toggleConfigMutation = useToggleConfigActive();

  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>('RAZORPAY');
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // BUG-007 FIX: store timer ref to prevent setState on unmounted component
  const savedMsgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ConfigFormData>({
    resolver: zodResolver(configFormSchema),
    defaultValues: {
      provider: 'RAZORPAY',
      testMode: false,
    },
  });

  const selectedConfig = configs.find((c) => c.provider === selectedProvider);

  useEffect(() => {
    if (!PAYMENTS_ENABLED) {
      router.replace('/dashboard');
    }
  }, [router]);

  useEffect(() => () => {
    if (savedMsgTimerRef.current) clearTimeout(savedMsgTimerRef.current);
  }, []);

  useEffect(() => {
    if (selectedConfig) {
      reset({
        provider: selectedConfig.provider,
        credentialsJson: JSON.stringify(selectedConfig.credentials, null, 2),
        webhookSecret: selectedConfig.webhookSecret || '',
        webhookUrl: selectedConfig.webhookUrl || '',
        testMode: selectedConfig.testMode,
      });
    } else {
      reset({
        provider: selectedProvider,
        credentialsJson: '{\n  "api_key": "",\n  "api_secret": ""\n}',
        webhookSecret: '',
        webhookUrl: '',
        testMode: false,
      });
    }
  }, [selectedProvider, selectedConfig, reset]);

  if (!PAYMENTS_ENABLED) {
    return null;
  }

  const onSubmit = async (data: ConfigFormData) => {
    try {
      setErrorMessage(null);
      setSavedMessage(null);
      let credentials: Record<string, unknown>;
      try {
        credentials = JSON.parse(data.credentialsJson) as Record<string, unknown>;
      } catch {
        setErrorMessage('Invalid JSON in credentials field');
        return;
      }
      const request: SavePaymentConfigRequest = {
        provider: data.provider,
        credentials,
        webhookSecret: data.webhookSecret || undefined,
        webhookUrl: data.webhookUrl || undefined,
        testMode: data.testMode,
      };
      await saveConfigMutation.mutateAsync(request);
      setSavedMessage(`${paymentService.getProviderLabel(data.provider)} configuration saved successfully!`);
      if (savedMsgTimerRef.current) clearTimeout(savedMsgTimerRef.current);
      savedMsgTimerRef.current = setTimeout(() => setSavedMessage(null), 5000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save configuration';
      setErrorMessage(message);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTestingConnection(true);
      setTestResult(null);
      const formData = watch();
      let credentials: Record<string, unknown> = {};
      try {
        credentials = JSON.parse(formData.credentialsJson || '{}') as Record<string, unknown>;
      } catch { /* use empty */ }
      const result = await testConnectionMutation.mutateAsync({
        provider: formData.provider,
        credentials,
        testMode: formData.testMode,
      });
      setTestResult(typeof result === 'string'
        ? { success: true, message: result }
        : (result && typeof result === 'object' && 'success' in result && 'message' in result)
          ? result as { success: boolean; message: string }
          : { success: true, message: String(result) });
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleToggleActive = async (provider: PaymentProvider, isActive: boolean) => {
    try {
      setErrorMessage(null);
      await toggleConfigMutation.mutateAsync({ provider, isActive });
      setSavedMessage(
        `${paymentService.getProviderLabel(provider)} has been ${isActive ? 'activated' : 'deactivated'}`
      );
      if (savedMsgTimerRef.current) clearTimeout(savedMsgTimerRef.current);
      savedMsgTimerRef.current = setTimeout(() => setSavedMessage(null), 5000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update configuration status';
      setErrorMessage(message);
    }
  };

  if (!hasHydrated) {
    return (
      <AppLayout activeMenuItem="payments">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="payments">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Settings className="w-8 h-8 text-sky-700" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] skeuo-emboss">
              Payment Configuration
            </h1>
            <p className="text-[var(--text-secondary)] mt-1">
              Configure and manage payment gateway providers
            </p>
          </div>
        </div>

        {/* Notifications */}
        {savedMessage && (
          <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg flex items-center gap-2 text-green-800 dark:text-green-300">
            <CheckCircle className="w-5 h-5" />
            {savedMessage}
          </div>
        )}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg flex items-center gap-2 text-red-800 dark:text-red-300">
            <AlertCircle className="w-5 h-5" />
            {errorMessage}
          </div>
        )}

        {/* Provider Selection */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 text-[var(--text-primary)]">Payment Providers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(['RAZORPAY', 'STRIPE', 'BANK_TRANSFER', 'PAYPAL'] as const).map((provider) => {
              const config = configs.find((c) => c.provider === provider);
              const isSelected = selectedProvider === provider;
              return (
                <button
                  key={provider}
                  onClick={() => setSelectedProvider(provider)}
                  className={`p-4 rounded-lg border-2 transition-colors text-left ${
                    isSelected
                      ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20'
                      : 'border-[var(--border-main)] hover:border-sky-300 dark:hover:border-sky-700'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-[var(--text-primary)]">
                        {paymentService.getProviderLabel(provider)}
                      </h3>
                      <p className="text-sm text-[var(--text-secondary)] mt-1">
                        {config ? 'Configured' : 'Not configured'}
                      </p>
                    </div>
                    {config?.isActive && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                        Active
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Configuration Form */}
        <div className="bg-[var(--bg-input)] rounded-lg border border-[var(--border-main)] p-6">
          <h2 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">
            Configure {paymentService.getProviderLabel(selectedProvider)}
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Test Mode Toggle */}
            <div>
              <label className="flex items-center gap-4 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('testMode')}
                  className="w-5 h-5 rounded border-[var(--border-main)] text-sky-700 focus:ring-sky-500"
                />
                <span className="text-sm font-medium text-[var(--text-secondary)]">
                  Test Mode (use sandbox credentials)
                </span>
              </label>
            </div>

            {/* Credentials */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Credentials (JSON)
              </label>
              <textarea
                {...register('credentialsJson')}
                rows={6}
                className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] font-mono text-sm"
                placeholder='{&#10;  "api_key": "your_api_key",&#10;  "api_secret": "your_api_secret"&#10;}'
              />
              {errors.credentialsJson && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.credentialsJson.message}</p>
              )}
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Enter your provider credentials as JSON. Check your provider dashboard for API keys.
              </p>
            </div>

            {/* Webhook Secret */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Webhook Secret (Optional)
              </label>
              <input
                type="password"
                {...register('webhookSecret')}
                className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)]"
                placeholder="Your webhook secret"
              />
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Used to verify webhook signatures from your payment provider.
              </p>
            </div>

            {/* Webhook URL */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Webhook URL (Optional)
              </label>
              <input
                type="url"
                {...register('webhookUrl')}
                className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)]"
                placeholder="https://your-domain.com/webhooks/payments"
              />
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                URL where your payment provider will send webhook notifications.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4 border-t border-[var(--border-main)]">
              <button
                type="submit"
                disabled={isSubmitting || saveConfigMutation.isPending}
                className="px-6 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isSubmitting || saveConfigMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Configuration'
                )}
              </button>

              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingConnection || testConnectionMutation.isPending}
                className="px-6 py-2 border border-sky-500 text-sky-700 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {testingConnection || testConnectionMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test Connection'
                )}
              </button>
            </div>
          </form>

          {/* Test Result */}
          {testResult && (
            <div
              className={`mt-4 p-4 rounded-lg border ${
                testResult.success
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
              }`}
            >
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                )}
                <p
                  className={`text-sm font-medium ${
                    testResult.success
                      ? 'text-green-800 dark:text-green-300'
                      : 'text-red-800 dark:text-red-300'
                  }`}
                >
                  {testResult.message}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Active Configurations */}
        {configs.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">
              Active Configurations
            </h2>
            <div className="space-y-4">
              {configs.map((config) => (
                <div
                  key={config.id}
                  className="bg-[var(--bg-input)] rounded-lg border border-[var(--border-main)] p-4 flex items-center justify-between"
                >
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)]">
                      {paymentService.getProviderLabel(config.provider)}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {config.testMode ? 'Test Mode' : 'Live Mode'} • Updated{' '}
                      {paymentService.formatDate(config.updatedAt)}
                    </p>
                  </div>
                  <label className="flex items-center gap-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.isActive}
                      onChange={(e) =>
                        handleToggleActive(config.provider, e.target.checked)
                      }
                      disabled={toggleConfigMutation.isPending}
                      className="w-5 h-5 rounded border-[var(--border-main)] text-sky-700 focus:ring-sky-500 disabled:opacity-50"
                    />
                    <span className="text-sm font-medium text-[var(--text-secondary)]">
                      {config.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
