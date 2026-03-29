'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  FileText,
  Plus,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Truck,
  X,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import {
  Card,
  CardContent,
  Loading,
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  EmptyState,
} from '@/components/ui';
import { useAuth } from '@/lib/hooks/useAuth';
import { safeWindowOpen } from '@/lib/utils/url';
import {
  useMyDocumentRequests,
  useCreateDocumentRequest,
  useDocumentTypes,
} from '@/lib/hooks/queries';
import {
  DocumentRequestDto,
  DocumentType,
  DeliveryMode,
  DocumentRequestStatus,
} from '@/lib/types/selfservice';

// UI metadata for known document types. Used to enrich API-returned type values with
// human-readable labels and descriptions. If the backend introduces a new type that is
// not listed here, the UI will fall back to a formatted label derived from the enum value.
// TODO: Consider moving label/description to a backend endpoint when the API supports it.
const DOCUMENT_TYPE_META: Partial<Record<DocumentType, { label: string; description: string }>> = {
  EMPLOYMENT_CERTIFICATE: { label: 'Employment Certificate', description: 'Confirms your employment status' },
  SALARY_CERTIFICATE:     { label: 'Salary Certificate',     description: 'Shows your current salary details' },
  EXPERIENCE_LETTER:      { label: 'Experience Letter',      description: 'Details your work experience' },
  RELIEVING_LETTER:       { label: 'Relieving Letter',       description: 'Confirms employment termination' },
  BONAFIDE_CERTIFICATE:   { label: 'Bonafide Certificate',   description: 'Verifies you are an employee' },
  ADDRESS_PROOF_LETTER:   { label: 'Address Proof Letter',   description: 'Confirms your address on record' },
  VISA_LETTER:            { label: 'Visa Support Letter',    description: 'For visa application purposes' },
  BANK_LETTER:            { label: 'Bank Letter',            description: 'For bank account opening or loans' },
  SALARY_SLIP:            { label: 'Salary Slip',            description: 'Monthly salary breakdown' },
  FORM_16:                { label: 'Form 16',                description: 'Tax deduction certificate' },
  APPOINTMENT_LETTER_COPY:{ label: 'Appointment Letter Copy',description: 'Copy of your offer letter' },
  CUSTOM:                 { label: 'Custom Document',        description: 'Any other document on request' },
};

/** Converts an enum value like SALARY_SLIP to "Salary Slip" as a display fallback. */
function formatDocumentTypeLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const STATUS_CONFIG: Record<DocumentRequestStatus, { icon: React.ReactNode; color: string; bgColor: string }> = {
  PENDING: { icon: <Clock className="h-4 w-4" />, color: 'text-warning-600', bgColor: 'bg-warning-100 dark:bg-warning-900/30' },
  IN_PROGRESS: { icon: <AlertCircle className="h-4 w-4" />, color: 'text-info-600', bgColor: 'bg-info-100 dark:bg-info-900/30' },
  GENERATED: { icon: <CheckCircle className="h-4 w-4" />, color: 'text-success-600', bgColor: 'bg-success-100 dark:bg-success-900/30' },
  DELIVERED: { icon: <Truck className="h-4 w-4" />, color: 'text-accent-700', bgColor: 'bg-accent-100 dark:bg-accent-900/30' },
  REJECTED: { icon: <XCircle className="h-4 w-4" />, color: 'text-danger-600', bgColor: 'bg-danger-100 dark:bg-danger-900/30' },
  CANCELLED: { icon: <X className="h-4 w-4" />, color: 'text-[var(--text-muted)]', bgColor: 'bg-[var(--bg-secondary)]' },
};

// ─── Zod Schema ────────────────────────────────────────────────────────────────

const documentRequestSchema = z.object({
  documentType: z.enum([
    'EMPLOYMENT_CERTIFICATE', 'SALARY_CERTIFICATE', 'EXPERIENCE_LETTER',
    'RELIEVING_LETTER', 'BONAFIDE_CERTIFICATE', 'ADDRESS_PROOF_LETTER',
    'VISA_LETTER', 'BANK_LETTER', 'SALARY_SLIP', 'FORM_16', 'APPOINTMENT_LETTER_COPY',
    'CUSTOM',
  ]),
  purpose: z.string().min(1, 'Purpose is required'),
  addressedTo: z.string().optional(),
  requiredByDate: z.string().min(1, 'Required by date is required'),
  deliveryMode: z.enum(['DIGITAL', 'PHYSICAL', 'BOTH']),
  deliveryAddress: z.string().optional(),
  priority: z.number({ coerce: true }).int().min(1).max(3),
});

type DocumentRequestFormData = z.infer<typeof documentRequestSchema>;

