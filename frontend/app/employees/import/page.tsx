'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { employeeService } from '@/lib/services/employee.service';
import {
  EmployeeImportPreview,
  EmployeeImportResult,
  EmployeeImportRowPreview,
} from '@/lib/types/employee';
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  FileText,
  Users,
  AlertCircle,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';

type ImportStep = 'upload' | 'preview' | 'result';

export default function EmployeeImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<ImportStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [preview, setPreview] = useState<EmployeeImportPreview | null>(null);
  const [result, setResult] = useState<EmployeeImportResult | null>(null);
  const [skipInvalid, setSkipInvalid] = useState(true);

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
  }, []);

  const handleFileSelect = (file: File) => {
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

    setSelectedFile(file);
    setError(null);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
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
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || `Failed to download ${type.toUpperCase()} template`);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    if (!selectedFile) return;

    try {
      setLoading(true);
      setError(null);
      const previewData = await employeeService.previewImport(selectedFile);
      setPreview(previewData);
      setStep('preview');
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to preview import file');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!selectedFile) return;

    try {
      setLoading(true);
      setError(null);
      const importResult = await employeeService.executeImport(selectedFile, skipInvalid);
      setResult(importResult);
      setStep('result');
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to execute import');
    } finally {
      setLoading(false);
    }
  };

  const resetImport = () => {
    setStep('upload');
    setSelectedFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'PARTIAL_SUCCESS':
        return 'bg-yellow-100 text-yellow-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-surface-100 text-surface-800 dark:bg-surface-800 dark:text-surface-200';
    }
  };

  return (
    <AppLayout activeMenuItem="employees">
      <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
        <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/employees')}
            className="flex items-center text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-100 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Employees
          </button>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">
            Bulk Import Employees
          </h1>
          <p className="text-surface-600 dark:text-surface-400 mt-1">
            Upload a CSV or Excel file to import multiple employees at once
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full ${
                step === 'upload'
                  ? 'bg-primary-500 text-white'
                  : 'bg-green-600 text-white'
              }`}
            >
              {step === 'upload' ? '1' : <CheckCircle className="w-5 h-5" />}
            </div>
            <span className="ml-2 font-medium text-surface-900 dark:text-surface-100">
              Upload
            </span>
          </div>
          <div
            className={`w-24 h-1 mx-4 ${
              step !== 'upload' ? 'bg-green-600' : 'bg-surface-300 dark:bg-surface-700'
            }`}
          />
          <div className="flex items-center">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full ${
                step === 'preview'
                  ? 'bg-primary-500 text-white'
                  : step === 'result'
                  ? 'bg-green-600 text-white'
                  : 'bg-surface-300 dark:bg-surface-700 text-surface-600 dark:text-surface-400'
              }`}
            >
              {step === 'result' ? <CheckCircle className="w-5 h-5" /> : '2'}
            </div>
            <span
              className={`ml-2 font-medium ${
                step !== 'upload'
                  ? 'text-surface-900 dark:text-surface-100'
                  : 'text-surface-400 dark:text-surface-600'
              }`}
            >
              Preview
            </span>
          </div>
          <div
            className={`w-24 h-1 mx-4 ${
              step === 'result' ? 'bg-green-600' : 'bg-surface-300 dark:bg-surface-700'
            }`}
          />
          <div className="flex items-center">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full ${
                step === 'result'
                  ? 'bg-green-600 text-white'
                  : 'bg-surface-300 dark:bg-surface-700 text-surface-600 dark:text-surface-400'
              }`}
            >
              3
            </div>
            <span
              className={`ml-2 font-medium ${
                step === 'result'
                  ? 'text-surface-900 dark:text-surface-100'
                  : 'text-surface-400 dark:text-surface-600'
              }`}
            >
              Import
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-red-800 font-medium">Error</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="bg-surface-0 dark:bg-surface-800 rounded-lg shadow-sm p-6">
            {/* Download Templates */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-surface-900 dark:text-surface-100 mb-3">
                Download Template
              </h3>
              <p className="text-sm text-surface-600 dark:text-surface-400 mb-4">
                Download a template file with the required columns and fill it with your employee data.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => downloadTemplate('csv')}
                  disabled={loading}
                  className="flex items-center px-4 py-2 border border-surface-300 rounded-lg hover:bg-surface-50 dark:border-surface-600 dark:hover:bg-surface-700"
                >
                  <FileText className="w-5 h-5 mr-2 text-green-600" />
                  <span className="text-surface-700 dark:text-surface-300">CSV Template</span>
                </button>
                <button
                  onClick={() => downloadTemplate('xlsx')}
                  disabled={loading}
                  className="flex items-center px-4 py-2 border border-surface-300 rounded-lg hover:bg-surface-50 dark:border-surface-600 dark:hover:bg-surface-700"
                >
                  <FileSpreadsheet className="w-5 h-5 mr-2 text-primary-600 dark:text-primary-400" />
                  <span className="text-surface-700 dark:text-surface-300">Excel Template</span>
                </button>
              </div>
            </div>

            {/* File Upload Area */}
            <div className="border-t border-surface-200 dark:border-surface-700 pt-6">
              <h3 className="text-lg font-medium text-surface-900 dark:text-surface-100 mb-3">
                Upload File
              </h3>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30'
                    : selectedFile
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-surface-300 dark:border-surface-600 hover:border-surface-400'
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
                    <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
                    <p className="text-lg font-medium text-surface-900 dark:text-surface-100">
                      {selectedFile.name}
                    </p>
                    <p className="text-sm text-surface-500 dark:text-surface-400">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      className="mt-3 text-sm text-red-600 hover:text-red-700"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="w-12 h-12 text-surface-400 dark:text-surface-600 mb-3" />
                    <p className="text-lg font-medium text-surface-900 dark:text-surface-100 mb-1">
                      Drag and drop your file here
                    </p>
                    <p className="text-sm text-surface-500 dark:text-surface-400 mb-3">
                      or
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                    >
                      Browse Files
                    </button>
                    <p className="text-xs text-surface-400 dark:text-surface-600 mt-3">
                      Supports CSV, XLS, and XLSX files
                    </p>
                  </div>
                )}
              </div>

              {selectedFile && (
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handlePreview}
                    disabled={loading}
                    className="flex items-center px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Validating...
                      </>
                    ) : (
                      <>
                        Preview Import
                        <CheckCircle className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === 'preview' && preview && (
          <div className="bg-surface-0 dark:bg-surface-800 rounded-lg shadow-sm">
            {/* Summary Cards */}
            <div className="p-6 border-b border-surface-200 dark:border-surface-700">
              <h3 className="text-lg font-medium text-surface-900 dark:text-surface-100 mb-4">
                Import Preview
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-surface-50 dark:bg-surface-800/50 rounded-lg p-4">
                  <div className="flex items-center">
                    <Users className="w-8 h-8 text-primary-600 dark:text-primary-400 mr-3" />
                    <div>
                      <p className="text-2xl font-bold text-surface-900 dark:text-surface-100">
                        {preview.totalRows}
                      </p>
                      <p className="text-sm text-surface-500 dark:text-surface-400">
                        Total Rows
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircle className="w-8 h-8 text-green-500 mr-3" />
                    <div>
                      <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                        {preview.validRows}
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-500">
                        Valid Rows
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-4">
                  <div className="flex items-center">
                    <XCircle className="w-8 h-8 text-red-500 mr-3" />
                    <div>
                      <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                        {preview.invalidRows}
                      </p>
                      <p className="text-sm text-red-600 dark:text-red-500">
                        Invalid Rows
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Table */}
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-surface-200 dark:divide-surface-700">
                  <thead className="bg-surface-50 dark:bg-surface-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-300 uppercase">
                        Row
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-300 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-300 uppercase">
                        Employee Code
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-300 uppercase">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-300 uppercase">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-300 uppercase">
                        Department
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-300 uppercase">
                        Errors
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                    {preview.rows.map((row: EmployeeImportRowPreview) => (
                      <tr
                        key={row.rowNumber}
                        className={
                          row.isValid
                            ? ''
                            : 'bg-red-50 dark:bg-red-900/10'
                        }
                      >
                        <td className="px-4 py-3 text-sm text-surface-900 dark:text-surface-100">
                          {row.rowNumber}
                        </td>
                        <td className="px-4 py-3">
                          {row.isValid ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-surface-900 dark:text-surface-100">
                          {row.employeeCode}
                        </td>
                        <td className="px-4 py-3 text-sm text-surface-900 dark:text-surface-100">
                          {row.fullName}
                        </td>
                        <td className="px-4 py-3 text-sm text-surface-900 dark:text-surface-100">
                          {row.workEmail}
                        </td>
                        <td className="px-4 py-3 text-sm text-surface-900 dark:text-surface-100">
                          {row.departmentName || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {row.rowErrors.length > 0 ? (
                            <div className="text-red-600 dark:text-red-400">
                              {row.rowErrors.map((err, idx) => (
                                <div key={idx} className="text-xs">
                                  {err}
                                </div>
                              ))}
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Import Options */}
            {preview.hasErrors && (
              <div className="px-6 py-4 bg-yellow-50 dark:bg-yellow-900/20 border-t border-yellow-200 dark:border-yellow-800">
                <div className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      Some rows have validation errors. You can either fix the file and re-upload,
                      or proceed with importing only the valid rows.
                    </p>
                    <label className="flex items-center mt-3">
                      <input
                        type="checkbox"
                        checked={skipInvalid}
                        onChange={(e) => setSkipInvalid(e.target.checked)}
                        className="rounded border-surface-300 dark:border-surface-600 text-primary-500 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-surface-700 dark:text-surface-300">
                        Skip invalid rows and import only valid employees ({preview.validRows} employees)
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="p-6 border-t border-surface-200 dark:border-surface-700 flex justify-between">
              <button
                onClick={resetImport}
                className="px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700"
              >
                Start Over
              </button>
              <button
                onClick={handleExecuteImport}
                disabled={loading || (preview.hasErrors && !skipInvalid) || preview.validRows === 0}
                className="flex items-center px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    Import {skipInvalid ? preview.validRows : preview.totalRows} Employees
                    <Upload className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Result */}
        {step === 'result' && result && (
          <div className="bg-surface-0 dark:bg-surface-800 rounded-lg shadow-sm p-6">
            {/* Result Header */}
            <div className="text-center mb-8">
              {result.status === 'COMPLETED' ? (
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              ) : result.status === 'PARTIAL_SUCCESS' ? (
                <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              ) : (
                <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              )}
              <h2 className="text-2xl font-bold text-surface-900 dark:text-surface-100 mb-2">
                Import {result.status === 'COMPLETED' ? 'Completed' : result.status === 'PARTIAL_SUCCESS' ? 'Partially Completed' : 'Failed'}
              </h2>
              <span
                className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(
                  result.status
                )}`}
              >
                {result.status.replace('_', ' ')}
              </span>
            </div>

            {/* Result Summary */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-primary-50 dark:bg-primary-950/30 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                  {result.totalProcessed}
                </p>
                <p className="text-sm text-primary-600 dark:text-primary-400">
                  Total Processed
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-green-700 dark:text-green-400">
                  {result.successCount}
                </p>
                <p className="text-sm text-green-600 dark:text-green-500">
                  Successfully Imported
                </p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-red-700 dark:text-red-400">
                  {result.failedCount}
                </p>
                <p className="text-sm text-red-600 dark:text-red-500">Failed</p>
              </div>
            </div>

            {/* Imported Employees */}
            {result.importedEmployees && result.importedEmployees.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-surface-900 dark:text-surface-100 mb-3">
                  Imported Employees
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-surface-200 dark:divide-surface-700">
                    <thead className="bg-surface-50 dark:bg-surface-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-300 uppercase">
                          Employee Code
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-300 uppercase">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-300 uppercase">
                          Email
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                      {result.importedEmployees.slice(0, 10).map((emp) => (
                        <tr key={emp.employeeId}>
                          <td className="px-4 py-3 text-sm text-surface-900 dark:text-surface-100">
                            {emp.employeeCode}
                          </td>
                          <td className="px-4 py-3 text-sm text-surface-900 dark:text-surface-100">
                            {emp.fullName}
                          </td>
                          <td className="px-4 py-3 text-sm text-surface-900 dark:text-surface-100">
                            {emp.workEmail}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {result.importedEmployees.length > 10 && (
                    <p className="text-sm text-surface-500 dark:text-surface-400 mt-2 text-center">
                      ...and {result.importedEmployees.length - 10} more employees
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Failed Imports */}
            {result.failedImports && result.failedImports.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-surface-900 dark:text-surface-100 mb-3">
                  Failed Imports
                </h3>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                  {result.failedImports.map((fail, idx) => (
                    <div
                      key={idx}
                      className="flex items-start py-2 border-b border-red-200 dark:border-red-800 last:border-0"
                    >
                      <XCircle className="w-4 h-4 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-sm font-medium text-red-800 dark:text-red-200">
                          Row {fail.rowNumber}
                          {fail.employeeCode && ` (${fail.employeeCode})`}:
                        </span>
                        <span className="text-sm text-red-700 dark:text-red-300 ml-1">
                          {fail.reason}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-6 border-t border-surface-200 dark:border-surface-700">
              <button
                onClick={resetImport}
                className="px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700"
              >
                Import More
              </button>
              <button
                onClick={() => router.push('/employees')}
                className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
              >
                View Employees
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    </AppLayout>
  );
}
