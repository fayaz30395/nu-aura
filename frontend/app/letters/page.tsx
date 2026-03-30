'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  FileText,
  Search,
  Plus,
  Calendar,
  Clock,
  AlertCircle,
  Loader2,
  MoreVertical,
  Eye,
  User,
  Send,
  CheckCircle,
  XCircle,
  Download,
  FileCheck,
  FilePlus,
  Files,
  PenTool,
  UserPlus,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Card,
  CardContent,
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@/components/ui';
import {
  LetterTemplate,
  GeneratedLetter,
  GenerateLetterRequest,
  GenerateOfferLetterRequest,
  LetterCategory,
  LetterStatus,
} from '@/lib/types/letter';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import {
  useAllLetters,
  useActiveLetterTemplates,
  useGenerateLetter,
  useGenerateOfferLetter,
  useIssueLetter,
  useApproveLetter,
  useRevokeLetter,
} from '@/lib/hooks/queries/useLetter';
import { useCandidates } from '@/lib/hooks/queries/useRecruitment';
import { createLogger } from '@/lib/utils/logger';

const log = createLogger('LettersPage');

// Zod schemas for forms
const GenerateLetterFormSchema = z.object({
  templateId: z.string().min(1, 'Template is required'),
  employeeId: z.string().min(1, 'Employee ID is required'),
  letterTitle: z.string().optional().or(z.literal('')),
  letterDate: z.string().min(1, 'Letter date is required'),
  effectiveDate: z.string().optional().or(z.literal('')),
  expiryDate: z.string().optional().or(z.literal('')),
  additionalNotes: z.string().optional().or(z.literal('')),
});

type GenerateLetterFormData = z.infer<typeof GenerateLetterFormSchema>;

const GenerateOfferLetterFormSchema = z.object({
  templateId: z.string().min(1, 'Template is required'),
  candidateId: z.string().min(1, 'Candidate is required'),
  letterTitle: z.string().optional().or(z.literal('')),
  offeredDesignation: z.string().min(1, 'Offered designation is required'),
  offeredCtc: z.number({ coerce: true }).positive('Offered CTC must be greater than 0'),
  proposedJoiningDate: z.string().min(1, 'Proposed joining date is required'),
  letterDate: z.string().min(1, 'Letter date is required'),
  expiryDate: z.string().optional().or(z.literal('')),
  additionalNotes: z.string().optional().or(z.literal('')),
  submitForApproval: z.boolean(),
  sendForESign: z.boolean(),
});

type GenerateOfferLetterFormData = z.infer<typeof GenerateOfferLetterFormSchema>;

const getCategoryLabel = (category: LetterCategory) => {
  const labels: Record<LetterCategory, string> = {
    [LetterCategory.OFFER]: 'Offer Letter',
    [LetterCategory.APPOINTMENT]: 'Appointment Letter',
    [LetterCategory.CONFIRMATION]: 'Confirmation Letter',
    [LetterCategory.PROMOTION]: 'Promotion Letter',
    [LetterCategory.TRANSFER]: 'Transfer Letter',
    [LetterCategory.SALARY_REVISION]: 'Salary Revision Letter',
    [LetterCategory.WARNING]: 'Warning Letter',
    [LetterCategory.TERMINATION]: 'Termination Letter',
    [LetterCategory.RESIGNATION_ACCEPTANCE]: 'Resignation Acceptance',
    [LetterCategory.EXPERIENCE]: 'Experience Letter',
    [LetterCategory.RELIEVING]: 'Relieving Letter',
    [LetterCategory.SALARY_CERTIFICATE]: 'Salary Certificate',
    [LetterCategory.EMPLOYMENT_CERTIFICATE]: 'Employment Certificate',
    [LetterCategory.BONAFIDE]: 'Bonafide Certificate',
    [LetterCategory.VISA_SUPPORT]: 'Visa Support Letter',
    [LetterCategory.BANK_LETTER]: 'Bank Letter',
    [LetterCategory.ADDRESS_PROOF]: 'Address Proof Letter',
    [LetterCategory.INTERNSHIP]: 'Internship Letter',
    [LetterCategory.TRAINING_COMPLETION]: 'Training Completion',
    [LetterCategory.APPRECIATION]: 'Appreciation Letter',
    [LetterCategory.CUSTOM]: 'Custom Letter',
  };
  return labels[category] || category;
};

