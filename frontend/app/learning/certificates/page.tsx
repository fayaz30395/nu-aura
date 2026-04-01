'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/utils/logger';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  Share2,
  Printer,
  Award,
  Calendar,
  Filter,
  Search,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { apiClient } from '@/lib/api/client';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';
import { useToast } from '@/components/notifications/ToastProvider';
import { useMyCertificates } from '@/lib/hooks/queries/useLearning';
import type { Certificate } from '@/lib/services/grow/lms.service';
import { safeWindowOpen } from '@/lib/utils/url';

export default function CertificateGalleryPage() {
  const router = useRouter();
  const toast = useToast();
  const { hasPermission, isReady: permReady } = usePermissions();
  const [searchQuery, setSearchQuery] = useState('');

  // A3: Permission gate — redirect if user lacks LMS:CERTIFICATE_VIEW
  useEffect(() => {
    if (!permReady) return;
    if (!hasPermission(Permissions.LMS_CERTIFICATE_VIEW)) {
      router.replace('/dashboard');
    }
  }, [permReady, hasPermission, router]);
  const [dateFilter, setDateFilter] = useState('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
  }, []);

  // Query
  const { data: certificates = [], isLoading } = useMyCertificates();

  // Apply filters
  const filteredCerts = (() => {
    let filtered = certificates;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(c =>
        c.courseTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.certificateNumber.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by date range
    if (dateFilter !== 'ALL') {
      filtered = filtered.filter(c => {
        const certDate = new Date(c.issuedAt);
        const daysDiff = Math.floor((new Date().getTime() - certDate.getTime()) / (1000 * 60 * 60 * 24));

        switch (dateFilter) {
          case 'LAST_30':
            return daysDiff <= 30;
          case 'LAST_90':
            return daysDiff <= 90;
          case 'LAST_YEAR':
            return daysDiff <= 365;
          default:
            return true;
        }
      });
    }

    return filtered;
  })();

  const handleDownload = async (certId: string, certNumber: string) => {
    try {
      // In a real implementation, this would trigger a PDF download
      const response = await apiClient.get<Blob>(`/lms/certificates/${certId}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(response.data as Blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `certificate-${certNumber}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      logger.error('Failed to download certificate:', err);
      toast.error('Failed to download certificate');
    }
  };

  const handlePrint = (certId: string) => {
    safeWindowOpen(`/learning/certificates/${certId}/print`, '_blank');
  };

  const handleShareLinkedIn = (certificate: Certificate) => {
    const linkedInUrl = `https://www.linkedin.com/feed/?v=create-charter`;
    const text = `I just completed "${certificate.courseTitle}" and earned a certificate! #SkillDevelopment #Learning`;
    const shareUrl = `${linkedInUrl}&quote=${encodeURIComponent(text)}`;
    safeWindowOpen(shareUrl, '_blank');
  };

  const handleCopyCertificateNumber = (certNumber: string) => {
    navigator.clipboard.writeText(certNumber);
    setCopiedId(certNumber);
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return <span className="badge-status px-4 py-1 bg-success-100 text-success-800 dark:bg-success-900/50 dark:text-success-300 rounded-full text-xs font-semibold">Active</span>;
    }
    return <span className="badge-status px-4 py-1 bg-danger-100 text-danger-800 dark:bg-danger-900/50 dark:text-danger-300 rounded-full text-xs font-semibold">Expired</span>;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <AppLayout activeMenuItem="learning">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/learning" className="flex items-center gap-1 text-accent-600 hover:text-accent-700 mb-4 w-fit text-sm">
            <ArrowLeft className="h-4 w-4" /> Back to Learning
          </Link>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss mb-2">My Certificates</h1>
          <p className="text-[var(--text-secondary)]">Collection of all earned certificates and credentials</p>
        </div>

        {/* Summary Stats */}
        {!isLoading && certificates.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="skeuo-card bg-[var(--bg-input)] rounded-lg shadow-[var(--shadow-elevated)] p-6">
              <div className="text-3xl font-bold text-accent-600 dark:text-accent-400">{certificates.length}</div>
              <div className="text-[var(--text-secondary)] text-sm">Total Certificates</div>
            </div>
            <div className="skeuo-card bg-[var(--bg-input)] rounded-lg shadow-[var(--shadow-elevated)] p-6">
              <div className="text-3xl font-bold text-success-600 dark:text-success-400">
                {certificates.filter(c => c.isActive).length}
              </div>
              <div className="text-[var(--text-secondary)] text-sm">Active Credentials</div>
            </div>
            <div className="skeuo-card bg-[var(--bg-input)] rounded-lg shadow-[var(--shadow-elevated)] p-6">
              <div className="text-3xl font-bold text-warning-600 dark:text-warning-400">
                {certificates.reduce((sum, c) => sum + (c.scoreAchieved || 0), 0) / Math.max(certificates.length, 1) | 0}%
              </div>
              <div className="text-[var(--text-secondary)] text-sm">Average Score</div>
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <div className="bg-[var(--bg-input)] rounded-lg shadow-[var(--shadow-elevated)] p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search by course name or certificate number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-aura w-full pl-10 pr-4 py-2 border border-[var(--border-main)] rounded-lg focus:outline-none focus:border-accent-600 dark:bg-[var(--bg-secondary)] dark:text-white"
              />
            </div>

            {/* Date Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-[var(--text-secondary)]" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="flex-1 px-4 py-2 border border-[var(--border-main)] rounded-lg focus:outline-none focus:border-accent-600 dark:bg-[var(--bg-secondary)] dark:text-white"
              >
                <option value="ALL">All Time</option>
                <option value="LAST_30">Last 30 Days</option>
                <option value="LAST_90">Last 90 Days</option>
                <option value="LAST_YEAR">Last Year</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-4 border-accent-600 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-[var(--text-muted)]">Loading certificates...</p>
            </div>
          </div>
        ) : filteredCerts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCerts.map((cert) => (
              <div
                key={cert.id}
                className="bg-gradient-to-br from-accent-50 to-accent-250 dark:from-surface-700 dark:to-surface-800 rounded-lg shadow-[var(--shadow-elevated)] overflow-hidden hover:shadow-[var(--shadow-dropdown)] transition-shadow border-l-4 border-warning-500"
              >
                {/* Header */}
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="p-4 bg-warning-100 dark:bg-warning-900/30 rounded-lg">
                        <Award className="h-6 w-6 text-warning-600 dark:text-warning-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-[var(--text-primary)] text-sm line-clamp-2">{cert.courseTitle}</h3>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">Certificate</p>
                      </div>
                    </div>
                    {getStatusBadge(cert.isActive)}
                  </div>

                  {/* Certificate Number */}
                  <div className="skeuo-card bg-[var(--bg-card)] rounded-lg p-4 mb-4">
                    <div className="text-xs text-[var(--text-secondary)] mb-1">Certificate ID</div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">{cert.certificateNumber}</span>
                      <button
                        onClick={() => handleCopyCertificateNumber(cert.certificateNumber)}
                        className="p-1 hover:bg-[var(--bg-surface)] rounded transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                        title="Copy certificate number"
                        aria-label="Copy certificate number"
                      >
                        {copiedId === cert.certificateNumber ? (
                          <Check className="h-4 w-4 text-success-600" />
                        ) : (
                          <Copy className="h-4 w-4 text-[var(--text-secondary)]" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-4 mb-4 text-sm">
                    <div className="flex items-center justify-between text-[var(--text-primary)]">
                      <span className="text-[var(--text-secondary)]">Issued</span>
                      <span className="font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {formatDate(cert.issuedAt)}
                      </span>
                    </div>

                    {cert.expiryDate && (
                      <div className="flex items-center justify-between text-[var(--text-primary)]">
                        <span className="text-[var(--text-secondary)]">Expires</span>
                        <span className="font-medium">{formatDate(cert.expiryDate)}</span>
                      </div>
                    )}

                    {cert.scoreAchieved && (
                      <div className="flex items-center justify-between text-[var(--text-primary)]">
                        <span className="text-[var(--text-secondary)]">Score</span>
                        <span className="font-bold text-accent-600 dark:text-accent-400">{cert.scoreAchieved}%</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleDownload(cert.id, cert.certificateNumber)}
                      className="btn-primary flex items-center justify-center gap-1 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                      title="Download PDF"
                      aria-label="Download certificate"
                    >
                      <Download className="h-4 w-4" />
                      <span className="hidden sm:inline">Download</span>
                    </button>
                    <button
                      onClick={() => handlePrint(cert.id)}
                      className="flex items-center justify-center gap-1 px-4 py-2 bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-surface)] text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                      title="Print certificate"
                      aria-label="Print certificate"
                    >
                      <Printer className="h-4 w-4" />
                      <span className="hidden sm:inline">Print</span>
                    </button>
                    <button
                      onClick={() => handleShareLinkedIn(cert)}
                      className="flex items-center justify-center gap-1 px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                      title="Share on LinkedIn"
                      aria-label="Share certificate on LinkedIn"
                    >
                      <Share2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Share</span>
                    </button>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gradient-to-r from-accent-500/10 to-accent-700/10 dark:from-accent-900/20 dark:to-accent-900/20 border-t border-[var(--border-main)] dark:border-[var(--border-main)]">
                  <a
                    href={`/learning/certificates/${cert.id}/verify`}
                    className="text-xs font-medium text-accent-600 dark:text-accent-400 hover:text-accent-800 dark:hover:text-accent-300 flex items-center gap-1 w-fit"
                  >
                    Verify Certificate
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[var(--bg-input)] rounded-lg shadow-[var(--shadow-elevated)] p-12 text-center">
            <Award className="h-16 w-16 text-[var(--text-muted)] mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              {searchQuery || dateFilter !== 'ALL' ? 'No matching certificates' : 'No certificates earned yet'}
            </h3>
            <p className="text-[var(--text-secondary)] mb-6">
              {searchQuery || dateFilter !== 'ALL'
                ? 'Try adjusting your search or filter criteria'
                : 'Complete courses to earn certificates and showcase your achievements'}
            </p>
            {(searchQuery || dateFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setDateFilter('ALL');
                }}
                className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 font-medium text-sm inline-flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              >
                Clear Filters
              </button>
            )}
            {!searchQuery && dateFilter === 'ALL' && (
              <Link
                href="/learning"
                className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 font-medium text-sm inline-flex items-center gap-2 ml-2"
              >
                Start Learning
              </Link>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
