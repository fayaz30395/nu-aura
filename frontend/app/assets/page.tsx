'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Search,
  Plus,
  Laptop,
  Monitor,
  Phone,
  Tablet,
  Armchair,
  Car,
  Key,
  Box,
  AlertCircle,
  Loader2,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  UserPlus,
  RotateCcw,
  Calendar,
  DollarSign,
  MapPin,
  User,
  Tag,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Card,
  CardContent,
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  EmptyState,
} from '@/components/ui';
import { assetService } from '@/lib/services/asset.service';
import { Asset, CreateAssetRequest, UpdateAssetRequest, AssetCategory, AssetStatus } from '@/lib/types/asset';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';

const getCategoryIcon = (category: AssetCategory) => {
  switch (category) {
    case AssetCategory.LAPTOP:
      return <Laptop className="h-5 w-5" />;
    case AssetCategory.DESKTOP:
      return <Monitor className="h-5 w-5" />;
    case AssetCategory.MONITOR:
      return <Monitor className="h-5 w-5" />;
    case AssetCategory.PHONE:
      return <Phone className="h-5 w-5" />;
    case AssetCategory.TABLET:
      return <Tablet className="h-5 w-5" />;
    case AssetCategory.FURNITURE:
      return <Armchair className="h-5 w-5" />;
    case AssetCategory.VEHICLE:
      return <Car className="h-5 w-5" />;
    case AssetCategory.SOFTWARE_LICENSE:
      return <Key className="h-5 w-5" />;
    default:
      return <Box className="h-5 w-5" />;
  }
};

const getCategoryColor = (category: AssetCategory) => {
  switch (category) {
    case AssetCategory.LAPTOP:
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    case AssetCategory.DESKTOP:
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
    case AssetCategory.MONITOR:
      return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300';
    case AssetCategory.PHONE:
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case AssetCategory.TABLET:
      return 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300';
    case AssetCategory.FURNITURE:
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
    case AssetCategory.VEHICLE:
      return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    case AssetCategory.SOFTWARE_LICENSE:
      return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
  }
};

