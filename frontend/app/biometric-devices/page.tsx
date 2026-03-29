'use client';

import { useState, useCallback } from 'react';
import {
  Fingerprint, Plus, RefreshCw, AlertTriangle, CheckCircle,
  XCircle, Clock, Wifi, WifiOff, Key, Trash2, Eye, Settings,
  Activity, Server,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useBiometricDevices,
  useRegisterDevice,
  useDeactivateDevice,
  useSyncDevice,
  useDeviceLogs,
  usePendingPunches,
  useReprocessPunches,
  useBiometricApiKeys,
  useGenerateApiKey,
  useRevokeApiKey,
} from '@/lib/hooks/useBiometric';
import type {
  BiometricDevice,
  BiometricDeviceRequest,
  BiometricPunchLog,
  BiometricApiKey,
} from '@/lib/services/biometricService';

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
  FINGERPRINT: { label: 'Fingerprint', color: 'bg-blue-100 text-blue-700' },
  FACE: { label: 'Face Recognition', color: 'bg-purple-100 text-purple-700' },
  IRIS: { label: 'Iris Scanner', color: 'bg-teal-100 text-teal-700' },
  CARD: { label: 'Card Reader', color: 'bg-amber-100 text-amber-700' },
  MULTI_MODAL: { label: 'Multi-Modal', color: 'bg-sky-100 text-sky-700' },
};

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  PENDING: { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  PROCESSED: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  FAILED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  DUPLICATE: { bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-400' },
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Fingerprint className="h-7 w-7 text-sky-700" />
                Biometric Devices
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Manage biometric devices, monitor punch logs, and configure API keys
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
            {[
              { key: 'devices' as const, label: 'Devices', icon: Server },
              { key: 'punches' as const, label: 'Pending Punches', icon: Clock },
              { key: 'api-keys' as const, label: 'API Keys', icon: Key },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => { setActiveTab(key); setPage(0); }}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === key
                    ? 'bg-white text-sky-700 shadow-sm dark:bg-gray-700 dark:text-sky-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === 'devices' && (
              <motion.div
                key="devices"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
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
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <PendingPunchesPanel page={page} setPage={setPage} />
              </motion.div>
            )}
            {activeTab === 'api-keys' && (
              <motion.div
                key="api-keys"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
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
  const { data, isLoading } = useBiometricDevices(page, 12);
  const deactivateMutation = useDeactivateDevice();
  const syncMutation = useSyncDevice();

  return (
    <div className="space-y-4">
      {/* Actions Row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {data ? `${data.totalElements} device(s) registered` : 'Loading...'}
        </p>
        <Button
          onClick={() => setShowRegisterModal(true)}
          className="bg-sky-700 hover:bg-sky-800 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Register Device
        </Button>
      </div>

      {/* Device Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-5 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
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
              <span className="text-sm text-gray-500">
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
        <RegisterDeviceModal onClose={() => setShowRegisterModal(false)} />
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
    color: 'bg-gray-100 text-gray-700',
  };

  const lastSyncFormatted = device.lastSyncAt
    ? new Date(device.lastSyncAt).toLocaleString()
    : 'Never';

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {device.deviceName}
              </h3>
              {device.isOnline ? (
                <Wifi className="h-4 w-4 text-green-500 flex-shrink-0" />
              ) : (
                <WifiOff className="h-4 w-4 text-gray-400 flex-shrink-0" />
              )}
            </div>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
              SN: {device.serialNumber}
            </p>
          </div>
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeConfig.color}`}>
            {typeConfig.label}
          </span>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-2 text-center">
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {device.totalPunchesToday}
            </p>
            <p className="text-[10px] text-gray-500">Today</p>
          </div>
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-2 text-center">
            <p className="text-lg font-bold text-red-600 dark:text-red-400">
              {device.failedPunchesToday}
            </p>
            <p className="text-[10px] text-gray-500">Failed</p>
          </div>
          <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-2 text-center">
            <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
              {device.pendingPunches}
            </p>
            <p className="text-[10px] text-gray-500">Pending</p>
          </div>
        </div>

        {/* Meta */}
        <div className="mt-3 space-y-1 text-xs text-gray-500 dark:text-gray-400">
          {device.manufacturer && (
            <p>
              {device.manufacturer} {device.model || ''}
            </p>
          )}
          {device.locationName && <p>Location: {device.locationName}</p>}
          <p>Last sync: {lastSyncFormatted}</p>
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2 border-t border-gray-100 dark:border-gray-700 pt-3">
          <button
            onClick={onViewLogs}
            className="flex items-center gap-1 text-xs text-sky-700 hover:text-sky-800 dark:text-sky-400 font-medium"
          >
            <Eye className="h-3.5 w-3.5" />
            Logs
          </button>
          <button
            onClick={onSync}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Sync
          </button>
          {device.isActive && (
            <button
              onClick={onDeactivate}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium ml-auto"
            >
              <XCircle className="h-3.5 w-3.5" />
              Deactivate
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Register Device Modal ──────────────────────────────────────────────────

function RegisterDeviceModal({ onClose }: { onClose: () => void }) {
  const registerMutation = useRegisterDevice();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800"
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Register Biometric Device
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Device Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Device Name *
            </label>
            <input
              {...register('deviceName')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-700 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="e.g., Main Entrance Scanner"
            />
            {errors.deviceName && (
              <p className="mt-1 text-xs text-red-500">{errors.deviceName.message}</p>
            )}
          </div>

          {/* Device Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Device Type *
            </label>
            <select
              {...register('deviceType')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-700 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              {Object.entries(DEVICE_TYPES).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            {errors.deviceType && (
              <p className="mt-1 text-xs text-red-500">{errors.deviceType.message}</p>
            )}
          </div>

          {/* Serial Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Serial Number *
            </label>
            <input
              {...register('serialNumber')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-700 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="e.g., ZK-2024-001"
            />
            {errors.serialNumber && (
              <p className="mt-1 text-xs text-red-500">{errors.serialNumber.message}</p>
            )}
          </div>

          {/* Two Column: Manufacturer + Model */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Manufacturer
              </label>
              <input
                {...register('manufacturer')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-700 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., ZKTeco"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Model
              </label>
              <input
                {...register('model')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-700 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., SpeedFace V5L"
              />
            </div>
          </div>

          {/* Two Column: IP Address + Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                IP Address
              </label>
              <input
                {...register('ipAddress')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-700 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., 192.168.1.100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Location
              </label>
              <input
                {...register('locationName')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-700 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., Building A, Floor 1"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              {...register('notes')}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-700 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Additional notes..."
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || registerMutation.isPending}
              className="bg-sky-700 hover:bg-sky-800 text-white"
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
  const { data, isLoading } = useDeviceLogs(deviceId, logPage, 20);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full max-w-xl bg-white shadow-xl dark:bg-gray-800 overflow-y-auto"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4 dark:bg-gray-800 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-sky-700" />
            Punch Logs
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="p-6 space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse h-16 rounded-lg bg-gray-100 dark:bg-gray-700" />
              ))}
            </div>
          ) : data?.content.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No punch logs found</p>
          ) : (
            <>
              {data?.content.map((log) => (
                <PunchLogRow key={log.id} log={log} />
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
                  <span className="text-sm text-gray-500">
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

function PunchLogRow({ log }: { log: BiometricPunchLog }) {
  const status = STATUS_COLORS[log.processedStatus] || STATUS_COLORS.PENDING;
  const StatusIcon = log.processedStatus === 'PROCESSED'
    ? CheckCircle
    : log.processedStatus === 'FAILED'
    ? XCircle
    : log.processedStatus === 'DUPLICATE'
    ? AlertTriangle
    : Clock;

  return (
    <div className={`rounded-lg border p-3 ${status.bg} dark:bg-opacity-20`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon className={`h-4 w-4 ${status.text}`} />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {log.employeeIdentifier}
              <span className={`ml-2 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                log.punchType === 'IN' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
              }`}>
                {log.punchType}
              </span>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(log.punchTime).toLocaleString()}
            </p>
          </div>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${status.text}`}>
          {log.processedStatus}
        </span>
      </div>
      {log.errorMessage && (
        <p className="mt-1.5 text-xs text-red-500 dark:text-red-400 pl-6">
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
  const { data, isLoading } = usePendingPunches(page, 20);
  const reprocessMutation = useReprocessPunches();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {data ? `${data.totalElements} unprocessed punch(es)` : 'Loading...'}
        </p>
        <Button
          onClick={() => reprocessMutation.mutate()}
          disabled={reprocessMutation.isPending}
          variant="outline"
          className="border-sky-700 text-sky-700 hover:bg-sky-50"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${reprocessMutation.isPending ? 'animate-spin' : ''}`} />
          Reprocess Failed
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse h-16 rounded-lg bg-gray-100 dark:bg-gray-700" />
          ))}
        </div>
      ) : data?.content.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">All punches have been processed</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {data?.content.map((log) => (
              <PunchLogRow key={log.id} log={log} />
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
              <span className="text-sm text-gray-500">
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
  const { data: keys, isLoading } = useBiometricApiKeys();
  const revokeMutation = useRevokeApiKey();
  const [newKey, setNewKey] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {keys ? `${keys.length} API key(s)` : 'Loading...'}
        </p>
        <Button
          onClick={() => setShowModal(true)}
          className="bg-sky-700 hover:bg-sky-800 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Generate Key
        </Button>
      </div>

      {/* New Key Banner */}
      {newKey && (
        <div className="rounded-lg border-2 border-green-300 bg-green-50 p-4 dark:bg-green-900/20 dark:border-green-700">
          <div className="flex items-start gap-2">
            <Key className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                API Key Generated - Copy it now!
              </p>
              <p className="mt-1 text-xs text-green-700 dark:text-green-400">
                This key will not be shown again.
              </p>
              <code className="mt-2 block break-all rounded bg-white px-3 py-2 text-xs font-mono text-gray-900 dark:bg-gray-800 dark:text-white">
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
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse h-16 rounded-lg bg-gray-100 dark:bg-gray-700" />
          ))}
        </div>
      ) : keys?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Key className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              No API keys. Generate one to connect biometric devices.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {keys?.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700"
            >
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {key.keyName}
                </p>
                <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span>...{key.keySuffix}</span>
                  <span>Created: {new Date(key.createdAt).toLocaleDateString()}</span>
                  {key.lastUsedAt && (
                    <span>Last used: {new Date(key.lastUsedAt).toLocaleDateString()}</span>
                  )}
                  <span className={key.isActive ? 'text-green-600' : 'text-red-500'}>
                    {key.isActive ? 'Active' : 'Revoked'}
                  </span>
                </div>
              </div>
              {key.isActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => revokeMutation.mutate(key.id)}
                  disabled={revokeMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
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
    formState: { errors },
  } = useForm<ApiKeyFormData>({
    resolver: zodResolver(apiKeySchema),
  });

  const onSubmit = useCallback(
    async (data: ApiKeyFormData) => {
      const result = await generateMutation.mutateAsync({ keyName: data.keyName });
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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800"
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Generate API Key
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Key Name *
            </label>
            <input
              {...register('keyName')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-700 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="e.g., Main Entrance Device Key"
            />
            {errors.keyName && (
              <p className="mt-1 text-xs text-red-500">{errors.keyName.message}</p>
            )}
          </div>

          <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
            The API key will only be shown once after generation. Make sure to copy and store it securely.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={generateMutation.isPending}
              className="bg-sky-700 hover:bg-sky-800 text-white"
            >
              {generateMutation.isPending ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
