'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layout';
import {
  Download,
  TrendingUp,
  Loader2,
  X,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { reportService, ReportRequest } from '@/lib/services/report.service';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';

export default function PerformanceReportsPage() {
  const [format, setFormat] = useState<'EXCEL' | 'PDF' | 'CSV'>('EXCEL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
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
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const request: ReportRequest = {
        format,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };

      await reportService.downloadPerformanceReport(request);
      setSuccessMessage(`Performance report downloaded successfully in ${format} format!`);
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
            <h1 className="text-3xl font-bold text-[var(--text-primary)] skeuo-emboss">Performance Reports</h1>
            <p className="text-[var(--text-secondary)] mt-1">
              Generate performance review reports with ratings and goal achievements
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
                <TrendingUp className="h-5 w-5 text-indigo-600" />
                Performance Report Configuration
              </CardTitle>
              <CardDescription>
                Configure filters and export format for performance reports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
                  Review Period (Optional)
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
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  Leave empty to include all performance reviews
                </p>
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
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20'
                          : 'border-[var(--border-main)] hover:border-[var(--border-main)]'
                      }`}
                    >
                      <p className={`font-medium text-sm ${format === fmt ? 'text-indigo-700' : 'text-[var(--text-secondary)]'}`}>
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
                <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                  <X className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
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
                      Download Performance Report
                    </>
                  )}
                </button>
              </PermissionGate>
            </CardContent>
          </Card>
        </motion.div>

        {/* Info Card */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <Card className="bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-indigo-900 dark:text-indigo-100">Report Details</h3>
                  <ul className="text-sm text-indigo-700 dark:text-indigo-300 mt-2 space-y-1">
                    <li>• Includes employee code, name, department, and designation</li>
                    <li>• Shows review cycle, date, and reviewer information</li>
                    <li>• Displays overall rating and performance level</li>
                    <li>• Includes goals completed and manager comments</li>
                    <li>• Confidential information - handle with appropriate permissions</li>
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
