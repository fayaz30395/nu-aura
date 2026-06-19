'use client';

import {useEffect, useRef, useState} from 'react';
import {useParams} from 'next/navigation';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {AlertCircle, Building2, CheckCircle2, ChevronRight, CreditCard, FileText, Upload, User} from 'lucide-react';
import {publicApiClient} from '@/lib/api/public-client';
import {Card, CardContent} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {Input} from '@/components/ui/Input';
import {createLogger} from '@/lib/utils/logger';
import {formatDate} from '@/lib/utils/format/date';

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

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

const bankDetailsSchema = z.object({
  bankName: z.string().min(1, 'Bank name required'),
  bankAccountNumber: z.string().min(1, 'Account number required'),
  bankAccountNumberConfirm: z.string().min(1, 'Please confirm account number'),
  bankIfscCode: z.string().regex(IFSC_REGEX, 'Invalid IFSC code (e.g. SBIN0001234)'),
  taxId: z.string().min(1, 'PAN number required'),
}).refine((d) => d.bankAccountNumber === d.bankAccountNumberConfirm, {
  message: 'Account numbers do not match',
  path: ['bankAccountNumberConfirm'],
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
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const idProofRef = useRef<HTMLInputElement>(null);
  const addressProofRef = useRef<HTMLInputElement>(null);
  const educationDocsRef = useRef<HTMLInputElement>(null);

  const uploadDocument = async (file: File, docType: string) => {
    setUploading(docType);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', docType);
      const response = await publicApiClient.post<PreboardingData>(
        `/preboarding/portal/${token}/documents`,
        formData,
        {headers: {'Content-Type': 'multipart/form-data'}},
      );
      setData(response.data);
    } catch (err) {
      log.error('Failed to upload document:', err);
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(null);
    }
  };

  useEffect(() => {
    loadData();
    // loadData is defined below and only depends on `token` (already listed).
    // Including it without useCallback would cause an infinite re-render loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await publicApiClient.get<PreboardingData>(`/preboarding/portal/${token}`);
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
    formState: {errors: personalInfoErrors},
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
      const response = await publicApiClient.put<PreboardingData>(`/preboarding/portal/${token}/personal-info`, formData);
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
    formState: {errors: bankDetailsErrors},
  } = useForm<BankDetailsFormData>({
    resolver: zodResolver(bankDetailsSchema),
    defaultValues: {
      bankName: data?.bankName || '',
      bankAccountNumber: data?.bankAccountNumber || '',
      bankAccountNumberConfirm: '',
      bankIfscCode: data?.bankIfscCode || '',
      taxId: data?.taxId || '',
    },
  });

  const saveBankDetails = async (formData: BankDetailsFormData) => {
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {bankAccountNumberConfirm: _confirm, ...payload} = formData;
    try {
      const response = await publicApiClient.put<PreboardingData>(`/preboarding/portal/${token}/bank-details`, payload);
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
      const response = await publicApiClient.post<PreboardingData>(`/preboarding/portal/${token}/sign-offer`);
      setData(response.data);
    } catch (err) {
      log.error('Failed to sign offer letter:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-shell-centered fade-slide-up auth-delay-20">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent-500 border-t-transparent"/>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-shell-centered fade-slide-up auth-delay-20 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-danger-500 mx-auto mb-4"/>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Access Error</h2>
            <p className="text-[var(--text-muted)]">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const steps = [
    {label: 'Personal Info', icon: User, complete: !!data.dateOfBirth && !!data.address},
    {label: 'Bank Details', icon: CreditCard, complete: !!data.bankAccountNumber},
    {label: 'Documents', icon: FileText, complete: data.idProofUploaded && data.photoUploaded},
    {label: 'Offer Letter', icon: CheckCircle2, complete: data.offerLetterSigned},
  ];

  return (
    <div
      className="page-shell-centered fade-slide-up auth-delay-20 bg-gradient-to-br from-accent-50 to-surface-100 dark:from-surface-900 dark:to-surface-800 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-lg bg-accent-500 flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-white"/>
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Welcome, {data.firstName}!</h1>
          <p className="text-[var(--text-muted)] mt-1">Complete your pre-boarding checklist before joining
            on {formatDate(data.expectedJoiningDate)}</p>
        </div>

        {/* Progress */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="row-between mb-2">
              <span className="text-sm font-medium text-[var(--text-secondary)]">Overall Progress</span>
              <span className="text-sm font-bold text-accent-700">{data.completionPercentage}%</span>
            </div>
            <div className="w-full bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded-full h-3">
              <div
                className="bg-accent-600 dark:bg-accent-500 h-3 rounded-full transition-all duration-500"
                style={{width: `${data.completionPercentage}%`}}
              />
            </div>
          </CardContent>
        </Card>

        {/* Steps */}
        <div className="row-between mb-6">
          {steps.map((step, idx) => (
            <div
              key={step.label}
              className={`flex items-center ${idx < steps.length - 1 ? 'flex-1' : ''}`}
              onClick={() => setActiveStep(idx)}
            >
              <button
                className={`flex flex-col items-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${idx === activeStep ? 'opacity-100' : 'opacity-60'}`}
                aria-label={`Go to step ${idx + 1}: ${step.label}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors ${
                  step.complete
                    ? 'bg-success-500 text-white'
                    : idx === activeStep
                      ? 'bg-accent-500 text-white'
                      : 'bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                }`}>
                  {step.complete ? <CheckCircle2 className="h-5 w-5"/> : <step.icon className="h-5 w-5"/>}
                </div>
                <span className="text-xs font-medium text-[var(--text-secondary)]">{step.label}</span>
              </button>
              {idx < steps.length - 1 && (
                <div
                  className="flex-1 h-0.5 mx-2 bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] relative top-[-12px]">
                  <div className={`h-full transition-all ${step.complete ? 'bg-success-500 w-full' : 'w-0'}`}/>
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
                <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="preboarding-date-of-birth" className="block text-sm font-medium mb-1">Date of Birth *</label>
                    <Input id="preboarding-date-of-birth" type="date" {...registerPersonalInfo('dateOfBirth')} />
                    {personalInfoErrors.dateOfBirth &&
                      <span className="text-danger-500 text-sm">{personalInfoErrors.dateOfBirth.message}</span>}
                  </div>
                  <div>
                    <label htmlFor="preboarding-phone-number" className="block text-sm font-medium mb-1">Phone Number</label>
                    <Input id="preboarding-phone-number" placeholder="+91 9876543210" {...registerPersonalInfo('phoneNumber')} />
                    {personalInfoErrors.phoneNumber &&
                      <span className="text-danger-500 text-sm">{personalInfoErrors.phoneNumber.message}</span>}
                  </div>
                </div>
                <div>
                  <label htmlFor="preboarding-address" className="block text-sm font-medium mb-1">Address *</label>
                  <textarea
                    id="preboarding-address"
                    className="w-full px-4 py-2 border rounded-lg dark:bg-[var(--bg-secondary)] dark:border-[var(--border-main)]"
                    rows={2}
                    {...registerPersonalInfo('address')}
                  />
                  {personalInfoErrors.address &&
                    <span className="text-danger-500 text-sm">{personalInfoErrors.address.message}</span>}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Input placeholder="City" aria-label="City" {...registerPersonalInfo('city')} />
                    {personalInfoErrors.city &&
                      <span className="text-danger-500 text-sm">{personalInfoErrors.city.message}</span>}
                  </div>
                  <div>
                    <Input placeholder="State" aria-label="State" {...registerPersonalInfo('state')} />
                    {personalInfoErrors.state &&
                      <span className="text-danger-500 text-sm">{personalInfoErrors.state.message}</span>}
                  </div>
                  <div>
                    <Input placeholder="Postal Code" aria-label="Postal Code" {...registerPersonalInfo('postalCode')} />
                    {personalInfoErrors.postalCode &&
                      <span className="text-danger-500 text-sm">{personalInfoErrors.postalCode.message}</span>}
                  </div>
                  <div>
                    <Input placeholder="Country" aria-label="Country" {...registerPersonalInfo('country')} />
                    {personalInfoErrors.country &&
                      <span className="text-danger-500 text-sm">{personalInfoErrors.country.message}</span>}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="preboarding-emergency-contact-name" className="block text-sm font-medium mb-1">Emergency Contact Name</label>
                    <Input id="preboarding-emergency-contact-name" {...registerPersonalInfo('emergencyContactName')} />
                    {personalInfoErrors.emergencyContactName && <span
                      className="text-danger-500 text-sm">{personalInfoErrors.emergencyContactName.message}</span>}
                  </div>
                  <div>
                    <label htmlFor="preboarding-emergency-contact-number" className="block text-sm font-medium mb-1">Emergency Contact Number</label>
                    <Input id="preboarding-emergency-contact-number" {...registerPersonalInfo('emergencyContactNumber')} />
                    {personalInfoErrors.emergencyContactNumber && <span
                      className="text-danger-500 text-sm">{personalInfoErrors.emergencyContactNumber.message}</span>}
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <Button type="submit" variant="primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save & Continue'}
                    <ChevronRight className="h-4 w-4 ml-1"/>
                  </Button>
                </div>
              </form>
            )}

            {activeStep === 1 && (
              <form onSubmit={handleSubmitBankDetails(saveBankDetails)} className="space-y-4">
                <h2 className="text-xl font-semibold mb-4">Bank & Tax Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="preboarding-bank-name" className="block text-sm font-medium mb-1">Bank Name *</label>
                    <Input id="preboarding-bank-name" {...registerBankDetails('bankName')} />
                    {bankDetailsErrors.bankName &&
                      <span className="text-danger-500 text-sm">{bankDetailsErrors.bankName.message}</span>}
                  </div>
                  <div>
                    <label htmlFor="preboarding-bank-account-number" className="block text-sm font-medium mb-1">Account Number *</label>
                    <Input id="preboarding-bank-account-number" type="password" autoComplete="off" {...registerBankDetails('bankAccountNumber')} />
                    {bankDetailsErrors.bankAccountNumber &&
                      <span className="text-danger-500 text-sm">{bankDetailsErrors.bankAccountNumber.message}</span>}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="preboarding-bank-account-number-confirm" className="block text-sm font-medium mb-1">Confirm Account Number *</label>
                    <Input id="preboarding-bank-account-number-confirm" type="password" autoComplete="off" {...registerBankDetails('bankAccountNumberConfirm')} />
                    {bankDetailsErrors.bankAccountNumberConfirm &&
                      <span className="text-danger-500 text-sm">{bankDetailsErrors.bankAccountNumberConfirm.message}</span>}
                  </div>
                  <div>
                    <label htmlFor="preboarding-bank-ifsc-code" className="block text-sm font-medium mb-1">IFSC Code *</label>
                    <Input id="preboarding-bank-ifsc-code" placeholder="SBIN0001234" {...registerBankDetails('bankIfscCode')} />
                    {bankDetailsErrors.bankIfscCode &&
                      <span className="text-danger-500 text-sm">{bankDetailsErrors.bankIfscCode.message}</span>}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="preboarding-pan-number" className="block text-sm font-medium mb-1">PAN Number *</label>
                    <Input id="preboarding-pan-number" placeholder="ABCDE1234F" {...registerBankDetails('taxId')} />
                    {bankDetailsErrors.taxId &&
                      <span className="text-danger-500 text-sm">{bankDetailsErrors.taxId.message}</span>}
                  </div>
                </div>
                <div className="flex justify-between pt-4">
                  <Button type="button" variant="ghost" onClick={() => setActiveStep(0)}>Back</Button>
                  <Button type="submit" variant="primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save & Continue'}
                    <ChevronRight className="h-4 w-4 ml-1"/>
                  </Button>
                </div>
              </form>
            )}

            {activeStep === 2 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4">Document Upload</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Passport Photo — Required */}
                  <button
                    type="button"
                    disabled={!!uploading || data.photoUploaded}
                    onClick={() => photoRef.current?.click()}
                    className={`rounded-lg p-4 border-2 w-full text-left transition-colors ${data.photoUploaded ? 'border-success-500 bg-[var(--bg-main)]' : 'border-dashed border-[var(--border-main)] bg-[var(--bg-main)] hover:border-accent-400 cursor-pointer'}`}
                    aria-label="Upload passport photo"
                  >
                    <div className="flex items-center gap-4">
                      {data.photoUploaded
                        ? <CheckCircle2 className="h-6 w-6 text-success-500"/>
                        : uploading === 'PASSPORT_PHOTO'
                          ? <div className="animate-spin rounded-full h-6 w-6 border-2 border-accent-500 border-t-transparent"/>
                          : <Upload className="h-6 w-6 text-[var(--text-muted)]"/>}
                      <div>
                        <p className="font-medium">Passport Photo <span className="text-danger-500">*</span></p>
                        <p className="text-caption">{data.photoUploaded ? 'Uploaded' : uploading === 'PASSPORT_PHOTO' ? 'Uploading…' : 'Click to upload'}</p>
                      </div>
                    </div>
                  </button>
                  <input ref={photoRef} type="file" accept="image/*,.pdf" className="hidden" aria-hidden="true"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDocument(f, 'PASSPORT_PHOTO'); e.target.value = ''; }}/>

                  {/* ID Proof — Required */}
                  <button
                    type="button"
                    disabled={!!uploading || data.idProofUploaded}
                    onClick={() => idProofRef.current?.click()}
                    className={`rounded-lg p-4 border-2 w-full text-left transition-colors ${data.idProofUploaded ? 'border-success-500 bg-[var(--bg-main)]' : 'border-dashed border-[var(--border-main)] bg-[var(--bg-main)] hover:border-accent-400 cursor-pointer'}`}
                    aria-label="Upload ID proof"
                  >
                    <div className="flex items-center gap-4">
                      {data.idProofUploaded
                        ? <CheckCircle2 className="h-6 w-6 text-success-500"/>
                        : uploading === 'ID_PROOF'
                          ? <div className="animate-spin rounded-full h-6 w-6 border-2 border-accent-500 border-t-transparent"/>
                          : <Upload className="h-6 w-6 text-[var(--text-muted)]"/>}
                      <div>
                        <p className="font-medium">ID Proof <span className="text-danger-500">*</span></p>
                        <p className="text-caption">{data.idProofUploaded ? 'Uploaded' : uploading === 'ID_PROOF' ? 'Uploading…' : 'Aadhar / Passport'}</p>
                      </div>
                    </div>
                  </button>
                  <input ref={idProofRef} type="file" accept="image/*,.pdf" className="hidden" aria-hidden="true"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDocument(f, 'ID_PROOF'); e.target.value = ''; }}/>

                  {/* Address Proof — Optional */}
                  <button
                    type="button"
                    disabled={!!uploading || data.addressProofUploaded}
                    onClick={() => addressProofRef.current?.click()}
                    className={`rounded-lg p-4 border-2 w-full text-left transition-colors ${data.addressProofUploaded ? 'border-success-500 bg-[var(--bg-main)]' : 'border-dashed border-[var(--border-main)] bg-[var(--bg-main)] hover:border-accent-400 cursor-pointer'}`}
                    aria-label="Upload address proof"
                  >
                    <div className="flex items-center gap-4">
                      {data.addressProofUploaded
                        ? <CheckCircle2 className="h-6 w-6 text-success-500"/>
                        : uploading === 'ADDRESS_PROOF'
                          ? <div className="animate-spin rounded-full h-6 w-6 border-2 border-accent-500 border-t-transparent"/>
                          : <Upload className="h-6 w-6 text-[var(--text-muted)]"/>}
                      <div>
                        <p className="font-medium">Address Proof <span className="text-caption">(optional)</span></p>
                        <p className="text-caption">{data.addressProofUploaded ? 'Uploaded' : uploading === 'ADDRESS_PROOF' ? 'Uploading…' : 'Click to upload'}</p>
                      </div>
                    </div>
                  </button>
                  <input ref={addressProofRef} type="file" accept="image/*,.pdf" className="hidden" aria-hidden="true"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDocument(f, 'ADDRESS_PROOF'); e.target.value = ''; }}/>

                  {/* Education Docs — Optional */}
                  <button
                    type="button"
                    disabled={!!uploading || data.educationDocsUploaded}
                    onClick={() => educationDocsRef.current?.click()}
                    className={`rounded-lg p-4 border-2 w-full text-left transition-colors ${data.educationDocsUploaded ? 'border-success-500 bg-[var(--bg-main)]' : 'border-dashed border-[var(--border-main)] bg-[var(--bg-main)] hover:border-accent-400 cursor-pointer'}`}
                    aria-label="Upload education documents"
                  >
                    <div className="flex items-center gap-4">
                      {data.educationDocsUploaded
                        ? <CheckCircle2 className="h-6 w-6 text-success-500"/>
                        : uploading === 'EDUCATION_DOCS'
                          ? <div className="animate-spin rounded-full h-6 w-6 border-2 border-accent-500 border-t-transparent"/>
                          : <Upload className="h-6 w-6 text-[var(--text-muted)]"/>}
                      <div>
                        <p className="font-medium">Education Docs <span className="text-caption">(optional)</span></p>
                        <p className="text-caption">{data.educationDocsUploaded ? 'Uploaded' : uploading === 'EDUCATION_DOCS' ? 'Uploading…' : 'Degrees / Certificates'}</p>
                      </div>
                    </div>
                  </button>
                  <input ref={educationDocsRef} type="file" accept="image/*,.pdf" className="hidden" aria-hidden="true"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDocument(f, 'EDUCATION_DOCS'); e.target.value = ''; }}/>
                </div>
                {uploadError && <p className="text-danger-500 text-sm">{uploadError}</p>}
                <p className="text-caption text-[var(--text-muted)]">Required: Passport Photo and ID Proof. Accepted formats: images, PDF.</p>
                <div className="flex justify-between pt-4">
                  <Button type="button" variant="ghost" onClick={() => setActiveStep(1)}>Back</Button>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={!data.photoUploaded || !data.idProofUploaded || !!uploading}
                    onClick={() => setActiveStep(3)}
                  >
                    Continue
                    <ChevronRight className="h-4 w-4 ml-1"/>
                  </Button>
                </div>
              </div>
            )}

            {activeStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4">Offer Letter</h2>
                {data.offerLetterSigned ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-16 w-16 text-success-500 mx-auto mb-4"/>
                    <h3 className="text-xl font-bold text-[var(--text-primary)]">All Done!</h3>
                    <p className="text-[var(--text-muted)] mt-2">You have completed your pre-boarding checklist. See you
                      on {formatDate(data.expectedJoiningDate)}!</p>
                  </div>
                ) : (
                  <>
                    <div className="panel-inset p-4">
                      <div className="flex items-start gap-4">
                        <FileText className="h-6 w-6 text-accent-500 mt-1"/>
                        <div>
                          <p className="font-medium">Employment Offer Letter</p>
                          <p className="text-body-muted mt-1">
                            Please review your offer letter and sign to confirm your acceptance of the position
                            as {data.designation}.
                          </p>
                        </div>
                      </div>
                    </div>
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
