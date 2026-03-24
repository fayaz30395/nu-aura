'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { employeeService } from '@/lib/services/employee.service';
import { payrollService } from '@/lib/services/payroll.service';
import { Employee } from '@/lib/types/employee';
import { logger } from '@/lib/utils/logger';
import { formatCurrency } from '@/lib/utils';
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  ChevronLeft,
  Users,
  Calendar,
  DollarSign,
  AlertCircle,
  Loader2,
  Check,
  X,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Step = 1 | 2 | 3 | 4;

interface EmployeePreview {
  employeeId: string;
  employeeName: string;
  baseSalary: number;
  totalAllowances: number;
  totalDeductions: number;
  grossAmount: number;
  netAmount: number;
}

interface ProcessingResult {
  payrollRunId: string;
  processedCount: number;
  failedCount: number;
}

export const BulkProcessingWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Employee Selection
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Step 2: Period Selection
  const [payrollPeriodStart, setPayrollPeriodStart] = useState('');
  const [payrollPeriodEnd, setPayrollPeriodEnd] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [runName, setRunName] = useState('');

  // Step 3: Preview
  const [previewData, setPreviewData] = useState<EmployeePreview[]>([]);

  // Step 4: Processing
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const response = await employeeService.getAllEmployees(0, 100);
      setEmployees(response.content.filter(emp => emp.status === 'ACTIVE'));
    } catch (err: unknown) {
      setError('Failed to load employees');
      logger.error('Error loading employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEmployee = (employeeId: string) => {
    const newSelected = new Set(selectedEmployeeIds);
    if (newSelected.has(employeeId)) {
      newSelected.delete(employeeId);
    } else {
      newSelected.add(employeeId);
    }
    setSelectedEmployeeIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedEmployeeIds.size === filteredEmployees.length) {
      setSelectedEmployeeIds(new Set());
    } else {
      setSelectedEmployeeIds(new Set(filteredEmployees.map(emp => emp.id)));
    }
  };

  const handleLoadPreview = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await payrollService.previewBulkProcessing({
        employeeIds: Array.from(selectedEmployeeIds),
        payrollPeriodStart,
        payrollPeriodEnd,
      });
      setPreviewData(data);
      setCurrentStep(3);
    } catch (err: unknown) {
      const message = typeof err === 'object' && err !== null && 'response' in err ? (err as { response?: { data?: { message?: string } } }).response?.data?.message : null;
      setError(message || 'Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayroll = async () => {
    try {
      setLoading(true);
      setProcessingStatus('processing');
      setError(null);

      const result = await payrollService.bulkProcessPayroll({
        employeeIds: Array.from(selectedEmployeeIds),
        payrollPeriodStart,
        payrollPeriodEnd,
        paymentDate,
        runName,
      });

      setProcessingResult(result);
      setProcessingStatus('completed');
      setCurrentStep(4);
    } catch (err: unknown) {
      const message = typeof err === 'object' && err !== null && 'response' in err ? (err as { response?: { data?: { message?: string } } }).response?.data?.message : null;
      setError(message || 'Failed to process payroll');
      setProcessingStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setSelectedEmployeeIds(new Set());
    setPayrollPeriodStart('');
    setPayrollPeriodEnd('');
    setPaymentDate('');
    setRunName('');
    setPreviewData([]);
    setProcessingResult(null);
    setProcessingStatus('idle');
    setError(null);
  };

  const filteredEmployees = employees.filter(emp =>
    searchQuery === '' ||
    emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.departmentName?.toLowerCase().includes(searchQuery.toLowerCase())
  );


  const canProceedFromStep1 = selectedEmployeeIds.size > 0;
  const canProceedFromStep2 = payrollPeriodStart && payrollPeriodEnd && paymentDate && runName;

  const steps = [
    { number: 1, title: 'Select Employees', icon: Users },
    { number: 2, title: 'Set Period', icon: Calendar },
    { number: 3, title: 'Review', icon: DollarSign },
    { number: 4, title: 'Process', icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <Card variant="elevated">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;

              return (
                <React.Fragment key={step.number}>
                  <div className="flex flex-col items-center gap-2 flex-1">
                    <div
                      className={cn(
                        'w-12 h-12 rounded-full flex items-center justify-center transition-all',
                        isCompleted && 'bg-success-500 text-white',
                        isActive && 'bg-sky-500 text-white ring-4 ring-sky-100 dark:ring-sky-900',
                        !isActive && !isCompleted && 'bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-400'
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-6 w-6" />
                      ) : (
                        <StepIcon className="h-6 w-6" />
                      )}
                    </div>
                    <div className="text-center">
                      <p
                        className={cn(
                          'text-sm font-medium',
                          isActive && 'text-sky-700 dark:text-sky-400',
                          !isActive && 'text-surface-600 dark:text-surface-400'
                        )}
                      >
                        {step.title}
                      </p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        'flex-1 h-0.5 mx-2 transition-all',
                        isCompleted ? 'bg-success-500' : 'bg-surface-200 dark:bg-surface-700'
                      )}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Step Content */}
      <Card variant="elevated">
        <CardContent className="p-6">
          {/* Step 1: Employee Selection */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-surface-900 dark:text-surface-50 mb-2">
                  Select Employees
                </h2>
                <p className="text-surface-600 dark:text-surface-400">
                  Choose employees to include in this payroll run
                </p>
              </div>

              {/* Search and Select All */}
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-surface-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search employees..."
                    className="w-full pl-10 pr-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-[var(--bg-input)] text-surface-900 dark:text-surface-50"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={handleSelectAll}
                  disabled={loading || filteredEmployees.length === 0}
                >
                  {selectedEmployeeIds.size === filteredEmployees.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>

              {/* Selected Count */}
              <div className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400">
                <Users className="h-4 w-4" />
                <span>
                  {selectedEmployeeIds.size} of {filteredEmployees.length} employees selected
                </span>
              </div>

              {/* Employee List */}
              <div className="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden">
                <div className="max-h-[400px] overflow-y-auto">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
                    </div>
                  ) : filteredEmployees.length === 0 ? (
                    <div className="text-center py-12 text-surface-600 dark:text-surface-400">
                      No employees found
                    </div>
                  ) : (
                    <div className="divide-y divide-surface-200 dark:divide-surface-700">
                      {filteredEmployees.map((employee) => {
                        const isSelected = selectedEmployeeIds.has(employee.id);
                        return (
                          <div
                            key={employee.id}
                            onClick={() => handleToggleEmployee(employee.id)}
                            className={cn(
                              'flex items-center gap-4 p-4 cursor-pointer transition-colors',
                              'hover:bg-surface-50 dark:hover:bg-surface-800/50',
                              isSelected && 'bg-sky-50 dark:bg-sky-950/30'
                            )}
                          >
                            <div className="flex-shrink-0">
                              {isSelected ? (
                                <CheckCircle2 className="h-6 w-6 text-sky-500" />
                              ) : (
                                <Circle className="h-6 w-6 text-surface-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-surface-900 dark:text-surface-50">
                                {employee.fullName}
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-sm text-surface-600 dark:text-surface-400">
                                <span>{employee.employeeCode}</span>
                                {employee.departmentName && (
                                  <>
                                    <span>•</span>
                                    <span>{employee.departmentName}</span>
                                  </>
                                )}
                                {employee.designation && (
                                  <>
                                    <span>•</span>
                                    <span>{employee.designation}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Period Selection */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-surface-900 dark:text-surface-50 mb-2">
                  Set Payroll Period
                </h2>
                <p className="text-surface-600 dark:text-surface-400">
                  Define the payroll period and payment details
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                    Run Name *
                  </label>
                  <input
                    type="text"
                    value={runName}
                    onChange={(e) => setRunName(e.target.value)}
                    placeholder="e.g., December 2024 Payroll"
                    className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-[var(--bg-input)] text-surface-900 dark:text-surface-50"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                      Period Start Date *
                    </label>
                    <input
                      type="date"
                      value={payrollPeriodStart}
                      onChange={(e) => setPayrollPeriodStart(e.target.value)}
                      className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-[var(--bg-input)] text-surface-900 dark:text-surface-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                      Period End Date *
                    </label>
                    <input
                      type="date"
                      value={payrollPeriodEnd}
                      onChange={(e) => setPayrollPeriodEnd(e.target.value)}
                      className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-[var(--bg-input)] text-surface-900 dark:text-surface-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-[var(--bg-input)] text-surface-900 dark:text-surface-50"
                  />
                </div>

                {/* Summary */}
                <div className="mt-6 p-4 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
                  <h3 className="font-semibold text-surface-900 dark:text-surface-50 mb-3">
                    Summary
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-surface-600 dark:text-surface-400">Employees:</span>
                      <span className="font-medium text-surface-900 dark:text-surface-50">
                        {selectedEmployeeIds.size}
                      </span>
                    </div>
                    {runName && (
                      <div className="flex justify-between">
                        <span className="text-surface-600 dark:text-surface-400">Run Name:</span>
                        <span className="font-medium text-surface-900 dark:text-surface-50">
                          {runName}
                        </span>
                      </div>
                    )}
                    {payrollPeriodStart && payrollPeriodEnd && (
                      <div className="flex justify-between">
                        <span className="text-surface-600 dark:text-surface-400">Period:</span>
                        <span className="font-medium text-surface-900 dark:text-surface-50">
                          {new Date(payrollPeriodStart).toLocaleDateString()} -{' '}
                          {new Date(payrollPeriodEnd).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {paymentDate && (
                      <div className="flex justify-between">
                        <span className="text-surface-600 dark:text-surface-400">Payment Date:</span>
                        <span className="font-medium text-surface-900 dark:text-surface-50">
                          {new Date(paymentDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-surface-900 dark:text-surface-50 mb-2">
                  Review Payroll
                </h2>
                <p className="text-surface-600 dark:text-surface-400">
                  Review the payroll calculation before processing
                </p>
              </div>

              {/* Total Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-sky-50 dark:bg-sky-950/30 rounded-lg">
                  <p className="text-sm text-sky-700 dark:text-sky-400 mb-1">
                    Total Employees
                  </p>
                  <p className="text-2xl font-bold text-sky-700 dark:text-sky-300">
                    {previewData.length}
                  </p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                  <p className="text-sm text-green-600 dark:text-green-400 mb-1">
                    Total Gross
                  </p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {formatCurrency(previewData.reduce((sum, emp) => sum + emp.grossAmount, 0))}
                  </p>
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400 mb-1">
                    Total Deductions
                  </p>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                    {formatCurrency(previewData.reduce((sum, emp) => sum + emp.totalDeductions, 0))}
                  </p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">
                    Total Net
                  </p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {formatCurrency(previewData.reduce((sum, emp) => sum + emp.netAmount, 0))}
                  </p>
                </div>
              </div>

              {/* Employee Details Table */}
              <div className="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-[400px]">
                  <table className="w-full">
                    <thead className="bg-surface-50 dark:bg-surface-800/50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-surface-700 dark:text-surface-300">
                          Employee
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-surface-700 dark:text-surface-300">
                          Base Salary
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-surface-700 dark:text-surface-300">
                          Allowances
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-surface-700 dark:text-surface-300">
                          Deductions
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-surface-700 dark:text-surface-300">
                          Gross Amount
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-surface-700 dark:text-surface-300">
                          Net Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                      {previewData.map((emp) => (
                        <tr key={emp.employeeId} className="hover:bg-surface-50 dark:hover:bg-surface-800/50">
                          <td className="px-4 py-3 text-sm font-medium text-surface-900 dark:text-surface-50">
                            {emp.employeeName}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-surface-900 dark:text-surface-50">
                            {formatCurrency(emp.baseSalary)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-green-600 dark:text-green-400">
                            {formatCurrency(emp.totalAllowances)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-red-600 dark:text-red-400">
                            {formatCurrency(emp.totalDeductions)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-surface-900 dark:text-surface-50">
                            {formatCurrency(emp.grossAmount)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-bold text-sky-700 dark:text-sky-400">
                            {formatCurrency(emp.netAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Processing */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                {processingStatus === 'processing' ? (
                  <>
                    <Loader2 className="h-16 w-16 animate-spin text-sky-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-surface-900 dark:text-surface-50 mb-2">
                      Processing Payroll
                    </h2>
                    <p className="text-surface-600 dark:text-surface-400">
                      Please wait while we process the payroll...
                    </p>
                  </>
                ) : processingStatus === 'completed' ? (
                  <>
                    <CheckCircle2 className="h-16 w-16 text-success-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-surface-900 dark:text-surface-50 mb-2">
                      Payroll Processed Successfully
                    </h2>
                    <p className="text-surface-600 dark:text-surface-400">
                      The payroll has been processed for all selected employees
                    </p>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-16 w-16 text-danger-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-surface-900 dark:text-surface-50 mb-2">
                      Processing Failed
                    </h2>
                    <p className="text-surface-600 dark:text-surface-400">
                      An error occurred while processing the payroll
                    </p>
                  </>
                )}
              </div>

              {processingResult && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-sky-50 dark:bg-sky-950/30 rounded-lg text-center">
                    <p className="text-sm text-sky-700 dark:text-sky-400 mb-1">
                      Payroll Run ID
                    </p>
                    <p className="text-lg font-bold text-sky-700 dark:text-sky-300">
                      {processingResult.payrollRunId}
                    </p>
                  </div>
                  <div className="p-4 bg-success-50 dark:bg-success-950/30 rounded-lg text-center">
                    <p className="text-sm text-success-600 dark:text-success-400 mb-1">
                      Processed
                    </p>
                    <p className="text-lg font-bold text-success-700 dark:text-success-300">
                      {processingResult.processedCount}
                    </p>
                  </div>
                  <div className="p-4 bg-danger-50 dark:bg-danger-950/30 rounded-lg text-center">
                    <p className="text-sm text-danger-600 dark:text-danger-400 mb-1">
                      Failed
                    </p>
                    <p className="text-lg font-bold text-danger-700 dark:text-danger-300">
                      {processingResult.failedCount}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <div>
          {currentStep > 1 && currentStep < 4 && (
            <Button
              variant="outline"
              leftIcon={<ChevronLeft className="h-4 w-4" />}
              onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1) as Step)}
              disabled={loading}
            >
              Previous
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {currentStep === 4 ? (
            <Button
              variant="primary"
              onClick={handleReset}
            >
              Start New Process
            </Button>
          ) : currentStep === 1 ? (
            <Button
              variant="primary"
              rightIcon={<ChevronRight className="h-4 w-4" />}
              onClick={() => setCurrentStep(2)}
              disabled={!canProceedFromStep1}
            >
              Continue
            </Button>
          ) : currentStep === 2 ? (
            <Button
              variant="primary"
              rightIcon={<ChevronRight className="h-4 w-4" />}
              onClick={handleLoadPreview}
              disabled={!canProceedFromStep2 || loading}
              isLoading={loading}
            >
              Load Preview
            </Button>
          ) : currentStep === 3 ? (
            <Button
              variant="success"
              onClick={handleProcessPayroll}
              disabled={loading || previewData.length === 0}
              isLoading={loading}
            >
              Process Payroll
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
