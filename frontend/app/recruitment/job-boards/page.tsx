'use client';

import { useState } from 'react';
import { Globe, Plus, Pause, ExternalLink, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import { notifications } from '@mantine/notifications';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

interface JobBoardPosting {
  id: string;
  jobOpeningId: string;
  boardName: 'NAUKRI' | 'INDEED' | 'LINKEDIN' | 'SHINE' | 'MONSTER';
  status: 'PENDING' | 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'FAILED';
  externalJobId?: string;
  externalUrl?: string;
  postedAt?: string;
  expiresAt?: string;
  applicationsCount: number;
  viewsCount: number;
  lastSyncedAt?: string;
  errorMessage?: string;
}

interface JobOpening {
  id: string;
  jobTitle: string;
  jobCode: string;
  location: string;
  status: string;
}

const boardConfig: Record<string, { color: string; logo: string }> = {
  NAUKRI:   { color: 'bg-accent-600',   logo: '🇮🇳 Naukri' },
  INDEED:   { color: 'bg-accent-700', logo: '🌐 Indeed' },
  LINKEDIN: { color: 'bg-accent-600',   logo: '💼 LinkedIn' },
  SHINE:    { color: 'bg-success-600',  logo: '✨ Shine' },
  MONSTER:  { color: 'bg-warning-600', logo: '👾 Monster' },
};

const statusIcon: Record<string, { icon: typeof Clock; color: string }> = {
  PENDING: { icon: Clock,         color: 'text-warning-500' },
  ACTIVE:  { icon: CheckCircle,   color: 'text-success-600' },
  PAUSED:  { icon: AlertCircle,   color: 'text-warning-500' },
  EXPIRED: { icon: XCircle,       color: 'text-[var(--text-muted)]' },
  FAILED:  { icon: XCircle,       color: 'text-danger-500' },
};

const ALL_BOARDS: JobBoardPosting['boardName'][] = ['NAUKRI', 'INDEED', 'LINKEDIN', 'SHINE', 'MONSTER'];

export default function JobBoardsPage() {
  const queryClient = useQueryClient();
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [selectedBoards, setSelectedBoards] = useState<JobBoardPosting['boardName'][]>(['NAUKRI']);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const { data: postingsData, isLoading } = useQuery<{ content: JobBoardPosting[] }>({
    queryKey: ['job-board-postings', filterStatus],
    queryFn: async (): Promise<{ content: JobBoardPosting[] }> => {
      if (filterStatus === 'ALL') {
        const response = await apiClient.get<{ content: JobBoardPosting[] }>('/recruitment/job-boards');
        return response.data;
      } else {
        const response = await apiClient.get<{ content: JobBoardPosting[] }>(`/recruitment/job-boards/status/${filterStatus}`);
        return response.data;
      }
    },
  });

  const { data: openJobs } = useQuery<{ content: JobOpening[] }>({
    queryKey: ['jobs', 'open'],
    queryFn: async (): Promise<{ content: JobOpening[] }> => {
      const response = await apiClient.get<{ content: JobOpening[] }>('/recruitment/jobs?status=OPEN');
      return response.data;
    },
  });

  const postMutation = useMutation({
    mutationFn: () => apiClient.post('/recruitment/job-boards/post', {
      jobOpeningId: selectedJobId,
      boards: selectedBoards,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-board-postings'] });
      setShowPostModal(false);
      setSelectedJobId('');
      setSelectedBoards(['NAUKRI']);
    },
    onError: () => notifications.show({ title: 'Error', message: 'Failed to post job to boards', color: 'red' }),
  });

  const pauseMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/recruitment/job-boards/${id}/pause`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['job-board-postings'] }),
  });

  const postings = postingsData?.content ?? [];

  const toggleBoard = (board: JobBoardPosting['boardName']) => {
    setSelectedBoards(prev =>
      prev.includes(board) ? prev.filter(b => b !== board) : [...prev, board]
    );
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">Job Board Management</h1>
            <p className="text-[var(--text-muted)] mt-1 skeuo-deboss">Post jobs to Naukri, Indeed, LinkedIn and track applications</p>
          </div>
          <Button onClick={() => setShowPostModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Post to Job Boards
          </Button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Active Postings', value: postings.filter(p => p.status === 'ACTIVE').length, color: 'text-success-600' },
            { label: 'Total Applications', value: postings.reduce((s, p) => s + p.applicationsCount, 0), color: 'text-accent-600' },
            { label: 'Total Views', value: postings.reduce((s, p) => s + p.viewsCount, 0), color: 'text-accent-700' },
            { label: 'Failed Postings', value: postings.filter(p => p.status === 'FAILED').length, color: 'text-danger-600' },
          ].map((stat: { label: string; value: number; color: string }) => (
            <Card key={stat.label}>
              <CardContent className="pt-4">
                <p className="text-sm text-[var(--text-muted)]">{stat.label}</p>
                <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          {['ALL', 'ACTIVE', 'PENDING', 'PAUSED', 'FAILED', 'EXPIRED'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-4 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                filterStatus === s
                  ? 'bg-accent-600 text-white border-accent-600'
                  : 'bg-white text-[var(--text-secondary)] border-[var(--border-strong)] hover:border-accent-400'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Postings grid */}
        {isLoading ? (
          <div className="p-8 text-center text-[var(--text-muted)]">Loading...</div>
        ) : postings.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-[var(--text-muted)]">
              <Globe className="w-10 h-10 mx-auto mb-2 text-[var(--text-muted)]" />
              <p>No job board postings found. Post a job to get started!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {postings.map((posting: JobBoardPosting) => {
              const bc = boardConfig[posting.boardName] ?? boardConfig.NAUKRI;
              const sc = statusIcon[posting.status] ?? statusIcon.PENDING;
              const StatusIcon = sc.icon;
              return (
                <Card key={posting.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`px-2.5 py-1 rounded text-xs font-bold text-white ${bc.color}`}>
                          {bc.logo}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <StatusIcon className={`w-4 h-4 ${sc.color}`} />
                            <span className="font-medium text-[var(--text-primary)]">{posting.status}</span>
                            {posting.externalUrl && (
                              <a href={posting.externalUrl} target="_blank" rel="noopener noreferrer"
                                className="text-accent-500 hover:underline">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                          <p className="text-sm text-[var(--text-muted)] mt-0.5">
                            Job ID: <span className="font-mono">{posting.jobOpeningId.slice(0, 8)}…</span>
                            {posting.externalJobId && ` · External: ${posting.externalJobId}`}
                          </p>
                          {posting.errorMessage && (
                            <p className="text-xs text-danger-600 mt-1">{posting.errorMessage}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-[var(--text-secondary)]">
                        <div className="text-center">
                          <p className="text-lg font-bold text-accent-700">{posting.applicationsCount}</p>
                          <p className="text-xs text-[var(--text-muted)]">Applications</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-accent-600">{posting.viewsCount}</p>
                          <p className="text-xs text-[var(--text-muted)]">Views</p>
                        </div>
                        {posting.status === 'ACTIVE' && (
                          <Button size="sm" variant="outline" onClick={() => pauseMutation.mutate(posting.id)}>
                            <Pause className="w-3.5 h-3.5 mr-1" />
                            Pause
                          </Button>
                        )}
                      </div>
                    </div>
                    {(posting.postedAt || posting.expiresAt) && (
                      <p className="text-xs text-[var(--text-muted)] mt-2">
                        {posting.postedAt && `Posted: ${new Date(posting.postedAt).toLocaleDateString()}`}
                        {posting.expiresAt && ` · Expires: ${new Date(posting.expiresAt).toLocaleDateString()}`}
                        {posting.lastSyncedAt && ` · Synced: ${new Date(posting.lastSyncedAt).toLocaleDateString()}`}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Post modal */}
      {showPostModal && (
        <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Post Job to Boards</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Select Job Opening *</label>
                <select
                  value={selectedJobId}
                  onChange={e => setSelectedJobId(e.target.value)}
                  className="input-aura"
                >
                  <option value="">— Select a job —</option>
                  {openJobs?.content?.map((job: JobOpening) => (
                    <option key={job.id} value={job.id}>
                      {job.jobTitle} ({job.jobCode}) — {job.location}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Select Boards *</label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_BOARDS.map((board: JobBoardPosting['boardName']) => {
                    const bc = boardConfig[board];
                    const isSelected = selectedBoards.includes(board);
                    return (
                      <button
                        key={board}
                        onClick={() => toggleBoard(board)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium transition-all ${
                          isSelected ? `${bc.color} text-white border-transparent` : 'bg-white text-[var(--text-primary)] border-[var(--border-strong)] hover:border-[var(--border-main)]'
                        }`}
                      >
                        <Globe className="w-4 h-4" />
                        {board}
                        {board === 'NAUKRI' && <span className="text-xs opacity-75">🔥</span>}
                      </button>
                    );
                  })}
                </div>
                {selectedBoards.length === 0 && (
                  <p className="text-xs text-danger-500 mt-1">Select at least one board</p>
                )}
              </div>
              <p className="text-xs text-[var(--text-muted)] bg-[var(--bg-surface)] p-4 rounded-md">
                <strong>Note:</strong> Naukri requires API credentials configured in settings.
                Jobs will be posted immediately and expire after 30 days.
              </p>
              <div className="flex gap-4 justify-end pt-2">
                <Button variant="outline" onClick={() => setShowPostModal(false)}>Cancel</Button>
                <Button
                  onClick={() => postMutation.mutate()}
                  disabled={!selectedJobId || selectedBoards.length === 0 || postMutation.isPending}
                >
                  {postMutation.isPending ? 'Posting...' : `Post to ${selectedBoards.length} Board${selectedBoards.length > 1 ? 's' : ''}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AppLayout>
  );
}
