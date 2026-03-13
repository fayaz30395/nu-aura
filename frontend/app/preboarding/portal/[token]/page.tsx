'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  User, Building2, CreditCard, FileText, CheckCircle2,
  Upload, ChevronRight, AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

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

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

  useEffect(() => {
    loadData();
  }, [token]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/v1/preboarding/portal/${token}`);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Invalid or expired link');
      }
      const result = await response.json();
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const savePersonalInfo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    try {
      const response = await fetch(`${API_URL}/api/v1/preboarding/portal/${token}/personal-info`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateOfBirth: formData.get('dateOfBirth'),
          address: formData.get('address'),
          city: formData.get('city'),
          state: formData.get('state'),
          postalCode: formData.get('postalCode'),
          country: formData.get('country'),
          phoneNumber: formData.get('phoneNumber'),
          emergencyContactName: formData.get('emergencyContactName'),
          emergencyContactNumber: formData.get('emergencyContactNumber'),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setData(result);
        setActiveStep(1);
      }
    } catch (err) {
      console.error('Failed to save personal info:', err);
    } finally {
      setSaving(false);
    }
  };

  const saveBankDetails = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    try {
      const response = await fetch(`${API_URL}/api/v1/preboarding/portal/${token}/bank-details`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankAccountNumber: formData.get('bankAccountNumber'),
          bankName: formData.get('bankName'),
          bankIfscCode: formData.get('bankIfscCode'),
          taxId: formData.get('taxId'),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setData(result);
        setActiveStep(2);
      }
    } catch (err) {
      console.error('Failed to save bank details:', err);
    } finally {
      setSaving(false);
    }
  };

  const signOfferLetter = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/preboarding/portal/${token}/sign-offer`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (err) {
      console.error('Failed to sign offer letter:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-surface-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-surface-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-surface-900 dark:text-surface-50 mb-2">Access Error</h2>
            <p className="text-surface-500">{error}</p>
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
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-surface-100 dark:from-surface-900 dark:to-surface-800 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary-500 flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">Welcome, {data.firstName}!</h1>
          <p className="text-surface-500 mt-1">Complete your pre-boarding checklist before joining on {new Date(data.expectedJoiningDate).toLocaleDateString()}</p>
        </div>

        {/* Progress */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-surface-700 dark:text-surface-300">Overall Progress</span>
              <span className="text-sm font-bold text-primary-600">{data.completionPercentage}%</span>
            </div>
            <div className="w-full bg-surface-100 dark:bg-surface-700 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-500"
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
                    ? 'bg-primary-500 text-white'
                    : 'bg-surface-200 dark:bg-surface-700 text-surface-500'
                }`}>
                  {step.complete ? <CheckCircle2 className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}
                </div>
                <span className="text-xs font-medium text-surface-600 dark:text-surface-400">{step.label}</span>
              </button>
              {idx < steps.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 bg-surface-200 dark:bg-surface-700 relative top-[-12px]">
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
              <form onSubmit={savePersonalInfo} className="space-y-4">
                <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Date of Birth *</label>
                    <Input name="dateOfBirth" type="date" defaultValue={data.dateOfBirth || ''} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone Number</label>
                    <Input name="phoneNumber" defaultValue={data.phoneNumber || ''} placeholder="+91 9876543210" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Address *</label>
                  <textarea
                    name="address"
                    defaultValue={data.address || ''}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-surface-800 dark:border-surface-600"
                    rows={2}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Input name="city" placeholder="City" defaultValue={data.city || ''} />
                  <Input name="state" placeholder="State" defaultValue={data.state || ''} />
                  <Input name="postalCode" placeholder="Postal Code" defaultValue={data.postalCode || ''} />
                  <Input name="country" placeholder="Country" defaultValue={data.country || ''} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Emergency Contact Name</label>
                    <Input name="emergencyContactName" defaultValue={data.emergencyContactName || ''} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Emergency Contact Number</label>
                    <Input name="emergencyContactNumber" defaultValue={data.emergencyContactNumber || ''} />
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
              <form onSubmit={saveBankDetails} className="space-y-4">
                <h2 className="text-lg font-semibold mb-4">Bank & Tax Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Bank Name *</label>
                    <Input name="bankName" defaultValue={data.bankName || ''} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Account Number *</label>
                    <Input name="bankAccountNumber" defaultValue={data.bankAccountNumber || ''} required />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">IFSC Code *</label>
                    <Input name="bankIfscCode" defaultValue={data.bankIfscCode || ''} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">PAN Number *</label>
                    <Input name="taxId" defaultValue={data.taxId || ''} placeholder="ABCDE1234F" required />
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
                  <Card className={`p-4 border-2 ${data.photoUploaded ? 'border-green-500' : 'border-dashed border-surface-300'}`}>
                    <div className="flex items-center gap-3">
                      {data.photoUploaded ? <CheckCircle2 className="h-6 w-6 text-green-500" /> : <Upload className="h-6 w-6 text-surface-400" />}
                      <div>
                        <p className="font-medium">Passport Photo</p>
                        <p className="text-xs text-surface-500">{data.photoUploaded ? 'Uploaded' : 'Required'}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className={`p-4 border-2 ${data.idProofUploaded ? 'border-green-500' : 'border-dashed border-surface-300'}`}>
                    <div className="flex items-center gap-3">
                      {data.idProofUploaded ? <CheckCircle2 className="h-6 w-6 text-green-500" /> : <Upload className="h-6 w-6 text-surface-400" />}
                      <div>
                        <p className="font-medium">ID Proof</p>
                        <p className="text-xs text-surface-500">{data.idProofUploaded ? 'Uploaded' : 'Aadhar/Passport'}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className={`p-4 border-2 ${data.addressProofUploaded ? 'border-green-500' : 'border-dashed border-surface-300'}`}>
                    <div className="flex items-center gap-3">
                      {data.addressProofUploaded ? <CheckCircle2 className="h-6 w-6 text-green-500" /> : <Upload className="h-6 w-6 text-surface-400" />}
                      <div>
                        <p className="font-medium">Address Proof</p>
                        <p className="text-xs text-surface-500">{data.addressProofUploaded ? 'Uploaded' : 'Optional'}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className={`p-4 border-2 ${data.educationDocsUploaded ? 'border-green-500' : 'border-dashed border-surface-300'}`}>
                    <div className="flex items-center gap-3">
                      {data.educationDocsUploaded ? <CheckCircle2 className="h-6 w-6 text-green-500" /> : <Upload className="h-6 w-6 text-surface-400" />}
                      <div>
                        <p className="font-medium">Education Docs</p>
                        <p className="text-xs text-surface-500">{data.educationDocsUploaded ? 'Uploaded' : 'Degrees/Certificates'}</p>
                      </div>
                    </div>
                  </Card>
                </div>
                <p className="text-sm text-surface-500">Note: Document upload functionality will be integrated with file storage.</p>
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
                    <h3 className="text-xl font-bold text-surface-900 dark:text-surface-50">All Done!</h3>
                    <p className="text-surface-500 mt-2">You have completed your pre-boarding checklist. See you on {new Date(data.expectedJoiningDate).toLocaleDateString()}!</p>
                  </div>
                ) : (
                  <>
                    <Card className="p-4 bg-surface-50 dark:bg-surface-800/50">
                      <div className="flex items-start gap-3">
                        <FileText className="h-6 w-6 text-primary-500 mt-1" />
                        <div>
                          <p className="font-medium">Employment Offer Letter</p>
                          <p className="text-sm text-surface-500 mt-1">
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
