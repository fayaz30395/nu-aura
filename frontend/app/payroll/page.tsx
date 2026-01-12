'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout';
import { payrollService } from '@/lib/services/payroll.service';
import {
  PayrollRun,
  PayrollRunRequest,
  Payslip,
  PayslipRequest,
  SalaryStructure,
  SalaryStructureRequest,
  PayrollRunStatus,
  SalaryComponent,
} from '@/lib/types/payroll';

type TabType = 'runs' | 'payslips' | 'structures';

interface FormModalState {
  isOpen: boolean;
  mode: 'create' | 'edit';
  item?: any;
}

export default function PayrollPage() {
  const [activeTab, setActiveTab] = useState<TabType>('runs');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Payroll Runs State
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [payrollRunModal, setPayrollRunModal] = useState<FormModalState>({
    isOpen: false,
    mode: 'create',
  });
  const [payrollRunForm, setPayrollRunForm] = useState<PayrollRunRequest>({
    runName: '',
    payrollPeriodStart: '',
    payrollPeriodEnd: '',
    paymentDate: '',
    notes: '',
  });
  const [payrollRunFilter, setPayrollRunFilter] = useState<PayrollRunStatus | 'ALL'>('ALL');
  const [selectedPayrollRun, setSelectedPayrollRun] = useState<PayrollRun | null>(null);
  const [showRunDeleteConfirm, setShowRunDeleteConfirm] = useState(false);

  // Payslips State
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [payslipModal, setPayslipModal] = useState<FormModalState>({
    isOpen: false,
    mode: 'create',
  });
  const [payslipForm, setPayslipForm] = useState<PayslipRequest>({
    employeeId: '',
    payrollRunId: '',
    paymentDate: '',
    payrollPeriodStart: '',
    payrollPeriodEnd: '',
    baseSalary: 0,
    allowances: 0,
    deductions: 0,
  });
  const [payslipSearchMonth, setPayslipSearchMonth] = useState<string>(
    new Date().toISOString().substring(0, 7)
  );
  const [payslipSearchEmployee, setPayslipSearchEmployee] = useState('');
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [showPayslipDeleteConfirm, setShowPayslipDeleteConfirm] = useState(false);

  // Salary Structures State
  const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>([]);
  const [structureModal, setStructureModal] = useState<FormModalState>({
    isOpen: false,
    mode: 'create',
  });
  const [structureForm, setStructureForm] = useState<SalaryStructureRequest>({
    employeeId: '',
    effectiveDate: '',
    baseSalary: 0,
    allowances: [],
    deductions: [],
  });
  const [structureFilter, setStructureFilter] = useState<'ACTIVE' | 'INACTIVE' | 'PENDING' | 'ALL'>('ACTIVE');
  const [selectedStructure, setSelectedStructure] = useState<SalaryStructure | null>(null);
  const [showStructureDeleteConfirm, setShowStructureDeleteConfirm] = useState(false);

  // Load data on mount and when tab changes
  useEffect(() => {
    if (activeTab === 'runs') {
      loadPayrollRuns();
    } else if (activeTab === 'payslips') {
      loadPayslips();
    } else if (activeTab === 'structures') {
      loadSalaryStructures();
    }
  }, [activeTab]);

  // ============ PAYROLL RUNS ============
  const loadPayrollRuns = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await payrollService.getAllPayrollRuns(0, 100);
      setPayrollRuns(response.content);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load payroll runs');
      console.error('Error loading payroll runs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayrollRun = () => {
    setPayrollRunForm({
      runName: '',
      payrollPeriodStart: '',
      payrollPeriodEnd: '',
      paymentDate: '',
      notes: '',
    });
    setSelectedPayrollRun(null);
    setPayrollRunModal({ isOpen: true, mode: 'create' });
  };

  const handleEditPayrollRun = (run: PayrollRun) => {
    setSelectedPayrollRun(run);
    setPayrollRunForm({
      runName: run.runName,
      payrollPeriodStart: run.payrollPeriodStart,
      payrollPeriodEnd: run.payrollPeriodEnd,
      paymentDate: run.paymentDate,
      notes: run.notes || '',
    });
    setPayrollRunModal({ isOpen: true, mode: 'edit' });
  };

  const handleSubmitPayrollRun = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (selectedPayrollRun) {
        await payrollService.updatePayrollRun(selectedPayrollRun.id, payrollRunForm);
      } else {
        await payrollService.createPayrollRun(payrollRunForm);
      }
      await loadPayrollRuns();
      setPayrollRunModal({ isOpen: false, mode: 'create' });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save payroll run');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayrollRun = async () => {
    if (!selectedPayrollRun) return;
    try {
      setLoading(true);
      await payrollService.deletePayrollRun(selectedPayrollRun.id);
      await loadPayrollRuns();
      setShowRunDeleteConfirm(false);
      setSelectedPayrollRun(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete payroll run');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayrollRun = async (run: PayrollRun) => {
    try {
      setLoading(true);
      await payrollService.processPayrollRun(run.id);
      await loadPayrollRuns();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to process payroll run');
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePayrollRun = async (run: PayrollRun) => {
    try {
      setLoading(true);
      await payrollService.approvePayrollRun(run.id);
      await loadPayrollRuns();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to approve payroll run');
    } finally {
      setLoading(false);
    }
  };

  // ============ PAYSLIPS ============
  const loadPayslips = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await payrollService.getAllPayslips(0, 100);
      setPayslips(response.content);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load payslips');
      console.error('Error loading payslips:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayslip = () => {
    setPayslipForm({
      employeeId: '',
      payrollRunId: '',
      paymentDate: '',
      payrollPeriodStart: '',
      payrollPeriodEnd: '',
      baseSalary: 0,
      allowances: 0,
      deductions: 0,
    });
    setSelectedPayslip(null);
    setPayslipModal({ isOpen: true, mode: 'create' });
  };

  const handleEditPayslip = (payslip: Payslip) => {
    setSelectedPayslip(payslip);
    setPayslipForm({
      employeeId: payslip.employeeId,
      payrollRunId: payslip.payrollRunId,
      paymentDate: payslip.paymentDate,
      payrollPeriodStart: payslip.payrollPeriodStart,
      payrollPeriodEnd: payslip.payrollPeriodEnd,
      baseSalary: payslip.baseSalary,
      allowances: payslip.allowances,
      deductions: payslip.deductions,
    });
    setPayslipModal({ isOpen: true, mode: 'edit' });
  };

  const handleSubmitPayslip = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (selectedPayslip) {
        await payrollService.updatePayslip(selectedPayslip.id, payslipForm);
      } else {
        await payrollService.createPayslip(payslipForm);
      }
      await loadPayslips();
      setPayslipModal({ isOpen: false, mode: 'create' });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save payslip');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayslip = async () => {
    if (!selectedPayslip) return;
    try {
      setLoading(true);
      await payrollService.deletePayslip(selectedPayslip.id);
      await loadPayslips();
      setShowPayslipDeleteConfirm(false);
      setSelectedPayslip(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete payslip');
    } finally {
      setLoading(false);
    }
  };

  // ============ SALARY STRUCTURES ============
  const loadSalaryStructures = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await payrollService.getAllSalaryStructures(0, 100);
      setSalaryStructures(response.content);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load salary structures');
      console.error('Error loading salary structures:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStructure = () => {
    setStructureForm({
      employeeId: '',
      effectiveDate: '',
      baseSalary: 0,
      allowances: [],
      deductions: [],
    });
    setSelectedStructure(null);
    setStructureModal({ isOpen: true, mode: 'create' });
  };

  const handleEditStructure = (structure: SalaryStructure) => {
    setSelectedStructure(structure);
    setStructureForm({
      employeeId: structure.employeeId,
      effectiveDate: structure.effectiveDate,
      baseSalary: structure.baseSalary,
      allowances: structure.allowances,
      deductions: structure.deductions,
    });
    setStructureModal({ isOpen: true, mode: 'edit' });
  };

  const handleAddComponent = (type: 'allowances' | 'deductions') => {
    const newComponent: SalaryComponent = {
      name: '',
      amount: 0,
      type: 'FIXED',
      description: '',
    };
    if (type === 'allowances') {
      setStructureForm({
        ...structureForm,
        allowances: [...(structureForm.allowances || []), newComponent],
      });
    } else {
      setStructureForm({
        ...structureForm,
        deductions: [...(structureForm.deductions || []), newComponent],
      });
    }
  };

  const handleRemoveComponent = (type: 'allowances' | 'deductions', index: number) => {
    if (type === 'allowances') {
      setStructureForm({
        ...structureForm,
        allowances: structureForm.allowances?.filter((_, i) => i !== index),
      });
    } else {
      setStructureForm({
        ...structureForm,
        deductions: structureForm.deductions?.filter((_, i) => i !== index),
      });
    }
  };

  const handleUpdateComponent = (
    type: 'allowances' | 'deductions',
    index: number,
    field: string,
    value: any
  ) => {
    if (type === 'allowances' && structureForm.allowances) {
      const updated = [...structureForm.allowances];
      updated[index] = { ...updated[index], [field]: value };
      setStructureForm({ ...structureForm, allowances: updated });
    } else if (type === 'deductions' && structureForm.deductions) {
      const updated = [...structureForm.deductions];
      updated[index] = { ...updated[index], [field]: value };
      setStructureForm({ ...structureForm, deductions: updated });
    }
  };

  const handleSubmitStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (selectedStructure) {
        await payrollService.updateSalaryStructure(selectedStructure.id, structureForm);
      } else {
        await payrollService.createSalaryStructure(structureForm);
      }
      await loadSalaryStructures();
      setStructureModal({ isOpen: false, mode: 'create' });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save salary structure');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStructure = async () => {
    if (!selectedStructure) return;
    try {
      setLoading(true);
      await payrollService.deleteSalaryStructure(selectedStructure.id);
      await loadSalaryStructures();
      setShowStructureDeleteConfirm(false);
      setSelectedStructure(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete salary structure');
    } finally {
      setLoading(false);
    }
  };

  // ============ HELPER FUNCTIONS ============
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      DRAFT: 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200',
      PROCESSING: 'bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400',
      PROCESSED: 'bg-cyan-100 text-cyan-800',
      APPROVED: 'bg-green-100 text-green-800',
      LOCKED: 'bg-red-100 text-red-800',
      ACTIVE: 'bg-green-100 text-green-800',
      INACTIVE: 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200',
      PENDING: 'bg-yellow-100 text-yellow-800',
      FINALIZED: 'bg-cyan-100 text-cyan-800',
      PAID: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200';
  };

  const filteredPayrollRuns = payrollRuns.filter(
    (run) => payrollRunFilter === 'ALL' || run.status === payrollRunFilter
  );

  const filteredPayslips = payslips.filter((payslip) => {
    const payslipMonth = payslip.paymentDate.substring(0, 7);
    const employeeMatch =
      payslipSearchEmployee === '' ||
      (payslip.employeeName?.toLowerCase() || '').includes(payslipSearchEmployee.toLowerCase());
    const monthMatch = payslipSearchMonth === '' || payslipMonth === payslipSearchMonth;
    return employeeMatch && monthMatch;
  });

  const filteredStructures = salaryStructures.filter(
    (structure) => structureFilter === 'ALL' || structure.status === structureFilter
  );

  return (
    <AppLayout activeMenuItem="payroll">
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-50">Payroll Management</h1>
          <p className="text-surface-600 dark:text-surface-400 mt-2">Manage payroll runs, payslips, and salary structures</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-4 text-sm underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-surface-200 dark:border-surface-700">
          <button
            onClick={() => setActiveTab('runs')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'runs'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-surface-600 dark:text-surface-400 hover:text-surface-800 dark:hover:text-surface-200'
            }`}
          >
            Payroll Runs
          </button>
          <button
            onClick={() => setActiveTab('payslips')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'payslips'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-surface-600 dark:text-surface-400 hover:text-surface-800 dark:hover:text-surface-200'
            }`}
          >
            Payslips
          </button>
          <button
            onClick={() => setActiveTab('structures')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'structures'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-surface-600 dark:text-surface-400 hover:text-surface-800 dark:hover:text-surface-200'
            }`}
          >
            Salary Structures
          </button>
        </div>

        {/* PAYROLL RUNS TAB */}
        {activeTab === 'runs' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <div className="flex gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                    Filter by Status
                  </label>
                  <select
                    value={payrollRunFilter}
                    onChange={(e) => setPayrollRunFilter(e.target.value as any)}
                    className="px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="ALL">All Status</option>
                    <option value="DRAFT">Draft</option>
                    <option value="PROCESSING">Processing</option>
                    <option value="PROCESSED">Processed</option>
                    <option value="APPROVED">Approved</option>
                    <option value="LOCKED">Locked</option>
                  </select>
                </div>
              </div>
              <button
                onClick={handleCreatePayrollRun}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
              >
                Create Payroll Run
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12 text-surface-600 dark:text-surface-400">Loading payroll runs...</div>
            ) : filteredPayrollRuns.length === 0 ? (
              <div className="bg-white dark:bg-surface-900 rounded-lg shadow-md p-12 text-center">
                <div className="text-surface-600 dark:text-surface-400 mb-4">No payroll runs found</div>
                <button
                  onClick={handleCreatePayrollRun}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                  Create Your First Payroll Run
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto bg-white dark:bg-surface-900 rounded-lg shadow-md">
                <table className="w-full">
                  <thead className="bg-surface-50 dark:bg-surface-800/50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-surface-800 dark:text-surface-200">
                        Run Name
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-surface-800 dark:text-surface-200">
                        Period
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-surface-800 dark:text-surface-200">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-surface-800 dark:text-surface-200">
                        Employees
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-surface-800 dark:text-surface-200">
                        Gross Amount
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-surface-800 dark:text-surface-200">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayrollRuns.map((run) => (
                      <tr key={run.id} className="border-b hover:bg-surface-50 dark:hover:bg-surface-800/50">
                        <td className="px-6 py-4 text-sm font-medium">{run.runName}</td>
                        <td className="px-6 py-4 text-sm text-surface-600 dark:text-surface-400">
                          {formatDate(run.payrollPeriodStart)} - {formatDate(run.payrollPeriodEnd)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                              run.status
                            )}`}
                          >
                            {run.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">{run.totalEmployees}</td>
                        <td className="px-6 py-4 text-sm font-semibold">
                          {formatCurrency(run.totalGrossAmount)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex gap-2">
                            {run.status === 'DRAFT' && (
                              <button
                                onClick={() => handleProcessPayrollRun(run)}
                                disabled={loading}
                                className="px-2 py-1 bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 rounded text-xs hover:bg-primary-100 disabled:opacity-50"
                              >
                                Process
                              </button>
                            )}
                            {run.status === 'PROCESSED' && (
                              <button
                                onClick={() => handleApprovePayrollRun(run)}
                                disabled={loading}
                                className="px-2 py-1 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100 disabled:opacity-50"
                              >
                                Approve
                              </button>
                            )}
                            <button
                              onClick={() => handleEditPayrollRun(run)}
                              className="px-2 py-1 bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 rounded text-xs hover:bg-primary-100"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                setSelectedPayrollRun(run);
                                setShowRunDeleteConfirm(true);
                              }}
                              className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* PAYSLIPS TAB */}
        {activeTab === 'payslips' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <div className="flex gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">Month</label>
                  <input
                    type="month"
                    value={payslipSearchMonth}
                    onChange={(e) => setPayslipSearchMonth(e.target.value)}
                    className="px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                    Employee Name
                  </label>
                  <input
                    type="text"
                    placeholder="Search by employee..."
                    value={payslipSearchEmployee}
                    onChange={(e) => setPayslipSearchEmployee(e.target.value)}
                    className="px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <button
                onClick={handleCreatePayslip}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
              >
                Create Payslip
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12 text-surface-600 dark:text-surface-400">Loading payslips...</div>
            ) : filteredPayslips.length === 0 ? (
              <div className="bg-white dark:bg-surface-900 rounded-lg shadow-md p-12 text-center">
                <div className="text-surface-600 dark:text-surface-400 mb-4">No payslips found</div>
                <button
                  onClick={handleCreatePayslip}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                  Create Your First Payslip
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPayslips.map((payslip) => (
                  <div key={payslip.id} className="bg-white dark:bg-surface-900 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{payslip.employeeName}</h3>
                        <p className="text-sm text-surface-600 dark:text-surface-400">{payslip.payrollRunName}</p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                          payslip.status
                        )}`}
                      >
                        {payslip.status}
                      </span>
                    </div>

                    <div className="mb-4 pb-4 border-b">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-surface-600 dark:text-surface-400">Period</span>
                        <span className="font-medium">
                          {formatDate(payslip.payrollPeriodStart)} -{' '}
                          {formatDate(payslip.payrollPeriodEnd)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-surface-600 dark:text-surface-400">Base Salary</span>
                        <span className="font-medium">{formatCurrency(payslip.baseSalary)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-surface-600 dark:text-surface-400">Allowances</span>
                        <span className="text-green-600 font-medium">
                          {formatCurrency(payslip.allowances)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-surface-600 dark:text-surface-400">Deductions</span>
                        <span className="text-red-600 font-medium">
                          {formatCurrency(payslip.deductions)}
                        </span>
                      </div>
                      <div className="border-t pt-3 flex justify-between text-sm font-semibold">
                        <span className="text-surface-800 dark:text-surface-200">Net Amount</span>
                        <span className="text-primary-600 dark:text-primary-400">{formatCurrency(payslip.netAmount)}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditPayslip(payslip)}
                        className="flex-1 px-3 py-2 bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 rounded hover:bg-primary-100 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPayslip(payslip);
                          setShowPayslipDeleteConfirm(true);
                        }}
                        className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* SALARY STRUCTURES TAB */}
        {activeTab === 'structures' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <div className="flex gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                    Filter by Status
                  </label>
                  <select
                    value={structureFilter}
                    onChange={(e) => setStructureFilter(e.target.value as any)}
                    className="px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="ALL">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="PENDING">Pending</option>
                  </select>
                </div>
              </div>
              <button
                onClick={handleCreateStructure}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
              >
                Create Structure
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12 text-surface-600 dark:text-surface-400">Loading salary structures...</div>
            ) : filteredStructures.length === 0 ? (
              <div className="bg-white dark:bg-surface-900 rounded-lg shadow-md p-12 text-center">
                <div className="text-surface-600 dark:text-surface-400 mb-4">No salary structures found</div>
                <button
                  onClick={handleCreateStructure}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                  Create Your First Structure
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredStructures.map((structure) => (
                  <div key={structure.id} className="bg-white dark:bg-surface-900 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{structure.employeeName}</h3>
                        <p className="text-sm text-surface-600 dark:text-surface-400">
                          Effective: {formatDate(structure.effectiveDate)}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                          structure.status
                        )}`}
                      >
                        {structure.status}
                      </span>
                    </div>

                    <div className="mb-6 pb-6 border-b">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-surface-600 dark:text-surface-400">Base Salary</span>
                          <p className="font-semibold text-lg">
                            {formatCurrency(structure.baseSalary)}
                          </p>
                        </div>
                        <div>
                          <span className="text-surface-600 dark:text-surface-400">Total CTC</span>
                          <p className="font-semibold text-lg">
                            {formatCurrency(structure.totalCTC)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {structure.allowances && structure.allowances.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-semibold text-sm mb-2 text-green-700">Allowances</h4>
                        <div className="space-y-1">
                          {structure.allowances.map((allow, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-surface-600 dark:text-surface-400">{allow.name}</span>
                              <span className="text-green-600 font-medium">
                                {formatCurrency(allow.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {structure.deductions && structure.deductions.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-semibold text-sm mb-2 text-red-700">Deductions</h4>
                        <div className="space-y-1">
                          {structure.deductions.map((ded, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-surface-600 dark:text-surface-400">{ded.name}</span>
                              <span className="text-red-600 font-medium">
                                {formatCurrency(ded.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditStructure(structure)}
                        className="flex-1 px-3 py-2 bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 rounded hover:bg-primary-100 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setSelectedStructure(structure);
                          setShowStructureDeleteConfirm(true);
                        }}
                        className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ============ PAYROLL RUN MODAL ============ */}
      {payrollRunModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-surface-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">
                {payrollRunModal.mode === 'create' ? 'Create Payroll Run' : 'Edit Payroll Run'}
              </h2>
              <form onSubmit={handleSubmitPayrollRun}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                      Run Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={payrollRunForm.runName}
                      onChange={(e) =>
                        setPayrollRunForm({ ...payrollRunForm, runName: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g., November 2024 Payroll"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                        Period Start *
                      </label>
                      <input
                        type="date"
                        required
                        value={payrollRunForm.payrollPeriodStart}
                        onChange={(e) =>
                          setPayrollRunForm({
                            ...payrollRunForm,
                            payrollPeriodStart: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                        Period End *
                      </label>
                      <input
                        type="date"
                        required
                        value={payrollRunForm.payrollPeriodEnd}
                        onChange={(e) =>
                          setPayrollRunForm({
                            ...payrollRunForm,
                            payrollPeriodEnd: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                      Payment Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={payrollRunForm.paymentDate}
                      onChange={(e) =>
                        setPayrollRunForm({ ...payrollRunForm, paymentDate: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">Notes</label>
                    <textarea
                      value={payrollRunForm.notes}
                      onChange={(e) =>
                        setPayrollRunForm({ ...payrollRunForm, notes: e.target.value })
                      }
                      rows={3}
                      className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Additional notes..."
                    />
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setPayrollRunModal({ isOpen: false, mode: 'create' })}
                    className="flex-1 px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ============ PAYSLIP MODAL ============ */}
      {payslipModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-surface-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">
                {payslipModal.mode === 'create' ? 'Create Payslip' : 'Edit Payslip'}
              </h2>
              <form onSubmit={handleSubmitPayslip}>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                        Employee ID *
                      </label>
                      <input
                        type="text"
                        required
                        value={payslipForm.employeeId}
                        onChange={(e) =>
                          setPayslipForm({ ...payslipForm, employeeId: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                        Payroll Run ID *
                      </label>
                      <input
                        type="text"
                        required
                        value={payslipForm.payrollRunId}
                        onChange={(e) =>
                          setPayslipForm({ ...payslipForm, payrollRunId: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                        Period Start *
                      </label>
                      <input
                        type="date"
                        required
                        value={payslipForm.payrollPeriodStart}
                        onChange={(e) =>
                          setPayslipForm({
                            ...payslipForm,
                            payrollPeriodStart: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                        Period End *
                      </label>
                      <input
                        type="date"
                        required
                        value={payslipForm.payrollPeriodEnd}
                        onChange={(e) =>
                          setPayslipForm({
                            ...payslipForm,
                            payrollPeriodEnd: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                      Payment Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={payslipForm.paymentDate}
                      onChange={(e) =>
                        setPayslipForm({ ...payslipForm, paymentDate: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                        Base Salary *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={payslipForm.baseSalary}
                        onChange={(e) =>
                          setPayslipForm({
                            ...payslipForm,
                            baseSalary: parseFloat(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                        Allowances
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={payslipForm.allowances}
                        onChange={(e) =>
                          setPayslipForm({
                            ...payslipForm,
                            allowances: parseFloat(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                        Deductions
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={payslipForm.deductions}
                        onChange={(e) =>
                          setPayslipForm({
                            ...payslipForm,
                            deductions: parseFloat(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setPayslipModal({ isOpen: false, mode: 'create' })}
                    className="flex-1 px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ============ SALARY STRUCTURE MODAL ============ */}
      {structureModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-surface-900 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">
                {structureModal.mode === 'create'
                  ? 'Create Salary Structure'
                  : 'Edit Salary Structure'}
              </h2>
              <form onSubmit={handleSubmitStructure}>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                        Employee ID *
                      </label>
                      <input
                        type="text"
                        required
                        value={structureForm.employeeId}
                        onChange={(e) =>
                          setStructureForm({ ...structureForm, employeeId: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                        Effective Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={structureForm.effectiveDate}
                        onChange={(e) =>
                          setStructureForm({ ...structureForm, effectiveDate: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                      Base Salary *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={structureForm.baseSalary}
                      onChange={(e) =>
                        setStructureForm({
                          ...structureForm,
                          baseSalary: parseFloat(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  {/* Allowances */}
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-green-700">Allowances</h3>
                      <button
                        type="button"
                        onClick={() => handleAddComponent('allowances')}
                        className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        Add Allowance
                      </button>
                    </div>
                    <div className="space-y-3">
                      {structureForm.allowances?.map((allowance, idx) => (
                        <div key={idx} className="flex gap-3 pb-3 border-b">
                          <div className="flex-1">
                            <input
                              type="text"
                              placeholder="Name"
                              value={allowance.name}
                              onChange={(e) =>
                                handleUpdateComponent('allowances', idx, 'name', e.target.value)
                              }
                              className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                          <div className="w-24">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Amount"
                              value={allowance.amount}
                              onChange={(e) =>
                                handleUpdateComponent(
                                  'allowances',
                                  idx,
                                  'amount',
                                  parseFloat(e.target.value)
                                )
                              }
                              className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveComponent('allowances', idx)}
                            className="px-2 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Deductions */}
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-red-700">Deductions</h3>
                      <button
                        type="button"
                        onClick={() => handleAddComponent('deductions')}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        Add Deduction
                      </button>
                    </div>
                    <div className="space-y-3">
                      {structureForm.deductions?.map((deduction, idx) => (
                        <div key={idx} className="flex gap-3 pb-3 border-b">
                          <div className="flex-1">
                            <input
                              type="text"
                              placeholder="Name"
                              value={deduction.name}
                              onChange={(e) =>
                                handleUpdateComponent('deductions', idx, 'name', e.target.value)
                              }
                              className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                          <div className="w-24">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Amount"
                              value={deduction.amount}
                              onChange={(e) =>
                                handleUpdateComponent(
                                  'deductions',
                                  idx,
                                  'amount',
                                  parseFloat(e.target.value)
                                )
                              }
                              className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveComponent('deductions', idx)}
                            className="px-2 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setStructureModal({ isOpen: false, mode: 'create' })}
                    className="flex-1 px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ============ DELETE CONFIRMATION MODALS ============ */}
      {showRunDeleteConfirm && selectedPayrollRun && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-surface-900 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Delete Payroll Run</h2>
            <p className="text-surface-600 dark:text-surface-400 mb-6">
              Are you sure you want to delete "{selectedPayrollRun.runName}"? This action cannot
              be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowRunDeleteConfirm(false);
                  setSelectedPayrollRun(null);
                }}
                className="flex-1 px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePayrollRun}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPayslipDeleteConfirm && selectedPayslip && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-surface-900 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Delete Payslip</h2>
            <p className="text-surface-600 dark:text-surface-400 mb-6">
              Are you sure you want to delete the payslip for {selectedPayslip.employeeName}?
              This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowPayslipDeleteConfirm(false);
                  setSelectedPayslip(null);
                }}
                className="flex-1 px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePayslip}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showStructureDeleteConfirm && selectedStructure && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-surface-900 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Delete Salary Structure</h2>
            <p className="text-surface-600 dark:text-surface-400 mb-6">
              Are you sure you want to delete the salary structure for {selectedStructure.employeeName}?
              This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowStructureDeleteConfirm(false);
                  setSelectedStructure(null);
                }}
                className="flex-1 px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteStructure}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </AppLayout>
  );
}
