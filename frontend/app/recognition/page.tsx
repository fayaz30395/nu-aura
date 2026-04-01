'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';
import {
  Award,
  Heart,
  ThumbsUp,
  Trophy,
  Star,
  Users,
  TrendingUp,
  Gift,
  MessageCircle,
  Send,
  Crown,
  Medal,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Card,
  CardContent,
  Button,
  Input,
  Select,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Badge,
  Textarea,
  Skeleton,
} from '@/components/ui';
import type { RecognitionRequest } from '@/lib/types/grow/recognition';
import { RecognitionType, RecognitionCategory } from '@/lib/types/grow/recognition';
import {
  usePublicFeed,
  useMyReceivedRecognitions,
  useMyGivenRecognitions,
  useLeaderboard,
  useMyPoints,
  useGiveRecognition,
  useAddReaction,
  useRemoveReaction,
} from '@/lib/hooks/queries/useRecognition';
import { ReactionType } from '@/lib/types/grow/recognition';

// Zod schema for recognition form
const recognitionFormSchema = z.object({
  receiverId: z.string().min(1, 'Employee ID is required'),
  type: z.nativeEnum(RecognitionType),
  category: z.nativeEnum(RecognitionCategory),
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  message: z.string().max(2000, 'Message must be less than 2000 characters').optional().or(z.literal('')),
  pointsAwarded: z.number().int().min(0, 'Points must be 0 or more').max(100, 'Points must not exceed 100'),
  isPublic: z.boolean().default(true),
  isAnonymous: z.boolean().default(false),
});

type RecognitionFormData = z.infer<typeof recognitionFormSchema>;

const recognitionTypeOptions = [
  { value: RecognitionType.KUDOS, label: 'Kudos', icon: ThumbsUp },
  { value: RecognitionType.APPRECIATION, label: 'Appreciation', icon: Heart },
  { value: RecognitionType.ACHIEVEMENT, label: 'Achievement', icon: Trophy },
  { value: RecognitionType.SPOT_AWARD, label: 'Spot Award', icon: Star },
  { value: RecognitionType.PEER_NOMINATION, label: 'Peer Nomination', icon: Users },
  { value: RecognitionType.MANAGER_RECOGNITION, label: 'Manager Recognition', icon: Crown },
  { value: RecognitionType.TEAM_RECOGNITION, label: 'Team Recognition', icon: Users },
];

const categoryOptions = [
  { value: RecognitionCategory.TEAMWORK, label: 'Teamwork' },
  { value: RecognitionCategory.INNOVATION, label: 'Innovation' },
  { value: RecognitionCategory.CUSTOMER_FOCUS, label: 'Customer Focus' },
  { value: RecognitionCategory.LEADERSHIP, label: 'Leadership' },
  { value: RecognitionCategory.PROBLEM_SOLVING, label: 'Problem Solving' },
  { value: RecognitionCategory.GOING_EXTRA_MILE, label: 'Going Extra Mile' },
  { value: RecognitionCategory.MENTORSHIP, label: 'Mentorship' },
  { value: RecognitionCategory.QUALITY, label: 'Quality' },
  { value: RecognitionCategory.INITIATIVE, label: 'Initiative' },
  { value: RecognitionCategory.COLLABORATION, label: 'Collaboration' },
  { value: RecognitionCategory.COMMUNICATION, label: 'Communication' },
  { value: RecognitionCategory.OTHER, label: 'Other' },
];

const getTypeIcon = (type: RecognitionType) => {
  switch (type) {
    case RecognitionType.KUDOS:
      return <ThumbsUp className="h-5 w-5" />;
    case RecognitionType.APPRECIATION:
      return <Heart className="h-5 w-5" />;
    case RecognitionType.ACHIEVEMENT:
      return <Trophy className="h-5 w-5" />;
    case RecognitionType.SPOT_AWARD:
      return <Star className="h-5 w-5" />;
    default:
      return <Award className="h-5 w-5" />;
  }
};

