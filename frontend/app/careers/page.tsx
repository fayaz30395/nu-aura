'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '@/lib/api/client';
import { usePublicJobs, type CareersFilters } from '@/lib/hooks/queries/useCareers';
import {
  Search,
  MapPin,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Upload,
  Send,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';

interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  employmentType: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
  postedDate: string;
  description: string;
  fullDescription: string;
  requirements: string[];
  responsibilities: string[];
  salaryRange?: string;
  experience: 'Entry-level' | 'Mid-level' | 'Senior' | 'Lead';
}

// Zod schema for job application form
const applicationFormSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(7, 'Invalid phone number'),
  coverLetter: z.string().optional().or(z.literal('')),
  linkedInUrl: z.string().optional().or(z.literal('')),
});

type ApplicationFormData = z.infer<typeof applicationFormSchema>;

interface JobCardProps {
  job: Job;
  onViewDetails: (job: Job) => void;
}

const JobCard: React.FC<JobCardProps> = ({ job, onViewDetails }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const getEmploymentTypeBg = (type: string) => {
    switch (type) {
      case 'Full-time':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 'Part-time':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
      case 'Contract':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300';
      case 'Internship':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      default:
        return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
    }
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer group"
          onClick={() => onViewDetails(job)}>
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-50 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            {job.title}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {job.department}
          </p>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
          {job.description}
        </p>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className={`${getEmploymentTypeBg(job.employmentType)} border-0`}>
            {job.employmentType}
          </Badge>
          <Badge variant="outline" className="border-slate-300 dark:border-slate-600">
            <MapPin className="h-3 w-3 mr-1" />
            {job.location}
          </Badge>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {formatDate(job.postedDate)}
          </span>
          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-primary-600 transition-colors" />
        </div>
      </div>
    </Card>
  );
};

