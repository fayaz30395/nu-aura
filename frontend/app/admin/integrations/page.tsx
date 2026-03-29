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
  AlertCircle,
  CheckCircle2,
  XCircle,
  Zap,
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
import { isProduction } from '@/lib/config/env';
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
import { useConnectors, useSaveConnectorConfig } from '@/lib/hooks/queries/useConnectors';
import type { ConnectorConfigRequest } from '@/lib/types/connector';
import { ConnectorCard } from '@/components/integrations/ConnectorCard';
import { ConnectorConfigPanel } from '@/components/integrations/ConnectorConfigPanel';
import { IntegrationActivityLog } from '@/components/integrations/IntegrationActivityLog';

const ADMIN_ACCESS_ROLES = [Roles.SUPER_ADMIN, Roles.TENANT_ADMIN, Roles.HR_ADMIN, Roles.HR_MANAGER];

export default function AdminIntegrationsPage() {
  const toast = useToast();
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuth();
  const { hasAnyRole, isReady } = usePermissions();

  // React Query hooks - Legacy SMS/Payment integrations
  const { data: smsStatus, isLoading: smsLoading } = useSmsStatus();
  const { data: paymentStatus, isLoading: paymentLoading } = usePaymentStatus();
  const { data: smsTemplates = {} } = useSmsTemplates();
  const testSmsMutation = useTestSms();
  const sendSmsMutation = useSendSms();
  const testPaymentMutation = useTestPayment();

  // React Query hooks - Connector framework
  const { data: connectors = [], isLoading: connectorsLoading } = useConnectors();
  const saveConfigMutation = useSaveConnectorConfig();

  const loading = smsLoading || paymentLoading || connectorsLoading;

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

  // Connector Config Panel State
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);

  const selectedConnector = selectedConnectorId
    ? connectors.find((c) => c.connectorId === selectedConnectorId)
    : null;

  const filteredConnectors = filterType
    ? connectors.filter((c) => c.type === filterType)
    : connectors;

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
    if (isProduction) {
      toast.error('SMS testing is disabled in production. Use a staging environment.');
      return;
    }

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
    if (isProduction) {
      toast.error('Direct SMS sending is disabled in production. Use the notification service instead.');
      return;
    }

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
    if (isProduction) {
      toast.error('Payment gateway testing is disabled in production. Use a staging environment.');
      return;
    }

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

  const handleSaveConnectorConfig = async (configData: ConnectorConfigRequest) => {
    if (!selectedConnectorId) return;

    saveConfigMutation.mutate(
      { connectorId: selectedConnectorId, data: configData },
      {
        onSuccess: () => {
          toast.success('Connector configured successfully');
          setSelectedConnectorId(null);
        },
        onError: (error: unknown) => {
          toast.error(
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
              'Failed to save configuration'
          );
        },
      }
    );
  };

  const renderStatusBadge = (status: IntegrationStatus | null) => {
    if (!status) return null;

    const isActive = status.configured && status.enabled;

    return (
      <div className="flex items-center gap-2">
        {isActive ? (
          <div className="badge-status flex items-center gap-2 px-3 py-1.5 rounded-full bg-success-100 dark:bg-success-900/30">
            <CheckCircle2 className="h-4 w-4 text-success-600 dark:text-success-400" />
            <span className="text-sm font-medium text-success-700 dark:text-success-300">
              Active
            </span>
          </div>
        ) : (
          <div className="badge-status flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-100 dark:bg-rose-900/30">
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
        <Loader2 className="h-8 w-8 animate-spin text-accent-700" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="skeuo-emboss p-4 rounded-xl bg-gradient-to-br from-accent-500 to-accent-700 shadow-lg shadow-accent-500/25">
            <Settings className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">
              Integrations
            </h1>
            <p className="text-[var(--text-secondary)] mt-1">
              Manage third-party integrations and external services
            </p>
          </div>
        </div>
        {/* Refresh disabled - data is automatically refetched by React Query */}
      </div>

      {/* Tabs for filtering connectors */}
      {connectors.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={filterType === null ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilterType(null)}
          >
            All ({connectors.length})
          </Button>
          {['NOTIFICATION', 'E_SIGNATURE', 'PAYMENT', 'STORAGE', 'CALENDAR', 'AUTH', 'ANALYTICS'].map(
            (type) => {
              const count = connectors.filter((c) => c.type === type).length;
              return count > 0 ? (
                <Button
                  key={type}
                  variant={filterType === type ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setFilterType(type)}
                >
                  {type} ({count})
                </Button>
              ) : null;
            }
          )}
        </div>
      )}

      {/* Connectors Grid */}
      {connectors.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Available Connectors</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredConnectors.map((connector) => (
              <ConnectorCard
                key={connector.connectorId}
                connector={connector}
                onConfigure={() => setSelectedConnectorId(connector.connectorId)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Connector Config Panel */}
      {selectedConnector && (
        <ConnectorConfigPanel
          connector={selectedConnector}
          isOpen={!!selectedConnectorId}
          onClose={() => setSelectedConnectorId(null)}
          onSave={handleSaveConnectorConfig}
          isLoading={saveConfigMutation.isPending}
        />
      )}

      {/* Activity Log */}
      {connectors.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-accent-300 dark:bg-accent-900/30">
                <Zap className="h-5 w-5 text-accent-800 dark:text-accent-600" />
              </div>
              <div>
                <CardTitle>Integration Activity Log</CardTitle>
                <CardDescription>Recent events from all integrations</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <IntegrationActivityLog pageSize={10} />
          </CardContent>
        </Card>
      )}

      {/* SMS Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-accent-100 dark:bg-accent-900/30">
                <MessageSquare className="h-5 w-5 text-accent-600 dark:text-accent-400" />
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
            <div className="skeuo-card p-4 rounded-lg border border-[var(--border-main)]">
              <p className="skeuo-deboss text-sm text-[var(--text-muted)]">Provider</p>
              <p className="skeuo-emboss text-lg font-semibold text-[var(--text-primary)] mt-1">
                {smsStatus?.provider || 'Not configured'}
              </p>
            </div>
            <div className="skeuo-card p-4 rounded-lg border border-[var(--border-main)]">
              <p className="skeuo-deboss text-sm text-[var(--text-muted)]">Status</p>
              <p className="skeuo-emboss text-lg font-semibold text-[var(--text-primary)] mt-1">
                {smsStatus?.configured ? 'Configured' : 'Not configured'}
              </p>
            </div>
            <div className="skeuo-card p-4 rounded-lg border border-[var(--border-main)]">
              <p className="skeuo-deboss text-sm text-[var(--text-muted)]">Last Checked</p>
              <p className="skeuo-emboss text-lg font-semibold text-[var(--text-primary)] mt-1">
                {smsStatus?.lastChecked
                  ? new Date(smsStatus.lastChecked).toLocaleTimeString()
                  : 'Never'}
              </p>
            </div>
          </div>

          {/* Test SMS */}
          <div className="skeuo-deboss p-4 rounded-lg bg-[var(--bg-secondary)]">
            <h3 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <TestTube className="h-4 w-4" />
              Test SMS Service
            </h3>
            <div className="flex gap-4">
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
                className={`mt-3 p-4 rounded-lg flex items-start gap-2 ${
                  smsTestResult.success
                    ? 'bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-300'
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
          <div className="skeuo-deboss p-4 rounded-lg bg-[var(--bg-secondary)]">
            <h3 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <Send className="h-4 w-4" />
              Send SMS
            </h3>
            <div className="space-y-4">
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
                  className="input-aura w-full px-3 py-2 rounded-lg"
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
                    className="input-aura w-full px-3 py-2 rounded-lg"
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
                className={`mt-3 p-4 rounded-lg flex items-start gap-2 ${
                  smsSendResult.success
                    ? 'bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-300'
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
            <div className="flex items-start gap-4 p-4 rounded-lg bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800">
              <AlertCircle className="h-5 w-5 text-warning-600 dark:text-warning-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-warning-900 dark:text-warning-100">
                  SMS Integration Not Configured
                </p>
                <p className="text-sm text-warning-700 dark:text-warning-300 mt-1">
                  To enable SMS notifications, configure the required SMS provider
                  credentials in the server environment. Contact your system administrator for details.
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
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-success-100 dark:bg-success-900/30">
                <CreditCard className="h-5 w-5 text-success-600 dark:text-success-400" />
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
            <div className="skeuo-card p-4 rounded-lg border border-[var(--border-main)]">
              <p className="skeuo-deboss text-sm text-[var(--text-muted)]">Provider</p>
              <p className="skeuo-emboss text-lg font-semibold text-[var(--text-primary)] mt-1">
                {paymentStatus?.provider || 'Not configured'}
              </p>
            </div>
            <div className="skeuo-card p-4 rounded-lg border border-[var(--border-main)]">
              <p className="skeuo-deboss text-sm text-[var(--text-muted)]">Status</p>
              <p className="skeuo-emboss text-lg font-semibold text-[var(--text-primary)] mt-1">
                {paymentStatus?.configured ? 'Configured' : 'Not configured'}
              </p>
            </div>
            <div className="skeuo-card p-4 rounded-lg border border-[var(--border-main)]">
              <p className="skeuo-deboss text-sm text-[var(--text-muted)]">Supported Methods</p>
              <p className="skeuo-emboss text-lg font-semibold text-[var(--text-primary)] mt-1">
                {paymentStatus?.supportedMethods?.length || 0}
              </p>
            </div>
          </div>

          {/* Test Payment Gateway */}
          <div className="skeuo-deboss p-4 rounded-lg bg-[var(--bg-secondary)]">
            <h3 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
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
                className={`mt-3 p-4 rounded-lg flex items-start gap-2 ${
                  paymentTestResult.success
                    ? 'bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-300'
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
            <div className="skeuo-deboss p-4 rounded-lg bg-[var(--bg-secondary)]">
              <h3 className="font-semibold text-[var(--text-primary)] mb-3">
                Supported Payment Methods
              </h3>
              <div className="flex flex-wrap gap-2">
                {paymentStatus.supportedMethods.map((method) => (
                  <span
                    key={method}
                    className="badge-status px-3 py-1.5 rounded-full bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] text-sm text-[var(--text-secondary)]"
                  >
                    {method}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Configuration Note */}
          {!paymentStatus?.configured && (
            <div className="flex items-start gap-4 p-4 rounded-lg bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800">
              <AlertCircle className="h-5 w-5 text-warning-600 dark:text-warning-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-warning-900 dark:text-warning-100">
                  Payment Gateway Not Configured
                </p>
                <p className="text-sm text-warning-700 dark:text-warning-300 mt-1">
                  To enable payment processing, configure the required payment gateway
                  credentials in the server environment. Contact your system administrator for details.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
