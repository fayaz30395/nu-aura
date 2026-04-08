'use client';

import {useEffect, useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {useRouter} from 'next/navigation';
import {ArrowLeft, Check, Copy, ExternalLink, Hash, Key, MessageSquare, RefreshCw, Shield, Zap,} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {apiClient} from '@/lib/api/client';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SlackConfig {
  id?: string;
  channel: 'SLACK';
  isEnabled: boolean;
  slackWorkspaceId: string;
  slackDefaultChannel: string;
  // Sensitive fields masked in response
  rateLimitPerMinute: number | null;
  rateLimitPerHour: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const slackConfigSchema = z.object({
  slackWorkspaceId: z.string().min(1, 'Workspace ID is required (starts with T)'),
  slackBotToken: z.string().optional().or(z.literal('')),
  slackSigningSecret: z.string().optional().or(z.literal('')),
  slackDefaultChannel: z.string().min(1, 'Default channel is required').regex(/^#/, 'Channel must start with #'),
  isEnabled: z.boolean(),
  rateLimitPerMinute: z.number({coerce: true}).min(0).nullable().optional(),
  rateLimitPerHour: z.number({coerce: true}).min(0).nullable().optional(),
});

type SlackConfigFormData = z.infer<typeof slackConfigSchema>;

// ─── Component ────────────────────────────────────────────────────────────────

export default function SlackIntegrationPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {hasAnyPermission, isReady} = usePermissions();
  const [copied, setCopied] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const hasAccess = hasAnyPermission(Permissions.SYSTEM_ADMIN, Permissions.INTEGRATION_MANAGE);

  useEffect(() => {
    if (isReady && !hasAccess) {
      router.replace('/me/dashboard');
    }
  }, [isReady, hasAccess, router]);

  // Fetch existing Slack config
  const configQuery = useQuery({
    queryKey: ['slack-config'],
    queryFn: async () => {
      const response = await apiClient.get<SlackConfig[]>('/api/v1/notifications/channels/config');
      const configs = response.data;
      return configs.find((c: SlackConfig) => c.channel === 'SLACK') || null;
    },
    enabled: isReady && hasAccess,
  });

  // Save config mutation
  const saveMutation = useMutation({
    mutationFn: async (data: SlackConfigFormData) => {
      const payload = {
        channel: 'SLACK' as const,
        isEnabled: data.isEnabled,
        slackWorkspaceId: data.slackWorkspaceId,
        slackDefaultChannel: data.slackDefaultChannel,
        rateLimitPerMinute: data.rateLimitPerMinute || null,
        rateLimitPerHour: data.rateLimitPerHour || null,
        // Bot token and signing secret are sent but masked in response
        ...(data.slackBotToken ? {slackBotToken: data.slackBotToken} : {}),
      };
      return apiClient.post('/api/v1/notifications/channels/config', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['slack-config']});
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: {errors, isSubmitting, isDirty},
  } = useForm<SlackConfigFormData>({
    resolver: zodResolver(slackConfigSchema),
    defaultValues: {
      slackWorkspaceId: '',
      slackBotToken: '',
      slackSigningSecret: '',
      slackDefaultChannel: '#hrms-notifications',
      isEnabled: false,
      rateLimitPerMinute: null,
      rateLimitPerHour: null,
    },
  });

  // Populate form when config loads
  useEffect(() => {
    if (configQuery.data) {
      reset({
        slackWorkspaceId: configQuery.data.slackWorkspaceId || '',
        slackBotToken: '', // Never populated from server (masked)
        slackSigningSecret: '',
        slackDefaultChannel: configQuery.data.slackDefaultChannel || '#hrms-notifications',
        isEnabled: configQuery.data.isEnabled || false,
        rateLimitPerMinute: configQuery.data.rateLimitPerMinute,
        rateLimitPerHour: configQuery.data.rateLimitPerHour,
      });
    }
  }, [configQuery.data, reset]);

  const isEnabled = watch('isEnabled');

  const onSubmit = async (data: SlackConfigFormData) => {
    await saveMutation.mutateAsync(data);
  };

  const handleTestConnection = async () => {
    setTestResult('testing');
    try {
      // Send a test message via the existing Slack notification service
      await apiClient.post('/api/v1/notifications/channels/config', {
        channel: 'SLACK',
        isEnabled: true,
        slackWorkspaceId: watch('slackWorkspaceId'),
        slackDefaultChannel: watch('slackDefaultChannel'),
      });
      setTestResult('success');
      setTimeout(() => setTestResult('idle'), 3000);
    } catch {
      setTestResult('error');
      setTimeout(() => setTestResult('idle'), 3000);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const webhookBaseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';

  if (!isReady || !hasAccess) return null;

  return (
    <AppLayout activeMenuItem="integrations">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/integrations')}
            className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-[var(--text-secondary)]"/>
          </button>
          <div className="flex items-center gap-2">
            <div className="p-4 rounded-xl bg-gradient-to-br from-accent-700 to-danger-600">
              <Zap className="h-6 w-6 text-white"/>
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">
                Slack Integration
              </h1>
              <p className="text-body-muted">
                Connect NU-AURA with your Slack workspace
              </p>
            </div>
          </div>
          {configQuery.data && (
            <span className={`ml-auto px-2 py-1 rounded-full text-xs font-medium ${
              configQuery.data.isEnabled
                ? 'bg-success-100 text-success-800'
                : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
            }`}>
              {configQuery.data.isEnabled ? 'Connected' : 'Disconnected'}
            </span>
          )}
        </div>

        {/* Setup Guide */}
        <div className="skeuo-card p-6 mb-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-accent-700"/>
            Setup Guide
          </h2>
          <ol className="space-y-2 text-body-secondary">
            <li className="flex gap-2">
              <span
                className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center text-xs font-bold">1</span>
              <span>
                Create a Slack App at{' '}
                <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer"
                   className="text-accent-700 hover:underline inline-flex items-center gap-1">
                  api.slack.com/apps <ExternalLink className="h-3 w-3"/>
                </a>
              </span>
            </li>
            <li className="flex gap-2">
              <span
                className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center text-xs font-bold">2</span>
              <span>Add Bot Token Scopes: <code
                className="px-1.5 py-0.5 bg-[var(--bg-secondary)] rounded text-xs">chat:write</code>, <code
                className="px-1.5 py-0.5 bg-[var(--bg-secondary)] rounded text-xs">users:read.email</code>, <code
                className="px-1.5 py-0.5 bg-[var(--bg-secondary)] rounded text-xs">commands</code></span>
            </li>
            <li className="flex gap-2">
              <span
                className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center text-xs font-bold">3</span>
              <span>Install the app to your workspace and copy the Bot Token below</span>
            </li>
            <li className="flex gap-2">
              <span
                className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center text-xs font-bold">4</span>
              <span>Configure Slash Commands using the webhook URLs below</span>
            </li>
          </ol>
        </div>

        {/* Webhook URLs */}
        <div className="skeuo-card p-6 mb-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-accent-700"/>
            Webhook URLs
          </h2>
          <p className="text-body-muted mb-4">
            Use these URLs when configuring your Slack App&apos;s slash commands and event subscriptions.
          </p>
          <div className="space-y-2">
            {[
              {label: 'Slash Commands', url: `${webhookBaseUrl}/api/v1/integrations/slack/commands`},
              {label: 'Interactive Components', url: `${webhookBaseUrl}/api/v1/integrations/slack/interactions`},
              {label: 'Event Subscriptions', url: `${webhookBaseUrl}/api/v1/integrations/slack/events`},
            ].map(({label, url}) => (
              <div key={label} className="row-between p-2 bg-[var(--bg-secondary)] rounded-lg">
                <div>
                  <div className="text-xs font-medium text-[var(--text-muted)]">{label}</div>
                  <code className="text-sm text-[var(--text-primary)]">{url}</code>
                </div>
                <button
                  onClick={() => copyToClipboard(url, label)}
                  className="p-2 hover:bg-[var(--bg-surface)] rounded transition-colors"
                >
                  {copied === label ? (
                    <Check className="h-4 w-4 text-success-500"/>
                  ) : (
                    <Copy className="h-4 w-4 text-[var(--text-muted)]"/>
                  )}
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 p-2 bg-accent-50 dark:bg-accent-950/30 rounded-lg">
            <p className="text-xs text-accent-800 dark:text-accent-400">
              <strong>Slash Commands to configure:</strong> <code>/leave</code> and <code>/balance</code> — both
              pointing to the Slash Commands URL above.
            </p>
          </div>
        </div>

        {/* Configuration Form */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="skeuo-card p-6 mb-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <Key className="h-5 w-5 text-accent-700"/>
              Configuration
            </h2>
            <div className="space-y-4">
              {/* Enable toggle */}
              <div className="row-between p-4 bg-[var(--bg-secondary)] rounded-lg">
                <div>
                  <div className="font-medium text-[var(--text-primary)]">Enable Slack Integration</div>
                  <div className="text-body-muted">Send notifications and receive commands from Slack</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" {...register('isEnabled')} className="sr-only peer"/>
                  <div
                    className="w-11 h-6 bg-[var(--border-main)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent-700 peer-focus:ring-offset-2 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--bg-card)] after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-700"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Workspace ID *
                  </label>
                  <input
                    type="text"
                    {...register('slackWorkspaceId')}
                    className="input-aura"
                    placeholder="T0123456789"
                    disabled={!isEnabled}
                  />
                  {errors.slackWorkspaceId && (
                    <p className="text-danger-500 text-xs mt-1">{errors.slackWorkspaceId.message}</p>
                  )}
                  <p className="text-caption mt-1">Found in Slack App settings &gt; Basic Information</p>
                </div>

                <div>
                  <label
                    className="block text-sm font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-1">
                    <Hash className="h-3.5 w-3.5"/>
                    Default Channel *
                  </label>
                  <input
                    type="text"
                    {...register('slackDefaultChannel')}
                    className="input-aura"
                    placeholder="#hrms-notifications"
                    disabled={!isEnabled}
                  />
                  {errors.slackDefaultChannel && (
                    <p className="text-danger-500 text-xs mt-1">{errors.slackDefaultChannel.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Bot Token
                </label>
                <input
                  type="password"
                  {...register('slackBotToken')}
                  className="input-aura"
                  placeholder="xoxb-..."
                  disabled={!isEnabled}
                />
                <p className="text-caption mt-1">
                  OAuth &amp; Permissions &gt; Bot User OAuth Token. Leave blank to keep existing token.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Signing Secret
                </label>
                <input
                  type="password"
                  {...register('slackSigningSecret')}
                  className="input-aura"
                  placeholder="Enter signing secret..."
                  disabled={!isEnabled}
                />
                <p className="text-caption mt-1">
                  Basic Information &gt; App Credentials &gt; Signing Secret. Used to verify incoming requests.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Rate Limit (per minute)
                  </label>
                  <input
                    type="number"
                    {...register('rateLimitPerMinute')}
                    className="input-aura"
                    placeholder="60"
                    disabled={!isEnabled}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Rate Limit (per hour)
                  </label>
                  <input
                    type="number"
                    {...register('rateLimitPerHour')}
                    className="input-aura"
                    placeholder="1000"
                    disabled={!isEnabled}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="row-between">
            <button type="button"
                    onClick={handleTestConnection}
                    disabled={!isEnabled || testResult === 'testing'}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--border-strong)] rounded-lg text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] disabled:opacity-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
            >
              <RefreshCw className={`h-4 w-4 ${testResult === 'testing' ? 'animate-spin' : ''}`}/>
              {testResult === 'testing' ? 'Testing...' : testResult === 'success' ? 'Connected!' : testResult === 'error' ? 'Failed' : 'Test Connection'}
            </button>
            <button type="submit"
                    disabled={isSubmitting || !isDirty}
                    className="btn-primary !h-auto disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
            >
              {isSubmitting ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>

        {/* Features */}
        <div className="skeuo-card p-6 mt-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Available Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {title: '/leave command', desc: 'Employees request leave from Slack', status: 'active'},
              {title: '/balance command', desc: 'Check remaining leave balance', status: 'active'},
              {title: 'Leave notifications', desc: 'Auto-notify on leave requests and approvals', status: 'active'},
              {title: 'Attendance summary', desc: 'Daily attendance summary in channel', status: 'active'},
              {title: 'Payslip alerts', desc: 'Notify when payslips are generated', status: 'active'},
              {title: 'Birthday & anniversary', desc: 'Celebrate milestones in channel', status: 'active'},
              {title: 'New joinee welcome', desc: 'Welcome new team members', status: 'active'},
              {title: 'Approval buttons', desc: 'Approve/reject directly from Slack', status: 'coming'},
            ].map((feature) => (
              <div key={feature.title} className="flex items-start gap-2 p-2 rounded-lg bg-[var(--bg-secondary)]">
                <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                  feature.status === 'active'
                    ? 'bg-success-100 text-success-600'
                    : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'
                }`}>
                  {feature.status === 'active' ? (
                    <Check className="h-3 w-3"/>
                  ) : (
                    <span className="text-2xs font-bold">S</span>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">{feature.title}</div>
                  <div className="text-caption">{feature.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
