'use client';

import {useCallback, useState} from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Fingerprint,
  Key,
  Plus,
  RefreshCw,
  Server,
  Trash2,
  Wifi,
  WifiOff,
  XCircle,
} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {Card, CardContent} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {AnimatePresence, motion} from 'framer-motion';
import {
  useBiometricApiKeys,
  useBiometricDevices,
  useDeactivateDevice,
  useDeviceLogs,
  useGenerateApiKey,
  usePendingPunches,
  useRegisterDevice,
  useReprocessPunches,
  useRevokeApiKey,
  useSyncDevice,
} from '@/lib/hooks/useBiometric';
import type {BiometricDevice, BiometricDeviceRequest, BiometricPunchLog,} from '@/lib/services/hrms/biometricService';

// ─── Zod Schemas ────────────────────────────────────────────────────────────

const deviceSchema = z.object({
  deviceName: z.string().min(1, 'Device name is required').max(200),
  deviceType: z.enum(['FINGERPRINT', 'FACE', 'IRIS', 'CARD', 'MULTI_MODAL'], {
    required_error: 'Device type is required',
  }),
  serialNumber: z.string().min(1, 'Serial number is required').max(100),
  locationName: z.string().max(200).optional(),
  ipAddress: z.string().max(50).optional(),
  manufacturer: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  firmwareVersion: z.string().max(50).optional(),
  notes: z.string().optional(),
});

type DeviceFormData = z.infer<typeof deviceSchema>;

const apiKeySchema = z.object({
  keyName: z.string().min(1, 'Key name is required').max(200),
});

type ApiKeyFormData = z.infer<typeof apiKeySchema>;

// ─── Device Type Config ─────────────────────────────────────────────────────

