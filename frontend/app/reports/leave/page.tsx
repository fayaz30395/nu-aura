'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layout';
import {
  Download,
  FileText,
  Calendar,
  Filter,
  Loader2,
  X,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { reportService, ReportRequest } from '@/lib/services/report.service';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';

export default function LeaveReportsPage() {
  const [format, setFormat] = useState<'EXCEL' | 'PDF' | 'CSV'>('EXCEL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [leaveStatus, setLeaveStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Auto-clear success message with proper cleanup
  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(''), 3000);
    return () => clearTimeout(t);
  }, [successMessage]);

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
        leaveStatus: leaveStatus || undefined,
      };

      await reportService.downloadLeaveReport(request);
      setSuccessMessage(`Leave report downloaded successfully in ${format} format!`);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to download report. Please try again.');
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
            <h1 className="text-3xl font-bold text-[var(--text-primary)] skeuo-emboss">Leave Reports</h1>
            <p className="text-[var(--text-secondary)] mt-1">
              Generate leave request reports with customizable filters
            </p>
          </div>
        </motion.div>

        {/* Success Message */}
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-success-50 dark:bg-success-950/20 border border-success-200 dark:border-success-800 rounded-lg"
          >
            <span className="text-success-700 dark:text-success-400">{successMessage}</span>
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
                <FileText className="h-5 w-5 text-warning-600" />
                Leave Report Configuration
              </CardTitle>
              <CardDescription>
                Configure filters and export format for leave reports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
                  Date Range <span className="text-danger-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[var(--text-muted)] mb-1">From</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="input-aura"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--text-muted)] mb-1">To</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="input-aura"
                    />
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filters (Optional)
                </label>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-[var(--text-muted)] mb-1">Leave Status</label>
                    <select
                      value={leaveStatus}
                      onChange={(e) => setLeaveStatus(e.target.value)}
                      className="input-aura"
                    >
                      <option value="">All Statuses</option>
                      <option value="PENDING">Pending</option>
                      <option value="APPROVED">Approved</option>
                      <option value="REJECTED">Rejected</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Format Selection */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
                  Export Format
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {(['EXCEL', 'PDF', 'CSV'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setFormat(fmt)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        format === fmt
                          ? 'border-warning-500 bg-warning-50 dark:bg-warning-950/20'
                          : 'border-[var(--border-main)] hover:border-[var(--border-main)]'
                      }`}
                    >
                      <p className={`font-medium text-sm ${format === fmt ? 'text-warning-700' : 'text-[var(--text-secondary)]'}`}>
                        {fmt}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        .{fmt === 'EXCEL' ? 'xlsx' : fmt.toLowerCase()}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="p-4 bg-danger-50 dark:bg-danger-950/20 border border-danger-200 dark:border-danger-800 rounded-lg flex items-start gap-2">
                  <X className="h-5 w-5 text-danger-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-danger-600 dark:text-danger-400">{error}</span>
                </div>
              )}

              {/* Download Button */}
              <PermissionGate permission={Permissions.REPORT_VIEW}>
                <button
                  onClick={handleDownload}
                  disabled={loading}
                  className="w-full btn-primary !h-auto disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Generating Report...
                    </>
                  ) : (
                    <>
                      <Download className="h-5 w-5" />
                      Download Leave Report
                    </>
                  )}
                </button>
              </PermissionGate>
            </CardContent>
          </Card>
        </motion.div>

        {/* Info Card */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <Card className="bg-warning-50 dark:bg-warning-950/20 border-warning-200 dark:border-warning-900">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <Calendar className="h-5 w-5 text-warning-600 dark:text-warning-400 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-warning-900 dark:text-warning-100">Report Details</h3>
                  <ul className="text-sm text-warning-700 dark:text-warning-300 mt-2 space-y-1">
                    <li>• Includes employee code, name, department, and leave details</li>
                    <li>• Shows leave type, start/end dates, and number of days</li>
                    <li>• Displays leave status and approval information</li>
                    <li>• Filter by status to focus on specific leave request types</li>
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
