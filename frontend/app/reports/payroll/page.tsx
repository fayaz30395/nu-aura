'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layout';
import {
  Download,
  DollarSign,
  Calendar,
  Filter,
  Loader2,
  X,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { reportService, ReportRequest } from '@/lib/services/report.service';

export default function PayrollReportsPage() {
  const [format, setFormat] = useState<'EXCEL' | 'PDF' | 'CSV'>('EXCEL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleDownload = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const request: ReportRequest = {
        format,
        startDate,
        endDate,
      };

      await reportService.downloadPayrollReport(request);
      setSuccessMessage(`Payroll report downloaded successfully in ${format} format!`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to download report. Please try again.');
    } finally {
      setLoading(false);
    }
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
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Payroll Reports</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Generate comprehensive payroll reports with salary breakdowns
            </p>
          </div>
        </motion.div>

        {/* Success Message */}
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg"
          >
            <span className="text-green-700 dark:text-green-400">{successMessage}</span>
          </motion.div>
        )}

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-purple-600" />
                Payroll Report Configuration
              </CardTitle>
              <CardDescription>
                Configure date range and export format for payroll reports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Payroll Period <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">From</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">To</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Format Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Export Format
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['EXCEL', 'PDF', 'CSV'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setFormat(fmt)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        format === fmt
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <p className={`font-medium text-sm ${format === fmt ? 'text-purple-700' : 'text-slate-700 dark:text-slate-300'}`}>
                        {fmt}
                      </p>
                      <p className="text-xs text-slate-500">
                        .{fmt === 'EXCEL' ? 'xlsx' : fmt.toLowerCase()}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                  <X className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
                </div>
              )}

              {/* Download Button */}
              <button
                onClick={handleDownload}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generating Report...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    Download Payroll Report
                  </>
                )}
              </button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Info Card */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-purple-900 dark:text-purple-100">Report Details</h3>
                  <ul className="text-sm text-purple-700 dark:text-purple-300 mt-2 space-y-1">
                    <li>• Includes employee code, name, department, and designation</li>
                    <li>• Shows basic salary, allowances, and total earnings</li>
                    <li>• Displays deductions breakdown and net salary</li>
                    <li>• Payment status and date information included</li>
                    <li>• Confidential information - handle with care</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
}