const DEVICE_TYPES: Record<string, { label: string; color: string }> = {
  FINGERPRINT: {label: 'Fingerprint', color: 'bg-accent-100 text-accent-700'},
  FACE: {label: 'Face Recognition', color: 'bg-accent-300 text-accent-900'},
  IRIS: {label: 'Iris Scanner', color: 'bg-success-100 text-success-700'},
  CARD: {label: 'Card Reader', color: 'bg-warning-100 text-warning-700'},
  MULTI_MODAL: {label: 'Multi-Modal', color: 'bg-accent-100 text-accent-700'},
};

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  PENDING: {bg: 'bg-warning-50', text: 'text-warning-700', dot: 'bg-warning-500'},
  PROCESSED: {bg: 'bg-success-50', text: 'text-success-700', dot: 'bg-success-500'},
  FAILED: {bg: 'bg-danger-50', text: 'text-danger-700', dot: 'bg-danger-500'},
  DUPLICATE: {bg: 'bg-[var(--bg-card)]', text: 'text-[var(--text-muted)]', dot: 'bg-[var(--text-muted)]'},
};

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function BiometricDevicesPage() {
  const [activeTab, setActiveTab] = useState<'devices' | 'punches' | 'api-keys'>('devices');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  return (
    <PermissionGate permission={Permissions.ATTENDANCE_MANAGE}>
      <AppLayout>
        <div className="space-y-6 p-6">
          {/* Header */}
          <div className="row-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Fingerprint className="h-7 w-7 text-accent-700"/>
                Biometric Devices
              </h1>
              <p className="mt-1 text-body-muted">
                Manage biometric devices, monitor punch logs, and configure API keys
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 rounded-lg bg-[var(--bg-card-hover)] p-1">
            {[
              {key: 'devices' as const, label: 'Devices', icon: Server},
              {key: 'punches' as const, label: 'Pending Punches', icon: Clock},
              {key: 'api-keys' as const, label: 'API Keys', icon: Key},
            ].map(({key, label, icon: Icon}) => (
              <button
                key={key}
                onClick={() => {
                  setActiveTab(key);
                  setPage(0);
                }}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                  activeTab === key
                    ? 'bg-[var(--bg-surface)] text-accent-700 shadow-[var(--shadow-card)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                <Icon className="h-4 w-4"/>
                {label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === 'devices' && (
              <motion.div
                key="devices"
                initial={{opacity: 0, y: 10}}
                animate={{opacity: 1, y: 0}}
                exit={{opacity: 0, y: -10}}
                transition={{duration: 0.15}}
              >
                <DeviceListPanel
                  page={page}
                  setPage={setPage}
                  showRegisterModal={showRegisterModal}
                  setShowRegisterModal={setShowRegisterModal}
                  selectedDeviceId={selectedDeviceId}
                  setSelectedDeviceId={setSelectedDeviceId}
                />
              </motion.div>
            )}
            {activeTab === 'punches' && (
              <motion.div
                key="punches"
                initial={{opacity: 0, y: 10}}
                animate={{opacity: 1, y: 0}}
                exit={{opacity: 0, y: -10}}
                transition={{duration: 0.15}}
              >
                <PendingPunchesPanel page={page} setPage={setPage}/>
              </motion.div>
            )}
            {activeTab === 'api-keys' && (
              <motion.div
                key="api-keys"
                initial={{opacity: 0, y: 10}}
                animate={{opacity: 1, y: 0}}
                exit={{opacity: 0, y: -10}}
                transition={{duration: 0.15}}
              >
                <ApiKeysPanel
                  showModal={showApiKeyModal}
                  setShowModal={setShowApiKeyModal}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </AppLayout>
    </PermissionGate>
  );
}

// ─── Device List Panel ──────────────────────────────────────────────────────

function DeviceListPanel({
                           page,
                           setPage,
                           showRegisterModal,
                           setShowRegisterModal,
                           selectedDeviceId,
                           setSelectedDeviceId,
                         }: {
  page: number;
  setPage: (p: number) => void;
  showRegisterModal: boolean;
  setShowRegisterModal: (v: boolean) => void;
  selectedDeviceId: string | null;
  setSelectedDeviceId: (v: string | null) => void;
}) {
  const {data, isLoading} = useBiometricDevices(page, 12);
  const deactivateMutation = useDeactivateDevice();
  const syncMutation = useSyncDevice();

  return (
    <div className="space-y-4">
      {/* Actions Row */}
      <div className="row-between">
        <p className="text-body-muted">
          {data ? `${data.totalElements} device(s) registered` : 'Loading...'}
        </p>
        <Button
          onClick={() => setShowRegisterModal(true)}
          className="bg-accent-700 hover:bg-accent-800 text-white"
        >
          <Plus className="mr-2 h-4 w-4"/>
          Register Device
        </Button>
      </div>

      {/* Device Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-5 w-3/4 rounded bg-[var(--border-main)]"/>
                  <div className="h-4 w-1/2 rounded bg-[var(--border-main)]"/>
                  <div className="h-4 w-full rounded bg-[var(--border-main)]"/>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data?.content.map((device) => (
              <DeviceCard
                key={device.id}
                device={device}
                onDeactivate={() => deactivateMutation.mutate(device.id)}
                onSync={() => syncMutation.mutate(device.id)}
                onViewLogs={() => setSelectedDeviceId(device.id)}
              />
            ))}
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="text-body-muted">
                Page {page + 1} of {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages - 1}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Register Modal */}
      {showRegisterModal && (
        <RegisterDeviceModal onClose={() => setShowRegisterModal(false)}/>
      )}

      {/* Device Logs Drawer */}
      {selectedDeviceId && (
        <DeviceLogsDrawer
          deviceId={selectedDeviceId}
          onClose={() => setSelectedDeviceId(null)}
        />
      )}
    </div>
  );
}

// ─── Device Card ────────────────────────────────────────────────────────────

function DeviceCard({
                      device,
                      onDeactivate,
                      onSync,
                      onViewLogs,
                    }: {
  device: BiometricDevice;
  onDeactivate: () => void;
  onSync: () => void;
  onViewLogs: () => void;
}) {
  const typeConfig = DEVICE_TYPES[device.deviceType] || {
    label: device.deviceType,
    color: 'bg-[var(--bg-card-hover)] text-[var(--text-secondary)]',
  };

  const lastSyncFormatted = device.lastSyncAt
    ? new Date(device.lastSyncAt).toLocaleString()
    : 'Never';

  return (
    <Card className="group hover:shadow-[var(--shadow-elevated)] transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                {device.deviceName}
              </h3>
              {device.isOnline ? (
                <Wifi className="h-4 w-4 text-success-500 flex-shrink-0"/>
              ) : (
                <WifiOff className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0"/>
              )}
            </div>
            <p className="mt-0.5 text-caption truncate">
              SN: {device.serialNumber}
            </p>
          </div>
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeConfig.color}`}>
            {typeConfig.label}
          </span>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-[var(--bg-page)] p-2 text-center">
            <p className="text-lg font-bold text-[var(--text-primary)]">
              {device.totalPunchesToday}
            </p>
            <p className="text-2xs text-[var(--text-muted)]">Today</p>
          </div>
          <div className="rounded-lg bg-danger-50 dark:bg-danger-900/20 p-2 text-center">
            <p className="text-lg font-bold text-danger-600 dark:text-danger-400">
              {device.failedPunchesToday}
            </p>
            <p className="text-2xs text-[var(--text-muted)]">Failed</p>
          </div>
          <div className="rounded-lg bg-warning-50 dark:bg-warning-900/20 p-2 text-center">
            <p className="text-lg font-bold text-warning-600 dark:text-warning-400">
              {device.pendingPunches}
            </p>
            <p className="text-2xs text-[var(--text-muted)]">Pending</p>
          </div>
        </div>

        {/* Meta */}
        <div className="mt-4 space-y-1 text-caption">
          {device.manufacturer && (
            <p>
              {device.manufacturer} {device.model || ''}
            </p>
          )}
          {device.locationName && <p>Location: {device.locationName}</p>}
          <p>Last sync: {lastSyncFormatted}</p>
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2 border-t border-[var(--border-subtle)] pt-4">
          <button
            onClick={onViewLogs}
            className="flex items-center gap-1 text-xs text-accent-700 hover:text-accent-800 dark:text-accent-400 font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded px-2 py-1"
          >
            <Eye className="h-3.5 w-3.5"/>
            Logs
          </button>
          <button
            onClick={onSync}
            className="flex items-center gap-1 text-xs text-accent-600 hover:text-accent-700 dark:text-accent-400 font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded px-2 py-1"
          >
            <RefreshCw className="h-3.5 w-3.5"/>
            Sync
          </button>
          {device.isActive && (
            <button
              onClick={onDeactivate}
              className="flex items-center gap-1 text-xs text-danger-500 hover:text-danger-600 font-medium ml-auto cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded px-2 py-1"
            >
              <XCircle className="h-3.5 w-3.5"/>
              Deactivate
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Register Device Modal ──────────────────────────────────────────────────

function RegisterDeviceModal({onClose}: { onClose: () => void }) {
  const registerMutation = useRegisterDevice();

  const {
    register,
    handleSubmit,
    formState: {errors, isSubmitting},
  } = useForm<DeviceFormData>({
    resolver: zodResolver(deviceSchema),
    defaultValues: {
      deviceType: 'FINGERPRINT',
    },
  });

  const onSubmit = useCallback(
    async (data: DeviceFormData) => {
      await registerMutation.mutateAsync(data as BiometricDeviceRequest);
      onClose();
    },
    [registerMutation, onClose]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <motion.div
        initial={{opacity: 0, scale: 0.95}}
        animate={{opacity: 1, scale: 1}}
        className="w-full max-w-lg rounded-xl bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-dropdown)]"
      >
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
          Register Biometric Device
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Device Name */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Device Name *
            </label>
            <input
              {...register('deviceName')}
              className="w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2"
              placeholder="e.g., Main Entrance Scanner"
            />
            {errors.deviceName && (
              <p className="mt-1 text-xs text-danger-500">{errors.deviceName.message}</p>
            )}
          </div>

          {/* Device Type */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Device Type *
            </label>
            <select
              {...register('deviceType')}
              className="w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2"
            >
              {Object.entries(DEVICE_TYPES).map(([key, {label}]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            {errors.deviceType && (
              <p className="mt-1 text-xs text-danger-500">{errors.deviceType.message}</p>
            )}
          </div>

          {/* Serial Number */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Serial Number *
            </label>
            <input
              {...register('serialNumber')}
              className="w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2"
              placeholder="e.g., ZK-2024-001"
            />
            {errors.serialNumber && (
              <p className="mt-1 text-xs text-danger-500">{errors.serialNumber.message}</p>
            )}
          </div>

          {/* Two Column: Manufacturer + Model */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Manufacturer
              </label>
              <input
                {...register('manufacturer')}
                className="w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2"
                placeholder="e.g., ZKTeco"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Model
              </label>
              <input
                {...register('model')}
                className="w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2"
                placeholder="e.g., SpeedFace V5L"
              />
            </div>
          </div>

          {/* Two Column: IP Address + Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                IP Address
              </label>
              <input
                {...register('ipAddress')}
                className="w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2"
                placeholder="e.g., 192.168.1.100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Location
              </label>
              <input
                {...register('locationName')}
                className="w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2"
                placeholder="e.g., Building A, Floor 1"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Notes
            </label>
            <textarea
              {...register('notes')}
              rows={2}
              className="w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2"
              placeholder="Additional notes..."
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-4 pt-2">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || registerMutation.isPending}
              className="bg-accent-700 hover:bg-accent-800 text-white"
            >
              {registerMutation.isPending ? 'Registering...' : 'Register Device'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Device Logs Drawer ─────────────────────────────────────────────────────

function DeviceLogsDrawer({
                            deviceId,
                            onClose,
                          }: {
  deviceId: string;
  onClose: () => void;
}) {
  const [logPage, setLogPage] = useState(0);
  const {data, isLoading} = useDeviceLogs(deviceId, logPage, 20);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <motion.div
        initial={{x: '100%'}}
        animate={{x: 0}}
        exit={{x: '100%'}}
        transition={{type: 'spring', damping: 25, stiffness: 200}}
        className="w-full max-w-xl bg-[var(--bg-surface)] shadow-[var(--shadow-dropdown)] overflow-y-auto"
      >
        <div className="sticky top-0 z-10 row-between divider-b bg-[var(--bg-surface)] px-6 py-4">
          <h3 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Activity className="h-5 w-5 text-accent-700"/>
            Punch Logs
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="p-6 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse h-16 rounded-lg bg-[var(--bg-card-hover)]"/>
              ))}
            </div>
          ) : data?.content.length === 0 ? (
            <p className="text-center text-[var(--text-muted)] py-8">No punch logs found</p>
          ) : (
            <>
              {data?.content.map((log) => (
                <PunchLogRow key={log.id} log={log}/>
              ))}

              {data && data.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={logPage === 0}
                    onClick={() => setLogPage(logPage - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-body-muted">
                    Page {logPage + 1} of {data.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={logPage >= data.totalPages - 1}
                    onClick={() => setLogPage(logPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Punch Log Row ──────────────────────────────────────────────────────────

function PunchLogRow({log}: { log: BiometricPunchLog }) {
  const status = STATUS_COLORS[log.processedStatus] || STATUS_COLORS.PENDING;
  const StatusIcon = log.processedStatus === 'PROCESSED'
    ? CheckCircle
    : log.processedStatus === 'FAILED'
      ? XCircle
      : log.processedStatus === 'DUPLICATE'
        ? AlertTriangle
        : Clock;

  return (
    <div className={`rounded-lg border p-4 ${status.bg} dark:bg-opacity-20`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon className={`h-4 w-4 ${status.text}`}/>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {log.employeeIdentifier}
              <span className={`ml-2 inline-flex items-center rounded px-1.5 py-0.5 text-2xs font-semibold ${
                log.punchType === 'IN' ? 'bg-success-100 text-success-700' : 'bg-warning-100 text-warning-700'
              }`}>
                {log.punchType}
              </span>
            </p>
            <p className="text-caption">
              {new Date(log.punchTime).toLocaleString()}
            </p>
          </div>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-2xs font-medium ${status.text}`}>
          {log.processedStatus}
        </span>
      </div>
      {log.errorMessage && (
        <p className="mt-1.5 text-xs text-danger-500 dark:text-danger-400 pl-6">
          {log.errorMessage}
        </p>
      )}
    </div>
  );
}

// ─── Pending Punches Panel ──────────────────────────────────────────────────

function PendingPunchesPanel({
                               page,
                               setPage,
                             }: {
  page: number;
  setPage: (p: number) => void;
}) {
  const {data, isLoading} = usePendingPunches(page, 20);
  const reprocessMutation = useReprocessPunches();

  return (
    <div className="space-y-4">
      <div className="row-between">
        <p className="text-body-muted">
          {data ? `${data.totalElements} unprocessed punch(es)` : 'Loading...'}
        </p>
        <Button
          onClick={() => reprocessMutation.mutate()}
          disabled={reprocessMutation.isPending}
          variant="outline"
          className="border-accent-700 text-accent-700 hover:bg-accent-50"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${reprocessMutation.isPending ? 'animate-spin' : ''}`}/>
          Reprocess Failed
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse h-16 rounded-lg bg-[var(--bg-card-hover)]"/>
          ))}
        </div>
      ) : data?.content.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-success-500 mb-4"/>
            <p className="text-[var(--text-muted)]">All punches have been processed</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {data?.content.map((log) => (
              <PunchLogRow key={log.id} log={log}/>
            ))}
          </div>

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="text-body-muted">
                Page {page + 1} of {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages - 1}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── API Keys Panel ─────────────────────────────────────────────────────────

function ApiKeysPanel({
                        showModal,
                        setShowModal,
                      }: {
  showModal: boolean;
  setShowModal: (v: boolean) => void;
}) {
  const {data: keys, isLoading} = useBiometricApiKeys();
  const revokeMutation = useRevokeApiKey();
  const [newKey, setNewKey] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="row-between">
        <p className="text-body-muted">
          {keys ? `${keys.length} API key(s)` : 'Loading...'}
        </p>
        <Button
          onClick={() => setShowModal(true)}
          className="bg-accent-700 hover:bg-accent-800 text-white"
        >
          <Plus className="mr-2 h-4 w-4"/>
          Generate Key
        </Button>
      </div>

      {/* New Key Banner */}
      {newKey && (
        <div
          className="rounded-lg border-2 border-success-300 bg-success-50 p-4 dark:bg-success-900/20 dark:border-success-700">
          <div className="flex items-start gap-2">
            <Key className="h-5 w-5 text-success-600 flex-shrink-0 mt-0.5"/>
            <div>
              <p className="text-sm font-semibold text-success-800 dark:text-success-300">
                API Key Generated - Copy it now!
              </p>
              <p className="mt-1 text-xs text-success-700 dark:text-success-400">
                This key will not be shown again.
              </p>
              <code
                className="mt-2 block break-all rounded bg-[var(--bg-page)] px-4 py-2 text-xs font-mono text-[var(--text-primary)]">
                {newKey}
              </code>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  navigator.clipboard.writeText(newKey);
                  setNewKey(null);
                }}
              >
                Copy and Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Keys List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse h-16 rounded-lg bg-[var(--bg-card-hover)]"/>
          ))}
        </div>
      ) : keys?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Key className="h-12 w-12 text-[var(--text-muted)] mb-4"/>
            <p className="text-[var(--text-muted)]">
              No API keys. Generate one to connect biometric devices.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {keys?.map((key) => (
            <div
              key={key.id}
              className="row-between rounded-lg border border-[var(--border-main)] p-4"
            >
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {key.keyName}
                </p>
                <div className="mt-1 flex items-center gap-4 text-caption">
                  <span>...{key.keySuffix}</span>
                  <span>Created: {new Date(key.createdAt).toLocaleDateString()}</span>
                  {key.lastUsedAt && (
                    <span>Last used: {new Date(key.lastUsedAt).toLocaleDateString()}</span>
                  )}
                  <span className={key.isActive ? 'text-success-600' : 'text-danger-500'}>
                    {key.isActive ? 'Active' : 'Revoked'}
                  </span>
                </div>
              </div>
              {key.isActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger-500 hover:text-danger-600 hover:bg-danger-50"
                  onClick={() => revokeMutation.mutate(key.id)}
                  disabled={revokeMutation.isPending}
                >
                  <Trash2 className="h-4 w-4"/>
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Generate Key Modal */}
      {showModal && (
        <GenerateApiKeyModal
          onClose={() => setShowModal(false)}
          onKeyGenerated={(key) => setNewKey(key)}
        />
      )}
    </div>
  );
}

// ─── Generate API Key Modal ─────────────────────────────────────────────────

function GenerateApiKeyModal({
                               onClose,
                               onKeyGenerated,
                             }: {
  onClose: () => void;
  onKeyGenerated: (key: string) => void;
}) {
  const generateMutation = useGenerateApiKey();

  const {
    register,
    handleSubmit,
    formState: {errors},
  } = useForm<ApiKeyFormData>({
    resolver: zodResolver(apiKeySchema),
  });

  const onSubmit = useCallback(
    async (data: ApiKeyFormData) => {
      const result = await generateMutation.mutateAsync({keyName: data.keyName});
      if (result.plaintextKey) {
        onKeyGenerated(result.plaintextKey);
      }
      onClose();
    },
    [generateMutation, onClose, onKeyGenerated]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <motion.div
        initial={{opacity: 0, scale: 0.95}}
        animate={{opacity: 1, scale: 1}}
        className="w-full max-w-md rounded-xl bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-dropdown)]"
      >
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
          Generate API Key
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Key Name *
            </label>
            <input
              {...register('keyName')}
              className="w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2"
              placeholder="e.g., Main Entrance Device Key"
            />
            {errors.keyName && (
              <p className="mt-1 text-xs text-danger-500">{errors.keyName.message}</p>
            )}
          </div>

          <p
            className="text-xs text-warning-600 dark:text-warning-400 bg-warning-50 dark:bg-warning-900/20 rounded-lg p-4">
            The API key will only be shown once after generation. Make sure to copy and store it securely.
          </p>

          <div className="flex justify-end gap-4 pt-2">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={generateMutation.isPending}
              className="bg-accent-700 hover:bg-accent-800 text-white"
            >
              {generateMutation.isPending ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
