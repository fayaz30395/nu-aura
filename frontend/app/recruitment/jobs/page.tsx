'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { recruitmentService } from '@/lib/services/recruitment.service';
import { departmentService } from '@/lib/services/department.service';
import { employeeService } from '@/lib/services/employee.service';
import { JobOpening, CreateJobOpeningRequest, JobStatus, EmploymentType, Priority } from '@/lib/types/recruitment';
import { Department } from '@/lib/types/employee';
import { Briefcase, MapPin, Users, Calendar, DollarSign, Plus, Search, Filter, Eye, Edit2, Trash2, X } from 'lucide-react';

export default function JobOpeningsPage() {
  const router = useRouter();
  const [jobOpenings, setJobOpenings] = useState<JobOpening[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<JobOpening | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingJob, setEditingJob] = useState<JobOpening | null>(null);

  const [formData, setFormData] = useState<CreateJobOpeningRequest>({
    jobCode: '',
    jobTitle: '',
    departmentId: '',
    location: '',
    employmentType: 'FULL_TIME',
    experienceRequired: '',
    minSalary: undefined,
    maxSalary: undefined,
    numberOfOpenings: 1,
    jobDescription: '',
    requirements: '',
    skillsRequired: '',
    hiringManagerId: '',
    status: 'DRAFT',
    postedDate: new Date().toISOString().split('T')[0],
    closingDate: '',
    priority: 'MEDIUM',
    isActive: true,
  });

  useEffect(() => {
    loadJobOpenings();
    loadDepartments();
    loadManagers();
  }, [statusFilter]);

  const loadJobOpenings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await recruitmentService.getAllJobOpenings(0, 100);
      let filtered = response.content;
      if (statusFilter) {
        filtered = filtered.filter(j => j.status === statusFilter);
      }
      setJobOpenings(filtered);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load job openings');
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await departmentService.getActiveDepartments();
      setDepartments(response);
    } catch (err) {
      console.error('Error loading departments:', err);
    }
  };

  const loadManagers = async () => {
    try {
      const response = await employeeService.getAllEmployees(0, 100);
      setManagers(response.content);
    } catch (err) {
      console.error('Error loading managers:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      if (editingJob) {
        await recruitmentService.updateJobOpening(editingJob.id, formData);
      } else {
        await recruitmentService.createJobOpening(formData);
      }
      setShowAddModal(false);
      resetForm();
      loadJobOpenings();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save job opening');
    }
  };

  const handleEdit = (job: JobOpening) => {
    setEditingJob(job);
    setFormData({
      jobCode: job.jobCode,
      jobTitle: job.jobTitle,
      departmentId: job.departmentId || '',
      location: job.location || '',
      employmentType: job.employmentType || 'FULL_TIME',
      experienceRequired: job.experienceRequired || '',
      minSalary: job.minSalary,
      maxSalary: job.maxSalary,
      numberOfOpenings: job.numberOfOpenings || 1,
      jobDescription: job.jobDescription || '',
      requirements: job.requirements || '',
      skillsRequired: job.skillsRequired || '',
      hiringManagerId: job.hiringManagerId || '',
      status: job.status,
      postedDate: job.postedDate || '',
      closingDate: job.closingDate || '',
      priority: job.priority || 'MEDIUM',
      isActive: job.isActive,
    });
    setShowAddModal(true);
  };

  const handleDelete = async () => {
    if (!jobToDelete) return;
    try {
      await recruitmentService.deleteJobOpening(jobToDelete.id);
      setShowDeleteModal(false);
      setJobToDelete(null);
      loadJobOpenings();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete job opening');
    }
  };

  const resetForm = () => {
    setEditingJob(null);
    setFormData({
      jobCode: '',
      jobTitle: '',
      departmentId: '',
      location: '',
      employmentType: 'FULL_TIME',
      experienceRequired: '',
      minSalary: undefined,
      maxSalary: undefined,
      numberOfOpenings: 1,
      jobDescription: '',
      requirements: '',
      skillsRequired: '',
      hiringManagerId: '',
      status: 'DRAFT',
      postedDate: new Date().toISOString().split('T')[0],
      closingDate: '',
      priority: 'MEDIUM',
      isActive: true,
    });
  };

  const getStatusColor = (status: JobStatus) => {
    switch (status) {
      case 'OPEN': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'DRAFT': return 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-300';
      case 'ON_HOLD': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'CLOSED': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'CANCELLED': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      default: return 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-300';
    }
  };

  const getPriorityColor = (priority?: Priority) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      case 'HIGH': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300';
      case 'MEDIUM': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'LOW': return 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-300';
      default: return 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-300';
    }
  };

  const filteredJobs = jobOpenings.filter(job =>
    job.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.jobCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: jobOpenings.length,
    open: jobOpenings.filter(j => j.status === 'OPEN').length,
    draft: jobOpenings.filter(j => j.status === 'DRAFT').length,
    closed: jobOpenings.filter(j => j.status === 'CLOSED').length,
  };

  return (
    <AppLayout activeMenuItem="recruitment">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">Job Openings</h1>
            <p className="text-surface-600 dark:text-surface-400 mt-1">Manage job openings and recruitment positions</p>
          </div>
          <Button onClick={() => { resetForm(); setShowAddModal(true); }} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Job Opening
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white dark:bg-surface-900">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-950/30 flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-500 dark:text-surface-400">Total Jobs</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-surface-900">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-950/30 flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-500 dark:text-surface-400">Open</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">{stats.open}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-surface-900">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-surface-600 dark:text-surface-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-500 dark:text-surface-400">Draft</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">{stats.draft}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-surface-900">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-500 dark:text-surface-400">Closed</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">{stats.closed}</p>
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
                  placeholder="Search job openings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              >
                <option value="">All Status</option>
                <option value="OPEN">Open</option>
                <option value="DRAFT">Draft</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="CLOSED">Closed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Job Openings Grid */}
        {loading ? (
          <div className="text-center py-12 text-surface-500 dark:text-surface-400">Loading job openings...</div>
        ) : filteredJobs.length === 0 ? (
          <Card className="bg-white dark:bg-surface-900">
            <CardContent className="p-12 text-center">
              <Briefcase className="h-12 w-12 text-surface-300 dark:text-surface-600 mx-auto mb-4" />
              <p className="text-surface-500 dark:text-surface-400">No job openings found</p>
              <Button onClick={() => { resetForm(); setShowAddModal(true); }} className="mt-4">
                Create First Job Opening
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredJobs.map((job) => (
              <Card key={job.id} className="bg-white dark:bg-surface-900 hover:shadow-lg transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-surface-900 dark:text-surface-50 text-lg">{job.jobTitle}</h3>
                      <p className="text-sm text-surface-500 dark:text-surface-400">{job.jobCode}</p>
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    {job.departmentName && (
                      <div className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400">
                        <Users className="h-4 w-4" />
                        <span>{job.departmentName}</span>
                      </div>
                    )}
                    {job.location && (
                      <div className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400">
                        <MapPin className="h-4 w-4" />
                        <span>{job.location}</span>
                      </div>
                    )}
                    {(job.minSalary || job.maxSalary) && (
                      <div className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400">
                        <DollarSign className="h-4 w-4" />
                        <span>
                          {job.minSalary && job.maxSalary
                            ? `${job.minSalary.toLocaleString()} - ${job.maxSalary.toLocaleString()}`
                            : job.minSalary?.toLocaleString() || job.maxSalary?.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {job.closingDate && (
                      <div className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400">
                        <Calendar className="h-4 w-4" />
                        <span>Closes: {new Date(job.closingDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-surface-100 dark:border-surface-800">
                    <div className="flex items-center gap-2">
                      {job.priority && (
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${getPriorityColor(job.priority)}`}>
                          {job.priority}
                        </span>
                      )}
                      {job.numberOfOpenings && (
                        <span className="text-xs text-surface-500 dark:text-surface-400">
                          {job.numberOfOpenings} position{job.numberOfOpenings > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => router.push(`/recruitment/candidates?jobId=${job.id}`)}
                        className="p-2 text-surface-500 hover:text-primary-600 dark:text-surface-400 dark:hover:text-primary-400 transition-colors"
                        title="View Candidates"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(job)}
                        className="p-2 text-surface-500 hover:text-primary-600 dark:text-surface-400 dark:hover:text-primary-400 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => { setJobToDelete(job); setShowDeleteModal(true); }}
                        className="p-2 text-surface-500 hover:text-red-600 dark:text-surface-400 dark:hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-surface-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-surface-200 dark:border-surface-700 shadow-xl">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
                    {editingJob ? 'Edit Job Opening' : 'Create Job Opening'}
                  </h2>
                  <button onClick={() => { setShowAddModal(false); resetForm(); }} className="text-surface-400 hover:text-surface-600 dark:hover:text-surface-300">
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Job Code *</label>
                      <input
                        type="text"
                        required
                        value={formData.jobCode}
                        onChange={(e) => setFormData({ ...formData, jobCode: e.target.value })}
                        className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                        placeholder="JOB-001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Job Title *</label>
                      <input
                        type="text"
                        required
                        value={formData.jobTitle}
                        onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                        className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                        placeholder="Senior Software Engineer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Department</label>
                      <select
                        value={formData.departmentId || ''}
                        onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                        className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      >
                        <option value="">Select Department</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Hiring Manager</label>
                      <select
                        value={formData.hiringManagerId || ''}
                        onChange={(e) => setFormData({ ...formData, hiringManagerId: e.target.value })}
                        className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      >
                        <option value="">Select Manager</option>
                        {managers.map((mgr) => (
                          <option key={mgr.id} value={mgr.id}>{mgr.fullName}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Location</label>
                      <input
                        type="text"
                        value={formData.location || ''}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                        placeholder="Remote / City"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Employment Type</label>
                      <select
                        value={formData.employmentType}
                        onChange={(e) => setFormData({ ...formData, employmentType: e.target.value as EmploymentType })}
                        className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      >
                        <option value="FULL_TIME">Full Time</option>
                        <option value="PART_TIME">Part Time</option>
                        <option value="CONTRACT">Contract</option>
                        <option value="TEMPORARY">Temporary</option>
                        <option value="INTERNSHIP">Internship</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">No. of Openings</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.numberOfOpenings || 1}
                        onChange={(e) => setFormData({ ...formData, numberOfOpenings: parseInt(e.target.value) })}
                        className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Min Salary</label>
                      <input
                        type="number"
                        value={formData.minSalary || ''}
                        onChange={(e) => setFormData({ ...formData, minSalary: e.target.value ? parseFloat(e.target.value) : undefined })}
                        className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                        placeholder="50000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Max Salary</label>
                      <input
                        type="number"
                        value={formData.maxSalary || ''}
                        onChange={(e) => setFormData({ ...formData, maxSalary: e.target.value ? parseFloat(e.target.value) : undefined })}
                        className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                        placeholder="80000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Experience Required</label>
                      <input
                        type="text"
                        value={formData.experienceRequired || ''}
                        onChange={(e) => setFormData({ ...formData, experienceRequired: e.target.value })}
                        className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                        placeholder="3-5 years"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as JobStatus })}
                        className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      >
                        <option value="DRAFT">Draft</option>
                        <option value="OPEN">Open</option>
                        <option value="ON_HOLD">On Hold</option>
                        <option value="CLOSED">Closed</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Priority</label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as Priority })}
                        className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="URGENT">Urgent</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Closing Date</label>
                      <input
                        type="date"
                        value={formData.closingDate || ''}
                        onChange={(e) => setFormData({ ...formData, closingDate: e.target.value })}
                        className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Job Description</label>
                    <textarea
                      rows={4}
                      value={formData.jobDescription || ''}
                      onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
                      className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      placeholder="Describe the job role and responsibilities..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Requirements</label>
                    <textarea
                      rows={3}
                      value={formData.requirements || ''}
                      onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                      className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      placeholder="List the requirements..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Skills Required</label>
                    <textarea
                      rows={2}
                      value={formData.skillsRequired || ''}
                      onChange={(e) => setFormData({ ...formData, skillsRequired: e.target.value })}
                      className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      placeholder="React, TypeScript, Node.js..."
                    />
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-surface-200 dark:border-surface-700">
                    <Button type="button" variant="outline" onClick={() => { setShowAddModal(false); resetForm(); }} className="flex-1">
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1">
                      {editingJob ? 'Update Job' : 'Create Job'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {showDeleteModal && jobToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-surface-900 rounded-2xl max-w-md w-full p-6 border border-surface-200 dark:border-surface-700 shadow-xl">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="ml-4 text-lg font-medium text-surface-900 dark:text-surface-50">Delete Job Opening</h3>
              </div>
              <p className="text-sm text-surface-500 dark:text-surface-400 mb-6">
                Are you sure you want to delete <strong className="text-surface-700 dark:text-surface-300">{jobToDelete.jobTitle}</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { setShowDeleteModal(false); setJobToDelete(null); }} className="flex-1">
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
