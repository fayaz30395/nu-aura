'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Users, UserPlus, Calendar, CheckCircle2, Clock,
  AlertCircle, MoreVertical, Search, Mail, RefreshCw
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/notifications/ToastProvider';
import {
  usePreboardingCandidates,
  useCreatePreboardingCandidate,
  useResendPreboardingInvitation,
  type PreboardingCandidate,
  type CreatePreboardingRequest,
} from '@/lib/hooks/queries/usePreboarding';

const preBoardingFormSchema = z.object({
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().optional().or(z.literal('')),
  email: z.string().email('Invalid email address'),
  joiningDate: z.string().min(1, 'Joining date required'),
  designation: z.string().optional().or(z.literal('')),
});

type PreBoardingFormData = z.infer<typeof preBoardingFormSchema>;

interface PreBoardingModalProps {
  onClose: () => void;
  createMutation: ReturnType<typeof useCreatePreboardingCandidate>;
}

function PreBoardingModal({ onClose, createMutation }: PreBoardingModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PreBoardingFormData>({
    resolver: zodResolver(preBoardingFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      joiningDate: '',
      designation: '',
    },
  });

  const onSubmit = async (data: PreBoardingFormData) => {
    try {
      const request: CreatePreboardingRequest = {
        firstName: data.firstName,
        lastName: data.lastName || undefined,
        email: data.email,
        expectedJoiningDate: data.joiningDate,
        designation: data.designation || undefined,
      };
      await createMutation.mutateAsync(request);
      reset();
      onClose();
    } catch (error) {
      console.error('Failed to invite candidate:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center z-50">
      <div className="bg-[var(--bg-input)] rounded-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">Invite Candidate</h2>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <Input placeholder="First Name *" {...register('firstName')} />
              {errors.firstName && <span className="text-red-500 text-sm">{errors.firstName.message}</span>}
            </div>
            <div>
              <Input placeholder="Last Name" {...register('lastName')} />
              {errors.lastName && <span className="text-red-500 text-sm">{errors.lastName.message}</span>}
            </div>
            <div>
              <Input type="email" placeholder="Email *" {...register('email')} />
              {errors.email && <span className="text-red-500 text-sm">{errors.email.message}</span>}
            </div>
            <div>
              <Input type="date" {...register('joiningDate')} />
              {errors.joiningDate && <span className="text-red-500 text-sm">{errors.joiningDate.message}</span>}
            </div>
            <div>
              <Input placeholder="Designation" {...register('designation')} />
              {errors.designation && <span className="text-red-500 text-sm">{errors.designation.message}</span>}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PreboardingPage() {
  const toast = useToast();
  const { data: candidates = [], isLoading: loading } = usePreboardingCandidates();
  const createCandidateMutation = useCreatePreboardingCandidate();
  const resendInvitationMutation = useResendPreboardingInvitation();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showInviteModal, setShowInviteModal] = useState(false);

  const handleResendInvitation = async (id: string) => {
    await resendInvitationMutation.mutateAsync(id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'INVITED': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'CONVERTED': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'CANCELLED': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-surface-100 text-surface-800';
    }
  };

  const filteredCandidates = candidates.filter(c => {
    const matchesSearch = c.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: candidates.length,
    invited: candidates.filter(c => c.status === 'INVITED').length,
    inProgress: candidates.filter(c => c.status === 'IN_PROGRESS').length,
    completed: candidates.filter(c => c.status === 'COMPLETED').length,
  };

  return (
    <AppLayout activeMenuItem="recruitment" breadcrumbs={[{ label: 'Pre-boarding', href: '/preboarding' }]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">Pre-boarding Portal</h1>
            <p className="text-sm text-surface-500 mt-1">Manage new hire paperwork before joining</p>
          </div>
          <Button
            variant="primary"
            leftIcon={<UserPlus className="h-4 w-4" />}
            onClick={() => setShowInviteModal(true)}
          >
            Invite Candidate
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-surface-500">Total Candidates</p>
                <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">{stats.total}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center">
                <Mail className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-surface-500">Invited</p>
                <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">{stats.invited}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-surface-500">In Progress</p>
                <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">{stats.inProgress}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-surface-500">Completed</p>
                <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">{stats.completed}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
            <Input
              placeholder="Search candidates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-[var(--bg-input)]"
          >
            <option value="ALL">All Status</option>
            <option value="INVITED">Invited</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CONVERTED">Converted</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* Candidates List */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="h-12 w-12 text-surface-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-surface-900 dark:text-surface-50">No candidates found</h3>
                <p className="text-surface-500 mt-1">Invite a new candidate to get started</p>
              </div>
            ) : (
              <div className="divide-y divide-surface-100 dark:divide-surface-700">
                {filteredCandidates.map((candidate) => (
                  <div key={candidate.id} className="p-4 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                            {candidate.firstName[0]}{candidate.lastName?.[0] || ''}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-surface-900 dark:text-surface-50">{candidate.fullName}</p>
                          <p className="text-sm text-surface-500">{candidate.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <p className="text-sm text-surface-900 dark:text-surface-50">{candidate.designation || '-'}</p>
                          <p className="text-xs text-surface-500">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            Joining: {new Date(candidate.expectedJoiningDate).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-surface-100 dark:bg-surface-700 rounded-full h-2">
                            <div
                              className="bg-primary-500 h-2 rounded-full transition-all"
                              style={{ width: `${candidate.completionPercentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-surface-500 w-8">{candidate.completionPercentage}%</span>
                        </div>

                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(candidate.status)}`}>
                          {candidate.status}
                        </span>

                        {candidate.status === 'INVITED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResendInvitation(candidate.id)}
                            title="Resend Invitation"
                            disabled={resendInvitationMutation.isPending}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Invite Modal */}
      {showInviteModal && <PreBoardingModal onClose={() => setShowInviteModal(false)} createMutation={createCandidateMutation} />}
    </AppLayout>
  );
}
