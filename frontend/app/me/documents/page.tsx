'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  Badge,
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  EmptyState,
} from '@/components/ui';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  useMyDocumentRequests,
  useCreateDocumentRequest,
  useCompleteDocumentRequest,
  useMarkDocumentDelivered,
  useRejectDocumentRequest,
} from '@/lib/hooks/queries';
import {
  DocumentRequestResponse,
  DocumentRequestDto,
  DocumentType,
  DeliveryMode,
  DocumentRequestStatus,
} from '@/lib/types/selfservice';

const DOCUMENT_TYPES: { value: DocumentType; label: string; description: string }[] = [
  { value: 'EMPLOYMENT_CERTIFICATE', label: 'Employment Certificate', description: 'Confirms your employment status' },
  { value: 'SALARY_CERTIFICATE', label: 'Salary Certificate', description: 'Shows your current salary details' },
  { value: 'EXPERIENCE_LETTER', label: 'Experience Letter', description: 'Details your work experience' },
  { value: 'RELIEVING_LETTER', label: 'Relieving Letter', description: 'Confirms employment termination' },
  { value: 'BONAFIDE_CERTIFICATE', label: 'Bonafide Certificate', description: 'Verifies you are an employee' },
  { value: 'ADDRESS_PROOF_LETTER', label: 'Address Proof Letter', description: 'Confirms your address on record' },
  { value: 'VISA_LETTER', label: 'Visa Support Letter', description: 'For visa application purposes' },
  { value: 'BANK_LETTER', label: 'Bank Letter', description: 'For bank account opening or loans' },
  { value: 'SALARY_SLIP', label: 'Salary Slip', description: 'Monthly salary breakdown' },
  { value: 'FORM_16', label: 'Form 16', description: 'Tax deduction certificate' },
  { value: 'APPOINTMENT_LETTER_COPY', label: 'Appointment Letter Copy', description: 'Copy of your offer letter' },
];

const STATUS_CONFIG: Record<DocumentRequestStatus, { icon: React.ReactNode; color: string; bgColor: string }> = {
  PENDING: { icon: <Clock className="h-4 w-4" />, color: 'text-warning-600', bgColor: 'bg-warning-100 dark:bg-warning-900/30' },
  IN_PROGRESS: { icon: <AlertCircle className="h-4 w-4" />, color: 'text-info-600', bgColor: 'bg-info-100 dark:bg-info-900/30' },
  GENERATED: { icon: <CheckCircle className="h-4 w-4" />, color: 'text-success-600', bgColor: 'bg-success-100 dark:bg-success-900/30' },
  DELIVERED: { icon: <Truck className="h-4 w-4" />, color: 'text-primary-600', bgColor: 'bg-primary-100 dark:bg-primary-900/30' },
  REJECTED: { icon: <XCircle className="h-4 w-4" />, color: 'text-danger-600', bgColor: 'bg-danger-100 dark:bg-danger-900/30' },
  CANCELLED: { icon: <X className="h-4 w-4" />, color: 'text-[var(--text-muted)]', bgColor: 'bg-[var(--bg-secondary)]' },
};