const getTypeColor = (type: RecognitionType) => {
  switch (type) {
    case RecognitionType.KUDOS:
      return 'bg-accent-100 text-accent-800 dark:bg-accent-900 dark:text-accent-200';
    case RecognitionType.APPRECIATION:
      return 'bg-accent-300 text-accent-900 dark:bg-accent-900 dark:text-accent-400';
    case RecognitionType.ACHIEVEMENT:
      return 'bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-200';
    case RecognitionType.SPOT_AWARD:
      return 'bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-200';
    case RecognitionType.PEER_NOMINATION:
      return 'bg-accent-300 text-accent-900 dark:bg-accent-900 dark:text-accent-400';
    default:
      return 'bg-[var(--bg-surface)] text-[var(--text-primary)] dark:bg-[var(--bg-primary)] dark:text-[var(--text-secondary)]';
  }
};

export default function RecognitionPage() {
  const [activeTab, setActiveTab] = useState<'feed' | 'received' | 'given'>('feed');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Query hooks
  const feedQuery = usePublicFeed();
  const receivedQuery = useMyReceivedRecognitions();
  const givenQuery = useMyGivenRecognitions();
  const leaderboardQuery = useLeaderboard(5);
  const myPointsQuery = useMyPoints();
  const giveRecognitionMutation = useGiveRecognition();
  const addReactionMutation = useAddReaction();
  const removeReactionMutation = useRemoveReaction();

  // Reaction picker state
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  // Comment state
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentText, setCommentText] = useState<Record<string, string>>({});

  const reactionEmojis: { type: ReactionType; emoji: string; label: string }[] = [
    { type: ReactionType.LIKE, emoji: '\uD83D\uDC4D', label: 'Like' },
    { type: ReactionType.LOVE, emoji: '\u2764\uFE0F', label: 'Love' },
    { type: ReactionType.CELEBRATE, emoji: '\uD83C\uDF89', label: 'Celebrate' },
    { type: ReactionType.SUPPORT, emoji: '\uD83D\uDE4F', label: 'Support' },
    { type: ReactionType.INSIGHTFUL, emoji: '\uD83D\uDCA1', label: 'Insightful' },
  ];

  const handleReaction = (recognitionId: string, reactionType: ReactionType, hasReacted: boolean | undefined) => {
    if (hasReacted) {
      removeReactionMutation.mutate({ recognitionId, reactionType });
    } else {
      addReactionMutation.mutate({ recognitionId, reactionType });
    }
    setShowReactionPicker(null);
  };

  const toggleComments = (recognitionId: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(recognitionId)) {
        next.delete(recognitionId);
      } else {
        next.add(recognitionId);
      }
      return next;
    });
  };

  // Form setup with React Hook Form
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<RecognitionFormData>({
    resolver: zodResolver(recognitionFormSchema),
    defaultValues: {
      receiverId: '',
      type: RecognitionType.KUDOS,
      category: RecognitionCategory.TEAMWORK,
      title: '',
      message: '',
      pointsAwarded: 10,
      isPublic: true,
      isAnonymous: false,
    },
  });

  // Get the active query based on tab
  const getActiveQuery = () => {
    switch (activeTab) {
      case 'received':
        return receivedQuery;
      case 'given':
        return givenQuery;
      default:
        return feedQuery;
    }
  };

  const activeQuery = getActiveQuery();
  const recognitions = activeQuery.data?.content || [];
  const isLoading = activeQuery.isLoading;
  const leaderboard = leaderboardQuery.data || [];
  const myPoints = myPointsQuery.data || null;

  const handleGiveRecognition = () => {
    reset();
    setIsModalOpen(true);
  };

  const handleSubmitRecognition = (data: RecognitionFormData) => {
    giveRecognitionMutation.mutate(data as RecognitionRequest, {
      onSuccess: () => {
        setIsModalOpen(false);
        reset();
      },
    });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    reset();
  };

  // Stats
  const stats = {
    totalRecognitions: recognitions.length,
    myPoints: myPoints?.totalPointsEarned || 0,
    recognitionsReceived: myPoints?.recognitionsReceived || 0,
    recognitionsGiven: myPoints?.recognitionsGiven || 0,
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Recognition' },
  ];

  return (
    <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="recognition">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
              Employee Recognition
            </h1>
            <p className="text-[var(--text-secondary)] skeuo-deboss">
              Celebrate achievements and recognize your colleagues
            </p>
          </div>
          <PermissionGate permission={Permissions.RECOGNITION_CREATE}>
            <Button onClick={handleGiveRecognition}>
              <Sparkles className="mr-2 h-4 w-4" />
              Give Recognition
            </Button>
          </PermissionGate>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="skeuo-card bg-gradient-to-br from-warning-50 to-warning-100 dark:from-warning-900/30 dark:to-warning-900/30 border-warning-200 dark:border-warning-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-warning-500 p-4">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-warning-700 dark:text-warning-300 skeuo-deboss">My Points</p>
                  <p className="text-2xl font-bold text-warning-900 dark:text-warning-100 skeuo-emboss">{stats.myPoints}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="skeuo-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-success-100 p-4 dark:bg-success-900">
                  <Award className="h-6 w-6 text-success-600 dark:text-success-400" />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)] skeuo-deboss">Received</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">{stats.recognitionsReceived}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="skeuo-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-accent-100 p-4 dark:bg-accent-900">
                  <Gift className="h-6 w-6 text-accent-600 dark:text-accent-400" />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)] skeuo-deboss">Given</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">{stats.recognitionsGiven}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="skeuo-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-accent-300 p-4 dark:bg-accent-900">
                  <TrendingUp className="h-6 w-6 text-accent-800 dark:text-accent-600" />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)] skeuo-deboss">Total Activity</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">{stats.totalRecognitions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-4">
            {/* Tabs */}
            <div className="flex gap-2">
              <Button
                variant={activeTab === 'feed' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('feed')}
              >
                Public Feed
              </Button>
              <Button
                variant={activeTab === 'received' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('received')}
              >
                Received
              </Button>
              <Button
                variant={activeTab === 'given' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('given')}
              >
                Given
              </Button>
            </div>

            {/* Recognition Feed */}
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-1/3" />
                          <Skeleton className="h-4 w-2/3" />
                          <Skeleton className="h-4 w-1/2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : recognitions.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Award className="h-12 w-12 text-[var(--text-muted)]" />
                  <p className="mt-4 text-lg font-medium text-[var(--text-primary)]">
                    No recognitions yet
                  </p>
                  <p className="text-[var(--text-secondary)]">
                    Be the first to recognize a colleague!
                  </p>
                  <PermissionGate permission={Permissions.RECOGNITION_CREATE}>
                    <Button onClick={handleGiveRecognition} className="mt-4">
                      <Sparkles className="mr-2 h-4 w-4" />
                      Give Recognition
                    </Button>
                  </PermissionGate>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {recognitions.map((recognition) => (
                  <Card key={recognition.id} className="card-aura overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`rounded-full p-4 flex-shrink-0 ${getTypeColor(recognition.type)}`} aria-label={`Recognition type: ${recognition.type}`}>
                          {getTypeIcon(recognition.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h3 className="font-semibold text-[var(--text-primary)] break-words">
                                {recognition.title}
                              </h3>
                              <p className="text-sm text-[var(--text-secondary)] mt-1">
                                {recognition.isAnonymous ? 'Someone' : recognition.giverName || 'A colleague'} recognized{' '}
                                <span className="font-medium text-accent-700 dark:text-accent-400">
                                  {recognition.receiverName || 'a team member'}
                                </span>
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="badge-status status-info whitespace-nowrap">
                                {recognition.type.replace('_', ' ')}
                              </span>
                              {recognition.pointsAwarded > 0 && (
                                <span className="badge-status status-warning flex items-center gap-1 whitespace-nowrap">
                                  <Star className="h-3 w-3" />
                                  {recognition.pointsAwarded}
                                </span>
                              )}
                            </div>
                          </div>

                          {recognition.message && (
                            <p className="mt-2 text-[var(--text-secondary)] break-words">
                              {recognition.message}
                            </p>
                          )}

                          {recognition.category && (
                            <div className="mt-2">
                              <Badge variant="default" className="text-xs">
                                {recognition.category.replace('_', ' ')}
                              </Badge>
                            </div>
                          )}

                          <div className="mt-3 flex items-center gap-4 text-sm text-[var(--text-muted)] flex-wrap">
                            {/* Reaction button with picker */}
                            <div className="relative">
                              <button
                                className={`flex items-center gap-1 transition-colors ${recognition.hasReacted ? 'text-danger-500 dark:text-danger-400' : 'hover:text-danger-500 dark:hover:text-danger-400'}`}
                                aria-label={`React to recognition (${recognition.likesCount} reactions)`}
                                onClick={() => {
                                  if (recognition.hasReacted) {
                                    handleReaction(recognition.id, ReactionType.LIKE, true);
                                  } else {
                                    setShowReactionPicker(showReactionPicker === recognition.id ? null : recognition.id);
                                  }
                                }}
                              >
                                <Heart className={`h-4 w-4 ${recognition.hasReacted ? 'fill-current' : ''}`} />
                                {recognition.likesCount}
                              </button>
                              {showReactionPicker === recognition.id && (
                                <div className="absolute bottom-full left-0 mb-2 p-1.5 bg-[var(--bg-card)] dark:bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-lg shadow-lg flex gap-1 z-10">
                                  {reactionEmojis.map((reaction) => (
                                    <button
                                      key={reaction.type}
                                      onClick={() => handleReaction(recognition.id, reaction.type, false)}
                                      className="p-1.5 hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-primary)] rounded-md transition-colors text-lg"
                                      title={reaction.label}
                                    >
                                      {reaction.emoji}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <button
                              className="flex items-center gap-1 hover:text-accent-500 dark:hover:text-accent-400 transition-colors"
                              aria-label={`Comment on recognition (${recognition.commentsCount} comments)`}
                              onClick={() => toggleComments(recognition.id)}
                            >
                              <MessageCircle className="h-4 w-4" />
                              {recognition.commentsCount}
                            </button>
                            <span className="text-xs">
                              {new Date(recognition.recognizedAt || recognition.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          {/* Comment Section */}
                          {expandedComments.has(recognition.id) && (
                            <div className="mt-3 pt-3 border-t border-[var(--border-main)]">
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Write a comment..."
                                  value={commentText[recognition.id] || ''}
                                  onChange={(e) =>
                                    setCommentText((prev) => ({
                                      ...prev,
                                      [recognition.id]: e.target.value,
                                    }))
                                  }
                                  className="flex-1 px-4 py-1.5 text-sm bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-accent-700"
                                />
                                <button
                                  className="px-4 py-1.5 bg-accent-700 text-white text-sm rounded-lg hover:bg-accent-800 transition-colors disabled:opacity-50"
                                  disabled={!commentText[recognition.id]?.trim()}
                                >
                                  <Send className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              {recognition.commentsCount > 0 && (
                                <p className="text-xs text-[var(--text-muted)] mt-2">
                                  {recognition.commentsCount} comment{recognition.commentsCount !== 1 ? 's' : ''} - view all
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Leaderboard Sidebar */}
          <div className="space-y-4">
            <Card className="skeuo-card">
              <CardContent className="p-4">
                <h3 className="flex items-center gap-2 text-xl font-semibold text-[var(--text-primary)] skeuo-emboss mb-4">
                  <Crown className="h-5 w-5 text-warning-500" />
                  Top Contributors
                </h3>
                {leaderboardQuery.isPending || (leaderboardQuery.isLoading && leaderboard.length === 0) ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-lg" />
                    ))}
                  </div>
                ) : leaderboard.length === 0 ? (
                  <div className="text-center py-6">
                    <AlertCircle className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-2" />
                    <p className="text-sm text-[var(--text-muted)]">No data yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {leaderboard.map((employee, index) => (
                      <div
                        key={employee.id}
                        className="flex items-center gap-4 p-2 rounded-lg card-aura transition-colors"
                      >
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 ${index === 0 ? 'bg-warning-500 text-white' :
                            index === 1 ? 'bg-[var(--text-muted)] text-white' :
                              index === 2 ? 'bg-warning-600 text-white' :
                                'bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                          }`}>
                          {index === 0 ? <Crown className="h-4 w-4" /> :
                            index === 1 ? <Medal className="h-4 w-4" /> :
                              index === 2 ? <Medal className="h-4 w-4" /> :
                                <span className="text-sm font-medium">{index + 1}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[var(--text-primary)] text-sm truncate">
                            {employee.employeeName || `Employee ${index + 1}`}
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">
                            {employee.recognitionsReceived} recognitions
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-warning-600 dark:text-warning-400">
                            {employee.totalPointsEarned}
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">pts</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="skeuo-card">
              <CardContent className="p-4">
                <h3 className="text-xl font-semibold text-[var(--text-primary)] skeuo-emboss mb-4">
                  Quick Recognize
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {recognitionTypeOptions.slice(0, 4).map((type) => {
                    const Icon = type.icon;
                    return (
                      <PermissionGate key={type.value} permission={Permissions.RECOGNITION_CREATE}>
                        <button
                          onClick={() => {
                            reset({ ...watch(), type: type.value });
                            setIsModalOpen(true);
                          }}
                          className="flex flex-col items-center gap-2 p-4 rounded-lg card-interactive"
                        >
                          <Icon className="h-6 w-6 text-accent-500" />
                          <span className="text-xs text-[var(--text-secondary)]">{type.label}</span>
                        </button>
                      </PermissionGate>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Give Recognition Modal */}
        <Modal isOpen={isModalOpen} onClose={handleCloseModal} size="lg">
          <ModalHeader>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-warning-500" />
              Give Recognition
            </h2>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Employee ID *
                </label>
                <Input
                  {...register('receiverId')}
                  placeholder="Enter employee ID to recognize"
                />
                {errors.receiverId && (
                  <p className="text-sm text-danger-500 mt-1">{errors.receiverId.message}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Recognition Type *
                  </label>
                  <Select {...register('type')}>
                    {recognitionTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                  {errors.type && (
                    <p className="text-sm text-danger-500 mt-1">{errors.type.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Category
                  </label>
                  <Select {...register('category')}>
                    {categoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                  {errors.category && (
                    <p className="text-sm text-danger-500 mt-1">{errors.category.message}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Title *
                </label>
                <Input
                  {...register('title')}
                  placeholder="e.g., Great job on the project!"
                />
                {errors.title && (
                  <p className="text-sm text-danger-500 mt-1">{errors.title.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Message
                </label>
                <Textarea
                  {...register('message')}
                  placeholder="Share more details about why you're recognizing this person..."
                  rows={3}
                />
                {errors.message && (
                  <p className="text-sm text-danger-500 mt-1">{errors.message.message}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Points to Award
                  </label>
                  <Input
                    {...register('pointsAwarded', { valueAsNumber: true })}
                    type="number"
                    min={0}
                    max={100}
                  />
                  {errors.pointsAwarded && (
                    <p className="text-sm text-danger-500 mt-1">{errors.pointsAwarded.message}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2 justify-end">
                  <label className="flex items-center gap-2">
                    <input
                      {...register('isPublic')}
                      type="checkbox"
                      className="rounded border-[var(--border-main)] text-accent-700 focus:ring-accent-500"
                    />
                    <span className="text-sm text-[var(--text-secondary)]">
                      Make public
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      {...register('isAnonymous')}
                      type="checkbox"
                      className="rounded border-[var(--border-main)] text-accent-700 focus:ring-accent-500"
                    />
                    <span className="text-sm text-[var(--text-secondary)]">
                      Send anonymously
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button onClick={handleSubmit(handleSubmitRecognition)}>
              <Send className="mr-2 h-4 w-4" />
              Send Recognition
            </Button>
          </ModalFooter>
        </Modal>
      </div>
    </AppLayout>
  );
}