const getStatusColor = (status: LetterStatus) => {
  switch (status) {
    case LetterStatus.DRAFT:
      return 'bg-[var(--bg-surface)] text-[var(--text-secondary)] dark:bg-[var(--bg-primary)] dark:text-[var(--text-secondary)]';
    case LetterStatus.PENDING_APPROVAL:
      return 'bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-300';
    case LetterStatus.APPROVED:
      return 'bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-300';
    case LetterStatus.ISSUED:
      return 'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300';
    case LetterStatus.REVOKED:
      return 'bg-danger-100 text-danger-700 dark:bg-danger-900 dark:text-danger-300';
    case LetterStatus.EXPIRED:
      return 'bg-accent-300 text-accent-900 dark:bg-accent-900 dark:text-accent-500';
    default:
      return 'bg-[var(--bg-surface)] text-[var(--text-secondary)] dark:bg-[var(--bg-primary)] dark:text-[var(--text-secondary)]';
  }
};

const getStatusLabel = (status: LetterStatus) => {
  const labels: Record<LetterStatus, string> = {
    [LetterStatus.DRAFT]: 'Draft',
    [LetterStatus.PENDING_APPROVAL]: 'Pending Approval',
    [LetterStatus.APPROVED]: 'Approved',
    [LetterStatus.ISSUED]: 'Issued',
    [LetterStatus.REVOKED]: 'Revoked',
    [LetterStatus.EXPIRED]: 'Expired',
  };
  return labels[status] || status;
};

