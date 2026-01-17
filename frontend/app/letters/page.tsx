'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Search,
  Plus,
  Calendar,
  Clock,
  AlertCircle,
  Loader2,
  MoreVertical,
  Edit,
  Trash2,
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
import { letterService } from '@/lib/services/letter.service';
import { recruitmentService } from '@/lib/services/recruitment.service';
import {
  LetterTemplate,
  GeneratedLetter,
  GenerateLetterRequest,
  GenerateOfferLetterRequest,
  LetterCategory,
  LetterStatus,
} from '@/lib/types/letter';
import { Candidate } from '@/lib/types/recruitment';

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
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    case LetterStatus.PENDING_APPROVAL:
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
    case LetterStatus.APPROVED:
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    case LetterStatus.ISSUED:
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case LetterStatus.REVOKED:
      return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    case LetterStatus.EXPIRED:
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
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
  const [letters, setLetters] = useState<GeneratedLetter[]>([]);
  const [templates, setTemplates] = useState<LetterTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [totalElements, setTotalElements] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [activeTab, setActiveTab] = useState<'letters' | 'templates'>('letters');

  // Modal states
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showOfferLetterModal, setShowOfferLetterModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState<GeneratedLetter | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<LetterTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  // Form state
  const [formData, setFormData] = useState<GenerateLetterRequest>({
    templateId: '',
    employeeId: '',
    letterTitle: '',
    letterDate: new Date().toISOString().split('T')[0],
    effectiveDate: '',
    expiryDate: '',
    additionalNotes: '',
  });

  // Offer letter form state
  const [offerFormData, setOfferFormData] = useState<GenerateOfferLetterRequest>({
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

  const fetchLetters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await letterService.getAllLetters(currentPage, 20);
      let filteredLetters = response.content;

      // Client-side filtering
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

      setLetters(filteredLetters);
      setTotalElements(response.totalElements);
      setTotalPages(response.totalPages);
    } catch (err: any) {
      console.error('Error fetching letters:', err);
      setError(err.response?.data?.message || 'Failed to load letters');
      setLetters([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, categoryFilter, currentPage]);

  const fetchTemplates = useCallback(async () => {
    try {
      const activeTemplates = await letterService.getActiveTemplates();
      setTemplates(activeTemplates);
    } catch (err: any) {
      console.error('Error fetching templates:', err);
    }
  }, []);

  const fetchCandidates = useCallback(async () => {
    try {
      const response = await recruitmentService.getAllCandidates(0, 100);
      // Filter to only show SELECTED candidates for offer letters
      const eligibleCandidates = response.content.filter(
        (c) => c.status === 'SELECTED' || c.status === 'OFFER_EXTENDED'
      );
      setCandidates(eligibleCandidates);
    } catch (err: any) {
      console.error('Error fetching candidates:', err);
    }
  }, []);

  useEffect(() => {
    fetchLetters();
    fetchTemplates();
    fetchCandidates();
  }, [fetchLetters, fetchTemplates, fetchCandidates]);

  const resetForm = () => {
    setFormData({
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
    setOfferFormData({
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
    setFormData({ ...formData, templateId });
  };

  const handleOfferTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    setSelectedTemplate(template || null);
    setOfferFormData({ ...offerFormData, templateId });
  };

  const handleCandidateSelect = (candidateId: string) => {
    const candidate = candidates.find((c) => c.id === candidateId);
    if (candidate) {
      setOfferFormData({
        ...offerFormData,
        candidateId,
        offeredDesignation: candidate.currentDesignation || '',
        offeredCtc: candidate.expectedCtc || 0,
      });
    } else {
      setOfferFormData({ ...offerFormData, candidateId });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // For demo, using a placeholder generatedBy ID
      await letterService.generateLetter(formData, 'current-user-id');
      setShowGenerateModal(false);
      resetForm();
      fetchLetters();
    } catch (err: any) {
      console.error('Error generating letter:', err);
      setError(err.response?.data?.message || 'Failed to generate letter');
    } finally {
      setSaving(false);
    }
  };

  const handleOfferLetterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await letterService.generateOfferLetter(offerFormData, 'current-user-id');
      setShowOfferLetterModal(false);
      resetOfferForm();
      fetchLetters();
      fetchCandidates();
    } catch (err: any) {
      console.error('Error generating offer letter:', err);
      setError(err.response?.data?.message || 'Failed to generate offer letter');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForApproval = async (letter: GeneratedLetter) => {
    try {
      await letterService.submitForApproval(letter.id);
      fetchLetters();
    } catch (err: any) {
      console.error('Error submitting for approval:', err);
      setError(err.response?.data?.message || 'Failed to submit for approval');
    }
  };

  const handleApproveLetter = async (letter: GeneratedLetter) => {
    try {
      await letterService.approveLetter(letter.id, 'current-user-id');
      fetchLetters();
    } catch (err: any) {
      console.error('Error approving letter:', err);
      setError(err.response?.data?.message || 'Failed to approve letter');
    }
  };

  const handleIssueLetter = async (letter: GeneratedLetter) => {
    try {
      await letterService.issueLetter(letter.id, 'current-user-id');
      fetchLetters();
    } catch (err: any) {
      console.error('Error issuing letter:', err);
      setError(err.response?.data?.message || 'Failed to issue letter');
    }
  };

  const handleIssueWithESign = async (letter: GeneratedLetter) => {
    try {
      await letterService.issueOfferLetterWithESign(letter.id, 'current-user-id');
      fetchLetters();
    } catch (err: any) {
      console.error('Error issuing letter with e-sign:', err);
      setError(err.response?.data?.message || 'Failed to issue letter with e-signature');
    }
  };

  const handleRevokeLetter = async (letter: GeneratedLetter) => {
    try {
      await letterService.revokeLetter(letter.id);
      fetchLetters();
    } catch (err: any) {
      console.error('Error revoking letter:', err);
      setError(err.response?.data?.message || 'Failed to revoke letter');
    }
  };

  // Stats
  const stats = {
    total: totalElements,
    draft: letters.filter((l) => l.status === LetterStatus.DRAFT).length,
    pendingApproval: letters.filter((l) => l.status === LetterStatus.PENDING_APPROVAL).length,
    issued: letters.filter((l) => l.status === LetterStatus.ISSUED).length,
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Letter Generation' },
  ];

  if (loading && letters.length === 0) {
    return (
      <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="letters">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          <span className="ml-2 text-surface-600 dark:text-surface-400">Loading letters...</span>
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
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
              Letter Generation
            </h1>
            <p className="text-surface-600 dark:text-surface-400">
              Generate and manage employee letters
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleOpenOfferLetterModal}>
              <UserPlus className="h-4 w-4 mr-2" />
              Generate Offer Letter
            </Button>
            <Button onClick={handleOpenGenerateModal}>
              <Plus className="h-4 w-4 mr-2" />
              Generate Letter
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
                <Button size="sm" variant="outline" onClick={fetchLetters} className="ml-auto">
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
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary-100 p-3 dark:bg-primary-900">
                  <Files className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">Total Letters</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-white">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
                  <FilePlus className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">Drafts</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-white">{stats.draft}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-100 p-3 dark:bg-amber-900">
                  <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">Pending Approval</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-white">{stats.pendingApproval}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-100 p-3 dark:bg-green-900">
                  <FileCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">Issued</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-white">{stats.issued}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-surface-200 dark:border-surface-700">
          <button
            onClick={() => setActiveTab('letters')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'letters'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
            }`}
          >
            Generated Letters
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'templates'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
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
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-surface-400" />
                <input
                  type="text"
                  placeholder="Search letters..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                className="px-4 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
            {letters.length > 0 ? (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-surface-50 dark:bg-surface-800">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                            Reference / Title
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                            Employee
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                            Category
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                            Letter Date
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-surface-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                        {letters.map((letter) => (
                          <tr key={letter.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50">
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div>
                                <p className="font-medium text-surface-900 dark:text-white">
                                  {letter.referenceNumber}
                                </p>
                                <p className="text-sm text-surface-500 line-clamp-1">
                                  {letter.letterTitle}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className={`rounded-full p-1.5 ${letter.candidateId ? 'bg-teal-100 dark:bg-teal-900' : 'bg-surface-200 dark:bg-surface-700'}`}>
                                  {letter.candidateId ? (
                                    <UserPlus className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                                  ) : (
                                    <User className="h-4 w-4 text-surface-600 dark:text-surface-400" />
                                  )}
                                </div>
                                <div>
                                  <span className="text-sm text-surface-600 dark:text-surface-400">
                                    {letter.candidateName || letter.employeeName || 'N/A'}
                                  </span>
                                  {letter.candidateId && (
                                    <p className="text-xs text-teal-600 dark:text-teal-400">Candidate</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className="text-sm text-surface-600 dark:text-surface-400">
                                {getCategoryLabel(letter.category)}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(letter.status)}`}>
                                {getStatusLabel(letter.status)}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className="text-sm text-surface-600 dark:text-surface-400">
                                {formatDate(letter.letterDate)}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right">
                              <div className="relative group inline-block">
                                <button className="p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-700">
                                  <MoreVertical className="h-4 w-4 text-surface-400" />
                                </button>
                                <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                                  <button
                                    onClick={() => handleViewDetails(letter)}
                                    className="w-full px-3 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-2"
                                  >
                                    <Eye className="h-4 w-4" />
                                    View Details
                                  </button>
                                  {letter.status === LetterStatus.DRAFT && (
                                    <button
                                      onClick={() => handleSubmitForApproval(letter)}
                                      className="w-full px-3 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-2"
                                    >
                                      <Send className="h-4 w-4" />
                                      Submit for Approval
                                    </button>
                                  )}
                                  {letter.status === LetterStatus.PENDING_APPROVAL && (
                                    <button
                                      onClick={() => handleApproveLetter(letter)}
                                      className="w-full px-3 py-2 text-left text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-2"
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                      Approve
                                    </button>
                                  )}
                                  {letter.status === LetterStatus.APPROVED && (
                                    <>
                                      <button
                                        onClick={() => handleIssueLetter(letter)}
                                        className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2"
                                      >
                                        <FileCheck className="h-4 w-4" />
                                        Issue Letter
                                      </button>
                                      {letter.candidateId && letter.category === LetterCategory.OFFER && (
                                        <button
                                          onClick={() => handleIssueWithESign(letter)}
                                          className="w-full px-3 py-2 text-left text-sm text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 flex items-center gap-2"
                                        >
                                          <PenTool className="h-4 w-4" />
                                          Issue with E-Sign
                                        </button>
                                      )}
                                    </>
                                  )}
                                  {letter.status === LetterStatus.ISSUED && letter.pdfUrl && (
                                    <a
                                      href={letter.pdfUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="w-full px-3 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-2"
                                    >
                                      <Download className="h-4 w-4" />
                                      Download PDF
                                    </a>
                                  )}
                                  {letter.status === LetterStatus.ISSUED && (
                                    <button
                                      onClick={() => handleRevokeLetter(letter)}
                                      className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
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
              !loading && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <FileText className="h-12 w-12 mx-auto text-surface-400 mb-4" />
                    <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-2">
                      No Letters Found
                    </h3>
                    <p className="text-surface-600 dark:text-surface-400 mb-4">
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
                <span className="text-sm text-surface-600 dark:text-surface-400">
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
                        <div className="rounded-lg bg-primary-100 p-2 dark:bg-primary-900">
                          <FileText className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                          <p className="text-xs text-surface-500 font-mono">{template.code}</p>
                          <h3 className="font-semibold text-surface-900 dark:text-white line-clamp-1">
                            {template.name}
                          </h3>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-surface-600 dark:text-surface-400 line-clamp-2 mb-3 min-h-[40px]">
                      {template.description || 'No description'}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                        {getCategoryLabel(template.category)}
                      </span>
                      {template.requiresApproval && (
                        <span className="text-xs text-surface-500">Requires Approval</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full">
                <Card>
                  <CardContent className="p-12 text-center">
                    <FileText className="h-12 w-12 mx-auto text-surface-400 mb-4" />
                    <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-2">
                      No Templates Available
                    </h3>
                    <p className="text-surface-600 dark:text-surface-400">
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
            <h2 className="text-xl font-semibold text-surface-900 dark:text-white">
              Generate Letter
            </h2>
          </ModalHeader>
          <form onSubmit={handleSubmit}>
            <ModalBody>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Template *
                  </label>
                  <select
                    required
                    value={formData.templateId}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select a template</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name} - {getCategoryLabel(template.category)}
                      </option>
                    ))}
                  </select>
                  {selectedTemplate && (
                    <p className="mt-1 text-xs text-surface-500">{selectedTemplate.description}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter employee ID"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Letter Title
                  </label>
                  <input
                    type="text"
                    value={formData.letterTitle}
                    onChange={(e) => setFormData({ ...formData, letterTitle: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Letter title (optional)"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Letter Date
                    </label>
                    <input
                      type="date"
                      value={formData.letterDate}
                      onChange={(e) => setFormData({ ...formData, letterDate: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Effective Date
                    </label>
                    <input
                      type="date"
                      value={formData.effectiveDate}
                      onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Additional Notes
                  </label>
                  <textarea
                    rows={3}
                    value={formData.additionalNotes}
                    onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Any additional notes..."
                  />
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="outline" type="button" onClick={() => setShowGenerateModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
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
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary-100 p-2 dark:bg-primary-900">
                <FileText className="h-6 w-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-sm text-surface-500 font-mono">{selectedLetter?.referenceNumber}</p>
                <h2 className="text-xl font-semibold text-surface-900 dark:text-white">
                  {selectedLetter?.letterTitle || 'Letter Details'}
                </h2>
              </div>
            </div>
          </ModalHeader>
          <ModalBody>
            {selectedLetter && (
              <div className="space-y-6">
                <div className="flex flex-wrap gap-2">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedLetter.status)}`}>
                    {getStatusLabel(selectedLetter.status)}
                  </span>
                  <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                    {getCategoryLabel(selectedLetter.category)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                    <p className="text-sm text-surface-500 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Employee
                    </p>
                    <p className="text-lg font-semibold text-surface-900 dark:text-white">
                      {selectedLetter.employeeName || 'Employee'}
                    </p>
                  </div>
                  <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                    <p className="text-sm text-surface-500 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Letter Date
                    </p>
                    <p className="text-lg font-semibold text-surface-900 dark:text-white">
                      {formatDate(selectedLetter.letterDate)}
                    </p>
                  </div>
                </div>

                {(selectedLetter.effectiveDate || selectedLetter.expiryDate) && (
                  <div className="grid grid-cols-2 gap-4">
                    {selectedLetter.effectiveDate && (
                      <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                        <p className="text-sm text-surface-500">Effective Date</p>
                        <p className="text-lg font-semibold text-surface-900 dark:text-white">
                          {formatDate(selectedLetter.effectiveDate)}
                        </p>
                      </div>
                    )}
                    {selectedLetter.expiryDate && (
                      <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                        <p className="text-sm text-surface-500">Expiry Date</p>
                        <p className="text-lg font-semibold text-surface-900 dark:text-white">
                          {formatDate(selectedLetter.expiryDate)}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {selectedLetter.generatedByName && (
                  <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                    <p className="text-sm text-surface-500">Generated By</p>
                    <p className="font-semibold text-surface-900 dark:text-white">
                      {selectedLetter.generatedByName}
                    </p>
                    {selectedLetter.generatedAt && (
                      <p className="text-xs text-surface-500">
                        {formatDate(selectedLetter.generatedAt)}
                      </p>
                    )}
                  </div>
                )}

                {selectedLetter.approvedByName && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Approved By
                    </p>
                    <p className="font-semibold text-surface-900 dark:text-white">
                      {selectedLetter.approvedByName}
                    </p>
                    {selectedLetter.approvalComments && (
                      <p className="text-sm text-surface-600 dark:text-surface-400 mt-1">
                        "{selectedLetter.approvalComments}"
                      </p>
                    )}
                  </div>
                )}

                {selectedLetter.additionalNotes && (
                  <div>
                    <h4 className="text-sm font-medium text-surface-500 mb-1">Additional Notes</h4>
                    <p className="text-surface-700 dark:text-surface-300">
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
            {selectedLetter?.status === LetterStatus.ISSUED && selectedLetter?.pdfUrl && (
              <Button asChild>
                <a href={selectedLetter.pdfUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </a>
              </Button>
            )}
          </ModalFooter>
        </Modal>

        {/* Offer Letter Modal */}
        <Modal isOpen={showOfferLetterModal} onClose={() => setShowOfferLetterModal(false)} size="lg">
          <ModalHeader>
            <h2 className="text-xl font-semibold text-surface-900 dark:text-white">
              Generate Offer Letter
            </h2>
          </ModalHeader>
          <form onSubmit={handleOfferLetterSubmit}>
            <ModalBody>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Template *
                  </label>
                  <select
                    required
                    value={offerFormData.templateId}
                    onChange={(e) => handleOfferTemplateSelect(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                  {selectedTemplate && (
                    <p className="mt-1 text-xs text-surface-500">{selectedTemplate.description}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Candidate *
                  </label>
                  <select
                    required
                    value={offerFormData.candidateId}
                    onChange={(e) => handleCandidateSelect(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select a candidate</option>
                    {candidates.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.fullName} - {candidate.jobTitle || 'N/A'} ({candidate.status.replace(/_/g, ' ')})
                      </option>
                    ))}
                  </select>
                  {candidates.length === 0 && (
                    <p className="mt-1 text-xs text-amber-600">No eligible candidates. Candidates must be in SELECTED status.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Letter Title
                  </label>
                  <input
                    type="text"
                    value={offerFormData.letterTitle}
                    onChange={(e) => setOfferFormData({ ...offerFormData, letterTitle: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Offer Letter (optional)"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Offered Designation *
                    </label>
                    <input
                      type="text"
                      required
                      value={offerFormData.offeredDesignation}
                      onChange={(e) => setOfferFormData({ ...offerFormData, offeredDesignation: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g., Senior Software Engineer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Offered CTC (Annual) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={offerFormData.offeredCtc || ''}
                      onChange={(e) => setOfferFormData({ ...offerFormData, offeredCtc: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g., 1500000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Proposed Joining Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={offerFormData.proposedJoiningDate}
                      onChange={(e) => setOfferFormData({ ...offerFormData, proposedJoiningDate: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Letter Date
                    </label>
                    <input
                      type="date"
                      value={offerFormData.letterDate}
                      onChange={(e) => setOfferFormData({ ...offerFormData, letterDate: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Offer Expiry Date
                  </label>
                  <input
                    type="date"
                    value={offerFormData.expiryDate}
                    onChange={(e) => setOfferFormData({ ...offerFormData, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Additional Notes
                  </label>
                  <textarea
                    rows={3}
                    value={offerFormData.additionalNotes}
                    onChange={(e) => setOfferFormData({ ...offerFormData, additionalNotes: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Any additional notes or special conditions..."
                  />
                </div>

                <div className="flex gap-4 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={offerFormData.submitForApproval}
                      onChange={(e) => setOfferFormData({ ...offerFormData, submitForApproval: e.target.checked })}
                      className="rounded border-surface-300 dark:border-surface-600 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-surface-700 dark:text-surface-300">Submit for approval</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={offerFormData.sendForESign}
                      onChange={(e) => setOfferFormData({ ...offerFormData, sendForESign: e.target.checked })}
                      className="rounded border-surface-300 dark:border-surface-600 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-surface-700 dark:text-surface-300">Send for e-signature</span>
                  </label>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="outline" type="button" onClick={() => setShowOfferLetterModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
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
