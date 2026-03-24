'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User, Building2, CreditCard, FileText, CheckCircle2,
  Upload, ChevronRight, AlertCircle
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createLogger } from '@/lib/utils/logger';

const log = createLogger('PreboardingPortalPage');

const personalInfoSchema = z.object({
  dateOfBirth: z.string().min(1, 'Date of birth required'),
  address: z.string().min(1, 'Address required'),
  city: z.string().min(1, 'City required'),
  state: z.string().min(1, 'State required'),
  postalCode: z.string().min(1, 'Postal code required'),
  country: z.string().min(1, 'Country required'),
  phoneNumber: z.string().optional().or(z.literal('')),
  emergencyContactName: z.string().optional().or(z.literal('')),
  emergencyContactNumber: z.string().optional().or(z.literal('')),
});

const bankDetailsSchema = z.object({
  bankName: z.string().min(1, 'Bank name required'),
  bankAccountNumber: z.string().min(1, 'Account number required'),
  bankIfscCode: z.string().min(1, 'IFSC code required'),
  taxId: z.string().min(1, 'PAN number required'),
});

type PersonalInfoFormData = z.infer<typeof personalInfoSchema>;
type BankDetailsFormData = z.infer<typeof bankDetailsSchema>;

interface PreboardingData {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  expectedJoiningDate: string;
  designation: string;
  status: string;
  completionPercentage: number;
  dateOfBirth: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  phoneNumber: string | null;
  emergencyContactNumber: string | null;
  emergencyContactName: string | null;
  bankAccountNumber: string | null;
  bankName: string | null;
  bankIfscCode: string | null;
  taxId: string | null;
  photoUploaded: boolean;
  idProofUploaded: boolean;
  addressProofUploaded: boolean;
  educationDocsUploaded: boolean;
  offerLetterSigned: boolean;
}

