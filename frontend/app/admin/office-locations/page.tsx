'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { OfficeLocation, OfficeLocationRequest } from '@/lib/services/office-location.service';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePermissions, Roles } from '@/lib/hooks/usePermissions';
import { useToast } from '@/components/notifications/ToastProvider';
import { ConfirmDialog } from '@/components/ui';
import {
  useOfficeLocations,
  useCreateOfficeLocation,
  useUpdateOfficeLocation,
  useDeleteOfficeLocation,
} from '@/lib/hooks/queries/useOfficeLocations';

const ADMIN_ACCESS_ROLES = [Roles.SUPER_ADMIN, Roles.TENANT_ADMIN, Roles.HR_ADMIN, Roles.HR_MANAGER];

const officeLocationSchema = z.object({
  name: z.string().min(1, 'Location name required'),
  address: z.string().min(1, 'Address required'),
  city: z.string().min(1, 'City required'),
  state: z.string().min(1, 'State required'),
  country: z.string().min(1, 'Country required'),
  postalCode: z.string().optional().or(z.literal('')),
  latitude: z.number({ coerce: true }).finite('Valid latitude required'),
  longitude: z.number({ coerce: true }).finite('Valid longitude required'),
  geofenceRadius: z.number({ coerce: true }).int().min(10, 'Minimum 10 meters').max(10000, 'Maximum 10000 meters'),
  isDefault: z.boolean().default(false),
  timezone: z.string().optional().or(z.literal('')),
});

type OfficeLocationFormData = z.infer<typeof officeLocationSchema>;