const formatDate = (date: string | undefined) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export default function LettersPage() {
  const router = useRouter();
  const { isAuthenticated, user, hasHydrated } = useAuth();

  // React Query hooks for data fetching
  const [currentPage, setCurrentPage] = useState(0);
  const { data: lettersData, isLoading: lettersLoading, error: lettersError, refetch: refetchLetters } = useAllLetters(currentPage, 20, isAuthenticated && hasHydrated);
  const { data: templatesData, isLoading: _templatesLoading } = useActiveLetterTemplates(isAuthenticated && hasHydrated);
  const { data: candidatesData, isLoading: _candidatesLoading, refetch: refetchCandidates } = useCandidates(0, 100);

  // React Query mutations
  const generateLetterMutation = useGenerateLetter();
  const generateOfferLetterMutation = useGenerateOfferLetter();
  const issueLetterMutation = useIssueLetter();
  const approveLetterMutation = useApproveLetter();
  const revokeLetterMutation = useRevokeLetter();

  // Local UI state (not server data)
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'letters' | 'templates'>('letters');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showOfferLetterModal, setShowOfferLetterModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState<GeneratedLetter | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<LetterTemplate | null>(null);

  // Derived state from React Query data
  const templates: LetterTemplate[] = templatesData ?? [];
  const allLetters: GeneratedLetter[] = lettersData?.content ?? [];
  const totalElements = lettersData?.totalElements ?? 0;
  const totalPages = lettersData?.totalPages ?? 0;

  // Filter letters client-side (same logic as before)
  let filteredLetters = allLetters;
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filteredLetters = filteredLetters.filter(
      (l) =>
        l.letterTitle?.toLowerCase().includes(query) ||
        l.referenceNumber?.toLowerCase().includes(query) ||
        l.employeeName?.toLowerCase().includes(query)
    );
  }
  if (statusFilter) {
    filteredLetters = filteredLetters.filter((l) => l.status === statusFilter);
  }
  if (categoryFilter) {
    filteredLetters = filteredLetters.filter((l) => l.category === categoryFilter);
  }

  // Filter eligible candidates for offer letters
  const eligibleCandidates = (candidatesData?.content ?? []).filter(
    (c) => c.status === 'SELECTED' || c.status === 'OFFER_EXTENDED'
  );

  // Form hooks
  const generateLetterForm = useForm<GenerateLetterFormData>({
    resolver: zodResolver(GenerateLetterFormSchema),
    defaultValues: {
      templateId: '',
      employeeId: '',
      letterTitle: '',
      letterDate: new Date().toISOString().split('T')[0],
      effectiveDate: '',
      expiryDate: '',
      additionalNotes: '',
    },
  });

  const offerLetterForm = useForm<GenerateOfferLetterFormData>({
    resolver: zodResolver(GenerateOfferLetterFormSchema),
    defaultValues: {
      templateId: '',
      candidateId: '',
      letterTitle: '',
      offeredCtc: 0,
      offeredDesignation: '',
      proposedJoiningDate: '',
      letterDate: new Date().toISOString().split('T')[0],
      expiryDate: '',
      additionalNotes: '',
      submitForApproval: false,
      sendForESign: false,
    },
  });

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      try {
        router.push('/auth/login');
      } catch (err) {
        log.error('Navigation error:', err);
        window.location.href = '/auth/login';
      }
    }
  }, [isAuthenticated, hasHydrated, router]);

  const resetForm = () => {
    generateLetterForm.reset({
      templateId: '',
      employeeId: '',
      letterTitle: '',
      letterDate: new Date().toISOString().split('T')[0],
      effectiveDate: '',
      expiryDate: '',
      additionalNotes: '',
    });
    setSelectedTemplate(null);
  };

  const resetOfferForm = () => {
    offerLetterForm.reset({
      templateId: '',
      candidateId: '',
      letterTitle: '',
      offeredCtc: 0,
      offeredDesignation: '',
      proposedJoiningDate: '',
      letterDate: new Date().toISOString().split('T')[0],
      expiryDate: '',
      additionalNotes: '',
      submitForApproval: false,
      sendForESign: false,
    });
    setSelectedTemplate(null);
  };

  const handleOpenGenerateModal = () => {
    resetForm();
    setShowGenerateModal(true);
  };

  const handleOpenOfferLetterModal = () => {
    resetOfferForm();
    setShowOfferLetterModal(true);
  };

  const handleViewDetails = (letter: GeneratedLetter) => {
    setSelectedLetter(letter);
    setShowDetailModal(true);
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    setSelectedTemplate(template || null);
    generateLetterForm.setValue('templateId', templateId);
  };

  const handleOfferTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    setSelectedTemplate(template || null);
    offerLetterForm.setValue('templateId', templateId);
  };

  const handleCandidateSelect = (candidateId: string) => {
    const candidate = eligibleCandidates.find((c) => c.id === candidateId);
    if (candidate) {
      offerLetterForm.setValue('candidateId', candidateId);
      offerLetterForm.setValue('offeredDesignation', candidate.currentDesignation || '');
      offerLetterForm.setValue('offeredCtc', candidate.expectedCtc || 0);
    } else {
      offerLetterForm.setValue('candidateId', candidateId);
    }
  };

  const onSubmitGenerateLetter = async (data: GenerateLetterFormData) => {
    const submitData: GenerateLetterRequest = {
      templateId: data.templateId,
      employeeId: data.employeeId,
      letterTitle: data.letterTitle || '',
      letterDate: data.letterDate,
      effectiveDate: data.effectiveDate || '',
      expiryDate: data.expiryDate || '',
      additionalNotes: data.additionalNotes || '',
    };
    generateLetterMutation.mutate(
      { data: submitData, generatedBy: user?.id || '' },
      {
        onSuccess: () => {
          setShowGenerateModal(false);
          resetForm();
          refetchLetters();
        },
        onError: (err: unknown) => {
          log.error('Error generating letter:', err);
        }
      }
    );
  };

  const onSubmitOfferLetter = async (data: GenerateOfferLetterFormData) => {
    const submitData: GenerateOfferLetterRequest = {
      templateId: data.templateId,
      candidateId: data.candidateId,
      letterTitle: data.letterTitle || '',
      offeredCtc: data.offeredCtc,
      offeredDesignation: data.offeredDesignation,
      proposedJoiningDate: data.proposedJoiningDate,
      letterDate: data.letterDate,
      expiryDate: data.expiryDate || '',
      additionalNotes: data.additionalNotes || '',
      submitForApproval: data.submitForApproval,
      sendForESign: data.sendForESign,
    };
    generateOfferLetterMutation.mutate(
      { data: submitData, generatedBy: user?.id || '' },
      {
        onSuccess: () => {
          setShowOfferLetterModal(false);
          resetOfferForm();
          refetchLetters();
          refetchCandidates();
        },
        onError: (err: unknown) => {
          log.error('Error generating offer letter:', err);
        }
      }
    );
  };

  const handleSubmitForApproval = async (letter: GeneratedLetter) => {
    // This calls approveLetterMutation with status update
    approveLetterMutation.mutate(
      { letterId: letter.id, approverId: user?.id || '' },
      { onSuccess: () => refetchLetters(), onError: (err) => log.error('Error:', err) }
    );
  };

  const handleApproveLetter = async (letter: GeneratedLetter) => {
    approveLetterMutation.mutate(
      { letterId: letter.id, approverId: user?.id || '' },
      { onSuccess: () => refetchLetters(), onError: (err) => log.error('Error:', err) }
    );
  };

  const handleIssueLetter = async (letter: GeneratedLetter) => {
    issueLetterMutation.mutate(
      { letterId: letter.id, issuerId: user?.id || '' },
      { onSuccess: () => refetchLetters(), onError: (err) => log.error('Error:', err) }
    );
  };

  const handleIssueWithESign = async (letter: GeneratedLetter) => {
    // For e-sign, use the same issue mutation (backend handles e-sign flag)
    issueLetterMutation.mutate(
      { letterId: letter.id, issuerId: user?.id || '' },
      { onSuccess: () => refetchLetters(), onError: (err) => log.error('Error:', err) }
    );
  };

  const handleRevokeLetter = async (letter: GeneratedLetter) => {
    revokeLetterMutation.mutate(letter.id, {
      onSuccess: () => refetchLetters(),
      onError: (err) => log.error('Error:', err),
    });
  };

  // Stats
  const stats = {
    total: totalElements,
    draft: filteredLetters.filter((l) => l.status === LetterStatus.DRAFT).length,
    pendingApproval: filteredLetters.filter((l) => l.status === LetterStatus.PENDING_APPROVAL).length,
    issued: filteredLetters.filter((l) => l.status === LetterStatus.ISSUED).length,
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Letter Generation' },
  ];

  if (lettersLoading && filteredLetters.length === 0) {
    return (
      <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="letters">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
          <span className="ml-2 text-[var(--text-secondary)]">Loading letters...</span>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="letters">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
              Letter Generation
            </h1>
            <p className="text-[var(--text-secondary)] skeuo-deboss">
              Generate and manage employee letters
            </p>
          </div>
          <div className="flex gap-2">
            <PermissionGate permission={Permissions.LETTER_GENERATE}>
              <Button variant="outline" onClick={handleOpenOfferLetterModal}>
                <UserPlus className="h-4 w-4 mr-2" />
                Generate Offer Letter
              </Button>
            </PermissionGate>
            <PermissionGate permission={Permissions.LETTER_GENERATE}>
              <Button onClick={handleOpenGenerateModal}>
                <Plus className="h-4 w-4 mr-2" />
                Generate Letter
              </Button>
            </PermissionGate>
          </div>
        </div>

        {/* Error Alert */}
        {lettersError && (
          <Card className="border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-900/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-danger-600 dark:text-danger-400">
                <AlertCircle className="h-5 w-5" />
                <span>{lettersError instanceof Error ? lettersError.message : 'Failed to load letters'}</span>
                <Button size="sm" variant="outline" onClick={() => refetchLetters()} className="ml-auto">
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-accent-100 p-4 dark:bg-accent-900">
                  <Files className="h-6 w-6 text-accent-700 dark:text-accent-400" />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Total Letters</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-[var(--bg-surface)] p-4 dark:bg-[var(--bg-secondary)]">
                  <FilePlus className="h-6 w-6 text-[var(--text-secondary)]" />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Drafts</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.draft}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-warning-100 p-4 dark:bg-warning-900">
                  <Clock className="h-6 w-6 text-warning-600 dark:text-warning-400" />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Pending Approval</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.pendingApproval}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-success-100 p-4 dark:bg-success-900">
                  <FileCheck className="h-6 w-6 text-success-600 dark:text-success-400" />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Issued</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.issued}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-[var(--border-main)]">
          <button
            onClick={() => setActiveTab('letters')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'letters'
                ? 'border-accent-500 text-accent-700 dark:text-accent-400'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)]'
            }`}
          >
            Generated Letters
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'templates'
                ? 'border-accent-500 text-accent-700 dark:text-accent-400'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)]'
            }`}
          >
            Templates ({templates.length})
          </button>
        </div>

        {activeTab === 'letters' && (
          <>
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Search letters..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
              >
                <option value="">All Status</option>
                <option value={LetterStatus.DRAFT}>Draft</option>
                <option value={LetterStatus.PENDING_APPROVAL}>Pending Approval</option>
                <option value={LetterStatus.APPROVED}>Approved</option>
                <option value={LetterStatus.ISSUED}>Issued</option>
                <option value={LetterStatus.REVOKED}>Revoked</option>
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
              >
                <option value="">All Categories</option>
                {Object.values(LetterCategory).map((cat) => (
                  <option key={cat} value={cat}>
                    {getCategoryLabel(cat)}
                  </option>
                ))}
              </select>
            </div>

            {/* Letters Table */}
            {filteredLetters.length > 0 ? (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[var(--bg-secondary)]">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                            Reference / Title
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                            Employee
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                            Category
                          </th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                            Letter Date
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                        {filteredLetters.map((letter) => (
                          <tr key={letter.id} className="h-11 hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50">
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div>
                                <p className="font-medium text-[var(--text-primary)]">
                                  {letter.referenceNumber}
                                </p>
                                <p className="text-sm text-[var(--text-muted)] line-clamp-1">
                                  {letter.letterTitle}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className={`rounded-full p-1.5 ${letter.candidateId ? 'bg-accent-100 dark:bg-accent-900' : 'bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)]'}`}>
                                  {letter.candidateId ? (
                                    <UserPlus className="h-4 w-4 text-accent-700 dark:text-accent-400" />
                                  ) : (
                                    <User className="h-4 w-4 text-[var(--text-secondary)]" />
                                  )}
                                </div>
                                <div>
                                  <span className="text-sm text-[var(--text-secondary)]">
                                    {letter.candidateName || letter.employeeName || 'N/A'}
                                  </span>
                                  {letter.candidateId && (
                                    <p className="text-xs text-accent-700 dark:text-accent-400">Candidate</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className="text-sm text-[var(--text-secondary)]">
                                {getCategoryLabel(letter.category)}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-center">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(letter.status)}`}>
                                {getStatusLabel(letter.status)}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className="text-sm text-[var(--text-secondary)]">
                                {formatDate(letter.letterDate)}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right">
                              <div className="relative group inline-block">
                                <button className="p-1 rounded hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]">
                                  <MoreVertical className="h-4 w-4 text-[var(--text-muted)]" />
                                </button>
                                <div className="absolute right-0 top-full mt-1 w-44 bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                                  <button
                                    onClick={() => handleViewDetails(letter)}
                                    className="w-full px-4 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] flex items-center gap-2"
                                  >
                                    <Eye className="h-4 w-4" />
                                    View Details
                                  </button>
                                  {letter.status === LetterStatus.DRAFT && (
                                    <button
                                      onClick={() => handleSubmitForApproval(letter)}
                                      className="w-full px-4 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] flex items-center gap-2"
                                    >
                                      <Send className="h-4 w-4" />
                                      Submit for Approval
                                    </button>
                                  )}
                                  {letter.status === LetterStatus.PENDING_APPROVAL && (
                                    <PermissionGate permission={Permissions.LETTER_APPROVE} fallback={<div />}>
                                      <button
                                        onClick={() => handleApproveLetter(letter)}
                                        className="w-full px-4 py-2 text-left text-sm text-success-600 hover:bg-success-50 dark:hover:bg-success-900/20 flex items-center gap-2"
                                      >
                                        <CheckCircle className="h-4 w-4" />
                                        Approve
                                      </button>
                                    </PermissionGate>
                                  )}
                                  {letter.status === LetterStatus.APPROVED && (
                                    <>
                                      <PermissionGate permission={Permissions.LETTER_ISSUE} fallback={<div />}>
                                        <button
                                          onClick={() => handleIssueLetter(letter)}
                                          className="w-full px-4 py-2 text-left text-sm text-accent-600 hover:bg-accent-50 dark:hover:bg-accent-900/20 flex items-center gap-2"
                                        >
                                          <FileCheck className="h-4 w-4" />
                                          Issue Letter
                                        </button>
                                      </PermissionGate>
                                      {letter.candidateId && letter.category === LetterCategory.OFFER && (
                                        <PermissionGate permission={Permissions.LETTER_ISSUE} fallback={<div />}>
                                          <button
                                            onClick={() => handleIssueWithESign(letter)}
                                            className="w-full px-4 py-2 text-left text-sm text-accent-700 hover:bg-accent-50 dark:hover:bg-accent-900/20 flex items-center gap-2"
                                          >
                                            <PenTool className="h-4 w-4" />
                                            Issue with E-Sign
                                          </button>
                                        </PermissionGate>
                                      )}
                                    </>
                                  )}
                                  {letter.status === LetterStatus.ISSUED && letter.pdfUrl ? (
                                    <a
                                      href={letter.pdfUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="w-full px-4 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] flex items-center gap-2"
                                      onClick={(e) => {
                                        if (!letter.pdfUrl) {
                                          e.preventDefault();
                                        }
                                      }}
                                    >
                                      <Download className="h-4 w-4" />
                                      Download PDF
                                    </a>
                                  ) : letter.status === LetterStatus.ISSUED ? (
                                    <button
                                      disabled
                                      className="w-full px-4 py-2 text-left text-sm text-[var(--text-muted)] cursor-not-allowed opacity-50 flex items-center gap-2"
                                      title="PDF not yet available"
                                    >
                                      <Download className="h-4 w-4" />
                                      PDF Generating...
                                    </button>
                                  ) : null}
                                  {letter.status === LetterStatus.ISSUED && (
                                    <button
                                      onClick={() => handleRevokeLetter(letter)}
                                      className="w-full px-4 py-2 text-left text-sm text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 flex items-center gap-2"
                                    >
                                      <XCircle className="h-4 w-4" />
                                      Revoke
                                    </button>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              !lettersLoading && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <FileText className="h-12 w-12 mx-auto text-[var(--text-muted)] mb-4" />
                    <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                      No Letters Found
                    </h3>
                    <p className="text-[var(--text-secondary)] mb-4">
                      {searchQuery || statusFilter || categoryFilter
                        ? 'No letters match your search criteria.'
                        : 'Get started by generating your first letter.'}
                    </p>
                    {!searchQuery && !statusFilter && !categoryFilter && (
                      <Button onClick={handleOpenGenerateModal}>
                        <Plus className="h-4 w-4 mr-2" />
                        Generate Letter
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-[var(--text-secondary)]">
                  Page {currentPage + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}

        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.length > 0 ? (
              templates.map((template) => (
                <Card key={template.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-accent-100 p-2 dark:bg-accent-900">
                          <FileText className="h-5 w-5 text-accent-700 dark:text-accent-400" />
                        </div>
                        <div>
                          <p className="text-xs text-[var(--text-muted)] font-mono">{template.code}</p>
                          <h3 className="font-semibold text-[var(--text-primary)] line-clamp-1">
                            {template.name}
                          </h3>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-3 min-h-[40px]">
                      {template.description || 'No description'}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-300">
                        {getCategoryLabel(template.category)}
                      </span>
                      {template.requiresApproval && (
                        <span className="text-xs text-[var(--text-muted)]">Requires Approval</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full">
                <Card>
                  <CardContent className="p-12 text-center">
                    <FileText className="h-12 w-12 mx-auto text-[var(--text-muted)] mb-4" />
                    <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                      No Templates Available
                    </h3>
                    <p className="text-[var(--text-secondary)]">
                      There are no active letter templates configured.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* Generate Letter Modal */}
        <Modal isOpen={showGenerateModal} onClose={() => setShowGenerateModal(false)} size="lg">
          <ModalHeader>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              Generate Letter
            </h2>
          </ModalHeader>
          <form onSubmit={generateLetterForm.handleSubmit(onSubmitGenerateLetter)}>
            <ModalBody>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Template *
                  </label>
                  <select
                    {...generateLetterForm.register('templateId')}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className="w-full px-4 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                  >
                    <option value="">Select a template</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name} - {getCategoryLabel(template.category)}
                      </option>
                    ))}
                  </select>
                  {generateLetterForm.formState.errors.templateId && (
                    <p className="text-danger-500 text-xs mt-1">{generateLetterForm.formState.errors.templateId.message}</p>
                  )}
                  {selectedTemplate && (
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{selectedTemplate.description}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    {...generateLetterForm.register('employeeId')}
                    className="w-full px-4 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                    placeholder="Enter employee ID"
                  />
                  {generateLetterForm.formState.errors.employeeId && (
                    <p className="text-danger-500 text-xs mt-1">{generateLetterForm.formState.errors.employeeId.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Letter Title
                  </label>
                  <input
                    type="text"
                    {...generateLetterForm.register('letterTitle')}
                    className="w-full px-4 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                    placeholder="Letter title (optional)"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Letter Date
                    </label>
                    <input
                      type="date"
                      {...generateLetterForm.register('letterDate')}
                      className="w-full px-4 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                    />
                    {generateLetterForm.formState.errors.letterDate && (
                      <p className="text-danger-500 text-xs mt-1">{generateLetterForm.formState.errors.letterDate.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Effective Date
                    </label>
                    <input
                      type="date"
                      {...generateLetterForm.register('effectiveDate')}
                      className="w-full px-4 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    {...generateLetterForm.register('expiryDate')}
                    className="w-full px-4 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Additional Notes
                  </label>
                  <textarea
                    rows={3}
                    {...generateLetterForm.register('additionalNotes')}
                    className="w-full px-4 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                    placeholder="Any additional notes..."
                  />
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="outline" type="button" onClick={() => setShowGenerateModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={generateLetterMutation.isPending}>
                {generateLetterMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Letter'
                )}
              </Button>
            </ModalFooter>
          </form>
        </Modal>

        {/* Letter Detail Modal */}
        <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} size="lg">
          <ModalHeader>
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-accent-100 p-2 dark:bg-accent-900">
                <FileText className="h-6 w-6 text-accent-700 dark:text-accent-400" />
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)] font-mono">{selectedLetter?.referenceNumber}</p>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                  {selectedLetter?.letterTitle || 'Letter Details'}
                </h2>
              </div>
            </div>
          </ModalHeader>
          <ModalBody>
            {selectedLetter && (
              <div className="space-y-6">
                <div className="flex flex-wrap gap-2">
                  <span className={`px-4 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedLetter.status)}`}>
                    {getStatusLabel(selectedLetter.status)}
                  </span>
                  <span className="px-4 py-1 text-sm font-medium rounded-full bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-300">
                    {getCategoryLabel(selectedLetter.category)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                    <p className="text-sm text-[var(--text-muted)] flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Employee
                    </p>
                    <p className="text-lg font-semibold text-[var(--text-primary)]">
                      {selectedLetter.employeeName || 'Employee'}
                    </p>
                  </div>
                  <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                    <p className="text-sm text-[var(--text-muted)] flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Letter Date
                    </p>
                    <p className="text-lg font-semibold text-[var(--text-primary)]">
                      {formatDate(selectedLetter.letterDate)}
                    </p>
                  </div>
                </div>

                {(selectedLetter.effectiveDate || selectedLetter.expiryDate) && (
                  <div className="grid grid-cols-2 gap-4">
                    {selectedLetter.effectiveDate && (
                      <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                        <p className="text-sm text-[var(--text-muted)]">Effective Date</p>
                        <p className="text-lg font-semibold text-[var(--text-primary)]">
                          {formatDate(selectedLetter.effectiveDate)}
                        </p>
                      </div>
                    )}
                    {selectedLetter.expiryDate && (
                      <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                        <p className="text-sm text-[var(--text-muted)]">Expiry Date</p>
                        <p className="text-lg font-semibold text-[var(--text-primary)]">
                          {formatDate(selectedLetter.expiryDate)}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {selectedLetter.generatedByName && (
                  <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                    <p className="text-sm text-[var(--text-muted)]">Generated By</p>
                    <p className="font-semibold text-[var(--text-primary)]">
                      {selectedLetter.generatedByName}
                    </p>
                    {selectedLetter.generatedAt && (
                      <p className="text-xs text-[var(--text-muted)]">
                        {formatDate(selectedLetter.generatedAt)}
                      </p>
                    )}
                  </div>
                )}

                {selectedLetter.approvedByName && (
                  <div className="p-4 bg-success-50 dark:bg-success-900/20 rounded-lg">
                    <p className="text-sm text-success-600 dark:text-success-400 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Approved By
                    </p>
                    <p className="font-semibold text-[var(--text-primary)]">
                      {selectedLetter.approvedByName}
                    </p>
                    {selectedLetter.approvalComments && (
                      <p className="text-sm text-[var(--text-secondary)] mt-1">
                        &quot;{selectedLetter.approvalComments}&quot;
                      </p>
                    )}
                  </div>
                )}

                {selectedLetter.additionalNotes && (
                  <div>
                    <h4 className="text-sm font-medium text-[var(--text-muted)] mb-1">Additional Notes</h4>
                    <p className="text-[var(--text-secondary)]">
                      {selectedLetter.additionalNotes}
                    </p>
                  </div>
                )}
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowDetailModal(false)}>
              Close
            </Button>
            {selectedLetter?.status === LetterStatus.ISSUED && selectedLetter?.pdfUrl ? (
              <Button asChild>
                <a
                  href={selectedLetter.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (!selectedLetter.pdfUrl) {
                      e.preventDefault();
                    }
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </a>
              </Button>
            ) : selectedLetter?.status === LetterStatus.ISSUED ? (
              <Button disabled>
                <Download className="h-4 w-4 mr-2" />
                PDF Generating...
              </Button>
            ) : null}
          </ModalFooter>
        </Modal>

        {/* Offer Letter Modal */}
        <Modal isOpen={showOfferLetterModal} onClose={() => setShowOfferLetterModal(false)} size="lg">
          <ModalHeader>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              Generate Offer Letter
            </h2>
          </ModalHeader>
          <form onSubmit={offerLetterForm.handleSubmit(onSubmitOfferLetter)}>
            <ModalBody>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Template *
                  </label>
                  <select
                    {...offerLetterForm.register('templateId')}
                    onChange={(e) => handleOfferTemplateSelect(e.target.value)}
                    className="w-full px-4 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                  >
                    <option value="">Select an offer letter template</option>
                    {templates
                      .filter((t) => t.category === LetterCategory.OFFER)
                      .map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                  </select>
                  {offerLetterForm.formState.errors.templateId && (
                    <p className="text-danger-500 text-xs mt-1">{offerLetterForm.formState.errors.templateId.message}</p>
                  )}
                  {selectedTemplate && (
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{selectedTemplate.description}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Candidate *
                  </label>
                  <select
                    {...offerLetterForm.register('candidateId')}
                    onChange={(e) => handleCandidateSelect(e.target.value)}
                    className="w-full px-4 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                  >
                    <option value="">Select a candidate</option>
                    {eligibleCandidates.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.fullName} - {candidate.jobTitle || 'N/A'} ({candidate.status.replace(/_/g, ' ')})
                      </option>
                    ))}
                  </select>
                  {offerLetterForm.formState.errors.candidateId && (
                    <p className="text-danger-500 text-xs mt-1">{offerLetterForm.formState.errors.candidateId.message}</p>
                  )}
                  {eligibleCandidates.length === 0 && (
                    <p className="mt-1 text-xs text-warning-600">No eligible candidates. Candidates must be in SELECTED status.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Letter Title
                  </label>
                  <input
                    type="text"
                    {...offerLetterForm.register('letterTitle')}
                    className="w-full px-4 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                    placeholder="Offer Letter (optional)"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Offered Designation *
                    </label>
                    <input
                      type="text"
                      {...offerLetterForm.register('offeredDesignation')}
                      className="w-full px-4 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                      placeholder="e.g., Senior Software Engineer"
                    />
                    {offerLetterForm.formState.errors.offeredDesignation && (
                      <p className="text-danger-500 text-xs mt-1">{offerLetterForm.formState.errors.offeredDesignation.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Offered CTC (Annual) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      {...offerLetterForm.register('offeredCtc', { valueAsNumber: true })}
                      className="w-full px-4 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                      placeholder="e.g., 1500000"
                    />
                    {offerLetterForm.formState.errors.offeredCtc && (
                      <p className="text-danger-500 text-xs mt-1">{offerLetterForm.formState.errors.offeredCtc.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Proposed Joining Date *
                    </label>
                    <input
                      type="date"
                      {...offerLetterForm.register('proposedJoiningDate')}
                      className="w-full px-4 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                    />
                    {offerLetterForm.formState.errors.proposedJoiningDate && (
                      <p className="text-danger-500 text-xs mt-1">{offerLetterForm.formState.errors.proposedJoiningDate.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Letter Date
                    </label>
                    <input
                      type="date"
                      {...offerLetterForm.register('letterDate')}
                      className="w-full px-4 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                    />
                    {offerLetterForm.formState.errors.letterDate && (
                      <p className="text-danger-500 text-xs mt-1">{offerLetterForm.formState.errors.letterDate.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Offer Expiry Date
                  </label>
                  <input
                    type="date"
                    {...offerLetterForm.register('expiryDate')}
                    className="w-full px-4 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Additional Notes
                  </label>
                  <textarea
                    rows={3}
                    {...offerLetterForm.register('additionalNotes')}
                    className="w-full px-4 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                    placeholder="Any additional notes or special conditions..."
                  />
                </div>

                <div className="flex gap-4 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      {...offerLetterForm.register('submitForApproval')}
                      className="rounded border-[var(--border-main)] dark:border-[var(--border-main)] text-accent-700 focus:ring-accent-500"
                    />
                    <span className="text-sm text-[var(--text-secondary)]">Submit for approval</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      {...offerLetterForm.register('sendForESign')}
                      className="rounded border-[var(--border-main)] dark:border-[var(--border-main)] text-accent-700 focus:ring-accent-500"
                    />
                    <span className="text-sm text-[var(--text-secondary)]">Send for e-signature</span>
                  </label>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="outline" type="button" onClick={() => setShowOfferLetterModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={generateLetterMutation.isPending}>
                {generateLetterMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Offer Letter'
                )}
              </Button>
            </ModalFooter>
          </form>
        </Modal>
      </div>
    </AppLayout>
  );
}