export default function PreboardingPortalPage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<PreboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
    // loadData is defined below and only depends on `token` (already listed).
    // Including it without useCallback would cause an infinite re-render loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<PreboardingData>(`/preboarding/portal/${token}`);
      setData(response.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid or expired link');
    } finally {
      setLoading(false);
    }
  };

  const {
    register: registerPersonalInfo,
    handleSubmit: handleSubmitPersonalInfo,
    formState: { errors: personalInfoErrors },
  } = useForm<PersonalInfoFormData>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      dateOfBirth: data?.dateOfBirth || '',
      address: data?.address || '',
      city: data?.city || '',
      state: data?.state || '',
      postalCode: data?.postalCode || '',
      country: data?.country || '',
      phoneNumber: data?.phoneNumber || '',
      emergencyContactName: data?.emergencyContactName || '',
      emergencyContactNumber: data?.emergencyContactNumber || '',
    },
  });

  const savePersonalInfo = async (formData: PersonalInfoFormData) => {
    setSaving(true);
    try {
      const response = await apiClient.put<PreboardingData>(`/preboarding/portal/${token}/personal-info`, formData);
      setData(response.data);
      setActiveStep(1);
    } catch (err) {
      log.error('Failed to save personal info:', err);
    } finally {
      setSaving(false);
    }
  };

  const {
    register: registerBankDetails,
    handleSubmit: handleSubmitBankDetails,
    formState: { errors: bankDetailsErrors },
  } = useForm<BankDetailsFormData>({
    resolver: zodResolver(bankDetailsSchema),
    defaultValues: {
      bankName: data?.bankName || '',
      bankAccountNumber: data?.bankAccountNumber || '',
      bankIfscCode: data?.bankIfscCode || '',
      taxId: data?.taxId || '',
    },
  });

  const saveBankDetails = async (formData: BankDetailsFormData) => {
    setSaving(true);
    try {
      const response = await apiClient.put<PreboardingData>(`/preboarding/portal/${token}/bank-details`, formData);
      setData(response.data);
      setActiveStep(2);
    } catch (err) {
      log.error('Failed to save bank details:', err);
    } finally {
      setSaving(false);
    }
  };

  const signOfferLetter = async () => {
    setSaving(true);
    try {
      const response = await apiClient.post<PreboardingData>(`/preboarding/portal/${token}/sign-offer`);
      setData(response.data);
    } catch (err) {
      log.error('Failed to sign offer letter:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-secondary)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--bg-secondary)] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Access Error</h2>
            <p className="text-[var(--text-muted)]">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const steps = [
    { label: 'Personal Info', icon: User, complete: !!data.dateOfBirth && !!data.address },
    { label: 'Bank Details', icon: CreditCard, complete: !!data.bankAccountNumber },
    { label: 'Documents', icon: FileText, complete: data.idProofUploaded && data.photoUploaded },
    { label: 'Offer Letter', icon: CheckCircle2, complete: data.offerLetterSigned },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-surface-100 dark:from-surface-900 dark:to-surface-800 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-sky-500 flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">Welcome, {data.firstName}!</h1>
          <p className="text-[var(--text-muted)] mt-1">Complete your pre-boarding checklist before joining on {new Date(data.expectedJoiningDate).toLocaleDateString()}</p>
        </div>

        {/* Progress */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[var(--text-secondary)]">Overall Progress</span>
              <span className="text-sm font-bold text-sky-700">{data.completionPercentage}%</span>
            </div>
            <div className="w-full bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded-full h-3">
              <div
                className="bg-gradient-to-r from-sky-500 to-sky-700 h-3 rounded-full transition-all duration-500"
                style={{ width: `${data.completionPercentage}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Steps */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, idx) => (
            <div
              key={step.label}
              className={`flex items-center ${idx < steps.length - 1 ? 'flex-1' : ''}`}
              onClick={() => setActiveStep(idx)}
            >
              <button className={`flex flex-col items-center cursor-pointer ${idx === activeStep ? 'opacity-100' : 'opacity-60'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors ${
                  step.complete
                    ? 'bg-green-500 text-white'
                    : idx === activeStep
                    ? 'bg-sky-500 text-white'
                    : 'bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                }`}>
                  {step.complete ? <CheckCircle2 className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}
                </div>
                <span className="text-xs font-medium text-[var(--text-secondary)]">{step.label}</span>
              </button>
              {idx < steps.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] relative top-[-12px]">
                  <div className={`h-full transition-all ${step.complete ? 'bg-green-500 w-full' : 'w-0'}`} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <Card>
          <CardContent className="p-6">
            {activeStep === 0 && (
              <form onSubmit={handleSubmitPersonalInfo(savePersonalInfo)} className="space-y-4">
                <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Date of Birth *</label>
                    <Input type="date" {...registerPersonalInfo('dateOfBirth')} />
                    {personalInfoErrors.dateOfBirth && <span className="text-red-500 text-sm">{personalInfoErrors.dateOfBirth.message}</span>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone Number</label>
                    <Input placeholder="+91 9876543210" {...registerPersonalInfo('phoneNumber')} />
                    {personalInfoErrors.phoneNumber && <span className="text-red-500 text-sm">{personalInfoErrors.phoneNumber.message}</span>}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Address *</label>
                  <textarea
                    className="w-full px-3 py-2 border rounded-lg dark:bg-[var(--bg-secondary)] dark:border-[var(--border-main)]"
                    rows={2}
                    {...registerPersonalInfo('address')}
                  />
                  {personalInfoErrors.address && <span className="text-red-500 text-sm">{personalInfoErrors.address.message}</span>}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Input placeholder="City" {...registerPersonalInfo('city')} />
                    {personalInfoErrors.city && <span className="text-red-500 text-sm">{personalInfoErrors.city.message}</span>}
                  </div>
                  <div>
                    <Input placeholder="State" {...registerPersonalInfo('state')} />
                    {personalInfoErrors.state && <span className="text-red-500 text-sm">{personalInfoErrors.state.message}</span>}
                  </div>
                  <div>
                    <Input placeholder="Postal Code" {...registerPersonalInfo('postalCode')} />
                    {personalInfoErrors.postalCode && <span className="text-red-500 text-sm">{personalInfoErrors.postalCode.message}</span>}
                  </div>
                  <div>
                    <Input placeholder="Country" {...registerPersonalInfo('country')} />
                    {personalInfoErrors.country && <span className="text-red-500 text-sm">{personalInfoErrors.country.message}</span>}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Emergency Contact Name</label>
                    <Input {...registerPersonalInfo('emergencyContactName')} />
                    {personalInfoErrors.emergencyContactName && <span className="text-red-500 text-sm">{personalInfoErrors.emergencyContactName.message}</span>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Emergency Contact Number</label>
                    <Input {...registerPersonalInfo('emergencyContactNumber')} />
                    {personalInfoErrors.emergencyContactNumber && <span className="text-red-500 text-sm">{personalInfoErrors.emergencyContactNumber.message}</span>}
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <Button type="submit" variant="primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save & Continue'}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </form>
            )}

            {activeStep === 1 && (
              <form onSubmit={handleSubmitBankDetails(saveBankDetails)} className="space-y-4">
                <h2 className="text-lg font-semibold mb-4">Bank & Tax Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Bank Name *</label>
                    <Input {...registerBankDetails('bankName')} />
                    {bankDetailsErrors.bankName && <span className="text-red-500 text-sm">{bankDetailsErrors.bankName.message}</span>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Account Number *</label>
                    <Input {...registerBankDetails('bankAccountNumber')} />
                    {bankDetailsErrors.bankAccountNumber && <span className="text-red-500 text-sm">{bankDetailsErrors.bankAccountNumber.message}</span>}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">IFSC Code *</label>
                    <Input {...registerBankDetails('bankIfscCode')} />
                    {bankDetailsErrors.bankIfscCode && <span className="text-red-500 text-sm">{bankDetailsErrors.bankIfscCode.message}</span>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">PAN Number *</label>
                    <Input placeholder="ABCDE1234F" {...registerBankDetails('taxId')} />
                    {bankDetailsErrors.taxId && <span className="text-red-500 text-sm">{bankDetailsErrors.taxId.message}</span>}
                  </div>
                </div>
                <div className="flex justify-between pt-4">
                  <Button type="button" variant="ghost" onClick={() => setActiveStep(0)}>Back</Button>
                  <Button type="submit" variant="primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save & Continue'}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </form>
            )}

            {activeStep === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold mb-4">Document Upload</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className={`p-4 border-2 ${data.photoUploaded ? 'border-green-500' : 'border-dashed border-[var(--border-main)]'}`}>
                    <div className="flex items-center gap-4">
                      {data.photoUploaded ? <CheckCircle2 className="h-6 w-6 text-green-500" /> : <Upload className="h-6 w-6 text-[var(--text-muted)]" />}
                      <div>
                        <p className="font-medium">Passport Photo</p>
                        <p className="text-xs text-[var(--text-muted)]">{data.photoUploaded ? 'Uploaded' : 'Required'}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className={`p-4 border-2 ${data.idProofUploaded ? 'border-green-500' : 'border-dashed border-[var(--border-main)]'}`}>
                    <div className="flex items-center gap-4">
                      {data.idProofUploaded ? <CheckCircle2 className="h-6 w-6 text-green-500" /> : <Upload className="h-6 w-6 text-[var(--text-muted)]" />}
                      <div>
                        <p className="font-medium">ID Proof</p>
                        <p className="text-xs text-[var(--text-muted)]">{data.idProofUploaded ? 'Uploaded' : 'Aadhar/Passport'}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className={`p-4 border-2 ${data.addressProofUploaded ? 'border-green-500' : 'border-dashed border-[var(--border-main)]'}`}>
                    <div className="flex items-center gap-4">
                      {data.addressProofUploaded ? <CheckCircle2 className="h-6 w-6 text-green-500" /> : <Upload className="h-6 w-6 text-[var(--text-muted)]" />}
                      <div>
                        <p className="font-medium">Address Proof</p>
                        <p className="text-xs text-[var(--text-muted)]">{data.addressProofUploaded ? 'Uploaded' : 'Optional'}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className={`p-4 border-2 ${data.educationDocsUploaded ? 'border-green-500' : 'border-dashed border-[var(--border-main)]'}`}>
                    <div className="flex items-center gap-4">
                      {data.educationDocsUploaded ? <CheckCircle2 className="h-6 w-6 text-green-500" /> : <Upload className="h-6 w-6 text-[var(--text-muted)]" />}
                      <div>
                        <p className="font-medium">Education Docs</p>
                        <p className="text-xs text-[var(--text-muted)]">{data.educationDocsUploaded ? 'Uploaded' : 'Degrees/Certificates'}</p>
                      </div>
                    </div>
                  </Card>
                </div>
                <p className="text-sm text-[var(--text-muted)]">Note: Document upload functionality will be integrated with file storage.</p>
                <div className="flex justify-between pt-4">
                  <Button type="button" variant="ghost" onClick={() => setActiveStep(1)}>Back</Button>
                  <Button type="button" variant="primary" onClick={() => setActiveStep(3)}>
                    Continue
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {activeStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold mb-4">Offer Letter</h2>
                {data.offerLetterSigned ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-[var(--text-primary)]">All Done!</h3>
                    <p className="text-[var(--text-muted)] mt-2">You have completed your pre-boarding checklist. See you on {new Date(data.expectedJoiningDate).toLocaleDateString()}!</p>
                  </div>
                ) : (
                  <>
                    <Card className="p-4 bg-[var(--bg-secondary)]/50">
                      <div className="flex items-start gap-4">
                        <FileText className="h-6 w-6 text-sky-500 mt-1" />
                        <div>
                          <p className="font-medium">Employment Offer Letter</p>
                          <p className="text-sm text-[var(--text-muted)] mt-1">
                            Please review your offer letter and sign to confirm your acceptance of the position as {data.designation}.
                          </p>
                        </div>
                      </div>
                    </Card>
                    <div className="flex justify-between pt-4">
                      <Button type="button" variant="ghost" onClick={() => setActiveStep(2)}>Back</Button>
                      <Button variant="primary" onClick={signOfferLetter} disabled={saving}>
                        {saving ? 'Signing...' : 'Sign & Accept Offer'}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