export default function MyDocumentsPage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuth();
  const [showModal, setShowModal] = useState(false);

  const defaultValues: DocumentRequestFormData = {
    documentType: 'EMPLOYMENT_CERTIFICATE',
    purpose: '',
    addressedTo: '',
    requiredByDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    deliveryMode: 'DIGITAL',
    deliveryAddress: '',
    priority: 2,
  };

  const {
    register,
    handleSubmit: rhfHandleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<DocumentRequestFormData>({
    resolver: zodResolver(documentRequestSchema),
    defaultValues,
  });

  const watchedDocumentType = watch('documentType');
  const watchedDeliveryMode = watch('deliveryMode');

  // React Query hooks
  const { data: documentTypeValues } = useDocumentTypes();

  // Enrich API-returned type values with UI labels/descriptions.
  // Falls back to a formatted label for any type not present in DOCUMENT_TYPE_META,
  // so newly added backend types are always surfaced in the select.
  const documentTypeOptions: { value: DocumentType; label: string; description: string }[] =
    (documentTypeValues ?? []).map((value) => ({
      value,
      label: DOCUMENT_TYPE_META[value]?.label ?? formatDocumentTypeLabel(value),
      description: DOCUMENT_TYPE_META[value]?.description ?? '',
    }));

  const { data: requestsData, isLoading } = useMyDocumentRequests(
    user?.employeeId || '',
    0,
    100,
    hasHydrated && !!user?.employeeId
  );

  const createMutation = useCreateDocumentRequest();
  const requests = requestsData?.content ?? [];

  useEffect(() => {
    if (hasHydrated && !user) {
      router.push('/auth/login');
    }
  }, [hasHydrated, user, router]);

  const onSubmit = async (data: DocumentRequestFormData) => {
    if (!user?.employeeId) return;

    const payload: DocumentRequestDto = {
      documentType: data.documentType as DocumentType,
      purpose: data.purpose,
      addressedTo: data.addressedTo || '',
      requiredByDate: data.requiredByDate,
      deliveryMode: data.deliveryMode as DeliveryMode,
      deliveryAddress: data.deliveryAddress || '',
      priority: data.priority,
    };

    await createMutation.mutateAsync({ employeeId: user.employeeId, data: payload });
    setShowModal(false);
    reset(defaultValues);
  };

  const handleModalClose = () => {
    setShowModal(false);
    reset(defaultValues);
  };

  if (!hasHydrated || isLoading) {
    return (
      <AppLayout
        activeMenuItem="my-documents"
        breadcrumbs={[
          { label: 'My Dashboard', href: '/me/dashboard' },
          { label: 'Documents', href: '/me/documents' },
        ]}
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <Loading />
        </div>
      </AppLayout>
    );
  }

  if (!user?.employeeId) {
    return (
      <AppLayout
        activeMenuItem="my-documents"
        breadcrumbs={[
          { label: 'My Dashboard', href: '/me/dashboard' },
          { label: 'Documents', href: '/me/documents' },
        ]}
      >
        <div className="text-center py-12">
          <FileText className="h-16 w-16 mx-auto text-[var(--text-muted)] dark:text-[var(--text-secondary)] mb-4" />
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">No Employee Profile Linked</h2>
          <p className="text-[var(--text-muted)] max-w-md mx-auto">
            Document requests require an employee profile. Use the admin panels to manage employee documents.
          </p>
          <button
            onClick={() => router.push('/documents')}
            className="mt-6 px-4 py-2 bg-accent-700 text-white rounded-lg hover:bg-accent-700 transition-colors"
          >
            Go to Document Management
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      activeMenuItem="my-documents"
      breadcrumbs={[
        { label: 'My Dashboard', href: '/me/dashboard' },
        { label: 'Documents', href: '/me/documents' },
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
              Document Requests
            </h1>
            <p className="text-[var(--text-muted)] mt-1 skeuo-deboss">
              Request official documents and track their status
            </p>
          </div>
          <Button onClick={() => setShowModal(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Request Document
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card padding="md" className="card-aura">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-warning-100 dark:bg-warning-900/30 text-warning-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {requests.filter((r) => r.status === 'PENDING').length}
                </p>
                <p className="text-sm text-[var(--text-muted)]">Pending</p>
              </div>
            </div>
          </Card>
          <Card padding="md" className="card-aura">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-info-100 dark:bg-info-900/30 text-info-600">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {requests.filter((r) => r.status === 'IN_PROGRESS').length}
                </p>
                <p className="text-sm text-[var(--text-muted)]">In Progress</p>
              </div>
            </div>
          </Card>
          <Card padding="md" className="card-aura">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-success-100 dark:bg-success-900/30 text-success-600">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {requests.filter((r) => r.status === 'GENERATED' || r.status === 'DELIVERED').length}
                </p>
                <p className="text-sm text-[var(--text-muted)]">Ready</p>
              </div>
            </div>
          </Card>
          <Card padding="md" className="card-aura">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {requests.length}
                </p>
                <p className="text-sm text-[var(--text-muted)]">Total</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Request List */}
        {requests.length === 0 ? (
          <EmptyState
            title="You haven't requested any documents yet"
            icon={<FileText className="h-12 w-12" />}
          />
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <Card key={request.id} hover className="card-aura">
                <CardContent>
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Icon and Status */}
                    <div className={`p-4 rounded-lg ${STATUS_CONFIG[request.status].bgColor}`}>
                      <FileText className={`h-6 w-6 ${STATUS_CONFIG[request.status].color}`} />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <h3 className="font-semibold text-[var(--text-primary)]">
                          {request.documentTypeDisplayName}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className={`badge-status gap-1.5 ${
                            request.status === 'PENDING' ? 'status-warning'
                            : request.status === 'IN_PROGRESS' ? 'status-info'
                            : request.status === 'GENERATED' || request.status === 'DELIVERED' ? 'status-success'
                            : request.status === 'REJECTED' ? 'status-danger'
                            : 'status-neutral'
                          }`}>
                            {STATUS_CONFIG[request.status].icon}
                            {request.statusDisplayName}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-[var(--text-secondary)] mt-1">
                        {request.purpose}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-sm text-[var(--text-muted)]">
                        <span>
                          Requested: {format(new Date(request.createdAt), 'MMM d, yyyy')}
                        </span>
                        <span>
                          Required by: {format(new Date(request.requiredByDate), 'MMM d, yyyy')}
                        </span>
                        <span className="capitalize">
                          Delivery: {request.deliveryMode.toLowerCase()}
                        </span>
                      </div>

                      {request.rejectionReason && (
                        <div className="mt-3 p-4 rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800">
                          <p className="text-sm text-danger-700 dark:text-danger-400">
                            <strong>Rejection Reason:</strong> {request.rejectionReason}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {(request.status === 'GENERATED' || request.status === 'DELIVERED') &&
                      request.generatedDocumentUrl && (
                        <div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => safeWindowOpen(request.generatedDocumentUrl, '_blank')}
                            className="flex items-center gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </Button>
                        </div>
                      )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Request Modal */}
        <Modal isOpen={showModal} onClose={handleModalClose} size="lg">
          <ModalHeader>
            <h2 className="text-xl font-semibold">Request Document</h2>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              {/* Document Type */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Document Type *
                </label>
                <select
                  {...register('documentType')}
                  className="input-aura w-full px-4 py-2 rounded-lg"
                >
                  {documentTypeOptions.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {documentTypeOptions.find((t) => t.value === watchedDocumentType)?.description}
                </p>
              </div>

              {/* Purpose */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Purpose *
                </label>
                <textarea
                  {...register('purpose')}
                  placeholder="Why do you need this document?"
                  rows={3}
                  className={`input-aura w-full px-4 py-2 rounded-lg ${errors.purpose ? 'border-danger-500' : ''}`}
                />
                {errors.purpose && (
                  <p className="mt-1 text-xs text-danger-500">{errors.purpose.message}</p>
                )}
              </div>

              {/* Addressed To */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Addressed To (Optional)
                </label>
                <input
                  type="text"
                  {...register('addressedTo')}
                  placeholder="e.g., Immigration Department, Bank Name"
                  className="input-aura w-full px-4 py-2 rounded-lg"
                />
              </div>

              {/* Required By Date */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Required By *
                </label>
                <input
                  type="date"
                  {...register('requiredByDate')}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className={`input-aura w-full px-4 py-2 rounded-lg ${errors.requiredByDate ? 'border-danger-500' : ''}`}
                />
                {errors.requiredByDate && (
                  <p className="mt-1 text-xs text-danger-500">{errors.requiredByDate.message}</p>
                )}
              </div>

              {/* Delivery Mode */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Delivery Mode *
                </label>
                <div className="flex gap-4">
                  {(['DIGITAL', 'PHYSICAL', 'BOTH'] as DeliveryMode[]).map((mode) => (
                    <label key={mode} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        {...register('deliveryMode')}
                        value={mode}
                        className="text-accent-700"
                      />
                      <span className="text-sm text-[var(--text-secondary)] capitalize">
                        {mode.toLowerCase()}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Delivery Address - only for physical delivery */}
              {(watchedDeliveryMode === 'PHYSICAL' || watchedDeliveryMode === 'BOTH') && (
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Delivery Address *
                  </label>
                  <textarea
                    {...register('deliveryAddress')}
                    placeholder="Enter delivery address"
                    rows={2}
                    className="input-aura w-full px-4 py-2 rounded-lg"
                  />
                </div>
              )}

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Priority
                </label>
                <select
                  {...register('priority', { valueAsNumber: true })}
                  className="input-aura w-full px-4 py-2 rounded-lg"
                >
                  <option value={1}>High - Urgent</option>
                  <option value={2}>Normal</option>
                  <option value={3}>Low - No rush</option>
                </select>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={handleModalClose}>
              Cancel
            </Button>
            <Button
              onClick={rhfHandleSubmit(onSubmit)}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
          </ModalFooter>
        </Modal>
      </div>
    </AppLayout>
  );
}
