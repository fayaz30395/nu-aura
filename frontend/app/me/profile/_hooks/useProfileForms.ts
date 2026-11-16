'use client';

import {useEffect, useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {useAuth} from '@/lib/hooks/useAuth';
import {useMyEmployee, useUpdateMyProfile} from '@/lib/hooks/queries';
import {useUnsavedChanges} from '@/lib/hooks/useUnsavedChanges';
import {employmentChangeRequestService} from '@/lib/services/hrms/employment-change-request.service';
import {isAxiosError} from '@/lib/utils/type-guards';
import {createLogger} from '@/lib/utils/logger';

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

export type ProfileFormData = z.infer<typeof profileFormSchema>;

const bankChangeSchema = z.object({
  bankName: z.string().min(1, 'Bank name is required'),
  bankAccountNumber: z.string().min(1, 'Account number is required'),
  bankIfscCode: z.string().min(1, 'IFSC code is required'),
  reason: z.string().min(1, 'Reason is required'),
});

export type BankChangeFormData = z.infer<typeof bankChangeSchema>;

const EMPTY_PROFILE: ProfileFormData = {
  personalEmail: '',
  phoneNumber: '',
  emergencyContactNumber: '',
  address: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
};

export function useProfileForms() {
  const {user} = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showBankChangeModal, setShowBankChangeModal] = useState(false);
  const [bankChangeSubmitting, setBankChangeSubmitting] = useState(false);
  const [bankChangeSuccess, setBankChangeSuccess] = useState(false);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: EMPTY_PROFILE,
  });

  const bankChangeForm = useForm<BankChangeFormData>({
    resolver: zodResolver(bankChangeSchema),
    defaultValues: {
      bankName: '',
      bankAccountNumber: '',
      bankIfscCode: '',
      reason: '',
    },
  });

  useUnsavedChanges(profileForm.formState.isDirty || bankChangeForm.formState.isDirty);

  // React Query hooks — use /employees/me (no ID needed)
  const {data: employee, isLoading, fetchStatus} = useMyEmployee(!!user);
  const isActuallyLoading = isLoading && fetchStatus === 'fetching';

  const updateMutation = useUpdateMyProfile();

  const profileValuesFromEmployee = (): ProfileFormData => ({
    personalEmail: employee?.personalEmail || '',
    phoneNumber: employee?.phoneNumber || '',
    emergencyContactNumber: employee?.emergencyContactNumber || '',
    address: employee?.address || '',
    city: employee?.city || '',
    state: employee?.state || '',
    postalCode: employee?.postalCode || '',
    country: employee?.country || '',
  });

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
    if (!success) return;
    const t = window.setTimeout(() => setSuccess(false), 3000);
    return () => window.clearTimeout(t);
  }, [success]);

  const handleSave = async (data: ProfileFormData) => {
    if (!employee) return;

    try {
      setError(null);
      await updateMutation.mutateAsync(data);
      setIsEditing(false);
      setSuccess(true);
    } catch (err: unknown) {
      log.error('Failed to update profile:', err);
      setError(isAxiosError(err) ? (err.response?.data?.message ?? 'Failed to update profile') : 'Failed to update profile');
    }
  };

  const handleCancel = () => {
    if (employee) {
      profileForm.reset(profileValuesFromEmployee());
    }
    setIsEditing(false);
    setError(null);
  };

  const openBankChange = () => {
    bankChangeForm.reset({
      bankName: employee?.bankName || '',
      bankAccountNumber: '',
      bankIfscCode: employee?.bankIfscCode || '',
      reason: '',
    });
    setShowBankChangeModal(true);
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
      setError(isAxiosError(err) ? (err.response?.data?.message ?? 'Failed to submit change request') : 'Failed to submit change request');
    } finally {
      setBankChangeSubmitting(false);
    }
  };

  return {
    user,
    employee,
    isActuallyLoading,
    isEditing,
    startEditing: () => setIsEditing(true),
    success,
    error,
    profileForm,
    savePending: updateMutation.isPending,
    submitProfile: profileForm.handleSubmit(handleSave),
    handleCancel,
    bankChangeForm,
    showBankChangeModal,
    openBankChange,
    closeBankChange: () => setShowBankChangeModal(false),
    bankChangeSubmitting,
    bankChangeSuccess,
    submitBankChange: bankChangeForm.handleSubmit(handleBankChangeRequest),
  };
}
