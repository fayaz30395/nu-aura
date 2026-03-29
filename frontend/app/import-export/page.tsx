'use client';

import { useState, useCallback, useMemo, useRef, DragEvent } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PermissionGate, AdminGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';
import { NuAuraLoader } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  useMigrationTemplates,
  useImportData,
  useValidateFile,
  usePreviewEmployeeImport,
  useExecuteEmployeeImport,
  useDownloadEmployeeTemplate,
  useExportData,
  useKekaFileUpload,
  useKekaImportPreview,
  useKekaExecuteImport,
  useKekaImportHistory,
} from '@/lib/hooks/queries/useImportExport';
import type {
  ImportDataType,
  ExportDataType,
  ExportFormat,
  ImportResult,
  EmployeeImportPreview,
} from '@/lib/services/importExport.service';
import type {
  KekaFileUploadResponse,
  KekaImportPreview,
  KekaImportMapping,
  KekaImportHistoryEntry,
  KekaEmployee,
} from '@/lib/types/keka-import';
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  Trash2,
  FileText,
  Database,
  ArrowUpDown,
  History,
  ChevronRight,
  Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { notifications } from '@mantine/notifications';

// ─── Constants ──────────────────────────────────────────────────────────────

const IMPORT_TYPES: Array<{ value: ImportDataType; label: string; description: string; icon: typeof Upload }> = [
  { value: 'employees', label: 'Employees', description: 'Employee master data', icon: FileSpreadsheet },
  { value: 'departments', label: 'Departments', description: 'Department structure', icon: Database },
  { value: 'attendance', label: 'Attendance', description: 'Daily attendance records', icon: Clock },
  { value: 'leave_balances', label: 'Leave Balances', description: 'Leave balance data', icon: FileText },
  { value: 'salary_structures', label: 'Payroll Components', description: 'Salary structure data', icon: FileSpreadsheet },
];

const EXPORT_TYPES: Array<{ value: ExportDataType; label: string; description: string }> = [
  { value: 'employees', label: 'Employees', description: 'Employee master data' },
  { value: 'attendance', label: 'Attendance', description: 'Attendance records' },
  { value: 'leaves', label: 'Leaves', description: 'Leave records' },
  { value: 'payroll', label: 'Payroll', description: 'Payroll data' },
  { value: 'timesheets', label: 'Timesheets', description: 'Timesheet records' },
  { value: 'projects', label: 'Projects', description: 'Project data' },
];

const FORMAT_OPTIONS: Array<{ value: ExportFormat; label: string; ext: string }> = [
  { value: 'EXCEL', label: 'Excel (.xlsx)', ext: '.xlsx' },
  { value: 'CSV', label: 'CSV (.csv)', ext: '.csv' },
  { value: 'PDF', label: 'PDF (.pdf)', ext: '.pdf' },
];

type ActiveTab = 'import' | 'export' | 'keka' | 'history';

// ─── Status Badge ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; icon: typeof CheckCircle2 }> = {
    SUCCESS: { bg: 'bg-success-100 dark:bg-success-900/30', text: 'text-success-700 dark:text-success-400', icon: CheckCircle2 },
    COMPLETED: { bg: 'bg-success-100 dark:bg-success-900/30', text: 'text-success-700 dark:text-success-400', icon: CheckCircle2 },
    PARTIAL_SUCCESS: { bg: 'bg-warning-100 dark:bg-warning-900/30', text: 'text-warning-700 dark:text-warning-400', icon: AlertTriangle },
    FAILED: { bg: 'bg-danger-100 dark:bg-danger-900/30', text: 'text-danger-700 dark:text-danger-400', icon: XCircle },
    IN_PROGRESS: { bg: 'bg-accent-100 dark:bg-accent-900/30', text: 'text-accent-700 dark:text-accent-400', icon: RefreshCw },
    CANCELLED: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', icon: XCircle },
  };

  const cfg = config[status] || config.FAILED;
  const Icon = cfg.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <Icon className="h-3.5 w-3.5" />
      {status.replace('_', ' ')}
    </span>
  );
}

// ─── File Drop Zone ─────────────────────────────────────────────────────────

const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.xls'];

function isAcceptedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function FileDropZone({
  onFileDrop,
  disabled,
  currentFile,
  onClear,
}: {
  onFileDrop: (file: File) => void;
  disabled?: boolean;
  currentFile: File | null;
  onClear: () => void;
}) {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragActive(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files);
    const accepted = files.find(isAcceptedFile);
    if (accepted) {
      onFileDrop(accepted);
    } else if (files.length > 0) {
      notifications.show({ title: 'Invalid File', message: 'Please upload a .csv, .xlsx, or .xls file', color: 'red' });
    }
  }, [disabled, onFileDrop]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const accepted = Array.from(files).find(isAcceptedFile);
      if (accepted) {
        onFileDrop(accepted);
      } else {
        notifications.show({ title: 'Invalid File', message: 'Please upload a .csv, .xlsx, or .xls file', color: 'red' });
      }
    }
    // Reset input so same file can be re-selected
    if (inputRef.current) inputRef.current.value = '';
  }, [onFileDrop]);

  if (currentFile) {
    return (
      <div className="flex items-center justify-between p-4 rounded-lg border border-accent-200 dark:border-accent-800 bg-accent-50 dark:bg-accent-900/20">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="h-8 w-8 text-accent-700 dark:text-accent-400" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{currentFile.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {(currentFile.size / 1024).toFixed(1)} KB
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="p-2 rounded-lg hover:bg-danger-100 dark:hover:bg-danger-900/30 text-danger-600 dark:text-danger-400 transition-colors"
          aria-label="Remove file"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
      className={`
        flex flex-col items-center justify-center p-8 rounded-lg border-2 border-dashed cursor-pointer transition-all
        ${isDragActive
          ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/20'
          : 'border-gray-300 dark:border-gray-600 hover:border-accent-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleInputChange}
        className="hidden"
        aria-label="Upload file"
      />
      <Upload className="h-10 w-10 text-gray-400 dark:text-gray-500 mb-3" />
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {isDragActive ? 'Drop file here' : 'Drag & drop a file here, or click to browse'}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        Supports .csv, .xlsx, .xls
      </p>
    </div>
  );
}

// ─── Import Section ─────────────────────────────────────────────────────────

function ImportSection() {
  const [selectedType, setSelectedType] = useState<ImportDataType>('employees');
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [preview, setPreview] = useState<EmployeeImportPreview | null>(null);
  const [step, setStep] = useState<'select' | 'upload' | 'preview' | 'result'>('select');

  const { data: templates, isLoading: templatesLoading } = useMigrationTemplates();
  const importMutation = useImportData();
  const validateMutation = useValidateFile();
  const previewEmployeeMutation = usePreviewEmployeeImport();
  const executeEmployeeMutation = useExecuteEmployeeImport();
  const downloadTemplateMutation = useDownloadEmployeeTemplate();

  const currentTemplate = useMemo(() => {
    if (!templates) return null;
    const key = selectedType as keyof typeof templates;
    const val = templates[key];
    if (val && typeof val === 'object' && 'requiredColumns' in val) return val;
    return null;
  }, [templates, selectedType]);

  const handleFileSelect = useCallback((f: File) => {
    setFile(f);
    setImportResult(null);
    setPreview(null);
    setStep('upload');
  }, []);

  const handleValidateAndPreview = useCallback(async () => {
    if (!file) return;

    if (selectedType === 'employees') {
      previewEmployeeMutation.mutate(file, {
        onSuccess: (data) => {
          setPreview(data);
          setStep('preview');
        },
      });
    } else {
      validateMutation.mutate(
        { file, type: selectedType },
        {
          onSuccess: (validation) => {
            if (!validation.validFormat) {
              notifications.show({
                title: 'Invalid File',
                message: validation.message,
                color: 'red',
              });
              return;
            }
            setStep('preview');
          },
        },
      );
    }
  }, [file, selectedType, previewEmployeeMutation, validateMutation]);

  const handleImport = useCallback(async () => {
    if (!file) return;

    if (selectedType === 'employees') {
      executeEmployeeMutation.mutate(
        { file, skipInvalid: true },
        {
          onSuccess: () => {
            setStep('result');
          },
        },
      );
    } else {
      importMutation.mutate(
        { type: selectedType, file },
        {
          onSuccess: (result) => {
            setImportResult(result);
            setStep('result');
          },
        },
      );
    }
  }, [file, selectedType, importMutation, executeEmployeeMutation]);

  const handleReset = useCallback(() => {
    setFile(null);
    setImportResult(null);
    setPreview(null);
    setStep('select');
  }, []);

  const isProcessing = importMutation.isPending || executeEmployeeMutation.isPending || previewEmployeeMutation.isPending || validateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {['Select Type', 'Upload File', 'Preview', 'Results'].map((label, i) => {
          const steps: Array<typeof step> = ['select', 'upload', 'preview', 'result'];
          const isActive = steps.indexOf(step) >= i;
          return (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && <ChevronRight className="h-4 w-4 text-gray-400" />}
              <span className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-400'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500'
              }`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Step 1: Type selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {IMPORT_TYPES.map(({ value, label, description, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => { setSelectedType(value); setStep('select'); setFile(null); setImportResult(null); setPreview(null); }}
            className={`
              flex items-center gap-3 p-4 rounded-lg border text-left transition-all
              ${selectedType === value
                ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/20 ring-1 ring-accent-500'
                : 'border-gray-200 dark:border-gray-700 hover:border-accent-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }
            `}
          >
            <Icon className={`h-5 w-5 flex-shrink-0 ${selectedType === value ? 'text-accent-700 dark:text-accent-400' : 'text-gray-400'}`} />
            <div>
              <p className={`text-sm font-medium ${selectedType === value ? 'text-accent-700 dark:text-accent-300' : 'text-gray-900 dark:text-gray-100'}`}>{label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Template info & download */}
      {currentTemplate && !templatesLoading && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Info className="h-4 w-4 text-accent-600" />
                Required Columns
              </h4>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {currentTemplate.requiredColumns.map((col: string) => (
                  <span key={col} className="px-2 py-0.5 rounded bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-400 text-xs font-mono">
                    {col} *
                  </span>
                ))}
                {currentTemplate.optionalColumns.slice(0, 5).map((col: string) => (
                  <span key={col} className="px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-mono">
                    {col}
                  </span>
                ))}
                {currentTemplate.optionalColumns.length > 5 && (
                  <span className="px-2 py-0.5 text-xs text-gray-500">
                    +{currentTemplate.optionalColumns.length - 5} more
                  </span>
                )}
              </div>
            </div>
            {selectedType === 'employees' && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => downloadTemplateMutation.mutate('csv')}
                  disabled={downloadTemplateMutation.isPending}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Download className="h-3.5 w-3.5 inline mr-1" />CSV
                </button>
                <button
                  type="button"
                  onClick={() => downloadTemplateMutation.mutate('xlsx')}
                  disabled={downloadTemplateMutation.isPending}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-accent-700 hover:bg-accent-800 text-white transition-colors"
                >
                  <Download className="h-3.5 w-3.5 inline mr-1" />XLSX
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: File upload */}
      <FileDropZone
        onFileDrop={handleFileSelect}
        disabled={isProcessing}
        currentFile={file}
        onClear={() => { setFile(null); setStep('select'); setPreview(null); setImportResult(null); }}
      />

      {/* Preview results (employee type) */}
      {step === 'preview' && preview && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Preview: {preview.totalRows} rows found ({preview.validRows} valid, {preview.invalidRows} invalid)
            </h4>
          </div>
          {preview.rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50">
                    <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Row</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Code</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Name</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Email</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Department</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {preview.rows.slice(0, 10).map((row) => (
                    <tr key={row.rowNumber} className={row.isValid ? '' : 'bg-danger-50 dark:bg-danger-900/10'}>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{row.rowNumber}</td>
                      <td className="px-3 py-2 font-mono text-gray-900 dark:text-gray-100">{row.employeeCode}</td>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{row.fullName}</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{row.workEmail}</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{row.departmentName}</td>
                      <td className="px-3 py-2">
                        {row.isValid ? (
                          <CheckCircle2 className="h-4 w-4 text-success-500" />
                        ) : (
                          <span className="text-danger-600 dark:text-danger-400">{row.rowErrors?.join(', ')}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {preview.errors.length > 0 && (
            <div className="p-4 bg-danger-50 dark:bg-danger-900/10 border-t border-danger-200 dark:border-danger-800">
              <h5 className="text-xs font-medium text-danger-700 dark:text-danger-400 mb-2">
                Validation Errors ({preview.errors.length})
              </h5>
              <ul className="space-y-1 text-xs text-danger-600 dark:text-danger-400">
                {preview.errors.slice(0, 10).map((err, i) => (
                  <li key={i}>Row {err.rowNumber}: {err.field} - {err.message}</li>
                ))}
                {preview.errors.length > 10 && (
                  <li className="text-danger-500">...and {preview.errors.length - 10} more errors</li>
                )}
              </ul>
            </div>
          )}
        </motion.div>
      )}

      {/* Import result */}
      {step === 'result' && importResult && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            {importResult.errorCount === 0 ? (
              <CheckCircle2 className="h-8 w-8 text-success-500" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-warning-500" />
            )}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Import Complete</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Processed in {importResult.durationMs}ms
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{importResult.totalRows}</p>
            </div>
            <div className="p-3 rounded-lg bg-success-50 dark:bg-success-900/20">
              <p className="text-xs text-success-600 dark:text-success-400">Success</p>
              <p className="text-xl font-bold text-success-700 dark:text-success-300">{importResult.successCount}</p>
            </div>
            <div className="p-3 rounded-lg bg-danger-50 dark:bg-danger-900/20">
              <p className="text-xs text-danger-600 dark:text-danger-400">Errors</p>
              <p className="text-xl font-bold text-danger-700 dark:text-danger-300">{importResult.errorCount}</p>
            </div>
            <div className="p-3 rounded-lg bg-warning-50 dark:bg-warning-900/20">
              <p className="text-xs text-warning-600 dark:text-warning-400">Skipped</p>
              <p className="text-xl font-bold text-warning-700 dark:text-warning-300">{importResult.skippedCount}</p>
            </div>
          </div>
          {importResult.errors.length > 0 && (
            <div className="mt-4 rounded-lg bg-danger-50 dark:bg-danger-900/10 p-4">
              <h5 className="text-xs font-medium text-danger-700 dark:text-danger-400 mb-2">Errors</h5>
              <ul className="space-y-1 text-xs text-danger-600 dark:text-danger-400 max-h-40 overflow-y-auto">
                {importResult.errors.map((err, i) => (
                  <li key={i}>Row {err.rowNumber}: {err.field} = &quot;{err.value}&quot; - {err.errorMessage}</li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        {step === 'upload' && file && (
          <button
            type="button"
            onClick={handleValidateAndPreview}
            disabled={isProcessing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent-700 hover:bg-accent-800 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {(previewEmployeeMutation.isPending || validateMutation.isPending) && <RefreshCw className="h-4 w-4 animate-spin" />}
            Validate & Preview
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
        {step === 'preview' && (
          <button
            type="button"
            onClick={handleImport}
            disabled={isProcessing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent-700 hover:bg-accent-800 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {(importMutation.isPending || executeEmployeeMutation.isPending) && <RefreshCw className="h-4 w-4 animate-spin" />}
            Start Import
            <Upload className="h-4 w-4" />
          </button>
        )}
        {(step === 'preview' || step === 'result') && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Start Over
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Export Section ──────────────────────────────────────────────────────────

function ExportSection() {
  const [selectedType, setSelectedType] = useState<ExportDataType>('employees');
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('EXCEL');

  const exportMutation = useExportData();

  const handleExport = useCallback(() => {
    // For the generic export, we send empty data as the backend will pull from DB
    // In a production implementation, this would include filters
    exportMutation.mutate({
      type: selectedType,
      format: selectedFormat,
      request: {
        headers: [],
        data: [],
        columnKeys: [],
      },
    });
  }, [selectedType, selectedFormat, exportMutation]);

  return (
    <div className="space-y-6">
      {/* Export type selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Export Type
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {EXPORT_TYPES.map(({ value, label, description }) => (
            <button
              key={value}
              type="button"
              onClick={() => setSelectedType(value)}
              className={`
                p-3 rounded-lg border text-left transition-all
                ${selectedType === value
                  ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/20 ring-1 ring-accent-500'
                  : 'border-gray-200 dark:border-gray-700 hover:border-accent-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }
              `}
            >
              <p className={`text-sm font-medium ${selectedType === value ? 'text-accent-700 dark:text-accent-300' : 'text-gray-900 dark:text-gray-100'}`}>{label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Format selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Format
        </label>
        <div className="flex gap-3">
          {FORMAT_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setSelectedFormat(value)}
              className={`
                px-4 py-2 rounded-lg border text-sm font-medium transition-all
                ${selectedFormat === value
                  ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-300 ring-1 ring-accent-500'
                  : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-accent-300'
                }
              `}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Export button */}
      <button
        type="button"
        onClick={handleExport}
        disabled={exportMutation.isPending}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent-700 hover:bg-accent-800 text-white text-sm font-medium transition-colors disabled:opacity-50"
      >
        {exportMutation.isPending ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        Export {EXPORT_TYPES.find((t) => t.value === selectedType)?.label}
      </button>
    </div>
  );
}

// ─── KEKA Migration Wizard ──────────────────────────────────────────────────

function KekaMigrationSection() {
  const [wizardStep, setWizardStep] = useState<'upload' | 'map' | 'preview' | 'execute' | 'done'>(
    'upload',
  );
  const [file, setFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<KekaFileUploadResponse | null>(null);
  const [mappings, setMappings] = useState<KekaImportMapping[]>([]);
  const [previewData, setPreviewData] = useState<KekaImportPreview | null>(null);

  const uploadMutation = useKekaFileUpload();
  const previewMutation = useKekaImportPreview();
  const executeMutation = useKekaExecuteImport();

  // Target fields matching KekaEmployee interface keys
  const targetFields: Array<keyof KekaEmployee> = [
    'employeeNumber', 'email', 'firstName', 'lastName',
    'personalEmail', 'phone', 'department', 'designation', 'joiningDate',
    'dateOfBirth', 'gender', 'employmentType', 'bankName', 'bankAccountNumber',
  ];

  const handleUpload = useCallback(() => {
    if (!file) return;
    uploadMutation.mutate(file, {
      onSuccess: (result) => {
        setUploadResult(result);
        // Auto-generate initial mappings from detected columns using fuzzy matching
        const autoMappings: KekaImportMapping[] = result.detectedColumns.map((col) => {
          const normalized = col.toLowerCase().replace(/[\s-]+/g, '');
          const match = targetFields.find((tf) => tf.toLowerCase() === normalized);
          return {
            sourceColumn: col,
            targetField: (match ?? '') as keyof KekaEmployee,
            transform: 'NONE' as const,
            isRequired: match === 'employeeNumber' || match === 'email' || match === 'firstName',
            description: '',
          };
        });
        setMappings(autoMappings);
        setWizardStep('map');
      },
    });
  }, [file, uploadMutation, targetFields]);

  const handlePreview = useCallback(() => {
    if (!uploadResult) return;
    previewMutation.mutate(
      { fileId: uploadResult.fileId, mappings },
      {
        onSuccess: (data) => {
          setPreviewData(data);
          setWizardStep('preview');
        },
      },
    );
  }, [uploadResult, mappings, previewMutation]);

  const handleExecute = useCallback(() => {
    if (!uploadResult) return;
    executeMutation.mutate(
      {
        fileId: uploadResult.fileId,
        mappings,
        options: {
          skipInvalidRows: true,
          updateExistingEmployees: false,
          sendWelcomeEmail: false,
          autoApproveEmployees: false,
        },
      },
      {
        onSuccess: () => {
          setWizardStep('done');
        },
      },
    );
  }, [uploadResult, mappings, executeMutation]);

  const handleReset = useCallback(() => {
    setFile(null);
    setUploadResult(null);
    setMappings([]);
    setPreviewData(null);
    setWizardStep('upload');
  }, []);

  const updateMapping = useCallback(
    (index: number, field: keyof KekaImportMapping, value: string | boolean) => {
      setMappings((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [field]: value };
        return updated;
      });
    },
    [],
  );

  const isProcessing = uploadMutation.isPending || previewMutation.isPending || executeMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Wizard progress */}
      <div className="flex items-center gap-2 text-sm">
        {[
          { key: 'upload', label: '1. Upload' },
          { key: 'map', label: '2. Map Columns' },
          { key: 'preview', label: '3. Preview' },
          { key: 'execute', label: '4. Import' },
        ].map(({ key, label }, i) => {
          const steps: string[] = ['upload', 'map', 'preview', 'execute', 'done'];
          const isActive = steps.indexOf(wizardStep) >= i;
          return (
            <div key={key} className="flex items-center gap-2">
              {i > 0 && <ChevronRight className="h-4 w-4 text-gray-400" />}
              <span className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-400'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500'
              }`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Upload step */}
      {wizardStep === 'upload' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-accent-200 dark:border-accent-800 bg-accent-50 dark:bg-accent-900/10 p-4">
            <h4 className="text-sm font-medium text-accent-800 dark:text-accent-300 flex items-center gap-2">
              <Info className="h-4 w-4" />
              KEKA Migration
            </h4>
            <p className="text-xs text-accent-700 dark:text-accent-400 mt-1">
              Upload your KEKA export file (.csv or .xlsx). The system will detect columns and let you map them to NU-AURA fields.
            </p>
          </div>
          <FileDropZone
            onFileDrop={(f) => setFile(f)}
            disabled={isProcessing}
            currentFile={file}
            onClear={() => setFile(null)}
          />
          {file && (
            <button
              type="button"
              onClick={handleUpload}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent-700 hover:bg-accent-800 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {uploadMutation.isPending && <RefreshCw className="h-4 w-4 animate-spin" />}
              Upload & Detect Columns
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Column mapping step */}
      {wizardStep === 'map' && uploadResult && (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Column Mapping - {uploadResult.fileName}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {uploadResult.detectedColumns.length} columns detected. Map each source column to a target field.
              </p>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {mappings.map((mapping, index) => (
                <div key={mapping.sourceColumn} className="flex items-center gap-4 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-gray-900 dark:text-gray-100 truncate">
                      {mapping.sourceColumn}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1">
                    <select
                      value={mapping.targetField}
                      onChange={(e) => updateMapping(index, 'targetField', e.target.value)}
                      className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2"
                    >
                      <option value="">-- Skip --</option>
                      {targetFields.map((tf) => (
                        <option key={tf} value={tf}>{tf}</option>
                      ))}
                    </select>
                  </div>
                  {mapping.isRequired && (
                    <span className="text-xs text-danger-500 font-medium flex-shrink-0">Required</span>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePreview}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent-700 hover:bg-accent-800 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {previewMutation.isPending && <RefreshCw className="h-4 w-4 animate-spin" />}
              Preview Import
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Start Over
            </button>
          </div>
        </div>
      )}

      {/* Preview step */}
      {wizardStep === 'preview' && previewData && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Rows</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{previewData.totalRows}</p>
            </div>
            <div className="p-4 rounded-lg bg-success-50 dark:bg-success-900/20">
              <p className="text-xs text-success-600 dark:text-success-400">Valid</p>
              <p className="text-xl font-bold text-success-700 dark:text-success-300">{previewData.validRows}</p>
            </div>
            <div className="p-4 rounded-lg bg-danger-50 dark:bg-danger-900/20">
              <p className="text-xs text-danger-600 dark:text-danger-400">Errors</p>
              <p className="text-xl font-bold text-danger-700 dark:text-danger-300">{previewData.errorRows}</p>
            </div>
          </div>

          {previewData.preview.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50">
                    <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Emp #</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Name</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Email</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Department</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Designation</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Joining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {previewData.preview.slice(0, 5).map((row, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 font-mono text-gray-900 dark:text-gray-100">{row.employeeNumber || '-'}</td>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{[row.firstName, row.lastName].filter(Boolean).join(' ') || '-'}</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{row.email || '-'}</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{row.department || '-'}</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{row.designation || '-'}</td>
                      <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{row.joiningDate || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {previewData.errors.length > 0 && (
            <div className="rounded-lg bg-danger-50 dark:bg-danger-900/10 p-4">
              <h5 className="text-xs font-medium text-danger-700 dark:text-danger-400 mb-2">
                Validation Errors ({previewData.errors.length})
              </h5>
              <ul className="space-y-1 text-xs text-danger-600 dark:text-danger-400 max-h-32 overflow-y-auto">
                {previewData.errors.slice(0, 10).map((err, i) => (
                  <li key={i}>Row {err.row}: {err.field} - {err.message}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExecute}
              disabled={isProcessing || previewData.validRows === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent-700 hover:bg-accent-800 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {executeMutation.isPending && <RefreshCw className="h-4 w-4 animate-spin" />}
              Execute Import ({previewData.validRows} rows)
              <Upload className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setWizardStep('map')}
              className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Back to Mapping
            </button>
          </div>
        </div>
      )}

      {/* Done step */}
      {wizardStep === 'done' && executeMutation.data && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 className="h-8 w-8 text-success-500" />
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">KEKA Migration Complete</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <StatusBadge status={executeMutation.data.status} />
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400">Processed</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{executeMutation.data.totalProcessed}</p>
            </div>
            <div className="p-3 rounded-lg bg-success-50 dark:bg-success-900/20">
              <p className="text-xs text-success-600 dark:text-success-400">Created</p>
              <p className="text-xl font-bold text-success-700 dark:text-success-300">{executeMutation.data.created}</p>
            </div>
            <div className="p-3 rounded-lg bg-accent-50 dark:bg-accent-900/20">
              <p className="text-xs text-accent-600 dark:text-accent-400">Updated</p>
              <p className="text-xl font-bold text-accent-700 dark:text-accent-300">{executeMutation.data.updated}</p>
            </div>
            <div className="p-3 rounded-lg bg-warning-50 dark:bg-warning-900/20">
              <p className="text-xs text-warning-600 dark:text-warning-400">Skipped</p>
              <p className="text-xl font-bold text-warning-700 dark:text-warning-300">{executeMutation.data.skipped}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Import Another File
          </button>
        </motion.div>
      )}
    </div>
  );
}

// ─── History / Activity Log ─────────────────────────────────────────────────

function HistorySection() {
  const [page, setPage] = useState(0);
  const { data: historyPage, isLoading } = useKekaImportHistory(page, 20);

  if (isLoading) {
    return <NuAuraLoader message="Loading import history..." />;
  }

  if (!historyPage || historyPage.content.length === 0) {
    return (
      <EmptyState
        icon={<History className="h-12 w-12 text-gray-400" />}
        title="No import history"
        description="Import operations will appear here once you start importing data."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800">
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">File</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Rows</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Created</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Errors</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Duration</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {historyPage.content.map((entry: KekaImportHistoryEntry) => (
              <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{entry.fileName}</td>
                <td className="px-4 py-3"><StatusBadge status={entry.status} /></td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{entry.totalRows ?? '-'}</td>
                <td className="px-4 py-3 text-success-600 dark:text-success-400">{entry.created ?? '-'}</td>
                <td className="px-4 py-3 text-danger-600 dark:text-danger-400">{entry.errors ?? '-'}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                  {entry.duration ? `${(entry.duration / 1000).toFixed(1)}s` : '-'}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                  {entry.uploadedAt ? new Date(entry.uploadedAt).toLocaleDateString() : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {historyPage.totalElements > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Page {page + 1} ({historyPage.totalElements} total)
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={historyPage.content.length < 20}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function ImportExportPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('import');

  const tabs: Array<{ key: ActiveTab; label: string; icon: typeof Upload; description: string }> = [
    { key: 'import', label: 'Import', icon: Upload, description: 'Import data from files' },
    { key: 'export', label: 'Export', icon: Download, description: 'Export data to files' },
    { key: 'keka', label: 'KEKA Migration', icon: ArrowUpDown, description: 'Migrate from KEKA' },
    { key: 'history', label: 'Activity Log', icon: History, description: 'Import/export history' },
  ];

  return (
    <AppLayout>
      <PermissionGate
        anyOf={[Permissions.MIGRATION_IMPORT, Permissions.MIGRATION_EXPORT, Permissions.SYSTEM_ADMIN]}
        fallback={
          <div className="flex items-center justify-center h-96">
            <EmptyState
              icon={<AlertTriangle className="h-12 w-12 text-warning-500" />}
              title="Access Denied"
              description="You do not have permission to access the Import/Export Hub."
            />
          </div>
        }
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Page header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Import / Export Hub</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Bulk import data, export reports, and manage KEKA migrations
            </p>
          </div>

          {/* Tab navigation */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800/50 w-fit">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`
                  inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${activeTab === key
                    ? 'bg-white dark:bg-gray-700 text-accent-700 dark:text-accent-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6"
            >
              {activeTab === 'import' && <ImportSection />}
              {activeTab === 'export' && <ExportSection />}
              {activeTab === 'keka' && (
                <AdminGate
                  fallback={
                    <EmptyState
                      icon={<AlertTriangle className="h-12 w-12 text-warning-500" />}
                      title="Admin Only"
                      description="KEKA migration is restricted to system administrators."
                    />
                  }
                >
                  <KekaMigrationSection />
                </AdminGate>
              )}
              {activeTab === 'history' && <HistorySection />}
            </motion.div>
          </AnimatePresence>
        </div>
      </PermissionGate>
    </AppLayout>
  );
}
