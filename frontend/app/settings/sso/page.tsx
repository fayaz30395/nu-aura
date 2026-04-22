'use client';

import React, {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Controller, useForm} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle,
  Download,
  FileText,
  Globe,
  Info,
  Key,
  Loader2,
  Save,
  TestTube,
  Trash2,
  Upload,
  Users,
  XCircle,
} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {useAuth} from '@/lib/hooks/useAuth';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {logger} from '@/lib/utils/logger';
import {
  useCreateSamlConfig,
  useDeleteSamlConfig,
  useSamlConfig,
  useTestSamlConnection,
  useUpdateSamlConfig,
} from '@/lib/hooks/useSamlConfig';
import {SamlConfigRequest, samlService} from '@/lib/services/core/saml.service';

// ==================== Zod Schema ====================

const samlConfigSchema = z.object({
  name: z.string().min(1, 'IdP name is required').max(200),
  entityId: z.string().min(1, 'Entity ID is required').max(500),
  ssoUrl: z.string().min(1, 'SSO URL is required').url('Must be a valid URL').max(1000),
  sloUrl: z.string().url('Must be a valid URL').max(1000).or(z.literal('')).optional(),
  certificate: z.string().optional(),
  metadataUrl: z.string().url('Must be a valid URL').max(1000).or(z.literal('')).optional(),
  isActive: z.boolean().default(false),
  autoProvisionUsers: z.boolean().default(false),
  defaultRoleId: z.string().optional(),
  attributeMappingEmail: z.string().optional(),
  attributeMappingFirstName: z.string().optional(),
  attributeMappingLastName: z.string().optional(),
  attributeMappingEmployeeId: z.string().optional(),
  attributeMappingDepartment: z.string().optional(),
  spEntityId: z.string().max(500).optional(),
});

type SamlConfigFormData = z.infer<typeof samlConfigSchema>;

// ==================== Page Component ====================

