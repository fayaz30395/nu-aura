'use client';

import React, {useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {
  AlertCircle,
  Armchair,
  Box,
  Calendar,
  Car,
  DollarSign,
  Download,
  Edit,
  Eye,
  Key,
  Laptop,
  Loader2,
  MapPin,
  Monitor,
  MoreVertical,
  Package,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Tablet,
  Tag,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  Wrench,
} from 'lucide-react';
import {AppLayout} from '@/components/layout/AppLayout';
import {Button, Card, CardContent, EmptyState, Modal, ModalBody, ModalFooter, ModalHeader, Stat,} from '@/components/ui';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {Reveal} from '@/components/motion';
import {BarsH} from '@/components/charts/aura';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {Asset, AssetCategory, AssetStatus, CreateAssetRequest, UpdateAssetRequest} from '@/lib/types/hrms/asset';
import {
  useAllAssets,
  useAssignAsset,
  useCreateAsset,
  useDeleteAsset,
  useReturnAsset,
  useUpdateAsset,
} from '@/lib/hooks/queries';
import {createLogger} from '@/lib/utils/logger';
import {cn, formatCurrency, getInitials} from '@/lib/utils';
import {formatDate as formatDateCanonical} from '@/lib/utils/format/date';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {ASSET_STATUS} from '@/lib/status/vocabulary';

const log = createLogger('AssetsPage');

const assetFormSchema = z.object({
  assetCode: z.string().min(1, 'Asset code required'),
  assetName: z.string().min(1, 'Asset name required'),
  category: z.string().min(1, 'Category required'),
  brand: z.string().optional().or(z.literal('')),
  model: z.string().optional().or(z.literal('')),
  serialNumber: z.string().optional().or(z.literal('')),
  purchaseDate: z.string().optional().or(z.literal('')),
  purchaseCost: z.number({coerce: true}).optional(),
  currentValue: z.number({coerce: true}).optional(),
  status: z.string().min(1, 'Status required'),
  location: z.string().optional().or(z.literal('')),
  warrantyExpiry: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

const assignAssetFormSchema = z.object({
  assignEmployeeId: z.string().min(1, 'Employee ID required'),
});

type AssetFormData = z.infer<typeof assetFormSchema>;
type AssignAssetFormData = z.infer<typeof assignAssetFormSchema>;

const getCategoryIcon = (category: AssetCategory) => {
  switch (category) {
    case AssetCategory.LAPTOP:
      return <Laptop className="h-5 w-5"/>;
    case AssetCategory.DESKTOP:
      return <Monitor className="h-5 w-5"/>;
    case AssetCategory.MONITOR:
      return <Monitor className="h-5 w-5"/>;
    case AssetCategory.PHONE:
      return <Phone className="h-5 w-5"/>;
    case AssetCategory.TABLET:
      return <Tablet className="h-5 w-5"/>;
    case AssetCategory.FURNITURE:
      return <Armchair className="h-5 w-5"/>;
    case AssetCategory.VEHICLE:
      return <Car className="h-5 w-5"/>;
    case AssetCategory.SOFTWARE_LICENSE:
      return <Key className="h-5 w-5"/>;
    default:
      return <Box className="h-5 w-5"/>;
  }
};

const getCategoryColor = (category: AssetCategory) => {
  switch (category) {
    case AssetCategory.LAPTOP:
      return 'bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-300';
    case AssetCategory.DESKTOP:
      return 'bg-accent-300 text-accent-900 dark:bg-accent-900 dark:text-accent-500';
    case AssetCategory.MONITOR:
      return 'bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-300';
    case AssetCategory.PHONE:
      return 'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300';
    case AssetCategory.TABLET:
      return 'bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-300';
    case AssetCategory.FURNITURE:
      return 'bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-300';
    case AssetCategory.VEHICLE:
      return 'bg-danger-100 text-danger-700 dark:bg-danger-900 dark:text-danger-300';
    case AssetCategory.SOFTWARE_LICENSE:
      return 'bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-300';
    default:
      return 'bg-[var(--bg-surface)] text-[var(--text-secondary)]';
  }
};

const formatDate = (date: string | undefined) => {
  if (!date) return '-';
  return formatDateCanonical(date);
};

/**
 * Aura: uniform soft-accent icon tile for the asset row (matches the
 * `AssetsPage` prototype, which renders every asset glyph in a single
 * `--accent-soft / --accent-text` tile rather than per-category hues).
 */
const ASSET_TILE_CLASS =
  'grid h-9 w-9 shrink-0 place-items-center rounded-aura-md bg-[var(--accent-soft)] text-[var(--accent-text)]';

/** Category filter chips, mapped to the real {@link AssetCategory} enum. `''` = All. */
const CATEGORY_CHIPS: ReadonlyArray<{ label: string; value: '' | AssetCategory }> = [
  {label: 'All', value: ''},
  {label: 'Laptop', value: AssetCategory.LAPTOP},
  {label: 'Monitor', value: AssetCategory.MONITOR},
  {label: 'Phone', value: AssetCategory.PHONE},
  {label: 'Tablet', value: AssetCategory.TABLET},
  {label: 'Peripheral', value: AssetCategory.OTHER},
];

/** Human label for an {@link AssetCategory} (used in the by-category breakdown). */
const categoryLabel = (category: AssetCategory): string =>
  category
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Token-driven chart palette used to tint assignee avatars deterministically,
 * mirroring the prototype's `colorFor(name)` (colored gradient chips, white
 * initials) rather than a single flat accent chip. Chart vars stay in-system
 * for light + dark parity.
 */
const AVATAR_PALETTE = [
  'bg-[var(--chart-1)]',
  'bg-[var(--chart-2)]',
  'bg-[var(--chart-3)]',
  'bg-[var(--chart-4)]',
  'bg-[var(--chart-5)]',
] as const;

/** Stable hash → palette index so a given name always maps to the same hue. */
const avatarColorFor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
};

/** Page-local assignee avatar — deterministic colored chip with white initials. */
function AssigneeAvatar({name}: { name: string }) {
  return (
    <span
      className={`grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white ${avatarColorFor(name)}`}
      aria-hidden
    >
      {getInitials(name)}
    </span>
  );
}


export default function AssetManagementPage() {
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  // statusFilter is retained (read by filteredAssets) but the Aura toolbar exposes
  // only category chips + search; the setter is intentionally unused here.
  const [statusFilter, _setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(0);

  // Initialize React Query hooks
  const assetsQuery = useAllAssets(currentPage, 20);
  const createMutation = useCreateAsset();
  const updateMutation = useUpdateAsset();
  const deleteMutation = useDeleteAsset();
  const assignMutation = useAssignAsset();
  const returnMutation = useReturnAsset();

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [openActionsAssetId, setOpenActionsAssetId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form setup
  const {
    register,
    handleSubmit,
    reset: resetAssetForm,
    formState: {errors, isSubmitting},
    setValue,
  } = useForm<AssetFormData>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      assetCode: '',
      assetName: '',
      category: AssetCategory.LAPTOP,
      brand: '',
      model: '',
      serialNumber: '',
      purchaseDate: '',
      purchaseCost: undefined,
      currentValue: undefined,
      status: AssetStatus.AVAILABLE,
      location: '',
      warrantyExpiry: '',
      notes: '',
    },
  });

  const {
    register: registerAssign,
    handleSubmit: handleSubmitAssign,
    reset: resetAssignForm,
    formState: {errors: assignErrors, isSubmitting: isAssigning},
  } = useForm<AssignAssetFormData>({
    resolver: zodResolver(assignAssetFormSchema),
    defaultValues: {
      assignEmployeeId: '',
    },
  });

  // Apply client-side filtering to assets
  const filteredAssets = React.useMemo(() => {
    let result = (assetsQuery.data?.content || []).filter(Boolean);

    // Client-side filtering
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.assetName?.toLowerCase().includes(query) ||
          a.assetCode?.toLowerCase().includes(query) ||
          a.brand?.toLowerCase().includes(query) ||
          a.model?.toLowerCase().includes(query)
      );
    }
    if (statusFilter) {
      result = result.filter((a) => a.status === statusFilter);
    }
    if (categoryFilter) {
      result = result.filter((a) => a.category === categoryFilter);
    }

    return result;
  }, [assetsQuery.data?.content, searchQuery, statusFilter, categoryFilter]);

  const resetForm = () => {
    resetAssetForm();
    setIsEditing(false);
    setSelectedAsset(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEditModal = (asset: Asset) => {
    setOpenActionsAssetId(null);
    setSelectedAsset(asset);
    setIsEditing(true);
    setValue('assetCode', asset.assetCode);
    setValue('assetName', asset.assetName);
    setValue('category', asset.category as unknown as string);
    setValue('brand', asset.brand || '');
    setValue('model', asset.model || '');
    setValue('serialNumber', asset.serialNumber || '');
    setValue('purchaseDate', asset.purchaseDate || '');
    setValue('purchaseCost', asset.purchaseCost);
    setValue('currentValue', asset.currentValue);
    setValue('status', asset.status as unknown as string);
    setValue('location', asset.location || '');
    setValue('warrantyExpiry', asset.warrantyExpiry || '');
    setValue('notes', asset.notes || '');
    setShowAddModal(true);
  };

  const handleViewDetails = (asset: Asset) => {
    setOpenActionsAssetId(null);
    setSelectedAsset(asset);
    setShowDetailModal(true);
  };

  const handleDeleteClick = (asset: Asset) => {
    setOpenActionsAssetId(null);
    setSelectedAsset(asset);
    setShowDeleteModal(true);
  };

  const handleAssignClick = (asset: Asset) => {
    setOpenActionsAssetId(null);
    setSelectedAsset(asset);
    resetAssignForm();
    setShowAssignModal(true);
  };

  const onAssetSubmit = async (data: AssetFormData) => {
    try {
      if (isEditing && selectedAsset) {
        const updateData: UpdateAssetRequest = {...data} as UpdateAssetRequest;
        await updateMutation.mutateAsync({id: selectedAsset.id, data: updateData});
      } else {
        await createMutation.mutateAsync(data as CreateAssetRequest);
      }
      setShowAddModal(false);
      resetForm();
    } catch (err: unknown) {
      log.error('Error saving asset:', err);
      setError((err as {
        response?: { data?: { message?: string } }
      })?.response?.data?.message || 'Failed to save asset');
    }
  };

  const onAssignSubmit = async (data: AssignAssetFormData) => {
    if (!selectedAsset) return;
    try {
      await assignMutation.mutateAsync({assetId: selectedAsset.id, employeeId: data.assignEmployeeId});
      setShowAssignModal(false);
      resetAssignForm();
      setSelectedAsset(null);
    } catch (err: unknown) {
      log.error('Error assigning asset:', err);
      setError((err as {
        response?: { data?: { message?: string } }
      })?.response?.data?.message || 'Failed to assign asset');
    }
  };

  const handleDelete = async () => {
    if (!selectedAsset) return;
    setDeleting(true);
    try {
      await deleteMutation.mutateAsync(selectedAsset.id);
      setShowDeleteModal(false);
      setSelectedAsset(null);
    } catch (err: unknown) {
      log.error('Error deleting asset:', err);
      setError((err as {
        response?: { data?: { message?: string } }
      })?.response?.data?.message || 'Failed to delete asset');
    } finally {
      setDeleting(false);
    }
  };

  const handleReturn = async (asset: Asset) => {
    setOpenActionsAssetId(null);
    try {
      await returnMutation.mutateAsync(asset.id);
    } catch (err: unknown) {
      log.error('Error returning asset:', err);
      setError((err as {
        response?: { data?: { message?: string } }
      })?.response?.data?.message || 'Failed to return asset');
    }
  };

  // Stats
  const stats = {
    total: assetsQuery.data?.totalElements || 0,
    available: filteredAssets.filter((a) => a.status === AssetStatus.AVAILABLE).length,
    assigned: filteredAssets.filter((a) => a.status === AssetStatus.ASSIGNED).length,
    maintenance: filteredAssets.filter((a) => a.status === AssetStatus.IN_MAINTENANCE).length,
  };

  const assignedPct = stats.total > 0 ? Math.round((stats.assigned / stats.total) * 100) : 0;

  // Aura "By category" breakdown — derived from the loaded page (real data),
  // ranked descending so the leading bar reads as the dominant category.
  const categoryBreakdown = React.useMemo(() => {
    const pageAssets = (assetsQuery.data?.content || []).filter(Boolean);
    const counts = new Map<AssetCategory, number>();
    for (const a of pageAssets) {
      counts.set(a.category, (counts.get(a.category) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([category, value]) => ({label: categoryLabel(category), value}))
      .sort((a, b) => b.value - a.value);
  }, [assetsQuery.data?.content]);

  // Aura "Lifecycle" bars — Healthy = not retired/lost, Aging = in maintenance,
  // End of life = retired/lost. Computed from the loaded page so the figures
  // track the real inventory rather than mock percentages.
  const lifecycle = React.useMemo(() => {
    const pageAssets = (assetsQuery.data?.content || []).filter(Boolean);
    const denom = pageAssets.length || 1;
    const endOfLife = pageAssets.filter(
      (a) => a.status === AssetStatus.RETIRED || a.status === AssetStatus.LOST
    ).length;
    const aging = pageAssets.filter((a) => a.status === AssetStatus.IN_MAINTENANCE).length;
    const healthy = pageAssets.length - endOfLife - aging;
    const pct = (n: number) => Math.round((n / denom) * 100);
    return [
      {label: 'Healthy', pct: pct(healthy), barClass: '[&::-webkit-progress-value]:bg-[var(--ok-fg)] [&::-moz-progress-bar]:bg-[var(--ok-fg)]'},
      {label: 'Aging (3y+)', pct: pct(aging), barClass: '[&::-webkit-progress-value]:bg-[var(--warn-fg)] [&::-moz-progress-bar]:bg-[var(--warn-fg)]'},
      {label: 'End of life', pct: pct(endOfLife), barClass: '[&::-webkit-progress-value]:bg-[var(--err-fg)] [&::-moz-progress-bar]:bg-[var(--err-fg)]'},
    ];
  }, [assetsQuery.data?.content]);

  // Aggregate book value across the loaded page (real `currentValue` sums).
  const bookValue = React.useMemo(
    () =>
      (assetsQuery.data?.content || [])
        .filter(Boolean)
        .reduce((sum, a) => sum + (a.currentValue || 0), 0),
    [assetsQuery.data?.content]
  );

  const breadcrumbs = [
    {label: 'NU-HRMS', href: '/dashboard'},
    {label: 'Assets'},
  ];

  const getActionsMenuClassName = (assetId: string) => {
    const openClass = openActionsAssetId === assetId
      ? 'opacity-100 visible'
      : 'opacity-0 invisible group-hover:opacity-100 group-hover:visible';

    return `absolute right-0 top-full mt-1 w-40 bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg shadow-[var(--shadow-dropdown)] ${openClass} transition-all z-10`;
  };

  if (assetsQuery.isLoading && !assetsQuery.data) {
    return (
      <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="assets">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-accent-500"/>
          <span className="ml-2 text-[var(--text-secondary)]">Loading assets...</span>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="assets">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-aura-title text-[var(--text-1)]">
              Assets
            </h1>
            <p className="mt-1 text-sm text-[var(--text-2)]">
              <span className="tnum">{stats.total.toLocaleString()}</span> tracked assets
              {' · '}
              <span className="tnum">{assignedPct}%</span> assigned
              {' · '}
              <span className="tnum">{formatCurrency(bookValue, 'INR', {maximumFractionDigits: 0})}</span> book value
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" leftIcon={<Download className="h-4 w-4"/>}>
              Export
            </Button>
            <PermissionGate permission={Permissions.ASSET_CREATE}>
              <Button leftIcon={<Plus className="h-4 w-4"/>} onClick={handleOpenAddModal}>
                Assign Asset
              </Button>
            </PermissionGate>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Card className="border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-900/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-danger-600 dark:text-danger-400">
                <AlertCircle className="h-5 w-5"/>
                <span>{error}</span>
                <Button size="sm" variant="outline" onClick={() => assetsQuery.refetch()} className="ml-auto">
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPI Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card padding="md">
            <Stat
              icon={<Package className="h-5 w-5"/>}
              iconTone="accent"
              label="Total assets"
              value={stats.total.toLocaleString()}
              foot="Across all locations"
            />
          </Card>
          <Card padding="md">
            <Stat
              icon={<UserCheck className="h-5 w-5"/>}
              iconTone="success"
              label="Assigned"
              value={stats.assigned.toLocaleString()}
              delta={`${assignedPct}%`}
              deltaDir="up"
              foot="of all inventory"
            />
          </Card>
          <Card padding="md">
            <Stat
              icon={<Box className="h-5 w-5"/>}
              iconTone="warning"
              label="Available"
              value={stats.available.toLocaleString()}
              delta={`${stats.available.toLocaleString()} ready`}
              deltaDir="flat"
              foot="Ready to deploy"
            />
          </Card>
          <Card padding="md">
            <Stat
              icon={<Wrench className="h-5 w-5"/>}
              iconTone="info"
              label="In repair"
              value={stats.maintenance.toLocaleString()}
              delta={stats.maintenance > 0 ? `${stats.maintenance.toLocaleString()} open` : 'None'}
              deltaDir={stats.maintenance > 0 ? 'down' : 'flat'}
              foot="In maintenance"
            />
          </Card>
        </div>

        {/* Split: asset table (left) + breakdowns (right) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_1.3fr]">
          {/* Left — inventory table */}
          <Card padding="none" className="self-start overflow-hidden">
            {/* Toolbar: category chips + search */}
            <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-soft)] px-4 py-3">
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
                {CATEGORY_CHIPS.map((chip) => {
                  const isActive = categoryFilter === chip.value;
                  return (
                    <button
                      key={chip.label}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setCategoryFilter(chip.value)}
                      className={cn(
                        'rounded-aura-full px-3 py-1 text-xs font-semibold transition-colors',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--surface)]',
                        isActive
                          ? 'bg-[var(--accent)] text-white'
                          : 'bg-[var(--surface-sunken)] text-[var(--text-2)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-1)]'
                      )}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
              <div className="relative ml-auto w-full sm:w-[220px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-3)]"/>
                <input
                  type="text"
                  placeholder="Search serial, name…"
                  aria-label="Search assets"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-aura h-9 w-full pl-9 text-sm"
                />
              </div>
            </div>

            {/* Assets Table */}
            {filteredAssets.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table-aura">
                  <thead>
                  <tr>
                    <th
                      className="skeuo-table-header text-aura-micro px-4 py-2 text-left">
                      Asset
                    </th>
                    <th
                      className="skeuo-table-header text-aura-micro px-4 py-2 text-left">
                      Serial
                    </th>
                    <th
                      className="skeuo-table-header text-aura-micro px-4 py-2 text-left">
                      Assigned to
                    </th>
                    <th
                      className="skeuo-table-header text-aura-micro px-4 py-2 text-left">
                      Location
                    </th>
                    <th
                      className="skeuo-table-header text-aura-micro px-4 py-2 text-left">
                      Status
                    </th>
                    <th
                      className="skeuo-table-header text-aura-micro px-4 py-2 text-left">
                      Purchased
                    </th>
                    <th
                      className="skeuo-table-header text-aura-micro px-4 py-2 text-right">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                  </thead>
                  <tbody>
                  {filteredAssets.map((asset) => (
                    <tr key={asset.id} className="h-[58px]">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className={ASSET_TILE_CLASS}>
                            {getCategoryIcon(asset.category)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-[var(--text-1)]">{asset.assetName}</p>
                            <p className="tnum text-xs text-[var(--text-3)]">{asset.assetCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="tnum text-[12.5px] text-[var(--text-2)]">
                          {asset.serialNumber || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {asset.assignedToName ? (
                          <div className="flex items-center gap-2">
                            <AssigneeAvatar name={asset.assignedToName}/>
                            <span className="font-medium text-[var(--text-1)]">{asset.assignedToName}</span>
                          </div>
                        ) : (
                          <span className="text-[var(--text-3)]">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-[var(--text-2)]">
                          {asset.location || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={asset.status} domain={ASSET_STATUS}/>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="tnum text-[12.5px] text-[var(--text-2)]">
                          {formatDate(asset.purchaseDate)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="relative group inline-block">
                          <button
                            type="button"
                            aria-label="Asset actions menu"
                            aria-haspopup="menu"
                            aria-expanded={openActionsAssetId === asset.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenActionsAssetId((currentAssetId) => currentAssetId === asset.id ? null : asset.id);
                            }}
                            className="p-1 rounded hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
                          >
                            <MoreVertical className="h-4 w-4 text-[var(--text-muted)]"/>
                          </button>
                          <div
                            role="menu"
                            className={getActionsMenuClassName(asset.id)}>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => handleViewDetails(asset)}
                              className="w-full px-4 py-2 text-left text-body-secondary hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border-focus)]"
                            >
                              <Eye className="h-4 w-4"/>
                              View Details
                            </button>
                            <PermissionGate permission={Permissions.ASSET_MANAGE} fallback={<div/>}>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => handleOpenEditModal(asset)}
                                className="w-full px-4 py-2 text-left text-body-secondary hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] flex items-center gap-2"
                              >
                                <Edit className="h-4 w-4"/>
                                Edit
                              </button>
                            </PermissionGate>
                            {asset.status === AssetStatus.AVAILABLE && (
                              <PermissionGate permission={Permissions.ASSET_ASSIGN} fallback={<div/>}>
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => handleAssignClick(asset)}
                                  className="w-full px-4 py-2 text-left text-body-secondary hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] flex items-center gap-2"
                                >
                                  <UserPlus className="h-4 w-4"/>
                                  Assign
                                </button>
                              </PermissionGate>
                            )}
                            {asset.status === AssetStatus.ASSIGNED && (
                              <PermissionGate permission={Permissions.ASSET_ASSIGN} fallback={<div/>}>
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => handleReturn(asset)}
                                  className="w-full px-4 py-2 text-left text-body-secondary hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] flex items-center gap-2"
                                >
                                  <RotateCcw className="h-4 w-4"/>
                                  Return
                                </button>
                              </PermissionGate>
                            )}
                            <PermissionGate permission={Permissions.ASSET_MANAGE} fallback={<div/>}>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => handleDeleteClick(asset)}
                                className="w-full px-4 py-2 text-left text-sm text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 flex items-center gap-2"
                              >
                                <Trash2 className="h-4 w-4"/>
                                Delete
                              </button>
                            </PermissionGate>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                  </tbody>
                </table>
              </div>
            ) : (
              !assetsQuery.isLoading && (
                <div className="p-6">
                  <EmptyState
                    icon={<Package className="h-12 w-12"/>}
                    title="No Assets Found"
                    description="Start tracking company assets by adding your first item. Manage laptops, monitors, furniture, and more."
                    actionLabel="Add Asset"
                    onAction={() => setShowAddModal(true)}
                  />
                </div>
              )
            )}

            {/* Pagination (inside the table card footer) */}
            {(assetsQuery.data?.totalPages || 0) > 1 && (
              <div className="flex items-center justify-center gap-2 border-t border-[var(--border-soft)] px-4 py-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="tnum text-sm text-[var(--text-2)]">
                  Page {currentPage + 1} of {assetsQuery.data?.totalPages || 0}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= (assetsQuery.data?.totalPages || 1) - 1}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </Card>

          {/* Right — By category + Lifecycle */}
          <Reveal className="self-start">
            <Card padding="lg">
              <div className="mb-3">
                <h2 className="text-[15px] font-bold text-[var(--text-1)]">By category</h2>
                <p className="text-xs text-[var(--text-3)]">Inventory mix</p>
              </div>
              {categoryBreakdown.length > 0 ? (
                <BarsH data={categoryBreakdown}/>
              ) : (
                <p className="text-sm text-[var(--text-3)]">No category data.</p>
              )}

              <hr className="my-5 border-[var(--border-soft)]"/>

              <h2 className="mb-3 text-[15px] font-bold text-[var(--text-1)]">Lifecycle</h2>
              <div className="flex flex-col gap-4">
                {lifecycle.map((row) => (
                  <div key={row.label}>
                    <div className="mb-1.5 flex items-center justify-between text-[12.5px]">
                      <span className="font-semibold text-[var(--text-2)]">{row.label}</span>
                      <span className="tnum text-[var(--text-3)]">{row.pct}%</span>
                    </div>
                    <progress
                      className={`block h-2 w-full appearance-none overflow-hidden rounded-aura-full bg-[var(--surface-sunken)] [&::-webkit-progress-bar]:bg-[var(--surface-sunken)] [&::-webkit-progress-value]:rounded-aura-full [&::-moz-progress-bar]:rounded-aura-full ${row.barClass}`}
                      value={row.pct}
                      max={100}
                      aria-label={`${row.label} lifecycle percentage`}
                    />
                  </div>
                ))}
              </div>
            </Card>
          </Reveal>
        </div>

        {/* Add/Edit Asset Modal */}
        <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} size="lg">
          <ModalHeader>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              {isEditing ? 'Edit Asset' : 'Add New Asset'}
            </h2>
          </ModalHeader>
          <form onSubmit={handleSubmit(onAssetSubmit)}>
            <ModalBody>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="asset-code" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Asset Code *
                    </label>
                    <input
                      id="asset-code"
                      type="text"
                      className="input-aura"
                      placeholder="AST001"
                      {...register('assetCode')}
                    />
                    {errors.assetCode && <span className="text-danger-500 text-sm">{errors.assetCode.message}</span>}
                  </div>
                  <div>
                    <label htmlFor="asset-name" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Asset Name *
                    </label>
                    <input
                      id="asset-name"
                      type="text"
                      className="input-aura"
                      placeholder="MacBook Pro 16"
                      {...register('assetName')}
                    />
                    {errors.assetName && <span className="text-danger-500 text-sm">{errors.assetName.message}</span>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="asset-category" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Category *
                    </label>
                    <select
                      id="asset-category"
                      className="input-aura"
                      {...register('category')}
                    >
                      <option value={AssetCategory.LAPTOP}>Laptop</option>
                      <option value={AssetCategory.DESKTOP}>Desktop</option>
                      <option value={AssetCategory.MONITOR}>Monitor</option>
                      <option value={AssetCategory.PHONE}>Phone</option>
                      <option value={AssetCategory.TABLET}>Tablet</option>
                      <option value={AssetCategory.FURNITURE}>Furniture</option>
                      <option value={AssetCategory.VEHICLE}>Vehicle</option>
                      <option value={AssetCategory.SOFTWARE_LICENSE}>Software License</option>
                      <option value={AssetCategory.OTHER}>Other</option>
                    </select>
                    {errors.category && <span className="text-danger-500 text-sm">{errors.category.message}</span>}
                  </div>
                  <div>
                    <label htmlFor="asset-status" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Status
                    </label>
                    <select
                      id="asset-status"
                      className="input-aura"
                      {...register('status')}
                    >
                      <option value={AssetStatus.AVAILABLE}>Available</option>
                      <option value={AssetStatus.ASSIGNED}>Assigned</option>
                      <option value={AssetStatus.IN_MAINTENANCE}>In Maintenance</option>
                      <option value={AssetStatus.RETIRED}>Retired</option>
                      <option value={AssetStatus.LOST}>Lost</option>
                    </select>
                    {errors.status && <span className="text-danger-500 text-sm">{errors.status.message}</span>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="asset-brand" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Brand
                    </label>
                    <input
                      id="asset-brand"
                      type="text"
                      className="input-aura"
                      placeholder="Apple"
                      {...register('brand')}
                    />
                  </div>
                  <div>
                    <label htmlFor="asset-model" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Model
                    </label>
                    <input
                      id="asset-model"
                      type="text"
                      className="input-aura"
                      placeholder="MacBook Pro 16 M3"
                      {...register('model')}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="asset-serial-number" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Serial Number
                  </label>
                  <input
                    id="asset-serial-number"
                    type="text"
                    className="input-aura"
                    placeholder="C02XG2JHH7JY"
                    {...register('serialNumber')}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="asset-purchase-date" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Purchase Date
                    </label>
                    <input
                      id="asset-purchase-date"
                      type="date"
                      className="input-aura"
                      {...register('purchaseDate')}
                    />
                  </div>
                  <div>
                    <label htmlFor="asset-warranty-expiry" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Warranty Expiry
                    </label>
                    <input
                      id="asset-warranty-expiry"
                      type="date"
                      className="input-aura"
                      {...register('warrantyExpiry')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="asset-purchase-cost" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Purchase Cost
                    </label>
                    <input
                      id="asset-purchase-cost"
                      type="number"
                      step="0.01"
                      className="input-aura"
                      placeholder="0.00"
                      {...register('purchaseCost')}
                    />
                  </div>
                  <div>
                    <label htmlFor="asset-current-value" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Current Value
                    </label>
                    <input
                      id="asset-current-value"
                      type="number"
                      step="0.01"
                      className="input-aura"
                      placeholder="0.00"
                      {...register('currentValue')}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="asset-location" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Location
                  </label>
                  <input
                    id="asset-location"
                    type="text"
                    className="input-aura"
                    placeholder="Main Office - Floor 3"
                    {...register('location')}
                  />
                </div>

                <div>
                  <label htmlFor="asset-notes" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Notes
                  </label>
                  <textarea
                    id="asset-notes"
                    rows={3}
                    className="input-aura"
                    placeholder="Additional notes..."
                    {...register('notes')}
                  />
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="outline" type="button" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
                    Saving...
                  </>
                ) : isEditing ? (
                  'Update Asset'
                ) : (
                  'Add Asset'
                )}
              </Button>
            </ModalFooter>
          </form>
        </Modal>

        {/* Asset Detail Modal */}
        <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} size="lg">
          <ModalHeader>
            <div className="flex items-center gap-4">
              {selectedAsset && (
                <>
                  <div className={`rounded-lg p-2 ${getCategoryColor(selectedAsset.category)}`}>
                    {getCategoryIcon(selectedAsset.category)}
                  </div>
                  <div>
                    <p className="text-body-muted font-mono">{selectedAsset.assetCode}</p>
                    <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                      {selectedAsset.assetName}
                    </h2>
                  </div>
                </>
              )}
            </div>
          </ModalHeader>
          <ModalBody>
            {selectedAsset && (
              <div className="space-y-6">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={selectedAsset.status} domain={ASSET_STATUS}/>
                  <span
                    className={`px-4 py-1 text-sm font-medium rounded-full ${getCategoryColor(selectedAsset.category)}`}>
                    {selectedAsset.category?.replace(/_/g, ' ') ?? '-'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {selectedAsset.brand && (
                    <div className="p-4 card-aura">
                      <p className="text-body-muted flex items-center gap-2">
                        <Tag className="h-4 w-4"/>
                        Brand
                      </p>
                      <p className="text-lg font-semibold text-[var(--text-primary)]">
                        {selectedAsset.brand}
                      </p>
                    </div>
                  )}
                  {selectedAsset.model && (
                    <div className="p-4 card-aura">
                      <p className="text-body-muted flex items-center gap-2">
                        <Package className="h-4 w-4"/>
                        Model
                      </p>
                      <p className="text-lg font-semibold text-[var(--text-primary)]">
                        {selectedAsset.model}
                      </p>
                    </div>
                  )}
                </div>

                {selectedAsset.serialNumber && (
                  <div className="p-4 card-aura">
                    <p className="text-body-muted">Serial Number</p>
                    <p className="text-lg font-mono font-semibold text-[var(--text-primary)]">
                      {selectedAsset.serialNumber}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 card-aura">
                    <p className="text-body-muted flex items-center gap-2">
                      <DollarSign className="h-4 w-4"/>
                      Purchase Cost
                    </p>
                    <p className="text-lg font-semibold text-[var(--text-primary)]">
                      {formatCurrency(selectedAsset.purchaseCost)}
                    </p>
                  </div>
                  <div className="p-4 card-aura">
                    <p className="text-body-muted flex items-center gap-2">
                      <DollarSign className="h-4 w-4"/>
                      Current Value
                    </p>
                    <p className="text-lg font-semibold text-[var(--text-primary)]">
                      {formatCurrency(selectedAsset.currentValue)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 card-aura">
                    <p className="text-body-muted flex items-center gap-2">
                      <Calendar className="h-4 w-4"/>
                      Purchase Date
                    </p>
                    <p className="text-lg font-semibold text-[var(--text-primary)]">
                      {formatDate(selectedAsset.purchaseDate)}
                    </p>
                  </div>
                  <div className="p-4 card-aura">
                    <p className="text-body-muted flex items-center gap-2">
                      <Calendar className="h-4 w-4"/>
                      Warranty Expiry
                    </p>
                    <p className="text-lg font-semibold text-[var(--text-primary)]">
                      {formatDate(selectedAsset.warrantyExpiry)}
                    </p>
                  </div>
                </div>

                {selectedAsset.assignedToName && (
                  <div className="p-4 card-aura">
                    <p className="text-body-muted flex items-center gap-2">
                      <User className="h-4 w-4"/>
                      Assigned To
                    </p>
                    <p className="text-lg font-semibold text-[var(--text-primary)]">
                      {selectedAsset.assignedToName}
                    </p>
                  </div>
                )}

                {selectedAsset.location && (
                  <div className="p-4 card-aura">
                    <p className="text-body-muted flex items-center gap-2">
                      <MapPin className="h-4 w-4"/>
                      Location
                    </p>
                    <p className="text-lg font-semibold text-[var(--text-primary)]">
                      {selectedAsset.location}
                    </p>
                  </div>
                )}

                {selectedAsset.notes && (
                  <div>
                    <h4 className="text-sm font-medium text-[var(--text-muted)] mb-1">Notes</h4>
                    <p className="text-[var(--text-secondary)]">
                      {selectedAsset.notes}
                    </p>
                  </div>
                )}
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowDetailModal(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setShowDetailModal(false);
              if (selectedAsset) handleOpenEditModal(selectedAsset);
            }}>
              <Edit className="h-4 w-4 mr-2"/>
              Edit Asset
            </Button>
          </ModalFooter>
        </Modal>

        {/* Delete Confirmation */}
        <ConfirmDialog
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="Delete Asset?"
          message={
            selectedAsset
              ? `This action cannot be undone. Asset "${selectedAsset.assetName}" will be permanently deleted.`
              : 'This action cannot be undone. The asset will be permanently deleted.'
          }
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
          loading={deleting}
        />

        {/* Assign Asset Modal */}
        <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} size="sm">
          <ModalHeader>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              Assign Asset
            </h2>
          </ModalHeader>
          <form onSubmit={handleSubmitAssign(onAssignSubmit)}>
            <ModalBody>
              <p className="text-[var(--text-secondary)] mb-4">
                Assign <strong>{selectedAsset?.assetName}</strong> to an employee.
              </p>
              <div>
                <label htmlFor="assign-employee-id" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Employee ID
                </label>
                <input
                  id="assign-employee-id"
                  type="text"
                  className="input-aura"
                  placeholder="Enter employee ID"
                  {...registerAssign('assignEmployeeId')}
                />
                {assignErrors.assignEmployeeId &&
                  <span className="text-danger-500 text-sm">{assignErrors.assignEmployeeId.message}</span>}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button type="button" variant="outline" onClick={() => setShowAssignModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isAssigning}>
                {isAssigning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
                    Assigning...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2"/>
                    Assign
                  </>
                )}
              </Button>
            </ModalFooter>
          </form>
        </Modal>
      </div>
    </AppLayout>
  );
}
