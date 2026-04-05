'use client';

import React, {useEffect, useState} from 'react';
import {motion} from 'framer-motion';
import {AppLayout} from '@/components/layout';
import {Download, Loader2, TrendingUp, X,} from 'lucide-react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {ReportRequest, reportService} from '@/lib/services/core/report.service';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';

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
      setError((err as {
        response?: { data?: { message?: string } }
      })?.response?.data?.message || 'Failed to download report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout activeMenuItem="reports">
      <div className="p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{opacity: 0, y: -20}}
          animate={{opacity: 1, y: 0}}
          className="row-between"
        >
          <div>
            <h1 className="text-2xl font-bold skeuo-emboss">Performance Reports</h1>
            <p className="text-[var(--text-secondary)] mt-1">
              Generate performance review reports with ratings and goal achievements
            </p>
          </div>
        </motion.div>

        {/* Success Message */}
        {successMessage && (
          <motion.div
            initial={{opacity: 0, y: -10}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, y: -10}}
            className="p-4 bg-success-50 dark:bg-success-950/20 border border-success-200 dark:border-success-800 rounded-lg"
          >
            <span className="text-success-700 dark:text-success-400">{successMessage}</span>
          </motion.div>
        )}

        {/* Main Card */}
        <motion.div
          initial={{opacity: 0, y: 20}}
          animate={{opacity: 1, y: 0}}
          transition={{delay: 0.1}}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-accent-600"/>
                Performance Report Configuration
              </CardTitle>
              <CardDescription>
                Configure filters and export format for performance reports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-4">
                  Review Period (Optional)
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-caption mb-1">From</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="input-aura"
                    />
                  </div>
                  <div>
                    <label className="block text-caption mb-1">To</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="input-aura"
                    />
                  </div>
                </div>
                <p className="text-caption mt-2">
                  Leave empty to include all performance reviews
                </p>
              </div>

              {/* Format Selection */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-4">
                  Export Format
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {(['EXCEL', 'PDF', 'CSV'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setFormat(fmt)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        format === fmt
                          ? 'border-accent-500 bg-accent-50 dark:bg-accent-950/20'
                          : 'border-[var(--border-main)] hover:border-[var(--border-main)]'
                      }`}
                    >
                      <p
                        className={`font-medium text-sm ${format === fmt ? 'text-accent-700' : 'text-[var(--text-secondary)]'}`}>
                        {fmt}
                      </p>
                      <p className="text-caption">
                        .{fmt === 'EXCEL' ? 'xlsx' : fmt.toLowerCase()}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div
                  className="p-4 bg-danger-50 dark:bg-danger-950/20 border border-danger-200 dark:border-danger-800 rounded-lg flex items-start gap-2">
                  <X className="h-5 w-5 text-danger-600 flex-shrink-0 mt-0.5"/>
                  <span className="text-sm text-danger-600 dark:text-danger-400">{error}</span>
                </div>
              )}

              {/* Download Button */}
              <PermissionGate permission={Permissions.REPORT_VIEW}>
                <button
                  onClick={handleDownload}
                  disabled={loading}
                  className="w-full btn-primary !h-auto disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin"/>
                      Generating Report...
                    </>
                  ) : (
                    <>
                      <Download className="h-5 w-5"/>
                      Download Performance Report
                    </>
                  )}
                </button>
              </PermissionGate>
            </CardContent>
          </Card>
        </motion.div>

        {/* Info Card */}
        <motion.div initial={{opacity: 0}} animate={{opacity: 1}} transition={{delay: 0.2}}>
          <Card className="bg-accent-50 dark:bg-accent-950/20 border-accent-200 dark:border-accent-900">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <TrendingUp className="h-5 w-5 text-accent-600 dark:text-accent-400 mt-0.5"/>
                <div>
                  <h3 className="font-semibold text-accent-900 dark:text-accent-100">Report Details</h3>
                  <ul className="text-sm text-accent-700 dark:text-accent-300 mt-2 space-y-1">
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