export default function SsoSettingsPage() {
  const router = useRouter();
  const {isAuthenticated, hasHydrated} = useAuth();
  const {hasPermission, isReady: permReady} = usePermissions();
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // React Query hooks
  const {data: samlConfig, isLoading, error: fetchError} = useSamlConfig(hasHydrated && isAuthenticated);
  const createMutation = useCreateSamlConfig();
  const updateMutation = useUpdateSamlConfig();
  const deleteMutation = useDeleteSamlConfig();
  const testMutation = useTestSamlConnection();

  const isExistingConfig = !!samlConfig?.id;

  // React Hook Form
  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: {errors, isDirty: _isDirty},
  } = useForm<SamlConfigFormData>({
    resolver: zodResolver(samlConfigSchema),
    defaultValues: {
      name: '',
      entityId: '',
      ssoUrl: '',
      sloUrl: '',
      certificate: '',
      metadataUrl: '',
      isActive: false,
      autoProvisionUsers: false,
      defaultRoleId: '',
      attributeMappingEmail: '',
      attributeMappingFirstName: '',
      attributeMappingLastName: '',
      attributeMappingEmployeeId: '',
      attributeMappingDepartment: '',
      spEntityId: '',
    },
  });

  const isActive = watch('isActive');

  // Populate form when config loads
  useEffect(() => {
    if (samlConfig) {
      let attrMapping: Record<string, string> = {};
      if (samlConfig.attributeMapping) {
        try {
          attrMapping = JSON.parse(samlConfig.attributeMapping);
        } catch {
          // ignore parse errors
        }
      }

      reset({
        name: samlConfig.name || '',
        entityId: samlConfig.entityId || '',
        ssoUrl: samlConfig.ssoUrl || '',
        sloUrl: samlConfig.sloUrl || '',
        certificate: '', // Never pre-fill certificate for security
        metadataUrl: samlConfig.metadataUrl || '',
        isActive: samlConfig.isActive ?? false,
        autoProvisionUsers: samlConfig.autoProvisionUsers ?? false,
        defaultRoleId: samlConfig.defaultRoleId || '',
        attributeMappingEmail: attrMapping.email || '',
        attributeMappingFirstName: attrMapping.firstName || '',
        attributeMappingLastName: attrMapping.lastName || '',
        attributeMappingEmployeeId: attrMapping.employeeId || '',
        attributeMappingDepartment: attrMapping.department || '',
        spEntityId: samlConfig.spEntityId || '',
      });
    }
  }, [samlConfig, reset]);

  // Auth redirect
  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, hasHydrated, router]);

  // RBAC guard — only SYSTEM_ADMIN can access SSO config (DEF-55)
  useEffect(() => {
    if (!permReady) return;
    if (!hasPermission(Permissions.SYSTEM_ADMIN)) {
      router.replace('/settings');
    }
  }, [permReady, hasPermission, router]);

  // Build request from form data
  const buildRequest = (data: SamlConfigFormData): SamlConfigRequest => {
    const attrMapping: Record<string, string> = {};
    if (data.attributeMappingEmail) attrMapping.email = data.attributeMappingEmail;
    if (data.attributeMappingFirstName) attrMapping.firstName = data.attributeMappingFirstName;
    if (data.attributeMappingLastName) attrMapping.lastName = data.attributeMappingLastName;
    if (data.attributeMappingEmployeeId) attrMapping.employeeId = data.attributeMappingEmployeeId;
    if (data.attributeMappingDepartment) attrMapping.department = data.attributeMappingDepartment;

    return {
      name: data.name,
      entityId: data.entityId,
      ssoUrl: data.ssoUrl,
      sloUrl: data.sloUrl || undefined,
      certificate: data.certificate || undefined,
      metadataUrl: data.metadataUrl || undefined,
      isActive: data.isActive,
      autoProvisionUsers: data.autoProvisionUsers,
      defaultRoleId: data.defaultRoleId || undefined,
      attributeMapping: Object.keys(attrMapping).length > 0 ? JSON.stringify(attrMapping) : undefined,
      spEntityId: data.spEntityId || undefined,
    };
  };

  // Save handler
  const onSubmit = async (data: SamlConfigFormData) => {
    setError(null);
    setSuccess(null);
    const request = buildRequest(data);

    try {
      if (isExistingConfig) {
        await updateMutation.mutateAsync(request);
        setSuccess('SAML configuration updated successfully.');
      } else {
        await createMutation.mutateAsync(request);
        setSuccess('SAML configuration created successfully.');
      }
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'Failed to save SAML configuration.';
      setError(message);
      logger.error('Failed to save SAML config:', err);
    }
  };

  // Delete handler
  const handleDelete = async () => {
    setError(null);
    try {
      await deleteMutation.mutateAsync();
      setSuccess('SAML configuration deleted.');
      setShowDeleteConfirm(false);
      reset();
    } catch (err: unknown) {
      setError('Failed to delete SAML configuration.');
      logger.error('Failed to delete SAML config:', err);
    }
  };

  // Test connection handler
  const handleTestConnection = async () => {
    setError(null);
    try {
      await testMutation.mutateAsync();
    } catch (err: unknown) {
      setError('Connection test failed.');
      logger.error('SAML test failed:', err);
    }
  };

  // Download SP metadata
  const handleDownloadMetadata = async () => {
    try {
      const metadata = await samlService.getMetadata();
      const blob = new Blob([metadata], {type: 'application/xml'});
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sp-metadata.xml';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError('Failed to download SP metadata.');
      logger.error('Failed to download metadata:', err);
    }
  };

  // Certificate file upload handler
  const handleCertificateFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setValue('certificate', content, {shouldDirty: true});
    };
    reader.readAsText(file);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ==================== Toggle Component ====================

  const Toggle = ({
                    checked,
                    onChange,
                    label,
                    description,
                  }: {
    checked: boolean;
    onChange: (val: boolean) => void;
    label: string;
    description: string;
  }) => (
    <div className="row-between py-4">
      <div>
        <label className="text-sm font-medium text-[var(--text-primary)]">{label}</label>
        <p className="text-body-secondary mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
          checked ? 'bg-accent-700' : 'bg-[var(--bg-secondary)]'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-[var(--bg-card)] transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  // ==================== Render ====================

  if (!hasHydrated || !isAuthenticated) return null;

  // RBAC guard — block render for non-admins (DEF-55)
  if (!permReady || !hasPermission(Permissions.SYSTEM_ADMIN)) return null;

  return (
    <AppLayout activeMenuItem="settings">
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/settings')}
            className="p-2 rounded-lg hover:bg-[var(--bg-surface)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
            aria-label="Go back to settings"
          >
            <ArrowLeft className="h-5 w-5 text-[var(--text-secondary)]"/>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">SAML SSO Configuration</h1>
            <p className="text-[var(--text-secondary)] mt-1">
              Configure SAML 2.0 Single Sign-On with your corporate Identity Provider
            </p>
          </div>
        </div>

        {/* Status Messages */}
        {success && (
          <div
            className='flex items-center gap-2 p-4 bg-status-success-bg border border-status-success-border rounded-lg'>
            <Check className='h-5 w-5 text-status-success-text flex-shrink-0'/>
            <p className='text-status-success-text font-medium'>{success}</p>
          </div>
        )}

        {(error || fetchError) && (
          <div
            className='flex items-center gap-2 p-4 bg-status-danger-bg border border-status-danger-border rounded-lg'>
            <AlertCircle className='h-5 w-5 text-status-danger-text flex-shrink-0'/>
            <p className='text-status-danger-text font-medium'>
              {error || 'No SAML configuration found. Fill in the form below to set one up.'}
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className='h-8 w-8 animate-spin text-accent'/>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* IdP Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5"/>
                  Identity Provider Settings
                </CardTitle>
                <CardDescription>
                  Configure your SAML 2.0 Identity Provider (Okta, Azure AD, OneLogin, etc.)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    IdP Name <span className='text-status-danger-text'>*</span>
                  </label>
                  <input
                    {...register('name')}
                    placeholder="e.g., Okta Production"
                    className="w-full px-4 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2"
                  />
                  {errors.name && (
                    <p className='text-sm text-status-danger-text mt-1'>{errors.name.message}</p>
                  )}
                </div>

                {/* Entity ID */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Entity ID <span className='text-status-danger-text'>*</span>
                  </label>
                  <input
                    {...register('entityId')}
                    placeholder="e.g., http://www.okta.com/exk123abc"
                    className="w-full px-4 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2"
                  />
                  {errors.entityId && (
                    <p className='text-sm text-status-danger-text mt-1'>{errors.entityId.message}</p>
                  )}
                </div>

                {/* SSO URL */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    SSO URL <span className='text-status-danger-text'>*</span>
                  </label>
                  <input
                    {...register('ssoUrl')}
                    placeholder="https://your-idp.example.com/sso/saml"
                    className="w-full px-4 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2"
                  />
                  {errors.ssoUrl && (
                    <p className='text-sm text-status-danger-text mt-1'>{errors.ssoUrl.message}</p>
                  )}
                </div>

                {/* SLO URL (optional) */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    SLO URL (optional)
                  </label>
                  <input
                    {...register('sloUrl')}
                    placeholder="https://your-idp.example.com/slo/saml"
                    className="w-full px-4 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2"
                  />
                  {errors.sloUrl && (
                    <p className='text-sm text-status-danger-text mt-1'>{errors.sloUrl.message}</p>
                  )}
                </div>

                {/* Metadata URL */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Metadata URL (optional)
                  </label>
                  <input
                    {...register('metadataUrl')}
                    placeholder="https://your-idp.example.com/metadata.xml"
                    className="w-full px-4 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2"
                  />
                  <p className="text-caption mt-1">
                    If provided, the IdP metadata will be auto-fetched to configure the SSO connection.
                  </p>
                  {errors.metadataUrl && (
                    <p className='text-sm text-status-danger-text mt-1'>{errors.metadataUrl.message}</p>
                  )}
                </div>

                {/* SP Entity ID override */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    SP Entity ID (optional)
                  </label>
                  <input
                    {...register('spEntityId')}
                    placeholder="Leave blank for auto-generated"
                    className="w-full px-4 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Certificate */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5"/>
                  IdP Certificate
                </CardTitle>
                <CardDescription>
                  Upload or paste the IdP X.509 signing certificate (PEM format)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {samlConfig?.hasCertificate && (
                  <div
                    className='flex items-center gap-2 p-4 bg-status-success-bg border border-status-success-border rounded-lg'>
                    <CheckCircle className='h-4 w-4 text-status-success-text flex-shrink-0'/>
                    <div>
                      <p className='text-sm text-status-success-text font-medium'>
                        Certificate uploaded
                      </p>
                      {samlConfig.certificateFingerprint && (
                        <p className='text-xs text-status-success-text font-mono mt-0.5 break-all'>
                          SHA-256: {samlConfig.certificateFingerprint}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Certificate (PEM)
                  </label>
                  <textarea
                    {...register('certificate')}
                    rows={6}
                    placeholder={`-----BEGIN CERTIFICATE-----\nMIID...\n-----END CERTIFICATE-----`}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2 font-mono text-sm"
                  />
                  <p className="text-caption mt-1">
                    {isExistingConfig
                      ? 'Leave blank to keep the existing certificate. Paste a new one to replace it.'
                      : 'Paste the PEM-encoded X.509 certificate from your IdP.'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Or upload a certificate file
                  </label>
                  <label
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] cursor-pointer hover:bg-[var(--bg-surface)] transition-colors">
                    <Upload className="h-4 w-4 text-[var(--text-secondary)]"/>
                    <span className="text-body-secondary">Choose file</span>
                    <input
                      type="file"
                      accept=".pem,.cer,.crt,.cert"
                      onChange={handleCertificateFile}
                      className="hidden"
                    />
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Attribute Mapping */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5"/>
                  Attribute Mapping
                </CardTitle>
                <CardDescription>
                  Map SAML assertion attributes to user fields. Leave blank for standard defaults.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      field: 'attributeMappingEmail' as const,
                      label: 'Email',
                      placeholder: 'urn:oid:0.9.2342.19200300.100.1.3'
                    },
                    {field: 'attributeMappingFirstName' as const, label: 'First Name', placeholder: 'urn:oid:2.5.4.42'},
                    {field: 'attributeMappingLastName' as const, label: 'Last Name', placeholder: 'urn:oid:2.5.4.4'},
                    {field: 'attributeMappingEmployeeId' as const, label: 'Employee ID', placeholder: 'customAttr1'},
                    {field: 'attributeMappingDepartment' as const, label: 'Department', placeholder: 'customAttr2'},
                  ].map(({field, label, placeholder}) => (
                    <div key={field}>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                        {label}
                      </label>
                      <input
                        {...register(field)}
                        placeholder={placeholder}
                        className="w-full px-4 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2 text-sm"
                      />
                    </div>
                  ))}
                </div>
                <div
                  className='flex items-start gap-2 mt-4 p-4 bg-accent-subtle border border-[var(--accent-primary)] rounded-lg'>
                  <Info className='h-4 w-4 text-accent mt-0.5 flex-shrink-0'/>
                  <p className='text-xs text-accent'>
                    Enter the SAML attribute name your IdP sends for each field. Common formats include
                    OID URIs (e.g., urn:oid:2.5.4.42) or friendly names (e.g., firstName). Check your IdP
                    documentation for the exact attribute names.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Provisioning & Activation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5"/>
                  Provisioning & Activation
                </CardTitle>
                <CardDescription>
                  Control user provisioning and SSO activation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Controller
                  name="autoProvisionUsers"
                  control={control}
                  render={({field}) => (
                    <Toggle
                      checked={field.value}
                      onChange={field.onChange}
                      label="Auto-Provision Users"
                      description="Automatically create user accounts on first SAML login. If disabled, users must be pre-created."
                    />
                  )}
                />

                {/* Default Role */}
                <div className="py-4">
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Default Role for Auto-Provisioned Users
                  </label>
                  <input
                    {...register('defaultRoleId')}
                    placeholder="Role UUID (leave blank for no default role)"
                    className="w-full px-4 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2 text-sm"
                  />
                  {samlConfig?.defaultRoleName && (
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      Current: {samlConfig.defaultRoleName}
                    </p>
                  )}
                </div>

                <div className="border-t border-[var(--border-main)] pt-2">
                  <Controller
                    name="isActive"
                    control={control}
                    render={({field}) => (
                      <Toggle
                        checked={field.value}
                        onChange={field.onChange}
                        label="Enable SSO"
                        description="Enable SAML SSO login for your organization. Users will see a 'Sign in with SSO' option on the login page."
                      />
                    )}
                  />
                </div>

                {isActive && (
                  <div
                    className='flex items-start gap-2 p-4 bg-status-warning-bg border border-status-warning-border rounded-lg'>
                    <AlertCircle className='h-4 w-4 text-status-warning-text mt-0.5 flex-shrink-0'/>
                    <p className='text-xs text-status-warning-text'>
                      Enabling SSO will add a &quot;Sign in with SSO&quot; button to your login page. Ensure you
                      have tested the configuration before enabling in production.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Test Connection Results */}
            {testMutation.data && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TestTube className="h-5 w-5"/>
                    Connection Test Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className={`flex items-center gap-2 p-4 rounded-lg ${
                      testMutation.data.success
                        ? 'bg-success-50 dark:bg-success-950/20 border border-success-200 dark:border-success-800'
                        : 'bg-danger-50 dark:bg-danger-950/20 border border-danger-200 dark:border-danger-800'
                    }`}>
                      {testMutation.data.success ? (
                        <CheckCircle className='h-5 w-5 text-status-success-text'/>
                      ) : (
                        <XCircle className='h-5 w-5 text-status-danger-text'/>
                      )}
                      <p className={`font-medium ${
                        testMutation.data.success
                          ? 'text-success-800 dark:text-success-200'
                          : 'text-danger-800 dark:text-danger-200'
                      }`}>
                        {testMutation.data.message}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        {testMutation.data.certificateValid ? (
                          <CheckCircle className='h-4 w-4 text-status-success-text'/>
                        ) : (
                          <XCircle className='h-4 w-4 text-status-danger-text'/>
                        )}
                        <span className="text-[var(--text-secondary)]">Certificate</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {testMutation.data.metadataReachable ? (
                          <CheckCircle className='h-4 w-4 text-status-success-text'/>
                        ) : (
                          <XCircle className='h-4 w-4 text-status-warning-text'/>
                        )}
                        <span className="text-[var(--text-secondary)]">Metadata URL</span>
                      </div>
                    </div>

                    {testMutation.data.certificateExpiry && (
                      <p className="text-caption">
                        Certificate expires: {new Date(testMutation.data.certificateExpiry).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              {/* Save */}
              <button
                type="submit"
                disabled={isSaving}
                className='inline-flex items-center gap-2 px-4 py-2 bg-accent text-inverse rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin"/>
                ) : (
                  <Save className="h-4 w-4"/>
                )}
                {isExistingConfig ? 'Update Configuration' : 'Save Configuration'}
              </button>

              {/* Test Connection */}
              {isExistingConfig && (
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testMutation.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                >
                  {testMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin"/>
                  ) : (
                    <TestTube className="h-4 w-4"/>
                  )}
                  Test Connection
                </button>
              )}

              {/* Download SP Metadata */}
              {isExistingConfig && (
                <button
                  type="button"
                  onClick={handleDownloadMetadata}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                >
                  <Download className="h-4 w-4"/>
                  Download SP Metadata
                </button>
              )}

              {/* Delete */}
              {isExistingConfig && !showDeleteConfirm && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className='inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-status-danger-border text-status-danger-text hover:bg-status-danger-bg transition-colors ml-auto cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
                >
                  <Trash2 className="h-4 w-4"/>
                  Delete
                </button>
              )}

              {showDeleteConfirm && (
                <div className="flex items-center gap-2 ml-auto">
                  <span className='text-sm text-status-danger-text font-medium'>Are you sure?</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    className='inline-flex items-center gap-1 px-4 py-1.5 bg-status-danger-bg text-inverse rounded-lg text-sm hover:bg-status-danger-bg disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
                  >
                    {deleteMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin"/> : null}
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-1.5 text-body-secondary hover:text-[var(--text-primary)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
}
