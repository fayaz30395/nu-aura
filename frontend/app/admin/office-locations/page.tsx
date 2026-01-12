'use client';

import { useState, useEffect } from 'react';
import { officeLocationService, OfficeLocation, OfficeLocationRequest } from '@/lib/services/office-location.service';

export default function OfficeLocationsPage() {
  const [locations, setLocations] = useState<OfficeLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<OfficeLocationRequest>({
    name: '',
    address: '',
    city: '',
    state: '',
    country: '',
    latitude: 0,
    longitude: 0,
    geofenceRadius: 100,
  });

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      setLoading(true);
      const data = await officeLocationService.getAllLocations();
      setLocations(data);
    } catch (error) {
      console.error('Error loading locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await officeLocationService.updateLocation(editingId, formData);
      } else {
        await officeLocationService.createLocation(formData);
      }
      setShowForm(false);
      setEditingId(null);
      resetForm();
      loadLocations();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save location');
    }
  };

  const handleEdit = (location: OfficeLocation) => {
    setFormData({
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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return;
    try {
      await officeLocationService.deleteLocation(id);
      loadLocations();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete location');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      city: '',
      state: '',
      country: '',
      latitude: 0,
      longitude: 0,
      geofenceRadius: 100,
    });
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setFormData(prev => ({
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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Office Locations & Geofencing</h1>
          <button
            onClick={() => { setShowForm(true); setEditingId(null); resetForm(); }}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            Add Location
          </button>
        </div>

        {showForm && (
          <div className="bg-white dark:bg-surface-900 rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingId ? 'Edit Location' : 'Add New Location'}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Address *</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">City *</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">State *</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Country *</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Postal Code</label>
                <input
                  type="text"
                  value={formData.postalCode || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Latitude *</label>
                <input
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => setFormData(prev => ({ ...prev, latitude: parseFloat(e.target.value) }))}
                  className="w-full p-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Longitude *</label>
                <input
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => setFormData(prev => ({ ...prev, longitude: parseFloat(e.target.value) }))}
                  className="w-full p-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Geofence Radius (meters) *</label>
                <input
                  type="number"
                  value={formData.geofenceRadius}
                  onChange={(e) => setFormData(prev => ({ ...prev, geofenceRadius: parseInt(e.target.value) }))}
                  className="w-full p-2 border rounded-lg"
                  required
                  min="10"
                  max="10000"
                />
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
                  className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                  {editingId ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingId(null); }}
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
          <div className="bg-white dark:bg-surface-900 rounded-lg shadow-md overflow-hidden">
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
              <tbody className="bg-white dark:bg-surface-900 divide-y divide-surface-200 dark:divide-surface-700">
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
                        onClick={() => handleDelete(location.id)}
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