const getStatusColor = (status: AssetStatus) => {
  switch (status) {
    case AssetStatus.AVAILABLE:
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case AssetStatus.ASSIGNED:
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    case AssetStatus.IN_MAINTENANCE:
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
    case AssetStatus.RETIRED:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    case AssetStatus.LOST:
      return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
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

const formatCurrency = (amount: number | undefined) => {
  if (amount === undefined || amount === null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function AssetManagementPage() {
  const router = useRouter();
  const { isAuthenticated, user, hasHydrated } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [totalElements, setTotalElements] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [assignEmployeeId, setAssignEmployeeId] = useState('');

  // Form state
  const [formData, setFormData] = useState<CreateAssetRequest>({
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
  });

  const fetchAssets = useCallback(async () => {
    if (!hasHydrated || !isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await assetService.getAllAssets(currentPage, 20);
      let filteredAssets = response.content;

      // Client-side filtering
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filteredAssets = filteredAssets.filter(
          (a) =>
            a.assetName.toLowerCase().includes(query) ||
            a.assetCode.toLowerCase().includes(query) ||
            a.brand?.toLowerCase().includes(query) ||
            a.model?.toLowerCase().includes(query)
        );
      }
      if (statusFilter) {
        filteredAssets = filteredAssets.filter((a) => a.status === statusFilter);
      }
      if (categoryFilter) {
        filteredAssets = filteredAssets.filter((a) => a.category === categoryFilter);
      }

      setAssets(filteredAssets);
      setTotalElements(response.totalElements);
      setTotalPages(response.totalPages);
    } catch (err: any) {
      console.error('Error fetching assets:', err);
      setError(err.response?.data?.message || 'Failed to load assets');
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, categoryFilter, currentPage, isAuthenticated, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      try {
        router.push('/auth/login');
      } catch (err) {
        console.error('Navigation error:', err);
        window.location.href = '/auth/login';
      }
      return;
    }
    fetchAssets();
  }, [fetchAssets, isAuthenticated, hasHydrated, router]);

  const resetForm = () => {
    setFormData({
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
    });
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
    setFormData({
      assetCode: asset.assetCode,
      assetName: asset.assetName,
      category: asset.category,
      brand: asset.brand || '',
      model: asset.model || '',
      serialNumber: asset.serialNumber || '',
      purchaseDate: asset.purchaseDate || '',
      purchaseCost: asset.purchaseCost,
      currentValue: asset.currentValue,
      status: asset.status,
      location: asset.location || '',
      warrantyExpiry: asset.warrantyExpiry || '',
      notes: asset.notes || '',
    });
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
    setAssignEmployeeId('');
    setShowAssignModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEditing && selectedAsset) {
        const updateData: UpdateAssetRequest = { ...formData };
        await assetService.updateAsset(selectedAsset.id, updateData);
      } else {
        await assetService.createAsset(formData);
      }
      setShowAddModal(false);
      resetForm();
      fetchAssets();
    } catch (err: any) {
      console.error('Error saving asset:', err);
      setError(err.response?.data?.message || 'Failed to save asset');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAsset) return;
    setDeleting(true);
    try {
      await assetService.deleteAsset(selectedAsset.id);
      setShowDeleteModal(false);
      setSelectedAsset(null);
      fetchAssets();
    } catch (err: any) {
      console.error('Error deleting asset:', err);
      setError(err.response?.data?.message || 'Failed to delete asset');
    } finally {
      setDeleting(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedAsset || !assignEmployeeId) return;
    setSaving(true);
    try {
      await assetService.assignAsset(selectedAsset.id, assignEmployeeId);
      setShowAssignModal(false);
      setSelectedAsset(null);
      setAssignEmployeeId('');
      fetchAssets();
    } catch (err: any) {
      console.error('Error assigning asset:', err);
      setError(err.response?.data?.message || 'Failed to assign asset');
    } finally {
      setSaving(false);
    }
  };

  const handleReturn = async (asset: Asset) => {
    try {
      await assetService.returnAsset(asset.id);
      fetchAssets();
    } catch (err: any) {
      console.error('Error returning asset:', err);
      setError(err.response?.data?.message || 'Failed to return asset');
    }
  };

  // Stats
  const stats = {
    total: totalElements,
    available: assets.filter((a) => a.status === AssetStatus.AVAILABLE).length,
    assigned: assets.filter((a) => a.status === AssetStatus.ASSIGNED).length,
    maintenance: assets.filter((a) => a.status === AssetStatus.IN_MAINTENANCE).length,
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Asset Management' },
  ];

  if (loading && assets.length === 0) {
    return (
      <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="assets">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          <span className="ml-2 text-surface-600 dark:text-surface-400">Loading assets...</span>
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
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
              Asset Management
            </h1>
            <p className="text-surface-600 dark:text-surface-400">
              Manage and track company assets
            </p>
          </div>
          <Button onClick={handleOpenAddModal}>
            <Plus className="h-4 w-4 mr-2" />
            Add Asset
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
                <Button size="sm" variant="outline" onClick={fetchAssets} className="ml-auto">
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary-100 p-3 dark:bg-primary-900">
                  <Package className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">Total Assets</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-white">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-100 p-3 dark:bg-green-900">
                  <Package className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">Available</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-white">{stats.available}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900">
                  <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">Assigned</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-white">{stats.assigned}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-100 p-3 dark:bg-amber-900">
                  <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">In Maintenance</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-white">{stats.maintenance}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-surface-400" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
            className="px-4 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
        {assets.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-surface-50 dark:bg-surface-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                        Asset
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                        Assigned To
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                        Value
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-surface-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                    {assets.map((asset) => (
                      <tr key={asset.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className={`rounded-lg p-2 ${getCategoryColor(asset.category)}`}>
                              {getCategoryIcon(asset.category)}
                            </div>
                            <div>
                              <p className="font-medium text-surface-900 dark:text-white">{asset.assetName}</p>
                              <p className="text-xs text-surface-500">{asset.assetCode}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-sm text-surface-600 dark:text-surface-400">
                            {asset.category.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(asset.status)}`}>
                            {asset.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-sm text-surface-600 dark:text-surface-400">
                            {asset.assignedToName || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-sm text-surface-600 dark:text-surface-400">
                            {formatCurrency(asset.currentValue)}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-sm text-surface-600 dark:text-surface-400">
                            {asset.location || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          <div className="relative group inline-block">
                            <button className="p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-700">
                              <MoreVertical className="h-4 w-4 text-surface-400" />
                            </button>
                            <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                              <button
                                onClick={() => handleViewDetails(asset)}
                                className="w-full px-3 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-2"
                              >
                                <Eye className="h-4 w-4" />
                                View Details
                              </button>
                              <button
                                onClick={() => handleOpenEditModal(asset)}
                                className="w-full px-3 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-2"
                              >
                                <Edit className="h-4 w-4" />
                                Edit
                              </button>
                              {asset.status === AssetStatus.AVAILABLE && (
                                <button
                                  onClick={() => handleAssignClick(asset)}
                                  className="w-full px-3 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-2"
                                >
                                  <UserPlus className="h-4 w-4" />
                                  Assign
                                </button>
                              )}
                              {asset.status === AssetStatus.ASSIGNED && (
                                <button
                                  onClick={() => handleReturn(asset)}
                                  className="w-full px-3 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-2"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                  Return
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteClick(asset)}
                                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </button>
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
          !loading && (
            <EmptyState
              icon={<Package className="h-12 w-12" />}
              title="No Assets Found"
              description="No assets assigned or available"
            />
          )
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 0}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-surface-600 dark:text-surface-400">
              Page {currentPage + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}

        {/* Add/Edit Asset Modal */}
        <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} size="lg">
          <ModalHeader>
            <h2 className="text-xl font-semibold text-surface-900 dark:text-white">
              {isEditing ? 'Edit Asset' : 'Add New Asset'}
            </h2>
          </ModalHeader>
          <form onSubmit={handleSubmit}>
            <ModalBody>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Asset Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.assetCode}
                      onChange={(e) => setFormData({ ...formData, assetCode: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="AST001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Asset Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.assetName}
                      onChange={(e) => setFormData({ ...formData, assetName: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="MacBook Pro 16"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Category *
                    </label>
                    <select
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as AssetCategory })}
                      className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as AssetStatus })}
                      className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value={AssetStatus.AVAILABLE}>Available</option>
                      <option value={AssetStatus.ASSIGNED}>Assigned</option>
                      <option value={AssetStatus.IN_MAINTENANCE}>In Maintenance</option>
                      <option value={AssetStatus.RETIRED}>Retired</option>
                      <option value={AssetStatus.LOST}>Lost</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Brand
                    </label>
                    <input
                      type="text"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Apple"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Model
                    </label>
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="MacBook Pro 16 M3"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Serial Number
                  </label>
                  <input
                    type="text"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="C02XG2JHH7JY"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Purchase Date
                    </label>
                    <input
                      type="date"
                      value={formData.purchaseDate}
                      onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Warranty Expiry
                    </label>
                    <input
                      type="date"
                      value={formData.warrantyExpiry}
                      onChange={(e) => setFormData({ ...formData, warrantyExpiry: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Purchase Cost
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.purchaseCost || ''}
                      onChange={(e) => setFormData({ ...formData, purchaseCost: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Current Value
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.currentValue || ''}
                      onChange={(e) => setFormData({ ...formData, currentValue: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Main Office - Floor 3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="outline" type="button" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
            <div className="flex items-center gap-3">
              {selectedAsset && (
                <>
                  <div className={`rounded-lg p-2 ${getCategoryColor(selectedAsset.category)}`}>
                    {getCategoryIcon(selectedAsset.category)}
                  </div>
                  <div>
                    <p className="text-sm text-surface-500 font-mono">{selectedAsset.assetCode}</p>
                    <h2 className="text-xl font-semibold text-surface-900 dark:text-white">
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
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedAsset.status)}`}>
                    {selectedAsset.status.replace('_', ' ')}
                  </span>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${getCategoryColor(selectedAsset.category)}`}>
                    {selectedAsset.category.replace('_', ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {selectedAsset.brand && (
                    <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                      <p className="text-sm text-surface-500 flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        Brand
                      </p>
                      <p className="text-lg font-semibold text-surface-900 dark:text-white">
                        {selectedAsset.brand}
                      </p>
                    </div>
                  )}
                  {selectedAsset.model && (
                    <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                      <p className="text-sm text-surface-500 flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Model
                      </p>
                      <p className="text-lg font-semibold text-surface-900 dark:text-white">
                        {selectedAsset.model}
                      </p>
                    </div>
                  )}
                </div>

                {selectedAsset.serialNumber && (
                  <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                    <p className="text-sm text-surface-500">Serial Number</p>
                    <p className="text-lg font-mono font-semibold text-surface-900 dark:text-white">
                      {selectedAsset.serialNumber}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                    <p className="text-sm text-surface-500 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Purchase Cost
                    </p>
                    <p className="text-lg font-semibold text-surface-900 dark:text-white">
                      {formatCurrency(selectedAsset.purchaseCost)}
                    </p>
                  </div>
                  <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                    <p className="text-sm text-surface-500 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Current Value
                    </p>
                    <p className="text-lg font-semibold text-surface-900 dark:text-white">
                      {formatCurrency(selectedAsset.currentValue)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                    <p className="text-sm text-surface-500 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Purchase Date
                    </p>
                    <p className="text-lg font-semibold text-surface-900 dark:text-white">
                      {formatDate(selectedAsset.purchaseDate)}
                    </p>
                  </div>
                  <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                    <p className="text-sm text-surface-500 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Warranty Expiry
                    </p>
                    <p className="text-lg font-semibold text-surface-900 dark:text-white">
                      {formatDate(selectedAsset.warrantyExpiry)}
                    </p>
                  </div>
                </div>

                {selectedAsset.assignedToName && (
                  <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                    <p className="text-sm text-surface-500 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Assigned To
                    </p>
                    <p className="text-lg font-semibold text-surface-900 dark:text-white">
                      {selectedAsset.assignedToName}
                    </p>
                  </div>
                )}

                {selectedAsset.location && (
                  <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                    <p className="text-sm text-surface-500 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Location
                    </p>
                    <p className="text-lg font-semibold text-surface-900 dark:text-white">
                      {selectedAsset.location}
                    </p>
                  </div>
                )}

                {selectedAsset.notes && (
                  <div>
                    <h4 className="text-sm font-medium text-surface-500 mb-1">Notes</h4>
                    <p className="text-surface-700 dark:text-surface-300">
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
              <Edit className="h-4 w-4 mr-2" />
              Edit Asset
            </Button>
          </ModalFooter>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} size="sm">
          <ModalHeader>
            <h2 className="text-xl font-semibold text-surface-900 dark:text-white">
              Delete Asset
            </h2>
          </ModalHeader>
          <ModalBody>
            <p className="text-surface-600 dark:text-surface-400">
              Are you sure you want to delete <strong>{selectedAsset?.assetName}</strong>? This action cannot be undone.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </ModalFooter>
        </Modal>

        {/* Assign Asset Modal */}
        <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} size="sm">
          <ModalHeader>
            <h2 className="text-xl font-semibold text-surface-900 dark:text-white">
              Assign Asset
            </h2>
          </ModalHeader>
          <ModalBody>
            <p className="text-surface-600 dark:text-surface-400 mb-4">
              Assign <strong>{selectedAsset?.assetName}</strong> to an employee.
            </p>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                Employee ID
              </label>
              <input
                type="text"
                value={assignEmployeeId}
                onChange={(e) => setAssignEmployeeId(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter employee ID"
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowAssignModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={saving || !assignEmployeeId}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign
                </>
              )}
            </Button>
          </ModalFooter>
        </Modal>
      </div>
    </AppLayout>
  );
}
