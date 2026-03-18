'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppLayout } from '@/components/layout';
import {
  Download,
  FileText,
  Calendar,
  Users,
  DollarSign,
  TrendingUp,
  BarChart3,
  FileSpreadsheet,
  X,
  Check,
  Loader2,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { ReportRequest, ReportType } from '@/lib/services/report.service';
import { useReportDownload } from '@/lib/hooks/queries/useReportDownload';

interface ReportConfig {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  category: string;
  endpoint: string;
  requiresDateRange: boolean;
  filters?: string[];
}

const reports: ReportConfig[] = [
  {
    id: 'employee',
    title: 'Employee Directory Report',
    description: 'Complete employee details with contact information, department, and employment status',
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    category: 'HR',
    endpoint: 'employee-directory',
    requiresDateRange: false,
    filters: ['department', 'status'],
  },
  {
    id: 'attendance',
    title: 'Attendance Report',
    description: 'Daily attendance records with check-in/check-out times and work hours',
    icon: Calendar,
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950/20',
    category: 'Attendance',
    endpoint: 'attendance',
    requiresDateRange: true,
    filters: ['department', 'employee', 'status'],
  },
  {
    id: 'department',
    title: 'Department Headcount Report',
    description: 'Department-wise employee distribution, active/inactive counts, and headcount analysis',
    icon: BarChart3,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50 dark:bg-pink-950/20',
    category: 'Analytics',
    endpoint: 'department-headcount',
    requiresDateRange: false,
  },
  {
    id: 'leave',
    title: 'Leave Report',
    description: 'Leave requests, balances, and utilization by employee and department',
    icon: FileText,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950/20',
    category: 'Leave',
    endpoint: 'leave',
    requiresDateRange: true,
    filters: ['department', 'leaveType', 'status'],
  },
  {
    id: 'payroll',
    title: 'Payroll Report',
    description: 'Monthly payroll summary with earnings, deductions, and net salary',
    icon: DollarSign,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950/20',
    category: 'Payroll',
    endpoint: 'payroll',
    requiresDateRange: true,
    filters: ['department', 'payrollRun'],
  },
  {
    id: 'performance',
    title: 'Performance Report',
    description: 'Employee performance reviews, ratings, and goal achievements',
    icon: TrendingUp,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/20',
    category: 'Performance',
    endpoint: 'performance',
    requiresDateRange: false,
    filters: ['department', 'reviewCycle'],
  },
];

interface DownloadModalProps {
  report: ReportConfig;
  onClose: () => void;
  onDownload: (type: ReportType, request: ReportRequest) => void;
  isPending: boolean;
}

const DownloadModal: React.FC<DownloadModalProps> = ({ report, onClose, onDownload, isPending }) => {
  const [format, setFormat] = useState<'EXCEL' | 'PDF' | 'CSV'>('EXCEL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');

  const handleDownload = () => {
    if (report.requiresDateRange && (!startDate || !endDate)) {
      setError('Please select both start and end dates');
      return;
    }

    setError('');

    const request: ReportRequest = {
      format,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    };

    onDownload(report.endpoint as ReportType, request);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-overlay)] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[var(--bg-card)] rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-2 rounded-lg ${report.bgColor}`}>
              <report.icon className={`h-5 w-5 ${report.color}`} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">{report.title}</h3>
              <p className="text-sm text-slate-500">{report.category}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Export Format
            </label>
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => setFormat('EXCEL')}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  format === 'EXCEL'
                    ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <FileSpreadsheet
                  className={`h-6 w-6 ${format === 'EXCEL' ? 'text-green-600' : 'text-slate-400'}`}
                />
                <div className="text-center">
                  <p className={`font-medium text-sm ${format === 'EXCEL' ? 'text-green-700' : 'text-slate-700 dark:text-slate-300'}`}>
                    Excel
                  </p>
                  <p className="text-xs text-slate-500">.xlsx</p>
                </div>
                {format === 'EXCEL' && <Check className="h-4 w-4 text-green-600 absolute top-2 right-2" />}
              </button>

              <button
                onClick={() => setFormat('PDF')}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all relative ${
                  format === 'PDF'
                    ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <FileText className={`h-6 w-6 ${format === 'PDF' ? 'text-red-600' : 'text-slate-400'}`} />
                <div className="text-center">
                  <p className={`font-medium text-sm ${format === 'PDF' ? 'text-red-700' : 'text-slate-700 dark:text-slate-300'}`}>
                    PDF
                  </p>
                  <p className="text-xs text-slate-500">.pdf</p>
                </div>
                {format === 'PDF' && <Check className="h-4 w-4 text-red-600 absolute top-2 right-2" />}
              </button>

              <button
                onClick={() => setFormat('CSV')}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all relative ${
                  format === 'CSV'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <FileSpreadsheet
                  className={`h-6 w-6 ${format === 'CSV' ? 'text-blue-600' : 'text-slate-400'}`}
                />
                <div className="text-center">
                  <p className={`font-medium text-sm ${format === 'CSV' ? 'text-blue-700' : 'text-slate-700 dark:text-slate-300'}`}>
                    CSV
                  </p>
                  <p className="text-xs text-slate-500">.csv</p>
                </div>
                {format === 'CSV' && <Check className="h-4 w-4 text-blue-600 absolute top-2 right-2" />}
              </button>
            </div>
          </div>

          {/* Date Range (if required) */}
          {report.requiresDateRange && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Date Range <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">From</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">To</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportConfig | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const downloadMutation = useReportDownload();

  const handleDownload = (type: ReportType, request: ReportRequest) => {
    if (!selectedReport) return;

    downloadMutation.mutate(
      { type, request },
      {
        onSuccess: () => {
          setSuccessMessage(`${selectedReport.title} downloaded successfully!`);
          setTimeout(() => setSuccessMessage(''), 3000);
          setSelectedReport(null);
        },
      }
    );
  };

  return (
    <AppLayout activeMenuItem="reports">
      <div className="p-6 space-y-6">
        {/* Header */}
        <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Reports</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Generate and download various HR reports in Excel or PDF format
          </p>
        </div>
      </motion.div>

      {/* Success Message */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-4"
          >
            <Check className="h-5 w-5 text-green-600" />
            <span className="text-green-700 dark:text-green-400">{successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report, index) => {
          const IconComponent = report.icon;
          return (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow duration-200 h-full flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className={`p-4 rounded-lg ${report.bgColor}`}>
                      <IconComponent className={`h-6 w-6 ${report.color}`} />
                    </div>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {report.category}
                    </span>
                  </div>
                  <CardTitle className="mt-4">{report.title}</CardTitle>
                  <CardDescription>{report.description}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto">
                  <div className="flex flex-col gap-4">
                    {report.requiresDateRange && (
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Calendar className="h-3 w-3" />
                        <span>Requires date range</span>
                      </div>
                    )}
                    {report.filters && report.filters.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Filter className="h-3 w-3" />
                        <span>Filters available</span>
                      </div>
                    )}
                    <button
                      onClick={() => setSelectedReport(report)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors duration-200"
                    >
                      <Download className="h-4 w-4" />
                      <span className="text-sm font-medium">Download Report</span>
                    </button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Info Card */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">Report Generation Tips</h3>
                <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1">
                  <li>• Excel format is recommended for data analysis and further processing</li>
                  <li>• PDF format is ideal for printing and sharing official documents</li>
                  <li>• CSV format provides raw data compatible with all spreadsheet applications</li>
                  <li>• Use date filters to generate reports for specific time periods</li>
                  <li>• Reports include all active employees unless filtered by department</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Download Modal */}
      <AnimatePresence>
        {selectedReport && (
          <DownloadModal
            report={selectedReport}
            onClose={() => setSelectedReport(null)}
            onDownload={handleDownload}
            isPending={downloadMutation.isPending}
          />
        )}
      </AnimatePresence>
      </div>
    </AppLayout>
  );
}
