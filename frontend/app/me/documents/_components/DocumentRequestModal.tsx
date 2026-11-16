'use client';

import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {format} from 'date-fns';
import {NativeSelect, Radio, Textarea, TextInput} from '@mantine/core';
import {Button, Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui';
import type {DeliveryMode, DocumentRequestDto, DocumentType} from '@/lib/types/hrms/selfservice';

// UI metadata for known document types. Used to enrich API-returned type values with
// human-readable labels and descriptions. If the backend introduces a new type that is
// not listed here, the UI will fall back to a formatted label derived from the enum value.
// FUTURE: NUAURA-001 — Consider moving label/description to a backend endpoint when the API supports it.
const DOCUMENT_TYPE_META: Partial<Record<DocumentType, { label: string; description: string }>> = {
  EMPLOYMENT_CERTIFICATE: {label: 'Employment Certificate', description: 'Confirms your employment status'},
  SALARY_CERTIFICATE: {label: 'Salary Certificate', description: 'Shows your current salary details'},
  EXPERIENCE_LETTER: {label: 'Experience Letter', description: 'Details your work experience'},
  RELIEVING_LETTER: {label: 'Relieving Letter', description: 'Confirms employment termination'},
  BONAFIDE_CERTIFICATE: {label: 'Bonafide Certificate', description: 'Verifies you are an employee'},
  ADDRESS_PROOF_LETTER: {label: 'Address Proof Letter', description: 'Confirms your address on record'},
  VISA_LETTER: {label: 'Visa Support Letter', description: 'For visa application purposes'},
  BANK_LETTER: {label: 'Bank Letter', description: 'For bank account opening or loans'},
  SALARY_SLIP: {label: 'Salary Slip', description: 'Monthly salary breakdown'},
  FORM_16: {label: 'Form 16', description: 'Tax deduction certificate'},
  APPOINTMENT_LETTER_COPY: {label: 'Appointment Letter Copy', description: 'Copy of your offer letter'},
  CUSTOM: {label: 'Custom Document', description: 'Any other document on request'},
};

/** Converts an enum value like SALARY_SLIP to "Salary Slip" as a display fallback. */
function formatDocumentTypeLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

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
  priority: z.coerce.number().int().min(1).max(3),
});

export type DocumentRequestFormData = z.infer<typeof documentRequestSchema>;

const buildDefaultValues = (): DocumentRequestFormData => ({
  documentType: 'EMPLOYMENT_CERTIFICATE',
  purpose: '',
  addressedTo: '',
  requiredByDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
  deliveryMode: 'DIGITAL',
  deliveryAddress: '',
  priority: 2,
});

interface DocumentRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTypeValues: DocumentType[] | undefined;
  isSubmitting: boolean;
  /** Resolves when the request was created; rejects (already toasted globally) otherwise. */
  onSubmit: (payload: DocumentRequestDto) => Promise<void>;
}

export function DocumentRequestModal({isOpen, onClose, documentTypeValues, isSubmitting, onSubmit}: DocumentRequestModalProps) {
  const {register, handleSubmit, watch, reset, setValue, formState: {errors}} = useForm<DocumentRequestFormData>({
    resolver: zodResolver(documentRequestSchema),
    defaultValues: buildDefaultValues(),
  });

  const watchedDocumentType = watch('documentType');
  const watchedDeliveryMode = watch('deliveryMode');

  // Falls back to a formatted label for any type not present in DOCUMENT_TYPE_META,
  // so newly added backend types are always surfaced in the select.
  const documentTypeOptions = (documentTypeValues ?? []).map((value) => ({
    value,
    label: DOCUMENT_TYPE_META[value]?.label ?? formatDocumentTypeLabel(value),
    description: DOCUMENT_TYPE_META[value]?.description ?? '',
  }));

  const handleClose = () => {
    onClose();
    reset(buildDefaultValues());
  };

  const submit = async (data: DocumentRequestFormData) => {
    try {
      await onSubmit({
        documentType: data.documentType as DocumentType,
        purpose: data.purpose,
        addressedTo: data.addressedTo || '',
        requiredByDate: data.requiredByDate,
        deliveryMode: data.deliveryMode as DeliveryMode,
        deliveryAddress: data.deliveryAddress || '',
        priority: data.priority,
      });
      handleClose();
    } catch {
      // The global MutationCache handler shows the error toast.
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalHeader onClose={handleClose}>
        <h2 className="text-xl font-semibold text-text-1">Request Document</h2>
      </ModalHeader>
      <ModalBody>
        <form id="me-documents-form" onSubmit={handleSubmit(submit)} noValidate className="flex flex-col gap-4">
          <NativeSelect
            id="me-documents-type"
            label="Document Type"
            withAsterisk
            description={documentTypeOptions.find((t) => t.value === watchedDocumentType)?.description}
            inputWrapperOrder={['label', 'input', 'description', 'error']}
            data={documentTypeOptions.map((type) => ({value: type.value, label: type.label}))}
            {...register('documentType')}
          />

          <Textarea
            id="me-documents-purpose"
            label="Purpose"
            withAsterisk
            placeholder="Why do you need this document?"
            rows={3}
            error={errors.purpose?.message}
            {...register('purpose')}
          />

          <TextInput
            id="me-documents-addressed-to"
            label="Addressed To"
            placeholder="e.g., Immigration Department, Bank Name"
            {...register('addressedTo')}
          />

          <TextInput
            id="me-documents-required-by"
            type="date"
            label="Required By"
            withAsterisk
            min={format(new Date(), 'yyyy-MM-dd')}
            error={errors.requiredByDate?.message}
            {...register('requiredByDate')}
          />

          <Radio.Group
            label="Delivery Mode"
            withAsterisk
            value={watchedDeliveryMode}
            onChange={(value) => setValue('deliveryMode', value as DeliveryMode, {shouldDirty: true})}
          >
            <div className="mt-2 flex gap-4">
              {(['DIGITAL', 'PHYSICAL', 'BOTH'] as DeliveryMode[]).map((mode) => (
                <Radio
                  key={mode}
                  value={mode}
                  label={mode.charAt(0) + mode.slice(1).toLowerCase()}
                />
              ))}
            </div>
          </Radio.Group>

          {(watchedDeliveryMode === 'PHYSICAL' || watchedDeliveryMode === 'BOTH') && (
            <Textarea
              id="me-documents-delivery-address"
              label="Delivery Address"
              withAsterisk
              placeholder="Enter delivery address"
              rows={2}
              {...register('deliveryAddress')}
            />
          )}

          <NativeSelect
            id="me-documents-priority"
            label="Priority"
            data={[
              {value: '1', label: 'High - Urgent'},
              {value: '2', label: 'Normal'},
              {value: '3', label: 'Low - No rush'},
            ]}
            {...register('priority', {valueAsNumber: true})}
          />
        </form>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        <Button type="submit" form="me-documents-form" isLoading={isSubmitting} loadingText="Submitting...">
          Submit Request
        </Button>
      </ModalFooter>
    </Modal>
  );
}