const JobDetailModal: React.FC<{
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
  onApply: (job: Job) => void;
}> = ({ job, isOpen, onClose, onApply }) => {
  if (!job) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            {job.title}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {job.department} · {job.location}
          </p>
        </div>
      </ModalHeader>

      <ModalBody>
        <div className="space-y-6">
          {/* Meta Info */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide font-semibold">
                Employment Type
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-50">
                {job.employmentType}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide font-semibold">
                Experience Level
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-50">
                {job.experience}
              </p>
            </div>
            {job.salaryRange && (
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide font-semibold">
                  Salary Range
                </p>
                <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-50">
                  {job.salaryRange}
                </p>
              </div>
            )}
          </div>

          <hr className="border-slate-200 dark:border-slate-700" />

          {/* Description */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-50 uppercase tracking-wide mb-3">
              About this role
            </h4>
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
              {job.fullDescription}
            </p>
          </div>

          {/* Responsibilities */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-50 uppercase tracking-wide mb-3">
              Responsibilities
            </h4>
            <ul className="space-y-2">
              {job.responsibilities.map((resp, idx) => (
                <li key={idx} className="flex gap-4 text-sm text-slate-700 dark:text-slate-300">
                  <span className="text-primary-600 dark:text-primary-400 font-bold">•</span>
                  {resp}
                </li>
              ))}
            </ul>
          </div>

          {/* Requirements */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-50 uppercase tracking-wide mb-3">
              Requirements
            </h4>
            <ul className="space-y-2">
              {job.requirements.map((req, idx) => (
                <li key={idx} className="flex gap-4 text-sm text-slate-700 dark:text-slate-300">
                  <span className="text-primary-600 dark:text-primary-400 font-bold">•</span>
                  {req}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button
          onClick={() => onApply(job)}
          className="bg-primary-600 hover:bg-primary-700 text-white"
        >
          Apply Now
          <Send className="h-4 w-4 ml-2" />
        </Button>
      </ModalFooter>
    </Modal>
  );
};

const ApplicationModal: React.FC<{
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
}> = ({ job, isOpen, onClose }) => {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      coverLetter: '',
      linkedInUrl: '',
    },
  });

  if (!job) return null;

  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setResumeFile(file);
    }
  };

  const handleFormSubmit = async (data: ApplicationFormData) => {
    setSubmitStatus('idle');

    try {
      const formDataObj = new FormData();
      formDataObj.append('name', data.fullName);
      formDataObj.append('email', data.email);
      formDataObj.append('phone', data.phone);
      formDataObj.append('coverLetter', data.coverLetter || '');
      formDataObj.append('linkedInUrl', data.linkedInUrl || '');
      formDataObj.append('jobId', job.id);
      if (resumeFile) {
        formDataObj.append('resume', resumeFile);
      }

      await apiClient.post('/careers/apply', formDataObj);

      setSubmitStatus('success');
      setSubmitMessage('Your application has been submitted successfully!');
      setTimeout(() => {
        reset();
        setResumeFile(null);
        onClose();
        setSubmitStatus('idle');
      }, 2000);
    } catch (error) {
      setSubmitStatus('error');
      setSubmitMessage(error instanceof Error ? error.message : 'Failed to submit application');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            Apply for {job.title}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Fill in your details below
          </p>
        </div>
      </ModalHeader>

      <ModalBody>
        {submitStatus !== 'idle' && (
          <div className={`p-4 rounded-lg mb-4 flex gap-4 ${
            submitStatus === 'success'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
          }`}>
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{submitMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-50 mb-2">
              Full Name *
            </label>
            <Input
              type="text"
              placeholder="John Doe"
              className="w-full"
              {...register('fullName')}
            />
            {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-50 mb-2">
              Email Address *
            </label>
            <Input
              type="email"
              placeholder="john@example.com"
              className="w-full"
              {...register('email')}
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-50 mb-2">
              Phone Number *
            </label>
            <Input
              type="tel"
              placeholder="+1 (555) 123-4567"
              className="w-full"
              {...register('phone')}
            />
            {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-50 mb-2">
              Resume *
            </label>
            <div className="relative">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleResumeChange}
                required
                className="hidden"
                id="resume-input"
              />
              <label
                htmlFor="resume-input"
                className="flex items-center gap-2 p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Upload className="h-5 w-5 text-slate-500" />
                <div className="text-sm">
                  <p className="font-medium text-slate-700 dark:text-slate-300">
                    {resumeFile ? resumeFile.name : 'Upload your resume'}
                  </p>
                  {!resumeFile && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      PDF, DOC, or DOCX (max 5MB)
                    </p>
                  )}
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-50 mb-2">
              Cover Letter
            </label>
            <textarea
              placeholder="Tell us why you're interested in this position..."
              rows={4}
              className="w-full px-3 py-2 bg-[var(--bg-input)] border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-600"
              {...register('coverLetter')}
            />
            {errors.coverLetter && <p className="text-red-500 text-sm mt-1">{errors.coverLetter.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-50 mb-2">
              LinkedIn Profile URL
            </label>
            <Input
              type="url"
              placeholder="https://linkedin.com/in/johndoe"
              className="w-full"
              {...register('linkedInUrl')}
            />
            {errors.linkedInUrl && <p className="text-red-500 text-sm mt-1">{errors.linkedInUrl.message}</p>}
          </div>
        </form>
      </ModalBody>

      <ModalFooter>
        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit(handleFormSubmit)}
          disabled={isSubmitting}
          className="bg-primary-600 hover:bg-primary-700 text-white"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Submit Application
            </>
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

const JobSkeletonCard: React.FC = () => (
  <Card className="p-6">
    <Skeleton className="h-6 w-3/4 mb-2" />
    <Skeleton className="h-4 w-1/3 mb-4" />
    <Skeleton className="h-12 w-full mb-4" />
    <div className="flex gap-2 mb-4">
      <Skeleton className="h-6 w-20" />
      <Skeleton className="h-6 w-24" />
    </div>
    <Skeleton className="h-4 w-1/4" />
  </Card>
);

export default function CareersPage() {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showJobDetail, setShowJobDetail] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const jobsPerPage = 9;

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedExperience, setSelectedExperience] = useState('');

  // React Query - automatically refetches when filters change
  const filters: CareersFilters = {
    department: selectedDepartment || undefined,
    location: selectedLocation || undefined,
    type: selectedType || undefined,
    q: searchQuery || undefined,
  };

  const { data: jobs = [], isLoading } = usePublicJobs(filters);

  // Get unique values for filters
  const departments = Array.from(new Set(jobs.map((j) => j.department)));
  const locations = Array.from(new Set(jobs.map((j) => j.location)));
  const types = ['Full-time', 'Part-time', 'Contract', 'Internship'];
  const experiences = ['Entry-level', 'Mid-level', 'Senior', 'Lead'];

  // Pagination
  const paginatedJobs = jobs.slice(
    (currentPage - 1) * jobsPerPage,
    currentPage * jobsPerPage
  );
  const totalPages = Math.ceil(jobs.length / jobsPerPage);

  const handleViewDetails = (job: Job) => {
    setSelectedJob(job);
    setShowJobDetail(true);
    setShowApplicationModal(false);
  };

  const handleApply = (job: Job) => {
    setSelectedJob(job);
    setShowJobDetail(false);
    setShowApplicationModal(true);
  };

  const handleCloseJobDetail = () => {
    setShowJobDetail(false);
    setSelectedJob(null);
  };

  const handleCloseApplicationModal = () => {
    setShowApplicationModal(false);
    setSelectedJob(null);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-block mb-4 px-4 py-2 rounded-full bg-primary-600/10 border border-primary-600/20">
            <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
              We&apos;re Hiring
            </span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold text-slate-50 mb-6">
            Join Our Talented Team
          </h1>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Explore exciting career opportunities and be part of something great. Help us build the future of HR management.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-12">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search job titles or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-[var(--bg-input)] border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Filters */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800 dark:bg-slate-800/50 rounded-lg p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-slate-50 mb-6">Filters</h3>

              {/* Department Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Department
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => {
                    setSelectedDepartment(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-600"
                >
                  <option value="">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Location
                </label>
                <select
                  value={selectedLocation}
                  onChange={(e) => {
                    setSelectedLocation(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-600"
                >
                  <option value="">All Locations</option>
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Employment Type Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Employment Type
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => {
                    setSelectedType(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-600"
                >
                  <option value="">All Types</option>
                  {types.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Experience Level Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Experience Level
                </label>
                <select
                  value={selectedExperience}
                  onChange={(e) => {
                    setSelectedExperience(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-600"
                >
                  <option value="">All Levels</option>
                  {experiences.map((exp) => (
                    <option key={exp} value={exp}>
                      {exp}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear Filters */}
              {(searchQuery || selectedDepartment || selectedLocation || selectedType || selectedExperience) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedDepartment('');
                    setSelectedLocation('');
                    setSelectedType('');
                    setSelectedExperience('');
                    setCurrentPage(1);
                  }}
                  className="w-full text-sm"
                >
                  Clear All Filters
                </Button>
              )}
            </div>
          </div>

          {/* Job Listings */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="grid gap-6">
                {[...Array(6)].map((_, i) => (
                  <JobSkeletonCard key={i} />
                ))}
              </div>
            ) : paginatedJobs.length === 0 ? (
              <div className="text-center py-20">
                <Briefcase className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-50 mb-2">
                  No jobs found
                </h3>
                <p className="text-slate-400 mb-6">
                  Try adjusting your filters or search query
                </p>
                <Button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedDepartment('');
                    setSelectedLocation('');
                    setSelectedType('');
                    setSelectedExperience('');
                  }}
                  className="bg-primary-600 hover:bg-primary-700"
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <>
                <div className="grid gap-6 mb-8">
                  {paginatedJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>

                    <div className="flex items-center gap-2">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={page === currentPage ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className={
                            page === currentPage
                              ? 'bg-primary-600 hover:bg-primary-700'
                              : ''
                          }
                        >
                          {page}
                        </Button>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Results Info */}
                <div className="text-center mt-8 text-sm text-slate-400">
                  Showing {(currentPage - 1) * jobsPerPage + 1} to{' '}
                  {Math.min(currentPage * jobsPerPage, jobs.length)} of {jobs.length} positions
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <JobDetailModal
        job={selectedJob}
        isOpen={showJobDetail}
        onClose={handleCloseJobDetail}
        onApply={handleApply}
      />

      <ApplicationModal
        job={selectedJob}
        isOpen={showApplicationModal}
        onClose={handleCloseApplicationModal}
      />
    </div>
  );
}
