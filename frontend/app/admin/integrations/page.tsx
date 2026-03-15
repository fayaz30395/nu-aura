'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings,
  MessageSquare,
  CreditCard,
  Loader2,
  Send,
  TestTube,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
  IntegrationStatus,
  SmsSendRequest,
  SmsTestRequest,
  IntegrationTestResponse,
  SmsSendResponse,
} from '@/lib/types/integration';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePermissions, Roles } from '@/lib/hooks/usePermissions';
import { useToast } from '@/components/notifications/ToastProvider';
import {
  useSmsStatus,
  useIntegrationPaymentStatus as usePaymentStatus,
  useSmsTemplates,
  useTestSms,
  useSendSms,
  useTestPayment,
} from '@/lib/hooks/queries/useIntegrations';

const ADMIN_ACCESS_ROLES = [Roles.SUPER_ADMIN, Roles.TENANT_ADMIN, Roles.HR_ADMIN, Roles.HR_MANAGER];

export default function AdminIntegrationsPage() {
  const toast = useToast();
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuth();
  const { hasAnyRole, isReady } = usePermissions();

  // React Query hooks
  const { data: smsStatus, isLoading: smsLoading } = useSmsStatus();
  const { data: paymentStatus, isLoading: paymentLoading } = usePaymentStatus();
  const { data: smsTemplates = {} } = useSmsTemplates();
  const testSmsMutation = useTestSms();
  const sendSmsMutation = useSendSms();
  const testPaymentMutation = useTestPayment();

  const loading = smsLoading || paymentLoading;

  // SMS Test State
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [smsTestResult, setSmsTestResult] = useState<IntegrationTestResponse | null>(null);

  // SMS Send State
  const [sendPhoneNumber, setSendPhoneNumber] = useState('');
  const [sendMessage, setSendMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [smsSendResult, setSmsSendResult] = useState<SmsSendResponse | null>(null);

  // Payment Test State
  const [paymentTestResult, setPaymentTestResult] = useState<IntegrationTestResponse | null>(null);

  // R2-008 FIX: return null immediately after router.push() so the component
  // stops rendering and doesn't briefly expose privileged UI before navigation.
  if (hasHydrated && isReady && isAuthenticated && !hasAnyRole(...ADMIN_ACCESS_ROLES)) {
    router.push('/home');
    return null;
  }

  if (hasHydrated && isReady && !isAuthenticated) {
    router.push('/auth/login');
    return null;
  }

  const handleTestSms = () => {
    if (!testPhoneNumber) {
      toast.warning('Please enter a phone number');
      return;
    }

    setSmsTestResult(null);
    const request: SmsTestRequest = { phoneNumber: testPhoneNumber };
    testSmsMutation.mutate(request, {
      onSuccess: (result) => {
        setSmsTestResult(result);
      },
      onError: (error: unknown) => {
        setSmsTestResult({
          success: false,
          message: (error instanceof Error ? error.message : String(error)) || 'Failed to test SMS',
          timestamp: new Date().toISOString(),
        });
      },
    });
  };

  const handleSendSms = () => {
    if (!sendPhoneNumber) {
      toast.warning('Please enter a phone number');
      return;
    }

    if (!sendMessage && !selectedTemplate) {
      toast.warning('Please enter a message or select a template');
      return;
    }

    setSmsSendResult(null);
    const request: SmsSendRequest = {
      phoneNumber: sendPhoneNumber,
      message: selectedTemplate ? undefined : sendMessage,
      templateId: selectedTemplate || undefined,
    };

    sendSmsMutation.mutate(request, {
      onSuccess: (result) => {
        setSmsSendResult(result);
      },
      onError: (error: unknown) => {
        setSmsSendResult({
          messageId: '',
          success: false,
          phoneNumber: sendPhoneNumber,
          errorMessage: (error instanceof Error ? error.message : String(error)) || 'Failed to send SMS',
          timestamp: new Date().toISOString(),
        });
      },
    });
  };

  const handleTestPayment = () => {
    setPaymentTestResult(null);
    testPaymentMutation.mutate(undefined, {
      onSuccess: (result) => {
        setPaymentTestResult(result);
      },
      onError: (error: unknown) => {
        setPaymentTestResult({
          success: false,
          message: (error instanceof Error ? error.message : String(error)) || 'Failed to test payment gateway',
          timestamp: new Date().toISOString(),
        });
      },
    });
  };

  const renderStatusBadge = (status: IntegrationStatus | null) => {
    if (!status) return null;

    const isActive = status.configured && status.enabled;

    return (
      <div className="flex items-center gap-2">
        {isActive ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              Active
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-100 dark:bg-rose-900/30">
            <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            <span className="text-sm font-medium text-rose-700 dark:text-rose-300">
              Inactive
            </span>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary-500/25">
            <Settings className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-50">
              Integrations
            </h1>
            <p className="text-surface-600 dark:text-surface-400 mt-1">
              Manage third-party integrations and external services
            </p>
          </div>
        </div>
        {/* Refresh disabled - data is automatically refetched by React Query */}
      </div>

      {/* SMS Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle>SMS Notifications</CardTitle>
                <CardDescription>Twilio SMS integration for notifications</CardDescription>
              </div>
            </div>
            {renderStatusBadge(smsStatus)}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Configuration Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-surface-200 dark:border-surface-700">
              <p className="text-sm text-surface-500 dark:text-surface-400">Provider</p>
              <p className="text-lg font-semibold text-surface-900 dark:text-surface-50 mt-1">
                {smsStatus?.provider || 'Not configured'}
              </p>
            </div>
            <div className="p-4 rounded-lg border border-surface-200 dark:border-surface-700">
              <p className="text-sm text-surface-500 dark:text-surface-400">Status</p>
              <p className="text-lg font-semibold text-surface-900 dark:text-surface-50 mt-1">
                {smsStatus?.configured ? 'Configured' : 'Not configured'}
              </p>
            </div>
            <div className="p-4 rounded-lg border border-surface-200 dark:border-surface-700">
              <p className="text-sm text-surface-500 dark:text-surface-400">Last Checked</p>
              <p className="text-lg font-semibold text-surface-900 dark:text-surface-50 mt-1">
                {smsStatus?.lastChecked
                  ? new Date(smsStatus.lastChecked).toLocaleTimeString()
                  : 'Never'}
              </p>
            </div>
          </div>

          {/* Test SMS */}
          <div className="p-4 rounded-lg bg-surface-50 dark:bg-surface-800">
            <h3 className="font-semibold text-surface-900 dark:text-surface-50 mb-3 flex items-center gap-2">
              <TestTube className="h-4 w-4" />
              Test SMS Service
            </h3>
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder="+1234567890"
                  value={testPhoneNumber}
                  onChange={(e) => setTestPhoneNumber(e.target.value)}
                  disabled={testSmsMutation.isPending}
                />
              </div>
              <Button onClick={handleTestSms} disabled={testSmsMutation.isPending || !smsStatus?.configured}>
                {testSmsMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Test
                  </>
                )}
              </Button>
            </div>
            {smsTestResult && (
              <div
                className={`mt-3 p-3 rounded-lg flex items-start gap-2 ${
                  smsTestResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300'
                }`}
              >
                {smsTestResult.success ? (
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                )}
                <span className="text-sm">{smsTestResult.message}</span>
              </div>
            )}
          </div>

          {/* Send SMS */}
          <div className="p-4 rounded-lg bg-surface-50 dark:bg-surface-800">
            <h3 className="font-semibold text-surface-900 dark:text-surface-50 mb-3 flex items-center gap-2">
              <Send className="h-4 w-4" />
              Send SMS
            </h3>
            <div className="space-y-3">
              <div>
                <Label>Phone Number</Label>
                <Input
                  placeholder="+1234567890"
                  value={sendPhoneNumber}
                  onChange={(e) => setSendPhoneNumber(e.target.value)}
                  disabled={sendSmsMutation.isPending}
                />
              </div>
              <div>
                <Label>Template (Optional)</Label>
                <select
                  className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-900"
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  disabled={sendSmsMutation.isPending}
                >
                  <option value="">Select a template...</option>
                  {Object.keys(smsTemplates).map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
              </div>
              {!selectedTemplate && (
                <div>
                  <Label>Message</Label>
                  <textarea
                    className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-900"
                    placeholder="Enter your message here..."
                    value={sendMessage}
                    onChange={(e) => setSendMessage(e.target.value)}
                    disabled={sendSmsMutation.isPending}
                    rows={4}
                  />
                </div>
              )}
              <Button onClick={handleSendSms} disabled={sendSmsMutation.isPending || !smsStatus?.configured}>
                {sendSmsMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send SMS
                  </>
                )}
              </Button>
            </div>
            {smsSendResult && (
              <div
                className={`mt-3 p-3 rounded-lg flex items-start gap-2 ${
                  smsSendResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300'
                }`}
              >
                {smsSendResult.success ? (
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                )}
                <div className="text-sm">
                  {smsSendResult.success ? (
                    <>
                      SMS sent successfully!
                      <br />
                      Message ID: {smsSendResult.messageId}
                    </>
                  ) : (
                    smsSendResult.errorMessage
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Configuration Note */}
          {!smsStatus?.configured && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-100">
                  SMS Integration Not Configured
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  To enable SMS notifications, configure the environment variables:
                  TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Gateway Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <CreditCard className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle>Payment Gateway</CardTitle>
                <CardDescription>Stripe payment processing integration</CardDescription>
              </div>
            </div>
            {renderStatusBadge(paymentStatus)}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Configuration Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-surface-200 dark:border-surface-700">
              <p className="text-sm text-surface-500 dark:text-surface-400">Provider</p>
              <p className="text-lg font-semibold text-surface-900 dark:text-surface-50 mt-1">
                {paymentStatus?.provider || 'Not configured'}
              </p>
            </div>
            <div className="p-4 rounded-lg border border-surface-200 dark:border-surface-700">
              <p className="text-sm text-surface-500 dark:text-surface-400">Status</p>
              <p className="text-lg font-semibold text-surface-900 dark:text-surface-50 mt-1">
                {paymentStatus?.configured ? 'Configured' : 'Not configured'}
              </p>
            </div>
            <div className="p-4 rounded-lg border border-surface-200 dark:border-surface-700">
              <p className="text-sm text-surface-500 dark:text-surface-400">Supported Methods</p>
              <p className="text-lg font-semibold text-surface-900 dark:text-surface-50 mt-1">
                {paymentStatus?.supportedMethods?.length || 0}
              </p>
            </div>
          </div>

          {/* Test Payment Gateway */}
          <div className="p-4 rounded-lg bg-surface-50 dark:bg-surface-800">
            <h3 className="font-semibold text-surface-900 dark:text-surface-50 mb-3 flex items-center gap-2">
              <TestTube className="h-4 w-4" />
              Test Payment Gateway
            </h3>
            <Button onClick={handleTestPayment} disabled={testPaymentMutation.isPending || !paymentStatus?.configured}>
              {testPaymentMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <TestTube className="h-4 w-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>
            {paymentTestResult && (
              <div
                className={`mt-3 p-3 rounded-lg flex items-start gap-2 ${
                  paymentTestResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300'
                }`}
              >
                {paymentTestResult.success ? (
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                )}
                <span className="text-sm">{paymentTestResult.message}</span>
              </div>
            )}
          </div>

          {/* Supported Payment Methods */}
          {paymentStatus?.supportedMethods && paymentStatus.supportedMethods.length > 0 && (
            <div className="p-4 rounded-lg bg-surface-50 dark:bg-surface-800">
              <h3 className="font-semibold text-surface-900 dark:text-surface-50 mb-3">
                Supported Payment Methods
              </h3>
              <div className="flex flex-wrap gap-2">
                {paymentStatus.supportedMethods.map((method) => (
                  <span
                    key={method}
                    className="px-3 py-1.5 rounded-full bg-surface-200 dark:bg-surface-700 text-sm text-surface-700 dark:text-surface-300"
                  >
                    {method}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Configuration Note */}
          {!paymentStatus?.configured && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-100">
                  Payment Gateway Not Configured
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  To enable payment processing, configure the environment variables:
                  STRIPE_API_KEY, STRIPE_PUBLISHABLE_KEY
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
