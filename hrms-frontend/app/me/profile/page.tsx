'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Building2,
  Edit2,
  Save,
  X,
  CreditCard,
  Shield,
  AlertCircle,
  Check,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuth } from '@/lib/hooks/useAuth';
import { employeeService } from '@/lib/services/employee.service';
import { Employee, UpdateEmployeeRequest } from '@/lib/types/employee';
import { getInitials } from '@/lib/utils';

export default function MyProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, hasHydrated } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [editData, setEditData] = useState<UpdateEmployeeRequest>({});
  const [photoLoadError, setPhotoLoadError] = useState(false);

  useEffect(() => {
    // Wait for hydration before checking authentication
    if (!hasHydrated) {
      return;
    }

    // Check if tokens exist in localStorage
    const hasTokens = typeof window !== 'undefined' &&
      localStorage.getItem('accessToken') &&
      localStorage.getItem('refreshToken');

    if (!isAuthenticated || !hasTokens) {
      router.push('/auth/login');
      return;
    }

    if (user) {
      if (user.employeeId) {
        loadProfile();
      } else {
        // User is authenticated but doesn't have an employee record
        setIsLoading(false);
        setError('No employee profile found for your account. Please contact your administrator.');
      }
    }
  }, [isAuthenticated, hasHydrated, user, router]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await employeeService.getEmployee(user!.employeeId!);
      setEmployee(data);
      setEditData({
        personalEmail: data.personalEmail,
        phoneNumber: data.phoneNumber,
        emergencyContactNumber: data.emergencyContactNumber,
        address: data.address,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        country: data.country,
      });
    } catch (err: any) {
      console.error('Failed to load profile:', err);
      setError(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!employee) return;

    try {
      setIsSaving(true);
      setError(null);
      await employeeService.updateEmployee(employee.id, editData);
      await loadProfile();
      setIsEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (employee) {
      setEditData({
        personalEmail: employee.personalEmail,
        phoneNumber: employee.phoneNumber,
        emergencyContactNumber: employee.emergencyContactNumber,
        address: employee.address,
        city: employee.city,
        state: employee.state,
        postalCode: employee.postalCode,
        country: employee.country,
      });
    }
    setIsEditing(false);
    setError(null);
  };

  if (isLoading) {
    return (
      <AppLayout activeMenuItem="profile">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!employee) {
    return (
      <AppLayout activeMenuItem="profile">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="max-w-md">
            <CardHeader>
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <CardTitle>Profile Not Found</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                {error || 'Unable to load your profile'}
              </p>
              <button
                onClick={loadProfile}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Retry
              </button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const displayName = employee.fullName
    || [employee.firstName, employee.lastName].filter(Boolean).join(' ')
    || employee.workEmail
    || employee.employeeCode
    || 'Employee';

  const formatDate = (date?: string) => {
    if (!date) return 'N/A';
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return 'N/A';
    return parsed.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatEnumValue = (value?: string) => {
    if (!value) return 'N/A';
    return value.replace(/_/g, ' ');
  };


  return (
    <AppLayout activeMenuItem="profile">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">My Profile</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Manage your personal information
            </p>
          </div>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Edit2 className="h-4 w-4" />
              Edit Profile
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Success Message */}
        {success && (
          <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
            <Check className="h-5 w-5 text-green-600" />
            <p className="text-green-800 dark:text-green-200 font-medium">
              Profile updated successfully!
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-800 dark:text-red-200 font-medium">{error}</p>
          </div>
        )}

        {/* Profile Header Card */}
        <Card className="overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-primary-500 to-primary-700" />
          <CardContent className="relative pt-0">
            <div className="flex flex-col md:flex-row items-start md:items-end gap-6 -mt-16">
              <div className="relative">
                {employee.profilePhotoUrl && !photoLoadError ? (
                  <img
                    src={employee.profilePhotoUrl}
                    alt={displayName}
                    className="w-32 h-32 rounded-full object-cover border-4 border-white dark:border-slate-900 shadow-lg bg-white dark:bg-slate-800"
                    onError={() => setPhotoLoadError(true)}
                    loading="lazy"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-white dark:bg-slate-800 border-4 border-white dark:border-slate-900 flex items-center justify-center text-4xl font-bold text-primary-600 shadow-lg">
                    {getInitials(displayName)}
                  </div>
                )}
                <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 border-4 border-white dark:border-slate-900 rounded-full" />
              </div>
              <div className="flex-1 pb-6">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
                  {displayName}
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 mt-1">
                  {employee.designation}
                </p>
                <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {employee.workEmail}
                  </div>
                  <div className="flex items-center gap-1">
                    <Briefcase className="h-4 w-4" />
                    {employee.employeeCode}
                  </div>
                  <div className="flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    {employee.departmentName || 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>Your basic personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Full Name
                </label>
                <p className="text-slate-900 dark:text-slate-50 mt-1">{displayName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Date of Birth
                </label>
                <p className="text-slate-900 dark:text-slate-50 mt-1">
                  {employee.dateOfBirth ? formatDate(employee.dateOfBirth) : 'Not provided'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Gender
                </label>
                <p className="text-slate-900 dark:text-slate-50 mt-1">
                  {employee.gender || 'Not provided'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Contact Information
              </CardTitle>
              <CardDescription>How to reach you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Work Email
                </label>
                <p className="text-slate-900 dark:text-slate-50 mt-1">{employee.workEmail}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Personal Email
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    value={editData.personalEmail || ''}
                    onChange={(e) => setEditData({ ...editData, personalEmail: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-slate-800"
                  />
                ) : (
                  <p className="text-slate-900 dark:text-slate-50 mt-1">
                    {employee.personalEmail || 'Not provided'}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Phone Number
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editData.phoneNumber || ''}
                    onChange={(e) => setEditData({ ...editData, phoneNumber: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-slate-800"
                  />
                ) : (
                  <p className="text-slate-900 dark:text-slate-50 mt-1">
                    {employee.phoneNumber || 'Not provided'}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Emergency Contact
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editData.emergencyContactNumber || ''}
                    onChange={(e) =>
                      setEditData({ ...editData, emergencyContactNumber: e.target.value })
                    }
                    className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-slate-800"
                  />
                ) : (
                  <p className="text-slate-900 dark:text-slate-50 mt-1">
                    {employee.emergencyContactNumber || 'Not provided'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Address
              </CardTitle>
              <CardDescription>Your residential address</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Street Address
                </label>
                {isEditing ? (
                  <textarea
                    value={editData.address || ''}
                    onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                    rows={2}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-slate-800"
                  />
                ) : (
                  <p className="text-slate-900 dark:text-slate-50 mt-1">
                    {employee.address || 'Not provided'}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    City
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.city || ''}
                      onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-slate-800"
                    />
                  ) : (
                    <p className="text-slate-900 dark:text-slate-50 mt-1">
                      {employee.city || 'N/A'}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    State
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.state || ''}
                      onChange={(e) => setEditData({ ...editData, state: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-slate-800"
                    />
                  ) : (
                    <p className="text-slate-900 dark:text-slate-50 mt-1">
                      {employee.state || 'N/A'}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Postal Code
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.postalCode || ''}
                      onChange={(e) => setEditData({ ...editData, postalCode: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-slate-800"
                    />
                  ) : (
                    <p className="text-slate-900 dark:text-slate-50 mt-1">
                      {employee.postalCode || 'N/A'}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Country
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.country || ''}
                      onChange={(e) => setEditData({ ...editData, country: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-slate-800"
                    />
                  ) : (
                    <p className="text-slate-900 dark:text-slate-50 mt-1">
                      {employee.country || 'N/A'}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Employment Details
              </CardTitle>
              <CardDescription>Your work-related information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Joining Date
                </label>
                <p className="text-slate-900 dark:text-slate-50 mt-1">
                  {formatDate(employee.joiningDate)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Employment Type
                </label>
                <p className="text-slate-900 dark:text-slate-50 mt-1">
                  {formatEnumValue(employee.employmentType)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Department
                </label>
                <p className="text-slate-900 dark:text-slate-50 mt-1">
                  {employee.departmentName || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Reporting Manager
                </label>
                <p className="text-slate-900 dark:text-slate-50 mt-1">
                  {employee.managerName || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Status
                </label>
                <span
                  className={`inline-flex mt-1 px-2 py-1 text-xs font-semibold rounded-full ${employee.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                    }`}
                >
                  {employee.status}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Bank Details */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Bank Details
              </CardTitle>
              <CardDescription>Your salary account information</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Bank Name
                </label>
                <p className="text-slate-900 dark:text-slate-50 mt-1">
                  {employee.bankName || 'Not provided'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Account Number
                </label>
                <p className="text-slate-900 dark:text-slate-50 mt-1 font-mono">
                  {employee.bankAccountNumber
                    ? `****${employee.bankAccountNumber.slice(-4)}`
                    : 'Not provided'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  IFSC Code
                </label>
                <p className="text-slate-900 dark:text-slate-50 mt-1 font-mono">
                  {employee.bankIfscCode || 'Not provided'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Tax Details */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Tax Information
              </CardTitle>
              <CardDescription>Your tax identification details</CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  PAN Number
                </label>
                <p className="text-slate-900 dark:text-slate-50 mt-1 font-mono">
                  {employee.taxId || 'Not provided'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
