'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Roles, usePermissions} from '@/lib/hooks/usePermissions';
import {useAuth} from '@/lib/hooks/useAuth';
import {Badge, Button, Stepper, Table} from '@mantine/core';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  MapPin,
  Settings,
  Upload,
  XCircle,
} from 'lucide-react';
import {AdminPageContent} from '@/components/layout';
import {
  KEKA_COLUMN_PRESETS,
  KekaImportMapping,
  KekaImportPreview,
  KekaImportResult,
} from '@/lib/types/core/keka-import';
import {kekaImportService} from '@/lib/services/core/keka-import.service';
import {
  useKekaDownloadErrorReport,
  useKekaExecuteImport,
  useKekaFileUpload,
  useKekaImportPreview,
} from '@/lib/hooks/queries/useKekaImport';

const ADMIN_ACCESS_ROLES = [Roles.SUPER_ADMIN, Roles.TENANT_ADMIN, Roles.HR_ADMIN, Roles.HR_MANAGER];

type ImportStep = 'upload' | 'mapping' | 'preview' | 'import' | 'result';

interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  matched: boolean;
  confidence?: number;
}

export default function KekaImportPage() {
  const router = useRouter();
  const {hasAnyRole, isReady} = usePermissions();
  const {hasHydrated, isAuthenticated} = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // DEF-59: RBAC gate — import is a destructive operation requiring admin access
  useEffect(() => {
    if (!hasHydrated || !isReady) return;
    if (!isAuthenticated) {
      router.replace('/auth/login');
      return;
    }
    if (!hasAnyRole(...ADMIN_ACCESS_ROLES)) {
      router.replace('/me/dashboard');
    }
  }, [hasHydrated, isReady, isAuthenticated, router, hasAnyRole]);

  // State management
  const [step, setStep] = useState<ImportStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [_detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [preview, setPreview] = useState<KekaImportPreview | null>(null);
  const [result, setResult] = useState<KekaImportResult | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);

  // Import options
  const [skipInvalidRows, setSkipInvalidRows] = useState(true);
  const [updateExistingEmployees, setUpdateExistingEmployees] = useState(false);
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(false);
  const [autoApproveEmployees, setAutoApproveEmployees] = useState(false);

  // React Query hooks
  const uploadMutation = useKekaFileUpload();
  const previewMutation = useKekaImportPreview();
  const executeMutation = useKekaExecuteImport();
  const errorReportMutation = useKekaDownloadErrorReport();

  // Drag handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
    // handleFileSelect is defined below; it only processes its File argument
    // (no external state closures that change), so this stale ref is safe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // File selection
  const handleFileSelect = async (file: File) => {
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    const validExtensions = ['.csv', '.xls', '.xlsx'];
    const hasValidExtension = validExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!validTypes.includes(file.type) && !hasValidExtension) {
      setError('Please upload a CSV or Excel file');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50MB');
      return;
    }

    setSelectedFile(file);
    setError(null);

    try {
      const uploadResponse = await uploadMutation.mutateAsync(file);
      setFileId(uploadResponse.fileId);
      setDetectedColumns(uploadResponse.detectedColumns);

      // Auto-generate mappings from suggestions
      const suggestions = kekaImportService.getFieldMappingSuggestions(
        uploadResponse.detectedColumns
      );
      const initialMappings: ColumnMapping[] = uploadResponse.detectedColumns.map(
        (col) => {
          const suggestion = suggestions.find((s) => s.sourceColumn === col);
          return {
            sourceColumn: col,
            targetField: suggestion?.targetField || '',
            matched: !!suggestion,
            confidence: suggestion?.confidence,
          };
        }
      );
      setColumnMappings(initialMappings);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to upload file. Please try again.';
      setError(errorMessage);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  // Download template
  const downloadTemplate = async (format: 'csv' | 'xlsx') => {
    try {
      setError(null);
      const blob = await kekaImportService.downloadKekaTemplate(format);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `keka_import_template.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : `Failed to download ${format.toUpperCase()} template`;
      setError(errorMessage);
    }
  };

  // Preview import
  const handlePreview = async () => {
    if (!fileId) return;

    const validMappings = columnMappings.filter(
      (m) => m.targetField && m.matched
    );

    if (validMappings.length === 0) {
      setError('Please map at least one column');
      return;
    }

    try {
      setError(null);
      const mappingData: KekaImportMapping[] = validMappings.map((m) => ({
        sourceColumn: m.sourceColumn,
        targetField: m.targetField as keyof import('@/lib/types/core/keka-import').KekaEmployee,
        transform: 'NONE',
      }));

      const previewData = await previewMutation.mutateAsync({
        fileId,
        mappings: mappingData,
      });

      setPreview(previewData);
      setStep('preview');
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to preview import. Please check your mappings.';
      setError(errorMessage);
    }
  };

  // Execute import
  const handleExecuteImport = async () => {
    if (!fileId || !preview) return;

    const validMappings = columnMappings.filter(
      (m) => m.targetField && m.matched
    );

    try {
      setError(null);
      const mappingData: KekaImportMapping[] = validMappings.map((m) => ({
        sourceColumn: m.sourceColumn,
        targetField: m.targetField as keyof import('@/lib/types/core/keka-import').KekaEmployee,
        transform: 'NONE',
      }));

      const importResult = await executeMutation.mutateAsync({
        fileId,
        mappings: mappingData,
        options: {
          skipInvalidRows,
          updateExistingEmployees,
          sendWelcomeEmail,
          autoApproveEmployees,
        },
      });

      setResult(importResult);
      setStep('result');
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to execute import. Please try again.';
      setError(errorMessage);
    }
  };

  // Download error report
  const handleDownloadErrorReport = async () => {
    if (!result) return;

    try {
      const blob = await errorReportMutation.mutateAsync(result.importId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `keka-import-errors-${result.importId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to download error report';
      setError(errorMessage);
    }
  };

  // Reset import
  const resetImport = () => {
    setStep('upload');
    setSelectedFile(null);
    setFileId(null);
    setDetectedColumns([]);
    setColumnMappings([]);
    setPreview(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Update mapping
  const updateMapping = (sourceColumn: string, targetField: string) => {
    setColumnMappings((prev) =>
      prev.map((m) =>
        m.sourceColumn === sourceColumn
          ? {
            ...m,
            targetField,
            matched: !!targetField,
          }
          : m
      )
    );
  };

  const isLoading =
    uploadMutation.isPending ||
    previewMutation.isPending ||
    executeMutation.isPending;

  const unmappedColumns = columnMappings.filter((m) => !m.targetField);

  return (
    <AdminPageContent>
      <div className="min-h-screen bg-[var(--bg-secondary)]">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/admin')}
              className="flex items-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)] mb-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2"/>
              Back to Admin
            </button>
            <h1 className="text-2xl font-bold skeuo-emboss">
              KEKA Data Import
            </h1>
            <p className="text-[var(--text-secondary)] mt-2 skeuo-deboss">
              Migrate employees and related data from KEKA HRMS into NU-AURA
            </p>
          </div>

          {/* Progress Stepper */}
          <div className="mb-8 skeuo-card p-6">
            <Stepper active={['upload', 'mapping', 'preview', 'import', 'result'].indexOf(step)}>
              <Stepper.Step label="Upload" description="Select KEKA export file"/>
              <Stepper.Step label="Mapping" description="Map columns"/>
              <Stepper.Step label="Preview" description="Validate data"/>
              <Stepper.Step label="Import" description="Execute import"/>
              <Stepper.Step label="Result" description="View results"/>
            </Stepper>
          </div>

          {/* Error Alert */}
          {error && (
            <div
              className="mb-6 p-4 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-danger-600 dark:text-danger-400 mr-4 flex-shrink-0 mt-0.5"/>
              <div className="flex-1">
                <p className="text-danger-800 dark:text-danger-100 font-medium">Error</p>
                <p className="text-danger-700 dark:text-danger-200 text-sm mt-1">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-danger-600 dark:text-danger-400 hover:text-danger-800 dark:hover:text-danger-200 ml-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                aria-label="Close error message"
              >
                ×
              </button>
            </div>
          )}

          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="skeuo-card p-6 space-y-6">
              {/* Download Templates */}
              <div>
                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-4 flex items-center">
                  <Download className="w-5 h-5 mr-2"/>
                  Download Template
                </h3>
                <p className="text-body-secondary mb-4">
                  Download a template file to see the required format for KEKA data export.
                </p>
                <div className="flex gap-4 flex-wrap">
                  <Button
                    onClick={() => downloadTemplate('csv')}
                    variant="light"
                    leftSection={<FileText className="w-4 h-4"/>}
                  >
                    CSV Template
                  </Button>
                  <Button
                    onClick={() => downloadTemplate('xlsx')}
                    variant="light"
                    leftSection={<FileSpreadsheet className="w-4 h-4"/>}
                  >
                    Excel Template
                  </Button>
                </div>
              </div>

              {/* Instructions */}
              <div
                className="bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-800 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-accent-900 dark:text-accent-100 mb-2">
                  How to export from KEKA:
                </h4>
                <ol className="text-sm text-accent-800 dark:text-accent-200 space-y-1 list-decimal list-inside">
                  <li>Log in to KEKA HRMS</li>
                  <li>Go to Employees &gt; Employee List</li>
                  <li>Click Export to CSV or Excel</li>
                  <li>Upload the file below</li>
                </ol>
              </div>

              {/* File Upload */}
              <div>
                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-4 flex items-center">
                  <Upload className="w-5 h-5 mr-2"/>
                  Upload File
                </h3>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive
                      ? 'border-accent-500 bg-accent-50 dark:bg-accent-950/30'
                      : selectedFile
                        ? 'border-success-500 bg-success-50 dark:bg-success-900/20'
                        : 'border-[var(--border-main)] dark:border-[var(--border-main)] hover:border-[var(--border-main)]'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xls,.xlsx"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />

                  {selectedFile ? (
                    <div className="flex flex-col items-center">
                      <CheckCircle className="w-12 h-12 text-success-500 mb-4"/>
                      <p className="text-lg font-medium text-[var(--text-primary)]">
                        {selectedFile.name}
                      </p>
                      <p className="text-body-muted">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                      <Button
                        variant="subtle"
                        color="red"
                        size="xs"
                        onClick={() => {
                          setSelectedFile(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                        className="mt-4"
                      >
                        Remove file
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className="w-12 h-12 text-[var(--text-muted)] mb-4"/>
                      <p className="text-lg font-medium text-[var(--text-primary)] mb-1">
                        Drag and drop your file here
                      </p>
                      <p className="text-body-muted mb-4">
                        or
                      </p>
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Browse Files
                      </Button>
                      <p className="text-caption mt-4">
                        Supports CSV, XLS, and XLSX files (max 50MB)
                      </p>
                    </div>
                  )}
                </div>

                {selectedFile && (
                  <div className="mt-6 flex justify-end">
                    <Button
                      onClick={() => setStep('mapping')}
                      disabled={isLoading}
                      loading={isLoading}
                    >
                      Continue to Mapping
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Mapping */}
          {step === 'mapping' && (
            <div className="skeuo-card p-6 space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2 flex items-center">
                  <MapPin className="w-5 h-5 mr-2"/>
                  Column Mapping
                </h3>
                <p className="text-body-secondary mb-4">
                  Map each column from your KEKA file to the corresponding NU-AURA field.
                </p>
              </div>

              {unmappedColumns.length > 0 && (
                <div
                  className="p-4 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg flex items-start mb-6">
                  <AlertTriangle className="w-5 h-5 text-warning-600 dark:text-warning-400 mr-4 flex-shrink-0 mt-0.5"/>
                  <div>
                    <p className="text-warning-800 dark:text-warning-100 font-medium">Unmapped Columns</p>
                    <p className="text-warning-700 dark:text-warning-200 text-sm mt-1">
                      {unmappedColumns.length} column(s) are not mapped. These will be skipped during
                      import.
                    </p>
                  </div>
                </div>
              )}

              {/* Mapping Table */}
              <div className="overflow-x-auto">
                <Table striped>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>KEKA Column</Table.Th>
                      <Table.Th>Confidence</Table.Th>
                      <Table.Th>NU-AURA Field</Table.Th>
                      <Table.Th>Status</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {columnMappings.map((mapping) => (
                      <Table.Tr key={mapping.sourceColumn}>
                        <Table.Td className="font-mono text-sm">
                          {mapping.sourceColumn}
                        </Table.Td>
                        <Table.Td>
                          {mapping.confidence ? (
                            <Badge
                              color={
                                mapping.confidence > 0.9
                                  ? 'green'
                                  : mapping.confidence > 0.7
                                    ? 'yellow'
                                    : 'gray'
                              }
                            >
                              {Math.round(mapping.confidence * 100)}%
                            </Badge>
                          ) : (
                            <Badge color="gray">No match</Badge>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <select
                            value={mapping.targetField}
                            onChange={(e) =>
                              updateMapping(mapping.sourceColumn, e.target.value)
                            }
                            className="input-aura !h-auto px-2 py-1 text-sm"
                          >
                            <option value="">Select field...</option>
                            {Object.entries(KEKA_COLUMN_PRESETS).map(([label, field]) => (
                              <option key={field} value={field}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </Table.Td>
                        <Table.Td>
                          {mapping.targetField ? (
                            <CheckCircle className="w-5 h-5 text-success-500"/>
                          ) : (
                            <XCircle className="w-5 h-5 text-[var(--text-muted)]"/>
                          )}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-6">
                <Button variant="light" onClick={() => setStep('upload')}>
                  Back
                </Button>
                <Button
                  onClick={handlePreview}
                  disabled={columnMappings.filter((m) => m.targetField).length === 0}
                  loading={isLoading}
                >
                  Preview Import
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && preview && (
            <div className="skeuo-card p-6 space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div
                  className="bg-accent-50 dark:bg-accent-900/20 p-4 rounded-lg border border-accent-200 dark:border-accent-800">
                  <p className="text-sm text-accent-600 dark:text-accent-300 font-medium">
                    Total Rows
                  </p>
                  <p className="text-2xl font-bold text-accent-900 dark:text-accent-100">
                    {preview.totalRows}
                  </p>
                </div>
                <div
                  className="bg-success-50 dark:bg-success-900/20 p-4 rounded-lg border border-success-200 dark:border-success-800">
                  <p className="text-sm text-success-600 dark:text-success-300 font-medium">
                    Valid
                  </p>
                  <p className="text-2xl font-bold text-success-900 dark:text-success-100">
                    {preview.validRows}
                  </p>
                </div>
                <div
                  className="bg-warning-50 dark:bg-warning-900/20 p-4 rounded-lg border border-warning-200 dark:border-warning-800">
                  <p className="text-sm text-warning-600 dark:text-warning-300 font-medium">
                    Warnings
                  </p>
                  <p className="text-2xl font-bold text-warning-900 dark:text-warning-100">
                    {preview.warnings.length}
                  </p>
                </div>
                <div
                  className="bg-danger-50 dark:bg-danger-900/20 p-4 rounded-lg border border-danger-200 dark:border-danger-800">
                  <p className="text-sm text-danger-600 dark:text-danger-300 font-medium">
                    Errors
                  </p>
                  <p className="text-2xl font-bold text-danger-900 dark:text-danger-100">
                    {preview.errorRows}
                  </p>
                </div>
              </div>

              {/* Error Details */}
              {preview.errors.length > 0 && (
                <div
                  className="p-4 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg">
                  <p className="font-semibold text-danger-800 dark:text-danger-100 mb-2">Import Errors</p>
                  <div className="text-sm space-y-1">
                    {preview.errors.slice(0, 5).map((err, idx) => (
                      <div key={idx} className="text-danger-700 dark:text-danger-200">
                        Row {err.row}, {err.field}: {err.message}
                      </div>
                    ))}
                    {preview.errors.length > 5 && (
                      <div className="text-danger-700 dark:text-danger-200 font-medium">
                        +{preview.errors.length - 5} more errors
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Preview Table */}
              <div>
                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-4 flex items-center">
                  <Eye className="w-5 h-5 mr-2"/>
                  Data Preview (First 10 rows)
                </h3>
                <div className="overflow-x-auto border border-[var(--border-main)] rounded-lg">
                  <Table striped>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>#</Table.Th>
                        <Table.Th>Employee ID</Table.Th>
                        <Table.Th>Name</Table.Th>
                        <Table.Th>Email</Table.Th>
                        <Table.Th>Department</Table.Th>
                        <Table.Th>Joining Date</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {preview.preview.map((emp, idx) => (
                        <Table.Tr key={idx}>
                          <Table.Td>{idx + 1}</Table.Td>
                          <Table.Td className="font-mono text-sm">
                            {emp.employeeNumber}
                          </Table.Td>
                          <Table.Td>
                            {emp.firstName} {emp.lastName || ''}
                          </Table.Td>
                          <Table.Td className="text-sm">{emp.email}</Table.Td>
                          <Table.Td>{emp.department || '-'}</Table.Td>
                          <Table.Td>{emp.joiningDate}</Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-6">
                <Button variant="light" onClick={() => setStep('mapping')}>
                  Back
                </Button>
                <Button
                  onClick={() => setStep('import')}
                  disabled={preview.errorRows > 0}
                  color={preview.errorRows > 0 ? 'gray' : undefined}
                >
                  {preview.errorRows > 0 ? 'Fix Errors First' : 'Proceed to Import'}
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Import Options */}
          {step === 'import' && preview && (
            <div className="skeuo-card p-6 space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2 flex items-center">
                  <Settings className="w-5 h-5 mr-2"/>
                  Import Options
                </h3>
                <p className="text-body-secondary mb-4">
                  Configure how the data should be imported into NU-AURA.
                </p>
              </div>

              {/* Options */}
              <div className="space-y-4">
                <label
                  className="flex items-center p-4 border border-[var(--border-main)] rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipInvalidRows}
                    onChange={(e) => setSkipInvalidRows(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <div className="ml-4">
                    <p className="font-medium text-[var(--text-primary)]">
                      Skip Invalid Rows
                    </p>
                    <p className="text-body-secondary">
                      Continue importing even if some rows have errors
                    </p>
                  </div>
                </label>

                <label
                  className="flex items-center p-4 border border-[var(--border-main)] rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={updateExistingEmployees}
                    onChange={(e) => setUpdateExistingEmployees(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <div className="ml-4">
                    <p className="font-medium text-[var(--text-primary)]">
                      Update Existing Employees
                    </p>
                    <p className="text-body-secondary">
                      Update employee data if they already exist in NU-AURA
                    </p>
                  </div>
                </label>

                <label
                  className="flex items-center p-4 border border-[var(--border-main)] rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendWelcomeEmail}
                    onChange={(e) => setSendWelcomeEmail(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <div className="ml-4">
                    <p className="font-medium text-[var(--text-primary)]">
                      Send Welcome Emails
                    </p>
                    <p className="text-body-secondary">
                      Send welcome emails to newly created employees
                    </p>
                  </div>
                </label>

                <label
                  className="flex items-center p-4 border border-[var(--border-main)] rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoApproveEmployees}
                    onChange={(e) => setAutoApproveEmployees(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <div className="ml-4">
                    <p className="font-medium text-[var(--text-primary)]">
                      Auto-approve Employees
                    </p>
                    <p className="text-body-secondary">
                      Automatically approve imported employees (SuperAdmin only)
                    </p>
                  </div>
                </label>
              </div>

              {/* Summary */}
              <div
                className="bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-800 p-4 rounded-lg mb-6">
                <p className="text-sm font-medium text-accent-900 dark:text-accent-100">
                  Ready to import {preview.validRows} valid employee records
                </p>
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-6">
                <Button variant="light" onClick={() => setStep('preview')}>
                  Back
                </Button>
                <Button
                  onClick={handleExecuteImport}
                  loading={isLoading}
                  color="green"
                >
                  Start Import
                </Button>
              </div>
            </div>
          )}

          {/* Step 5: Result */}
          {step === 'result' && result && (
            <div className="skeuo-card p-6 space-y-6">
              {/* Status Badge */}
              <div className="row-between">
                <div>
                  <h3 className="text-xl font-semibold text-[var(--text-primary)] flex items-center">
                    {result.status === 'SUCCESS' ? (
                      <>
                        <CheckCircle className="w-6 h-6 text-success-500 mr-2"/>
                        Import Completed
                      </>
                    ) : result.status === 'PARTIAL_SUCCESS' ? (
                      <>
                        <AlertTriangle className="w-6 h-6 text-warning-500 mr-2"/>
                        Partial Success
                      </>
                    ) : (
                      <>
                        <XCircle className="w-6 h-6 text-danger-500 mr-2"/>
                        Import Failed
                      </>
                    )}
                  </h3>
                </div>
                <Badge
                  color={
                    result.status === 'SUCCESS'
                      ? 'green'
                      : result.status === 'PARTIAL_SUCCESS'
                        ? 'yellow'
                        : 'red'
                  }
                >
                  {result.status}
                </Badge>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div
                  className="bg-accent-50 dark:bg-accent-900/20 p-4 rounded-lg border border-accent-200 dark:border-accent-800">
                  <p className="text-sm text-accent-600 dark:text-accent-300 font-medium">
                    Total Processed
                  </p>
                  <p className="text-2xl font-bold text-accent-900 dark:text-accent-100">
                    {result.totalProcessed}
                  </p>
                </div>
                <div
                  className="bg-success-50 dark:bg-success-900/20 p-4 rounded-lg border border-success-200 dark:border-success-800">
                  <p className="text-sm text-success-600 dark:text-success-300 font-medium">
                    Created
                  </p>
                  <p className="text-2xl font-bold text-success-900 dark:text-success-100">
                    {result.created}
                  </p>
                </div>
                <div
                  className="bg-accent-250 dark:bg-accent-900/20 p-4 rounded-lg border border-accent-400 dark:border-accent-900">
                  <p className="text-sm text-accent-800 dark:text-accent-500 font-medium">
                    Updated
                  </p>
                  <p className="text-2xl font-bold text-accent-900 dark:text-accent-300">
                    {result.updated}
                  </p>
                </div>
                <div
                  className="bg-warning-50 dark:bg-warning-900/20 p-4 rounded-lg border border-warning-200 dark:border-warning-800">
                  <p className="text-sm text-warning-600 dark:text-warning-300 font-medium">
                    Skipped
                  </p>
                  <p className="text-2xl font-bold text-warning-900 dark:text-warning-100">
                    {result.skipped}
                  </p>
                </div>
              </div>

              {/* Duration */}
              <div className="bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] p-4 rounded-lg">
                <p className="text-body-secondary">
                  Import completed in {result.duration}ms
                </p>
              </div>

              {/* Errors */}
              {result.errors.length > 0 && (
                <div
                  className="p-4 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg">
                  <p className="font-semibold text-danger-800 dark:text-danger-100 mb-2">Import Errors</p>
                  <div className="text-sm space-y-1 mb-4">
                    {result.errors.slice(0, 5).map((err, idx) => (
                      <div key={idx} className="text-danger-700 dark:text-danger-200">
                        Row {err.row}, {err.field}: {err.message}
                      </div>
                    ))}
                    {result.errors.length > 5 && (
                      <div className="text-danger-700 dark:text-danger-200 font-medium">
                        +{result.errors.length - 5} more errors
                      </div>
                    )}
                  </div>
                  {result.errors.length > 0 && (
                    <Button
                      size="xs"
                      color="red"
                      variant="light"
                      onClick={handleDownloadErrorReport}
                      loading={errorReportMutation.isPending}
                    >
                      Download Error Report
                    </Button>
                  )}
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between pt-6 gap-4">
                <Button
                  variant="light"
                  onClick={() => router.push('/employees')}
                >
                  View Employees
                </Button>
                <Button onClick={resetImport} color="green">
                  Import Another File
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminPageContent>
  );
}