export default function MyDocumentsPage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuth();
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState<DocumentRequestDto>({
    documentType: 'EMPLOYMENT_CERTIFICATE',
    purpose: '',
    addressedTo: '',
    requiredByDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    deliveryMode: 'DIGITAL',
    deliveryAddress: '',
    priority: 2,
  });

  // React Query hooks
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

  const handleSubmit = async () => {
    if (!user?.employeeId || !formData.purpose) return;

    try {
      await createMutation.mutateAsync({
        employeeId: user.employeeId,
        data: formData,
      });
      setShowModal(false);
      setFormData({
        documentType: 'EMPLOYMENT_CERTIFICATE',
        purpose: '',
        addressedTo: '',
        requiredByDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        deliveryMode: 'DIGITAL',
        deliveryAddress: '',
        priority: 2,
      });
    } catch (error) {
      console.error('Failed to create document request:', error);
    }
  };

  if (!hasHydrated || isLoading) {
    return (
      <AppLayout
        activeMenuItem="profile"
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
        activeMenuItem="profile"
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
            className="mt-6 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Go to Document Management
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      activeMenuItem="profile"
      breadcrumbs={[
        { label: 'My Dashboard', href: '/me/dashboard' },
        { label: 'Documents', href: '/me/documents' },
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Document Requests
            </h1>
            <p className="text-[var(--text-muted)] mt-1">
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
          <Card padding="md">
            <div className="flex items-center gap-3">
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
          <Card padding="md">
            <div className="flex items-center gap-3">
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
          <Card padding="md">
            <div className="flex items-center gap-3">
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
          <Card padding="md">
            <div className="flex items-center gap-3">
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
              <Card key={request.id} hover>
                <CardContent>
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Icon and Status */}
                    <div className={`p-3 rounded-lg ${STATUS_CONFIG[request.status].bgColor}`}>
                      <FileText className={`h-6 w-6 ${STATUS_CONFIG[request.status].color}`} />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <h3 className="font-semibold text-[var(--text-primary)]">
                          {request.documentTypeDisplayName}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[request.status].bgColor} ${STATUS_CONFIG[request.status].color}`}>
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
                        <div className="mt-3 p-3 rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800">
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
                            onClick={() => window.open(request.generatedDocumentUrl, '_blank')}
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
        <Modal isOpen={showModal} onClose={() => setShowModal(false)} size="lg">
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
                  value={formData.documentType}
                  onChange={(e) =>
                    setFormData({ ...formData, documentType: e.target.value as DocumentType })
                  }
                  className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg bg-[var(--bg-input)] text-[var(--text-primary)]"
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {DOCUMENT_TYPES.find((t) => t.value === formData.documentType)?.description}
                </p>
              </div>

              {/* Purpose */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Purpose *
                </label>
                <textarea
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="Why do you need this document?"
                  rows={3}
                  className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg bg-[var(--bg-input)] text-[var(--text-primary)]"
                />
              </div>

              {/* Addressed To */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Addressed To (Optional)
                </label>
                <input
                  type="text"
                  value={formData.addressedTo}
                  onChange={(e) => setFormData({ ...formData, addressedTo: e.target.value })}
                  placeholder="e.g., Immigration Department, Bank Name"
                  className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg bg-[var(--bg-input)] text-[var(--text-primary)]"
                />
              </div>

              {/* Required By Date */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Required By *
                </label>
                <input
                  type="date"
                  value={formData.requiredByDate}
                  onChange={(e) => setFormData({ ...formData, requiredByDate: e.target.value })}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg bg-[var(--bg-input)] text-[var(--text-primary)]"
                />
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
                        name="deliveryMode"
                        value={mode}
                        checked={formData.deliveryMode === mode}
                        onChange={(e) =>
                          setFormData({ ...formData, deliveryMode: e.target.value as DeliveryMode })
                        }
                        className="text-primary-600"
                      />
                      <span className="text-sm text-[var(--text-secondary)] capitalize">
                        {mode.toLowerCase()}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Delivery Address - only for physical delivery */}
              {(formData.deliveryMode === 'PHYSICAL' || formData.deliveryMode === 'BOTH') && (
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Delivery Address *
                  </label>
                  <textarea
                    value={formData.deliveryAddress}
                    onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                    placeholder="Enter delivery address"
                    rows={2}
                    className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg bg-[var(--bg-input)] text-[var(--text-primary)]"
                  />
                </div>
              )}

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg bg-[var(--bg-input)] text-[var(--text-primary)]"
                >
                  <option value={1}>High - Urgent</option>
                  <option value={2}>Normal</option>
                  <option value={3}>Low - No rush</option>
                </select>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || !formData.purpose}
            >
              {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
          </ModalFooter>
        </Modal>
      </div>
    </AppLayout>
  );
}
