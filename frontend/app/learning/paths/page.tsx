'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Users,
  Play,
  CheckCircle2,
  Zap,
  Filter,
  Search,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/notifications/ToastProvider';

interface LearningPath {
  id: string;
  title: string;
  description?: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  durationHours?: number;
  courseCount: number;
  totalEnrollments: number;
  thumbnailUrl?: string;
  isEnrolled?: boolean;
  progressPercentage?: number;
  status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
}

export default function LearningPathsPage() {
  const toast = useToast();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('ALL');

  // Query for learning paths
  const { data: paths = [], isLoading, refetch } = useQuery({
    queryKey: ['learning-paths'],
    queryFn: async () => {
      const response = await apiClient.get<{ content: LearningPath[] }>('/lms/learning-paths');
      return response.data.content || [];
    },
  });

  // Mutation for enrolling in paths
  const enrollPathMutation = useMutation({
    mutationFn: async (pathId: string) => {
      await apiClient.post(`/lms/learning-paths/${pathId}/enroll`);
    },
    onSuccess: () => {
      refetch();
    },
    onError: (err: unknown) => {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to enroll in learning path');
    },
  });

  // Apply filters
  const filteredPaths = (() => {
    let filtered = paths;

    // Filter by difficulty
    if (selectedDifficulty !== 'ALL') {
      filtered = filtered.filter(p => p.difficulty === selectedDifficulty);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
      );
    }

    return filtered;
  })();

  const handleEnrollPath = async (pathId: string) => {
    try {
      await enrollPathMutation.mutateAsync(pathId);
    } catch {
      // Error handled by mutation
    }
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'BEGINNER': return 'bg-success-100 text-success-800 dark:bg-success-900/50 dark:text-success-300';
      case 'INTERMEDIATE': return 'bg-warning-100 text-warning-800 dark:bg-warning-900/50 dark:text-warning-300';
      case 'ADVANCED': return 'bg-danger-100 text-danger-800 dark:bg-danger-900/50 dark:text-danger-300';
      default: return 'bg-[var(--bg-secondary)] text-[var(--text-primary)]';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'NOT_STARTED': return 'bg-[var(--bg-surface)] text-[var(--text-primary)]';
      case 'IN_PROGRESS': return 'bg-warning-100 text-warning-700';
      case 'COMPLETED': return 'bg-success-100 text-success-700';
      default: return 'bg-[var(--bg-surface)] text-[var(--text-primary)]';
    }
  };

  return (
    <AppLayout activeMenuItem="learning">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/learning" className="flex items-center gap-1 text-accent-600 hover:text-accent-700 mb-4 w-fit text-sm">
            <ArrowLeft className="h-4 w-4" /> Back to Learning
          </Link>
          <h1 className="text-4xl font-bold text-[var(--text-primary)] skeuo-emboss mb-2">Learning Paths</h1>
          <p className="text-[var(--text-secondary)]">Structured learning journeys to develop specific skills and competencies</p>
        </div>

        {/* Search and Filter */}
        <div className="bg-[var(--bg-input)] rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search learning paths..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-aura w-full pl-10 pr-4 py-2 border border-[var(--border-main)] rounded-lg focus:outline-none focus:border-accent-600 bg-[var(--bg-secondary)] text-[var(--text-primary)]"
              />
            </div>

            {/* Difficulty Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-[var(--text-secondary)]" />
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="flex-1 px-4 py-2 border border-[var(--border-main)] rounded-lg focus:outline-none focus:border-accent-600 bg-[var(--bg-secondary)] text-[var(--text-primary)]"
              >
                <option value="ALL">All Difficulty Levels</option>
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-4 border-accent-600 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-[var(--text-muted)]">Loading learning paths...</p>
            </div>
          </div>
        ) : filteredPaths.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPaths.map((path) => (
              <div key={path.id} className="skeuo-card bg-[var(--bg-input)] rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                {/* Thumbnail */}
                {path.thumbnailUrl ? (
                  <div className="relative w-full h-40">
                    <Image
                      src={path.thumbnailUrl}
                      alt={path.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full h-40 bg-gradient-to-r from-accent-500 to-accent-800 flex items-center justify-center">
                    <Zap className="h-12 w-12 text-white opacity-50" />
                  </div>
                )}

                {/* Content */}
                <div className="p-6">
                  {/* Title and Status */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] flex-1">{path.title}</h3>
                    {path.status && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(path.status)}`}>
                        {path.status.replace('_', ' ')}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {path.description && (
                    <p className="text-[var(--text-secondary)] text-sm mb-4 line-clamp-2">{path.description}</p>
                  )}

                  {/* Meta Info */}
                  <div className="flex flex-wrap gap-4 mb-4 text-xs text-[var(--text-secondary)]">
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      {path.courseCount} {path.courseCount === 1 ? 'course' : 'courses'}
                    </div>
                    {path.durationHours && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {path.durationHours}h
                      </div>
                    )}
                    {path.totalEnrollments > 0 && (
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {path.totalEnrollments} enrolled
                      </div>
                    )}
                  </div>

                  {/* Difficulty Badge */}
                  <div className="mb-4">
                    <span className={`badge-status inline-block px-3 py-1 rounded-full text-xs font-semibold ${getDifficultyColor(path.difficulty)}`}>
                      {path.difficulty}
                    </span>
                  </div>

                  {/* Progress Bar (if enrolled) */}
                  {path.isEnrolled && typeof path.progressPercentage === 'number' && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-[var(--text-secondary)]">Progress</span>
                        <span className="text-xs font-bold text-[var(--text-primary)]">{path.progressPercentage}%</span>
                      </div>
                      <div className="w-full h-2 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent-600 transition-all duration-300"
                          style={{ width: `${path.progressPercentage}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  {path.isEnrolled ? (
                    <button
                      onClick={() => router.push(`/learning/paths/${path.id}`)}
                      className="btn-primary w-full px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 font-medium text-sm flex items-center justify-center gap-2"
                    >
                      {path.status === 'COMPLETED' ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" /> Review Path
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" /> Continue
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleEnrollPath(path.id)}
                      disabled={enrollPathMutation.isPending}
                      className="btn-primary w-full px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 font-medium text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {enrollPathMutation.isPending ? (
                        <>
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                          Enrolling...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" /> Enroll Now
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[var(--bg-input)] rounded-lg shadow-md p-12 text-center">
            <Zap className="h-16 w-16 text-[var(--text-muted)] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              {searchQuery || selectedDifficulty !== 'ALL' ? 'No matching learning paths' : 'No learning paths available'}
            </h3>
            <p className="text-[var(--text-secondary)] mb-6">
              {searchQuery || selectedDifficulty !== 'ALL' 
                ? 'Try adjusting your search or filter criteria'
                : 'Learning paths will be available soon'}
            </p>
            {(searchQuery || selectedDifficulty !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedDifficulty('ALL');
                }}
                className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 font-medium text-sm"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
