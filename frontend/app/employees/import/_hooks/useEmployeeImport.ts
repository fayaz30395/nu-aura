'use client';

import {useRef, useState} from 'react';
import {employeeService} from '@/lib/services/hrms/employee.service';
import type {EmployeeImportPreview, EmployeeImportResult} from '@/lib/types/hrms/employee';

export type ImportStep = 'upload' | 'preview' | 'result';

const VALID_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
const VALID_EXTENSIONS = ['.csv', '.xls', '.xlsx'];
const MAX_FILE_BYTES = 10 * 1024 * 1024;

function apiMessage(err: unknown, fallback: string): string {
  return (err as {response?: {data?: {message?: string}}})?.response?.data?.message || fallback;
}

/** Upload → preview → execute state machine for the bulk employee import. */
export function useEmployeeImport() {
  const resetFileRef = useRef<() => void>(null);

  const [step, setStep] = useState<ImportStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<EmployeeImportPreview | null>(null);
  const [result, setResult] = useState<EmployeeImportResult | null>(null);
  const [skipInvalid, setSkipInvalid] = useState(true);

  const selectFile = (file: File | null) => {
    if (!file) return;
    const hasValidExtension = VALID_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!VALID_TYPES.includes(file.type) && !hasValidExtension) {
      setError('Please upload a CSV or Excel file');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError('File size must be under 10MB');
      return;
    }
    setSelectedFile(file);
    setError(null);
  };

  const clearFile = () => {
    setSelectedFile(null);
    resetFileRef.current?.();
  };

  const downloadTemplate = async (type: 'csv' | 'xlsx') => {
    try {
      setLoading(true);
      const blob =
        type === 'csv'
          ? await employeeService.downloadCsvTemplate()
          : await employeeService.downloadExcelTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `employee_import_template.${type}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      setError(apiMessage(err, `Failed to download ${type.toUpperCase()} template`));
    } finally {
      setLoading(false);
    }
  };

  const runPreview = async () => {
    if (!selectedFile) return;
    try {
      setLoading(true);
      setError(null);
      setPreview(await employeeService.previewImport(selectedFile));
      setStep('preview');
    } catch (err: unknown) {
      setError(apiMessage(err, 'Failed to preview import file'));
    } finally {
      setLoading(false);
    }
  };

  const executeImport = async () => {
    if (!selectedFile) return;
    try {
      setLoading(true);
      setError(null);
      setResult(await employeeService.executeImport(selectedFile, skipInvalid));
      setStep('result');
    } catch (err: unknown) {
      setError(apiMessage(err, 'Failed to execute import'));
    } finally {
      setLoading(false);
    }
  };

  const resetImport = () => {
    setStep('upload');
    setPreview(null);
    setResult(null);
    setError(null);
    clearFile();
  };

  return {
    step,
    selectedFile,
    loading,
    error,
    preview,
    result,
    skipInvalid,
    setSkipInvalid,
    resetFileRef,
    selectFile,
    clearFile,
    downloadTemplate,
    runPreview,
    executeImport,
    resetImport,
  };
}
