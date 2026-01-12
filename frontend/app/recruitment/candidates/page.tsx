'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { recruitmentService } from '@/lib/services/recruitment.service';
import { employeeService } from '@/lib/services/employee.service';
import { Candidate, CreateCandidateRequest, CandidateStatus, CandidateSource, RecruitmentStage, JobOpening } from '@/lib/types/recruitment';
import { Users, Search, Plus, Mail, Phone, Building, MapPin, Calendar, FileText, Edit2, Trash2, X, Eye, ChevronRight, DollarSign } from 'lucide-react';

// Loading fallback
function CandidatesPageLoading() {
  return (
    <AppLayout>
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-surface-200 dark:bg-surface-700 rounded w-1/4" />
        <div className="h-64 bg-surface-200 dark:bg-surface-700 rounded" />
      </div>
    </AppLayout>
  );
}

// Wrap with Suspense for useSearchParams
export default function CandidatesPageWrapper() {
  return (
    <Suspense fallback={<CandidatesPageLoading />}>
      <CandidatesPage />
    </Suspense>
  );
}

function CandidatesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobIdFilter = searchParams.get('jobId');

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobOpenings, setJobOpenings] = useState<JobOpening[]>([]);
  const [recruiters, setRecruiters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [selectedJobFilter, setSelectedJobFilter] = useState<string>(jobIdFilter || '');

  const [formData, setFormData] = useState<CreateCandidateRequest>({
    candidateCode: '',
    jobOpeningId: jobIdFilter || '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    currentLocation: '',
    currentCompany: '',
    currentDesignation: '',
    totalExperience: undefined,
    currentCtc: undefined,
    expectedCtc: undefined,
    noticePeriodDays: undefined,
    resumeUrl: '',
    source: 'JOB_PORTAL',
    status: 'NEW',
    currentStage: 'APPLICATION_RECEIVED',
    appliedDate: new Date().toISOString().split('T')[0],
    notes: '',
    assignedRecruiterId: '',
  });

  useEffect(() => {
    loadCandidates();
    loadJobOpenings();
    loadRecruiters();
  }, [statusFilter, selectedJobFilter]);

  const loadCandidates = async () => {
    try {
      setLoading(true);
      setError(null);
      let candidatesList: Candidate[] = [];

      if (selectedJobFilter) {
        candidatesList = await recruitmentService.getCandidatesByJobOpening(selectedJobFilter);
      } else {
        const response = await recruitmentService.getAllCandidates(0, 100);
        candidatesList = response.content;
      }

      if (statusFilter) {
        candidatesList = candidatesList.filter(c => c.status === statusFilter);
      }
      setCandidates(candidatesList);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load candidates');
    } finally {
      setLoading(false);
    }
  };

  const loadJobOpenings = async () => {
    try {
      const response = await recruitmentService.getAllJobOpenings(0, 100);
      setJobOpenings(response.content);
    } catch (err) {
      console.error('Error loading job openings:', err);
    }
  };

  const loadRecruiters = async () => {
    try {
      const response = await employeeService.getAllEmployees(0, 100);
      setRecruiters(response.content);
    } catch (err) {
      console.error('Error loading recruiters:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      if (editingCandidate) {
        await recruitmentService.updateCandidate(editingCandidate.id, formData);
      } else {
        await recruitmentService.createCandidate(formData);
      }
      setShowAddModal(false);
      resetForm();
      loadCandidates();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save candidate');
    }
  };

  const handleEdit = (candidate: Candidate) => {
    setEditingCandidate(candidate);
    setFormData({
      candidateCode: candidate.candidateCode,
      jobOpeningId: candidate.jobOpeningId,
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      email: candidate.email,
      phone: candidate.phone || '',
      currentLocation: candidate.currentLocation || '',
      currentCompany: candidate.currentCompany || '',
      currentDesignation: candidate.currentDesignation || '',
      totalExperience: candidate.totalExperience,
      currentCtc: candidate.currentCtc,
      expectedCtc: candidate.expectedCtc,
      noticePeriodDays: candidate.noticePeriodDays,
      resumeUrl: candidate.resumeUrl || '',
      source: candidate.source || 'JOB_PORTAL',
      status: candidate.status,
      currentStage: candidate.currentStage || 'APPLICATION_RECEIVED',
      appliedDate: candidate.appliedDate || '',
      notes: candidate.notes || '',
      assignedRecruiterId: candidate.assignedRecruiterId || '',
    });
    setShowAddModal(true);
  };

  const handleDelete = async () => {
    if (!candidateToDelete) return;
    try {
      await recruitmentService.deleteCandidate(candidateToDelete.id);
      setShowDeleteModal(false);
      setCandidateToDelete(null);
      loadCandidates();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete candidate');
    }
  };

  const resetForm = () => {
    setEditingCandidate(null);
    setFormData({
      candidateCode: '',
      jobOpeningId: selectedJobFilter || '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      currentLocation: '',
      currentCompany: '',
      currentDesignation: '',
      totalExperience: undefined,
      currentCtc: undefined,
      expectedCtc: undefined,
      noticePeriodDays: undefined,
      resumeUrl: '',
      source: 'JOB_PORTAL',
      status: 'NEW',
      currentStage: 'APPLICATION_RECEIVED',
      appliedDate: new Date().toISOString().split('T')[0],
      notes: '',
      assignedRecruiterId: '',
    });
  };

  const getStatusColor = (status: CandidateStatus) => {
    switch (status) {
      case 'NEW': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'SCREENING': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300';
      case 'INTERVIEW': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'SELECTED': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'OFFER_EXTENDED': return 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300';
      case 'OFFER_ACCEPTED': return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300';
      case 'OFFER_DECLINED': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300';
      case 'REJECTED': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      case 'WITHDRAWN': return 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-300';
      default: return 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-300';
    }
  };

  const getStageColor = (stage?: RecruitmentStage) => {
    switch (stage) {
      case 'APPLICATION_RECEIVED': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'SCREENING': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300';
      case 'TECHNICAL_ROUND': return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300';
      case 'HR_ROUND': return 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300';
      case 'MANAGER_ROUND': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300';
      case 'FINAL_ROUND': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'OFFER': return 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300';
      case 'JOINED': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      default: return 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-300';
    }
  };

  const filteredCandidates = candidates.filter(candidate =>
    candidate.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    candidate.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    candidate.candidateCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: candidates.length,
    new: candidates.filter(c => c.status === 'NEW').length,
    interview: candidates.filter(c => c.status === 'INTERVIEW').length,
    selected: candidates.filter(c => c.status === 'SELECTED' || c.status === 'OFFER_ACCEPTED').length,
  };

  return (
    <AppLayout activeMenuItem="recruitment">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">Candidates</h1>
            <p className="text-surface-600 dark:text-surface-400 mt-1">Track and manage candidate applications</p>
          </div>
          <Button onClick={() => { resetForm(); setShowAddModal(true); }} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Candidate
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white dark:bg-surface-900">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-950/30 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-500 dark:text-surface-400">Total Candidates</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-surface-900">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-500 dark:text-surface-400">New</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">{stats.new}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-surface-900">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-yellow-50 dark:bg-yellow-950/30 flex items-center justify-center">
                  <Users className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-500 dark:text-surface-400">In Interview</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">{stats.interview}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-surface-900">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-950/30 flex items-center justify-center">
                  <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-500 dark:text-surface-400">Selected</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">{stats.selected}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Search and Filters */}
        <Card className="bg-white dark:bg-surface-900">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-surface-400" />
                <input
                  type="text"
                  placeholder="Search candidates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
              <select
                value={selectedJobFilter}
                onChange={(e) => setSelectedJobFilter(e.target.value)}
                className="px-4 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              >
                <option value="">All Job Openings</option>
                {jobOpenings.map((job) => (
                  <option key={job.id} value={job.id}>{job.jobTitle}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              >
                <option value="">All Status</option>
                <option value="NEW">New</option>
                <option value="SCREENING">Screening</option>
                <option value="INTERVIEW">Interview</option>
                <option value="SELECTED">Selected</option>
                <option value="OFFER_EXTENDED">Offer Extended</option>
                <option value="OFFER_ACCEPTED">Offer Accepted</option>
                <option value="OFFER_DECLINED">Offer Declined</option>
                <option value="REJECTED">Rejected</option>
                <option value="WITHDRAWN">Withdrawn</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Candidates Table */}
        <Card className="bg-white dark:bg-surface-900">
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-12 text-surface-500 dark:text-surface-400">Loading candidates...</div>
            ) : filteredCandidates.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-surface-300 dark:text-surface-600 mx-auto mb-4" />
                <p className="text-surface-500 dark:text-surface-400">No candidates found</p>
                <Button onClick={() => { resetForm(); setShowAddModal(true); }} className="mt-4">
                  Add First Candidate
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-surface-50 dark:bg-surface-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">Candidate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">Job</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">Experience</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">Stage</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">Source</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                    {filteredCandidates.map((candidate) => (
                      <tr key={candidate.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                              <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                                {candidate.firstName.charAt(0)}{candidate.lastName.charAt(0)}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-surface-900 dark:text-surface-50">{candidate.fullName}</div>
                              <div className="text-sm text-surface-500 dark:text-surface-400">{candidate.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-surface-900 dark:text-surface-50">{candidate.jobTitle || '-'}</div>
                          <div className="text-xs text-surface-500 dark:text-surface-400">{candidate.candidateCode}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-surface-600 dark:text-surface-400">
                          {candidate.totalExperience ? `${candidate.totalExperience} years` : '-'}
                        </td>
                        <td className="px-6 py-4">
                          {candidate.currentStage && (
                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStageColor(candidate.currentStage)}`}>
                              {candidate.currentStage.replace(/_/g, ' ')}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(candidate.status)}`}>
                            {candidate.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-surface-600 dark:text-surface-400">
                          {candidate.source?.replace(/_/g, ' ') || '-'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => { setSelectedCandidate(candidate); setShowViewModal(true); }}
                              className="p-2 text-surface-500 hover:text-primary-600 dark:text-surface-400 dark:hover:text-primary-400 transition-colors"
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => router.push(`/recruitment/interviews?candidateId=${candidate.id}`)}
                              className="p-2 text-surface-500 hover:text-primary-600 dark:text-surface-400 dark:hover:text-primary-400 transition-colors"
                              title="Schedule Interview"
                            >
                              <Calendar className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(candidate)}
                              className="p-2 text-surface-500 hover:text-primary-600 dark:text-surface-400 dark:hover:text-primary-400 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => { setCandidateToDelete(candidate); setShowDeleteModal(true); }}
                              className="p-2 text-surface-500 hover:text-red-600 dark:text-surface-400 dark:hover:text-red-400 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-surface-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-surface-200 dark:border-surface-700 shadow-xl">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
                    {editingCandidate ? 'Edit Candidate' : 'Add Candidate'}
                  </h2>
                  <button onClick={() => { setShowAddModal(false); resetForm(); }} className="text-surface-400 hover:text-surface-600 dark:hover:text-surface-300">
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Candidate Code *</label>
                      <input
                        type="text"
                        required
                        value={formData.candidateCode}
                        onChange={(e) => setFormData({ ...formData, candidateCode: e.target.value })}
                        className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                        placeholder="CAN-001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Job Opening *</label>
                      <select
                        required
                        value={formData.jobOpeningId}
                        onChange={(e) => setFormData({ ...formData, jobOpeningId: e.target.value })}
                        className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      >
                        <option value="">Select Job Opening</option>
                        {jobOpenings.map((job) => (
                          <option key={job.id} value={job.id}>{job.jobTitle}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">First Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Last Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Email *</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Current Company</label>
                      <input
                        type="text"
                        value={formData.currentCompany || ''}
                        onChange={(e) => setFormData({ ...formData, currentCompany: e.target.value })}
                        className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Current Designation</label>
                      <input
                        type="text"
                        value={formData.currentDesignation || ''}
                        onChange={(e) => setFormData({ ...formData, currentDesignation: e.target.value })}
                        className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Location</label>
                      <input
                        type="text"
                        value={formData.currentLocation || ''}
                        onChange={(e) => setFormData({ ...formData, currentLocation: e.target.value })}
                        className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Experience (years)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={formData.totalExperience || ''}
                        onChange={(e) => setFormData({ ...formData, totalExperience: e.target.value ? parseFloat(e.target.value) : undefined })}
                        className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Current CTC</label>
                      <input
                        type="number"
                        value={formData.currentCtc || ''}
                        onChange={(e) => setFormData({ ...formData, currentCtc: e.target.value ? parseFloat(e.target.value) : undefined })}
                        className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Expected CTC</label>
                      <input
                        type="number"
                        value={formData.expectedCtc || ''}
                        onChange={(e) => setFormData({ ...formData, expectedCtc: e.target.value ? parseFloat(e.target.value) : undefined })}
                        className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Notice (days)</label>
                      <input
                        type="number"
                        value={formData.noticePeriodDays || ''}
                        onChange={(e) => setFormData({ ...formData, noticePeriodDays: e.target.value ? parseInt(e.target.value) : undefined })}
                        className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Source</label>
                      <select
                        value={formData.source}
                        onChange={(e) => setFormData({ ...formData, source: e.target.value as CandidateSource })}
                        className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      >
                        <option value="JOB_PORTAL">Job Portal</option>
                        <option value="REFERRAL">Referral</option>
                        <option value="LINKEDIN">LinkedIn</option>
                        <option value="COMPANY_WEBSITE">Company Website</option>
                        <option value="WALK_IN">Walk In</option>
                        <option value="CAMPUS">Campus</option>
                        <option value="CONSULTANT">Consultant</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as CandidateStatus })}
                        className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      >
                        <option value="NEW">New</option>
                        <option value="SCREENING">Screening</option>
                        <option value="INTERVIEW">Interview</option>
                        <option value="SELECTED">Selected</option>
                        <option value="OFFER_EXTENDED">Offer Extended</option>
                        <option value="OFFER_ACCEPTED">Offer Accepted</option>
                        <option value="OFFER_DECLINED">Offer Declined</option>
                        <option value="REJECTED">Rejected</option>
                        <option value="WITHDRAWN">Withdrawn</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Current Stage</label>
                      <select
                        value={formData.currentStage}
                        onChange={(e) => setFormData({ ...formData, currentStage: e.target.value as RecruitmentStage })}
                        className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      >
                        <option value="APPLICATION_RECEIVED">Application Received</option>
                        <option value="SCREENING">Screening</option>
                        <option value="TECHNICAL_ROUND">Technical Round</option>
                        <option value="HR_ROUND">HR Round</option>
                        <option value="MANAGER_ROUND">Manager Round</option>
                        <option value="FINAL_ROUND">Final Round</option>
                        <option value="OFFER">Offer</option>
                        <option value="JOINED">Joined</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Assigned Recruiter</label>
                      <select
                        value={formData.assignedRecruiterId || ''}
                        onChange={(e) => setFormData({ ...formData, assignedRecruiterId: e.target.value })}
                        className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      >
                        <option value="">Select Recruiter</option>
                        {recruiters.map((recruiter) => (
                          <option key={recruiter.id} value={recruiter.id}>{recruiter.fullName}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Resume URL</label>
                      <input
                        type="url"
                        value={formData.resumeUrl || ''}
                        onChange={(e) => setFormData({ ...formData, resumeUrl: e.target.value })}
                        className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Notes</label>
                    <textarea
                      rows={3}
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      placeholder="Additional notes..."
                    />
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-surface-200 dark:border-surface-700">
                    <Button type="button" variant="outline" onClick={() => { setShowAddModal(false); resetForm(); }} className="flex-1">
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1">
                      {editingCandidate ? 'Update Candidate' : 'Add Candidate'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* View Modal */}
        {showViewModal && selectedCandidate && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-surface-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-surface-200 dark:border-surface-700 shadow-xl">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-surface-900 dark:text-surface-50">Candidate Details</h2>
                  <button onClick={() => setShowViewModal(false)} className="text-surface-400 hover:text-surface-600 dark:hover:text-surface-300">
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                      <span className="text-2xl font-bold text-primary-700 dark:text-primary-300">
                        {selectedCandidate.firstName.charAt(0)}{selectedCandidate.lastName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-surface-900 dark:text-surface-50">{selectedCandidate.fullName}</h3>
                      <p className="text-surface-500 dark:text-surface-400">{selectedCandidate.candidateCode}</p>
                      <div className="flex gap-2 mt-2">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedCandidate.status)}`}>
                          {selectedCandidate.status.replace(/_/g, ' ')}
                        </span>
                        {selectedCandidate.currentStage && (
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStageColor(selectedCandidate.currentStage)}`}>
                            {selectedCandidate.currentStage.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-800 rounded-xl">
                      <Mail className="h-5 w-5 text-surface-400" />
                      <div>
                        <p className="text-xs text-surface-500 dark:text-surface-400">Email</p>
                        <p className="text-sm font-medium text-surface-900 dark:text-surface-50">{selectedCandidate.email}</p>
                      </div>
                    </div>
                    {selectedCandidate.phone && (
                      <div className="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-800 rounded-xl">
                        <Phone className="h-5 w-5 text-surface-400" />
                        <div>
                          <p className="text-xs text-surface-500 dark:text-surface-400">Phone</p>
                          <p className="text-sm font-medium text-surface-900 dark:text-surface-50">{selectedCandidate.phone}</p>
                        </div>
                      </div>
                    )}
                    {selectedCandidate.currentLocation && (
                      <div className="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-800 rounded-xl">
                        <MapPin className="h-5 w-5 text-surface-400" />
                        <div>
                          <p className="text-xs text-surface-500 dark:text-surface-400">Location</p>
                          <p className="text-sm font-medium text-surface-900 dark:text-surface-50">{selectedCandidate.currentLocation}</p>
                        </div>
                      </div>
                    )}
                    {selectedCandidate.currentCompany && (
                      <div className="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-800 rounded-xl">
                        <Building className="h-5 w-5 text-surface-400" />
                        <div>
                          <p className="text-xs text-surface-500 dark:text-surface-400">Current Company</p>
                          <p className="text-sm font-medium text-surface-900 dark:text-surface-50">{selectedCandidate.currentCompany}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Professional Info */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="p-3 bg-surface-50 dark:bg-surface-800 rounded-xl text-center">
                      <p className="text-xs text-surface-500 dark:text-surface-400">Experience</p>
                      <p className="text-lg font-semibold text-surface-900 dark:text-surface-50">
                        {selectedCandidate.totalExperience ? `${selectedCandidate.totalExperience}y` : '-'}
                      </p>
                    </div>
                    <div className="p-3 bg-surface-50 dark:bg-surface-800 rounded-xl text-center">
                      <p className="text-xs text-surface-500 dark:text-surface-400">Current CTC</p>
                      <p className="text-lg font-semibold text-surface-900 dark:text-surface-50">
                        {selectedCandidate.currentCtc?.toLocaleString() || '-'}
                      </p>
                    </div>
                    <div className="p-3 bg-surface-50 dark:bg-surface-800 rounded-xl text-center">
                      <p className="text-xs text-surface-500 dark:text-surface-400">Expected CTC</p>
                      <p className="text-lg font-semibold text-surface-900 dark:text-surface-50">
                        {selectedCandidate.expectedCtc?.toLocaleString() || '-'}
                      </p>
                    </div>
                    <div className="p-3 bg-surface-50 dark:bg-surface-800 rounded-xl text-center">
                      <p className="text-xs text-surface-500 dark:text-surface-400">Notice Period</p>
                      <p className="text-lg font-semibold text-surface-900 dark:text-surface-50">
                        {selectedCandidate.noticePeriodDays ? `${selectedCandidate.noticePeriodDays}d` : '-'}
                      </p>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedCandidate.notes && (
                    <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-xl">
                      <p className="text-xs text-surface-500 dark:text-surface-400 mb-2">Notes</p>
                      <p className="text-sm text-surface-900 dark:text-surface-50">{selectedCandidate.notes}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t border-surface-200 dark:border-surface-700">
                    <Button variant="outline" onClick={() => setShowViewModal(false)} className="flex-1">
                      Close
                    </Button>
                    <Button onClick={() => { setShowViewModal(false); handleEdit(selectedCandidate); }} className="flex-1">
                      Edit Candidate
                    </Button>
                    <Button onClick={() => router.push(`/recruitment/interviews?candidateId=${selectedCandidate.id}`)} className="flex-1">
                      Schedule Interview
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {showDeleteModal && candidateToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-surface-900 rounded-2xl max-w-md w-full p-6 border border-surface-200 dark:border-surface-700 shadow-xl">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="ml-4 text-lg font-medium text-surface-900 dark:text-surface-50">Delete Candidate</h3>
              </div>
              <p className="text-sm text-surface-500 dark:text-surface-400 mb-6">
                Are you sure you want to delete <strong className="text-surface-700 dark:text-surface-300">{candidateToDelete.fullName}</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { setShowDeleteModal(false); setCandidateToDelete(null); }} className="flex-1">
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete} className="flex-1">
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