export default function OfficeLocationsPage() {
  const toast = useToast();
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuth();
  const { hasAnyRole, isReady } = usePermissions();

  // Form state
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OfficeLocationFormData>({
    resolver: zodResolver(officeLocationSchema),
    defaultValues: {
      name: '',
      address: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
      latitude: 0,
      longitude: 0,
      geofenceRadius: 100,
      isDefault: false,
      timezone: '',
    },
  });

  // Local UI state
  const [showForm, setShowForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [locationToDelete, setLocationToDelete] = React.useState<OfficeLocation | null>(null);

  // React Query hooks
  const { data: locations = [], isLoading } = useOfficeLocations();
  const createMutation = useCreateOfficeLocation();
  const updateMutation = useUpdateOfficeLocation();
  const deleteMutation = useDeleteOfficeLocation();

  const loading = isLoading;

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

  const onSubmit = async (data: OfficeLocationFormData) => {
    if (editingId) {
      updateMutation.mutate(
        { id: editingId, data: data as OfficeLocationRequest },
        {
          onSuccess: () => {
            setShowForm(false);
            setEditingId(null);
            reset();
            toast.success('Location updated successfully');
          },
          onError: (error: unknown) => {
            toast.error(
              (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
              'Failed to update location'
            );
          },
        }
      );
    } else {
      createMutation.mutate(data as OfficeLocationRequest, {
        onSuccess: () => {
          setShowForm(false);
          setEditingId(null);
          reset();
          toast.success('Location created successfully');
        },
        onError: (error: unknown) => {
          toast.error(
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to create location'
          );
        },
      });
    }
  };

  const handleEdit = (location: OfficeLocation) => {
    reset({
      name: location.name,
      address: location.address,
      city: location.city,
      state: location.state,
      country: location.country,
      postalCode: location.postalCode,
      latitude: location.latitude,
      longitude: location.longitude,
      geofenceRadius: location.geofenceRadius,
      isDefault: location.isDefault,
      timezone: location.timezone,
    });
    setEditingId(location.id);
    setShowForm(true);
  };

  const handleDelete = (location: OfficeLocation) => {
    setLocationToDelete(location);
    setShowDeleteConfirm(true);
  };

  const performDelete = () => {
    if (!locationToDelete) return;
    deleteMutation.mutate(locationToDelete.id, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
        setLocationToDelete(null);
      },
      onError: (error: unknown) => {
        toast.error(
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to delete location'
        );
      },
    });
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        reset(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
      });
    }
  };

  return (
    <>
      <div className="max-w-7xl mx-auto">
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false);
            setLocationToDelete(null);
          }}
          onConfirm={performDelete}
          title="Delete Location"
          message={`Are you sure you want to delete "${locationToDelete?.name}"?`}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Office Locations & Geofencing</h1>
          <button
            onClick={() => {
              reset();
              setEditingId(null);
              setShowForm(true);
            }}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            Add Location
          </button>
        </div>

        {showForm && (
          <div className="bg-[var(--bg-card)] rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingId ? 'Edit Location' : 'Add New Location'}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  {...register('name')}
                  className="w-full p-2 border rounded-lg"
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Address *</label>
                <input
                  type="text"
                  {...register('address')}
                  className="w-full p-2 border rounded-lg"
                />
                {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">City *</label>
                <input
                  type="text"
                  {...register('city')}
                  className="w-full p-2 border rounded-lg"
                />
                {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">State *</label>
                <input
                  type="text"
                  {...register('state')}
                  className="w-full p-2 border rounded-lg"
                />
                {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Country *</label>
                <input
                  type="text"
                  {...register('country')}
                  className="w-full p-2 border rounded-lg"
                />
                {errors.country && <p className="text-red-500 text-sm mt-1">{errors.country.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Postal Code</label>
                <input
                  type="text"
                  {...register('postalCode')}
                  className="w-full p-2 border rounded-lg"
                />
                {errors.postalCode && <p className="text-red-500 text-sm mt-1">{errors.postalCode.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Latitude *</label>
                <input
                  type="number"
                  step="any"
                  {...register('latitude')}
                  className="w-full p-2 border rounded-lg"
                />
                {errors.latitude && <p className="text-red-500 text-sm mt-1">{errors.latitude.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Longitude *</label>
                <input
                  type="number"
                  step="any"
                  {...register('longitude')}
                  className="w-full p-2 border rounded-lg"
                />
                {errors.longitude && <p className="text-red-500 text-sm mt-1">{errors.longitude.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Geofence Radius (meters) *</label>
                <input
                  type="number"
                  {...register('geofenceRadius')}
                  className="w-full p-2 border rounded-lg"
                  min="10"
                  max="10000"
                />
                {errors.geofenceRadius && <p className="text-red-500 text-sm mt-1">{errors.geofenceRadius.message}</p>}
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  className="px-4 py-2 bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50"
                >
                  Get Current Location
                </button>
              </div>
              <div className="col-span-2 flex gap-4 mt-4">
                <button
                  type="submit"
                  disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
                  className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                >
                  {isSubmitting || createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingId ? 'Update' : 'Create')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    reset();
                  }}
                  className="px-6 py-2 bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="bg-[var(--bg-card)] rounded-lg shadow-md overflow-hidden">
            <table className="min-w-full divide-y divide-surface-200 dark:divide-surface-700">
              <thead className="bg-surface-50 dark:bg-surface-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-surface-600 dark:text-surface-400 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-surface-600 dark:text-surface-400 uppercase">Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-surface-600 dark:text-surface-400 uppercase">Coordinates</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-surface-600 dark:text-surface-400 uppercase">Radius</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-surface-600 dark:text-surface-400 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-surface-600 dark:text-surface-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-[var(--bg-card)] divide-y divide-surface-200 dark:divide-surface-700">
                {locations.map((location) => (
                  <tr key={location.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium">{location.name}</div>
                      {location.isDefault && (
                        <span className="text-xs text-primary-600 dark:text-primary-400">Default</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div>{location.address}</div>
                      <div className="text-sm text-surface-600 dark:text-surface-400">
                        {location.city}, {location.state}, {location.country}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {location.geofenceRadius}m
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        location.isActive ? 'bg-green-100 text-green-800' : 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200'
                      }`}>
                        {location.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleEdit(location)}
                        className="text-primary-600 dark:text-primary-400 hover:text-primary-800 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(location)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {locations.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-surface-600 dark:text-surface-400">
                      No office locations found. Add your first location to enable geofencing.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
