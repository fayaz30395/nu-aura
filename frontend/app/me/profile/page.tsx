'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
  SendHorizonal,
  Clock,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuth } from '@/lib/hooks/useAuth';
import { useMyEmployee, useUpdateMyProfile } from '@/lib/hooks/queries';
import { getInitials } from '@/lib/utils';
import { createLogger } from '@/lib/utils/logger';
import { employmentChangeRequestService } from '@/lib/services/hrms/employment-change-request.service';

const log = createLogger('ProfilePage');

const profileFormSchema = z.object({
  personalEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  phoneNumber: z.string().optional().or(z.literal('')),
  emergencyContactNumber: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  postalCode: z.string().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

const bankChangeSchema = z.object({
  bankName: z.string().min(1, 'Bank name is required'),
  bankAccountNumber: z.string().min(1, 'Account number is required'),
  bankIfscCode: z.string().min(1, 'IFSC code is required'),
  reason: z.string().min(1, 'Reason is required'),
});

type BankChangeFormData = z.infer<typeof bankChangeSchema>;

export default function MyProfilePage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [photoLoadError, setPhotoLoadError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bank change request state
  const [showBankChangeModal, setShowBankChangeModal] = useState(false);
  const [bankChangeSubmitting, setBankChangeSubmitting] = useState(false);
  const [bankChangeSuccess, setBankChangeSuccess] = useState(false);

  // React Hook Form for profile edit
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      personalEmail: '',
      phoneNumber: '',
      emergencyContactNumber: '',
      address: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
    },
  });

  // React Hook Form for bank change request
  const bankChangeForm = useForm<BankChangeFormData>({
    resolver: zodResolver(bankChangeSchema),
    defaultValues: {
      bankName: '',
      bankAccountNumber: '',
      bankIfscCode: '',
      reason: '',
    },
  });

  // React Query hooks — use /employees/me (no ID needed)
  const { data: employee, isLoading } = useMyEmployee(hasHydrated && isAuthenticated);

  const updateMutation = useUpdateMyProfile();

  // Initialize edit data when employee data loads
  useEffect(() => {
    if (employee) {
      profileForm.reset({
        personalEmail: employee.personalEmail || '',
        phoneNumber: employee.phoneNumber || '',
        emergencyContactNumber: employee.emergencyContactNumber || '',
        address: employee.address || '',
        city: employee.city || '',
        state: employee.state || '',
        postalCode: employee.postalCode || '',
        country: employee.country || '',
      });
    }
  }, [employee, profileForm]);

  useEffect(() => {
    // Wait for hydration before checking authentication
    if (!hasHydrated) {
      return;
    }

    // Auth is managed via httpOnly cookies + Zustand state
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
  }, [isAuthenticated, hasHydrated, router]);

  const handleSave = async (data: ProfileFormData) => {
    if (!employee) return;

    try {
      setError(null);
      await updateMutation.mutateAsync(data);
      setIsEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      log.error('Failed to update profile:', err);
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update profile');
    }
  };

  const handleCancel = () => {
    if (employee) {
      profileForm.reset({
        personalEmail: employee.personalEmail || '',
        phoneNumber: employee.phoneNumber || '',
        emergencyContactNumber: employee.emergencyContactNumber || '',
        address: employee.address || '',
        city: employee.city || '',
        state: employee.state || '',
        postalCode: employee.postalCode || '',
        country: employee.country || '',
      });
    }
    setIsEditing(false);
    setError(null);
  };

  const handleBankChangeRequest = async (data: BankChangeFormData) => {
    if (!employee) return;

    setBankChangeSubmitting(true);
    try {
      await employmentChangeRequestService.createChangeRequest({
        employeeId: employee.id,
        reason: `Bank Details Change Request: ${data.reason}\n\nNew Bank Name: ${data.bankName}\nNew Account Number: ****${data.bankAccountNumber.slice(-4)}\nNew IFSC: ${data.bankIfscCode}`,
      });
      setBankChangeSuccess(true);
      setTimeout(() => {
        setShowBankChangeModal(false);
        setBankChangeSuccess(false);
        bankChangeForm.reset();
      }, 2000);
    } catch (err: unknown) {
      log.error('Failed to submit bank change request:', err);
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to submit change request');
    } finally {
      setBankChangeSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout activeMenuItem="profile">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-12 h-12 border-4 border-accent-200 border-t-accent-700 rounded-full animate-spin" />
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
              <div className="flex items-center gap-2 text-danger-600">
                <AlertCircle className="h-5 w-5" />
                <CardTitle>Profile Not Found</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-[var(--text-secondary)] mb-4">
                {error || 'Unable to load your profile'}
              </p>
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
            <h1 className="text-2xl font-bold skeuo-emboss">My Profile</h1>
            <p className="text-[var(--text-secondary)] mt-1 skeuo-deboss">
              Manage your personal information
            </p>
          </div>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg"
            >
              <Edit2 className="h-4 w-4" />
              Edit Profile
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                disabled={updateMutation.isPending}
                className="btn-secondary flex items-center gap-2 px-4 py-2 rounded-lg disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
              <button
                onClick={profileForm.handleSubmit(handleSave)}
                disabled={updateMutation.isPending}
                className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              >
                {updateMutation.isPending ? (
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
          <div className="flex items-center gap-2 p-4 bg-success-50 dark:bg-success-950/20 border border-success-200 dark:border-success-800 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
            <Check className="h-5 w-5 text-success-600" />
            <p className="text-success-800 dark:text-success-200 font-medium">
              Profile updated successfully!
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-danger-50 dark:bg-danger-950/20 border border-danger-200 dark:border-danger-800 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertCircle className="h-5 w-5 text-danger-600" />
            <p className="text-danger-800 dark:text-danger-200 font-medium">{error}</p>
          </div>
        )}

        {/* Profile Header Card */}
        <Card className="card-aura overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-accent-500 to-accent-700" />
          <CardContent className="relative pt-0">
            <div className="flex flex-col md:flex-row items-start md:items-end gap-6 -mt-16">
              <div className="relative">
                {employee.profilePhotoUrl && !photoLoadError ? (
                  <Image
                    src={employee.profilePhotoUrl}
                    alt={displayName}
                    width={128}
                    height={128}
                    className="rounded-full object-cover border-4 border-[var(--bg-card)] dark:border-[var(--bg-main)] shadow-[var(--shadow-dropdown)] bg-[var(--bg-input)]"
                    onError={() => setPhotoLoadError(true)}
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-[var(--bg-input)] border-4 border-[var(--bg-card)] dark:border-[var(--bg-main)] flex items-center justify-center text-4xl font-bold text-accent-700 shadow-[var(--shadow-dropdown)]">
                    {getInitials(displayName)}
                  </div>
                )}
                <div className="absolute bottom-2 right-2 w-6 h-6 bg-success-500 border-4 border-[var(--bg-card)] dark:border-[var(--bg-main)] rounded-full" />
              </div>
              <div className="flex-1 pb-6">
                <h2 className="text-2xl  font-bold text-[var(--text-primary)]">
                  {displayName}
                </h2>
                <p className="text-lg text-[var(--text-secondary)] mt-1">
                  {employee.designation}
                </p>
                <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-[var(--text-secondary)]">
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
          <Card className="card-aura">
            <CardHeader>
              <CardTitle className="skeuo-emboss flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>Your basic personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">
                  Full Name
                </label>
                <p className="text-[var(--text-primary)] mt-1">{displayName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">
                  Date of Birth
                </label>
                <p className="text-[var(--text-primary)] mt-1">
                  {employee.dateOfBirth ? formatDate(employee.dateOfBirth) : 'Not provided'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">
                  Gender
                </label>
                <p className="text-[var(--text-primary)] mt-1">
                  {employee.gender || 'Not provided'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="card-aura">
            <CardHeader>
              <CardTitle className="skeuo-emboss flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Contact Information
              </CardTitle>
              <CardDescription>How to reach you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">
                  Work Email
                </label>
                <p className="text-[var(--text-primary)] mt-1">{employee.workEmail}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">
                  Personal Email
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    {...profileForm.register('personalEmail')}
                    className="input-aura w-full mt-1 px-4 py-2 rounded-lg"
                  />
                ) : (
                  <p className="text-[var(--text-primary)] mt-1">
                    {employee.personalEmail || 'Not provided'}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">
                  Phone Number
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    {...profileForm.register('phoneNumber')}
                    className="input-aura w-full mt-1 px-4 py-2 rounded-lg"
                  />
                ) : (
                  <p className="text-[var(--text-primary)] mt-1">
                    {employee.phoneNumber || 'Not provided'}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">
                  Emergency Contact
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    {...profileForm.register('emergencyContactNumber')}
                    className="input-aura w-full mt-1 px-4 py-2 rounded-lg"
                  />
                ) : (
                  <p className="text-[var(--text-primary)] mt-1">
                    {employee.emergencyContactNumber || 'Not provided'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card className="card-aura">
            <CardHeader>
              <CardTitle className="skeuo-emboss flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Address
              </CardTitle>
              <CardDescription>Your residential address</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">
                  Street Address
                </label>
                {isEditing ? (
                  <textarea
                    {...profileForm.register('address')}
                    rows={2}
                    className="input-aura w-full mt-1 px-4 py-2 rounded-lg"
                  />
                ) : (
                  <p className="text-[var(--text-primary)] mt-1">
                    {employee.address || 'Not provided'}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-[var(--text-secondary)]">
                    City
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      {...profileForm.register('city')}
                      className="input-aura w-full mt-1 px-4 py-2 rounded-lg"
                    />
                  ) : (
                    <p className="text-[var(--text-primary)] mt-1">
                      {employee.city || 'N/A'}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-[var(--text-secondary)]">
                    State
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      {...profileForm.register('state')}
                      className="input-aura w-full mt-1 px-4 py-2 rounded-lg"
                    />
                  ) : (
                    <p className="text-[var(--text-primary)] mt-1">
                      {employee.state || 'N/A'}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-[var(--text-secondary)]">
                    Postal Code
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      {...profileForm.register('postalCode')}
                      className="input-aura w-full mt-1 px-4 py-2 rounded-lg"
                    />
                  ) : (
                    <p className="text-[var(--text-primary)] mt-1">
                      {employee.postalCode || 'N/A'}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-[var(--text-secondary)]">
                    Country
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      {...profileForm.register('country')}
                      className="input-aura w-full mt-1 px-4 py-2 rounded-lg"
                    />
                  ) : (
                    <p className="text-[var(--text-primary)] mt-1">
                      {employee.country || 'N/A'}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employment Details */}
          <Card className="card-aura">
            <CardHeader>
              <CardTitle className="skeuo-emboss flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Employment Details
              </CardTitle>
              <CardDescription>Your work-related information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">
                  Joining Date
                </label>
                <p className="text-[var(--text-primary)] mt-1">
                  {formatDate(employee.joiningDate)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">
                  Employment Type
                </label>
                <p className="text-[var(--text-primary)] mt-1">
                  {formatEnumValue(employee.employmentType)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">
                  Department
                </label>
                <p className="text-[var(--text-primary)] mt-1">
                  {employee.departmentName || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">
                  Reporting Manager
                </label>
                <p className="text-[var(--text-primary)] mt-1">
                  {employee.managerName || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">
                  Status
                </label>
                <span
                  className={`badge-status mt-1 ${employee.status === 'ACTIVE'
                      ? 'status-success'
                      : 'status-neutral'
                    }`}
                >
                  {employee.status}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Bank Details */}
          <Card className="card-aura lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="skeuo-emboss flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Bank Details
                  </CardTitle>
                  <CardDescription>Your salary account information</CardDescription>
                </div>
                <button
                  onClick={() => {
                    bankChangeForm.reset({
                      bankName: employee.bankName || '',
                      bankAccountNumber: '',
                      bankIfscCode: employee.bankIfscCode || '',
                      reason: '',
                    });
                    setShowBankChangeModal(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-warning-700 dark:text-warning-400 bg-warning-50 dark:bg-warning-950/30 border border-warning-200 dark:border-warning-800 rounded-lg hover:bg-warning-100 dark:hover:bg-warning-950/50 transition-colors"
                >
                  <SendHorizonal className="h-3.5 w-3.5" />
                  Request Change
                </button>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">
                  Bank Name
                </label>
                <p className="text-[var(--text-primary)] mt-1">
                  {employee.bankName || 'Not provided'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">
                  Account Number
                </label>
                <p className="text-[var(--text-primary)] mt-1 font-mono">
                  {employee.bankAccountNumber
                    ? `****${employee.bankAccountNumber.slice(-4)}`
                    : 'Not provided'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">
                  IFSC Code
                </label>
                <p className="text-[var(--text-primary)] mt-1 font-mono">
                  {employee.bankIfscCode || 'Not provided'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Tax Details */}
          <Card className="card-aura lg:col-span-2">
            <CardHeader>
              <CardTitle className="skeuo-emboss flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Tax Information
              </CardTitle>
              <CardDescription>Your tax identification details</CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">
                  PAN Number
                </label>
                <p className="text-[var(--text-primary)] mt-1 font-mono">
                  {employee.taxId || 'Not provided'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bank Change Request Modal */}
        {showBankChangeModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-[var(--bg-card)] dark:bg-[var(--bg-secondary)] rounded-xl max-w-lg w-full shadow-[var(--shadow-dropdown)]">
              <div className="p-6 border-b border-[var(--border-main)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-warning-100 dark:bg-warning-900/30 rounded-lg">
                      <SendHorizonal className="h-5 w-5 text-warning-600 dark:text-warning-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                        Request Bank Details Change
                      </h2>
                      <p className="text-sm text-[var(--text-secondary)]">
                        Changes to bank details require HR approval
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowBankChangeModal(false)}
                    className="p-1 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    <X className="h-5 w-5 text-[var(--text-muted)]" />
                  </button>
                </div>
              </div>

              {bankChangeSuccess ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-success-100 dark:bg-success-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="h-8 w-8 text-success-600 dark:text-success-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                    Request Submitted
                  </h3>
                  <p className="text-[var(--text-secondary)] mt-2">
                    Your bank details change request has been submitted for HR approval.
                    You will be notified once it is processed.
                  </p>
                </div>
              ) : (
                <div className="p-6 space-y-4">
                  <div className="flex items-start gap-2 p-4 bg-warning-50 dark:bg-warning-950/20 border border-warning-200 dark:border-warning-800 rounded-lg">
                    <Clock className="h-4 w-4 text-warning-600 dark:text-warning-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-warning-800 dark:text-warning-300">
                      Bank detail changes are sensitive and go through an approval workflow. Your current details will remain active until the change is approved.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                      New Bank Name *
                    </label>
                    <input
                      type="text"
                      {...bankChangeForm.register('bankName')}
                      placeholder="e.g., State Bank of India"
                      className="input-aura w-full px-4 py-2 rounded-lg"
                    />
                    {bankChangeForm.formState.errors.bankName && (
                      <p className="text-danger-500 text-xs mt-1">{bankChangeForm.formState.errors.bankName.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                      New Account Number *
                    </label>
                    <input
                      type="text"
                      {...bankChangeForm.register('bankAccountNumber')}
                      placeholder="Enter full account number"
                      className="input-aura w-full px-4 py-2 rounded-lg font-mono"
                    />
                    {bankChangeForm.formState.errors.bankAccountNumber && (
                      <p className="text-danger-500 text-xs mt-1">{bankChangeForm.formState.errors.bankAccountNumber.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                      New IFSC Code *
                    </label>
                    <input
                      type="text"
                      {...bankChangeForm.register('bankIfscCode')}
                      placeholder="e.g., SBIN0001234"
                      className="input-aura w-full px-4 py-2 rounded-lg font-mono uppercase"
                    />
                    {bankChangeForm.formState.errors.bankIfscCode && (
                      <p className="text-danger-500 text-xs mt-1">{bankChangeForm.formState.errors.bankIfscCode.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                      Reason for Change *
                    </label>
                    <textarea
                      {...bankChangeForm.register('reason')}
                      rows={3}
                      placeholder="e.g., Changed salary account to new bank"
                      className="input-aura w-full px-4 py-2 rounded-lg"
                    />
                    {bankChangeForm.formState.errors.reason && (
                      <p className="text-danger-500 text-xs mt-1">{bankChangeForm.formState.errors.reason.message}</p>
                    )}
                  </div>
                </div>
              )}

              {!bankChangeSuccess && (
                <div className="p-6 border-t border-[var(--border-main)] flex justify-end gap-4">
                  <button
                    onClick={() => setShowBankChangeModal(false)}
                    className="btn-secondary px-4 py-2 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={bankChangeForm.handleSubmit(handleBankChangeRequest)}
                    disabled={bankChangeSubmitting}
                    className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                  >
                    {bankChangeSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <SendHorizonal className="h-4 w-4" />
                        Submit Request
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
