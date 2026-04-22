'use client';

import {useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {AlertCircle, Calendar, CheckCircle2, Clock, Mail, RefreshCw, Search, UserPlus, Users} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {Card, CardContent} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {Input} from '@/components/ui/Input';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {Skeleton} from '@/components/ui/Skeleton';
import {
  type CreatePreboardingRequest,
  useCreatePreboardingCandidate,
  usePreboardingCandidates,
  useResendPreboardingInvitation,
} from '@/lib/hooks/queries/usePreboarding';
import {createLogger} from '@/lib/utils/logger';

const preBoardingFormSchema = z.object({
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().optional().or(z.literal('')),
  email: z.string().email('Invalid email address'),
  joiningDate: z.string().min(1, 'Joining date required'),
  designation: z.string().optional().or(z.literal('')),
});

type PreBoardingFormData = z.infer<typeof preBoardingFormSchema>;

const log = createLogger('PreboardingPage');

interface PreBoardingModalProps {
  onClose: () => void;
  createMutation: ReturnType<typeof useCreatePreboardingCandidate>;
}

function PreBoardingModal({onClose, createMutation}: PreBoardingModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: {errors, isSubmitting},
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
      log.error('Failed to invite candidate:', error);
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
              {errors.firstName && <span className='text-status-danger-text text-sm'>{errors.firstName.message}</span>}
            </div>
            <div>
              <Input placeholder="Last Name" {...register('lastName')} />
              {errors.lastName && <span className='text-status-danger-text text-sm'>{errors.lastName.message}</span>}
            </div>
            <div>
              <Input type="email" placeholder="Email *" {...register('email')} />
              {errors.email && <span className='text-status-danger-text text-sm'>{errors.email.message}</span>}
            </div>
            <div>
              <Input type="date" {...register('joiningDate')} />
              {errors.joiningDate &&
                <span className='text-status-danger-text text-sm'>{errors.joiningDate.message}</span>}
            </div>
            <div>
              <Input placeholder="Designation" {...register('designation')} />
              {errors.designation &&
                <span className='text-status-danger-text text-sm'>{errors.designation.message}</span>}
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
  const {data: candidates = [], isLoading: loading, isError, error, refetch} = usePreboardingCandidates();
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
      case 'COMPLETED':
        return "bg-status-success-bg text-status-success-text";
      case 'IN_PROGRESS':
        return "bg-accent-subtle text-accent";
      case 'INVITED':
        return "bg-status-warning-bg text-status-warning-text";
      case 'CONVERTED':
        return "bg-accent-subtle text-accent";
      case 'CANCELLED':
        return "bg-status-danger-bg text-status-danger-text";
      default:
        return 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]';
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
    <AppLayout activeMenuItem="recruitment" breadcrumbs={[{label: 'Pre-boarding', href: '/preboarding'}]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">Pre-boarding Portal</h1>
            <p className="text-body-muted mt-1">Manage new hire paperwork before joining</p>
          </div>
          <PermissionGate permission={Permissions.PREBOARDING_CREATE}>
            <Button
              variant="primary"
              leftIcon={<UserPlus className="h-4 w-4"/>}
              onClick={() => setShowInviteModal(true)}
            >
              Invite Candidate
            </Button>
          </PermissionGate>
        </div>

        {/* Error State */}
        {isError && (
          <Card className='border-status-danger-border bg-status-danger-bg'>
            <CardContent className="p-4 row-between">
              <div className="flex items-center gap-4">
                <AlertCircle className='h-5 w-5 text-status-danger-text flex-shrink-0'/>
                <p className='text-sm text-status-danger-text'>
                  {error instanceof Error ? error.message : 'Failed to load pre-boarding data'}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5"/>
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className='w-12 h-12 rounded-xl bg-accent-subtle flex items-center justify-center'>
                <Users className='h-6 w-6 text-accent'/>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-muted)]">Total Candidates</p>
                <p className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">{stats.total}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div
                className='w-12 h-12 rounded-xl bg-status-warning-bg flex items-center justify-center'>
                <Mail className='h-6 w-6 text-status-warning-text'/>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-muted)]">Invited</p>
                <p className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">{stats.invited}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className='w-12 h-12 rounded-xl bg-accent-subtle flex items-center justify-center'>
                <Clock className='h-6 w-6 text-accent'/>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-muted)]">In Progress</p>
                <p className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">{stats.inProgress}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div
                className='w-12 h-12 rounded-xl bg-status-success-bg flex items-center justify-center'>
                <CheckCircle2 className='h-6 w-6 text-status-success-text'/>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-muted)]">Completed</p>
                <p className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">{stats.completed}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]"/>
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
            className="px-4 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-input)]"
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
                  <Skeleton key={i} className="h-16 w-full"/>
                ))}
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4"/>
                <h3 className="text-lg font-medium text-[var(--text-primary)]">No candidates found</h3>
                <p className="text-[var(--text-muted)] mt-1">Invite a new candidate to get started</p>
              </div>
            ) : (
              <div className='divide-y divide-surface-100'>
                {filteredCandidates.map((candidate) => (
                  <div key={candidate.id}
                       className="p-4 hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50 transition-colors">
                    <div className="row-between">
                      <div className="flex items-center gap-4">
                        <div
                          className='w-10 h-10 rounded-full bg-accent-subtle flex items-center justify-center'>
                          <span className='text-sm font-medium text-accent'>
                            {candidate.firstName[0]}{candidate.lastName?.[0] || ''}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">{candidate.fullName}</p>
                          <p className="text-body-muted">{candidate.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <p className="text-sm text-[var(--text-primary)]">{candidate.designation || '-'}</p>
                          <p className="text-caption">
                            <Calendar className="h-3 w-3 inline mr-1"/>
                            Joining: {new Date(candidate.expectedJoiningDate).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded-full h-2">
                            <div
                              className='bg-accent h-2 rounded-full transition-all'
                              style={{width: `${candidate.completionPercentage}%`}}
                            />
                          </div>
                          <span className="text-caption w-8">{candidate.completionPercentage}%</span>
                        </div>

                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(candidate.status)}`}>
                          {candidate.status}
                        </span>

                        {candidate.status === 'INVITED' && (
                          <PermissionGate permission={Permissions.PREBOARDING_CREATE}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResendInvitation(candidate.id)}
                              title="Resend Invitation"
                              disabled={resendInvitationMutation.isPending}
                            >
                              <RefreshCw className="h-4 w-4"/>
                            </Button>
                          </PermissionGate>
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
      {showInviteModal &&
        <PreBoardingModal onClose={() => setShowInviteModal(false)} createMutation={createCandidateMutation}/>}
    </AppLayout>
  );
}
