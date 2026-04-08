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
  UserPlus,
} from 'lucide-react';
import {AppLayout} from '@/components/layout/AppLayout';
import {Button, Card, CardContent, EmptyState, Modal, ModalBody, ModalFooter, ModalHeader,} from '@/components/ui';
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
import {formatCurrency} from '@/lib/utils';

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

const getStatusColor = (status: AssetStatus) => {
  switch (status) {
    case AssetStatus.AVAILABLE:
      return 'badge-status status-success';
    case AssetStatus.ASSIGNED:
      return 'badge-status status-info';
    case AssetStatus.IN_MAINTENANCE:
      return 'badge-status status-warning';
    case AssetStatus.RETIRED:
      return 'badge-status status-neutral';
    case AssetStatus.LOST:
      return 'badge-status status-danger';
    default:
      return 'badge-status status-neutral';
  }
};

const formatDate = (date: string | undefined) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};


export default function AssetManagementPage() {
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
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
    let result = assetsQuery.data?.content || [];

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
    setSelectedAsset(asset);
    setShowDetailModal(true);
  };

  const handleDeleteClick = (asset: Asset) => {
    setSelectedAsset(asset);
    setShowDeleteModal(true);
  };

  const handleAssignClick = (asset: Asset) => {
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

  const breadcrumbs = [
    {label: 'Dashboard', href: '/dashboard'},
    {label: 'Asset Management'},
  ];

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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
              Asset Management
            </h1>
            <p className="text-[var(--text-secondary)] skeuo-deboss">
              Manage and track company assets
            </p>
          </div>
          <PermissionGate permission={Permissions.ASSET_CREATE}>
            <Button onClick={handleOpenAddModal}>
              <Plus className="h-4 w-4 mr-2"/>
              Add Asset
            </Button>
          </PermissionGate>
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="skeuo-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-accent-100 p-4 dark:bg-accent-900">
                  <Package className="h-6 w-6 text-accent-700 dark:text-accent-400"/>
                </div>
                <div>
                  <p className="text-body-secondary skeuo-deboss">Total Assets</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="skeuo-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-success-100 p-4 dark:bg-success-900">
                  <Package className="h-6 w-6 text-success-600 dark:text-success-400"/>
                </div>
                <div>
                  <p className="text-body-secondary skeuo-deboss">Available</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">{stats.available}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="skeuo-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-accent-100 p-4 dark:bg-accent-900">
                  <User className="h-6 w-6 text-accent-600 dark:text-accent-400"/>
                </div>
                <div>
                  <p className="text-body-secondary skeuo-deboss">Assigned</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">{stats.assigned}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="skeuo-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-warning-100 p-4 dark:bg-warning-900">
                  <AlertCircle className="h-6 w-6 text-warning-600 dark:text-warning-400"/>
                </div>
                <div>
                  <p className="text-body-secondary skeuo-deboss">In Maintenance</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">{stats.maintenance}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]"/>
            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-aura pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-aura"
          >
            <option value="">All Status</option>
            <option value={AssetStatus.AVAILABLE}>Available</option>
            <option value={AssetStatus.ASSIGNED}>Assigned</option>
            <option value={AssetStatus.IN_MAINTENANCE}>In Maintenance</option>
            <option value={AssetStatus.RETIRED}>Retired</option>
            <option value={AssetStatus.LOST}>Lost</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input-aura"
          >
            <option value="">All Categories</option>
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
        </div>

        {/* Assets Table */}
        {filteredAssets.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="table-aura">
                  <thead>
                  <tr>
                    <th
                      className="skeuo-table-header px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                      Asset
                    </th>
                    <th
                      className="skeuo-table-header px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                      Category
                    </th>
                    <th
                      className="skeuo-table-header px-4 py-2 text-center text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                      Status
                    </th>
                    <th
                      className="skeuo-table-header px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                      Assigned To
                    </th>
                    <th
                      className="skeuo-table-header px-4 py-2 text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                      Value
                    </th>
                    <th
                      className="skeuo-table-header px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                      Location
                    </th>
                    <th
                      className="skeuo-table-header px-4 py-2 text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                  </thead>
                  <tbody>
                  {filteredAssets.map((asset) => (
                    <tr key={asset.id} className="h-11">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-4">
                          <div className={`rounded-lg p-2 ${getCategoryColor(asset.category)}`}>
                            {getCategoryIcon(asset.category)}
                          </div>
                          <div>
                            <p className="font-medium text-[var(--text-primary)]">{asset.assetName}</p>
                            <p className="text-caption">{asset.assetCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-body-secondary">
                            {asset.category?.replace('_', ' ') ?? '-'}
                          </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                          <span className={getStatusColor(asset.status)}>
                            {asset.status?.replace('_', ' ') ?? '-'}
                          </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-body-secondary">
                            {asset.assignedToName || '-'}
                          </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                          <span className="text-body-secondary">
                            {formatCurrency(asset.currentValue)}
                          </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-body-secondary">
                            {asset.location || '-'}
                          </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        <div className="relative group inline-block">
                          <button
                            aria-label="Asset actions menu"
                            className="p-1 rounded hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
                          >
                            <MoreVertical className="h-4 w-4 text-[var(--text-muted)]"/>
                          </button>
                          <div
                            className="absolute right-0 top-full mt-1 w-40 bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg shadow-[var(--shadow-dropdown)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                            <button
                              onClick={() => handleViewDetails(asset)}
                              className="w-full px-4 py-2 text-left text-body-secondary hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border-focus)]"
                            >
                              <Eye className="h-4 w-4"/>
                              View Details
                            </button>
                            <PermissionGate permission={Permissions.ASSET_MANAGE} fallback={<div/>}>
                              <button
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
            </CardContent>
          </Card>
        ) : (
          !assetsQuery.isLoading && (
            <EmptyState
              icon={<Package className="h-12 w-12"/>}
              title="No Assets Found"
              description="Start tracking company assets by adding your first item. Manage laptops, monitors, furniture, and more."
              actionLabel="Add Asset"
              onAction={() => setShowAddModal(true)}
            />
          )
        )}

        {/* Pagination */}
        {(assetsQuery.data?.totalPages || 0) > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 0}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="text-body-secondary">
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
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Asset Code *
                    </label>
                    <input
                      type="text"
                      className="input-aura"
                      placeholder="AST001"
                      {...register('assetCode')}
                    />
                    {errors.assetCode && <span className="text-danger-500 text-sm">{errors.assetCode.message}</span>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Asset Name *
                    </label>
                    <input
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
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Category *
                    </label>
                    <select
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
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Status
                    </label>
                    <select
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
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Brand
                    </label>
                    <input
                      type="text"
                      className="input-aura"
                      placeholder="Apple"
                      {...register('brand')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Model
                    </label>
                    <input
                      type="text"
                      className="input-aura"
                      placeholder="MacBook Pro 16 M3"
                      {...register('model')}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Serial Number
                  </label>
                  <input
                    type="text"
                    className="input-aura"
                    placeholder="C02XG2JHH7JY"
                    {...register('serialNumber')}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Purchase Date
                    </label>
                    <input
                      type="date"
                      className="input-aura"
                      {...register('purchaseDate')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Warranty Expiry
                    </label>
                    <input
                      type="date"
                      className="input-aura"
                      {...register('warrantyExpiry')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Purchase Cost
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="input-aura"
                      placeholder="0.00"
                      {...register('purchaseCost')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Current Value
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="input-aura"
                      placeholder="0.00"
                      {...register('currentValue')}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    className="input-aura"
                    placeholder="Main Office - Floor 3"
                    {...register('location')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Notes
                  </label>
                  <textarea
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
                  <span className={getStatusColor(selectedAsset.status)}>
                    {selectedAsset.status?.replace('_', ' ') ?? '-'}
                  </span>
                  <span
                    className={`px-4 py-1 text-sm font-medium rounded-full ${getCategoryColor(selectedAsset.category)}`}>
                    {selectedAsset.category?.replace('_', ' ') ?? '-'}
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

        {/* Delete Confirmation Modal */}
        <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} size="sm">
          <ModalHeader>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              Delete Asset
            </h2>
          </ModalHeader>
          <ModalBody>
            <p className="text-[var(--text-secondary)]">
              Are you sure you want to delete <strong>{selectedAsset?.assetName}</strong>? This action cannot be undone.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2"/>
                  Delete
                </>
              )}
            </Button>
          </ModalFooter>
        </Modal>

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
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Employee ID
                </label>
                <input
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
