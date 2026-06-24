'use client';

import {useEffect, useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {AnimatePresence} from 'framer-motion';
import {AppLayout} from '@/components/layout';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {
  AlertTriangle,
  Bell,
  BookOpen,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  Edit2,
  Eye,
  Gift,
  Heart,
  Loader2,
  Megaphone,
  PartyPopper,
  Pin,
  Plus,
  Search,
  Trash2,
  Users,
  Wrench,
} from 'lucide-react';
import {useAuth} from '@/lib/hooks/useAuth';
import {isAdmin} from '@/lib/utils';
import {
  Announcement,
  AnnouncementCategory,
  AnnouncementPriority,
  CreateAnnouncementRequest,
  getCategoryColor,
  getCategoryLabel,
  getPriorityColor,
} from '@/lib/services/platform/announcement.service';
import {sanitizeAnnouncementHtml} from '@/lib/utils/sanitize';
import {safeUrl} from '@/lib/utils/safeUrl';
import {useToast} from '@/components/notifications/ToastProvider';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {EmptyState} from '@/components/ui/EmptyState';
import {Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui/Modal';
import {SkeletonCard} from '@/components/ui/Skeleton';
import {createLogger} from '@/lib/utils/logger';
import {useDebounce} from '@/lib/hooks/useDebounce';
import {
  useActiveAnnouncements,
  useCreateAnnouncement,
  useDeleteAnnouncement,
  useMarkAnnouncementRead,
  usePinnedAnnouncements,
  useUpdateAnnouncement,
} from '@/lib/hooks/queries/useAnnouncements';
import {useActiveDepartments} from '@/lib/hooks/queries/useDepartments';
import {formatDate as formatDateCanonical} from '@/lib/utils/format/date';
import {PageTransition, Reveal, Stagger, StaggerItem} from '@/components/motion';

/** Maps each announcement category to a background class for the icon container. */
const categoryIconBgColors: Record<AnnouncementCategory, string> = {
  GENERAL: 'bg-accent-100 dark:bg-accent-900/30',
  POLICY_UPDATE: 'bg-accent-300 dark:bg-accent-900/30',
  EVENT: 'bg-success-100 dark:bg-success-900/30',
  HOLIDAY: 'bg-warning-100 dark:bg-warning-900/30',
  ACHIEVEMENT: 'bg-accent-300 dark:bg-accent-900/30',
  URGENT: 'bg-danger-100 dark:bg-danger-900/30',
  BENEFIT: 'bg-accent-100 dark:bg-accent-900/30',
  TRAINING: 'bg-accent-100 dark:bg-accent-900/30',
  SOCIAL: 'bg-warning-100 dark:bg-warning-900/30',
  IT_MAINTENANCE: 'bg-[var(--bg-surface)]',
  HEALTH_SAFETY: 'bg-success-100 dark:bg-success-900/30',
  OTHER: 'bg-[var(--bg-surface)]',
};

/** Maps each announcement category to a text color class for the icon. */
const categoryIconTextColors: Record<AnnouncementCategory, string> = {
  GENERAL: 'text-accent-800 dark:text-accent-400',
  POLICY_UPDATE: 'text-accent-900 dark:text-accent-600',
  EVENT: 'text-success-800 dark:text-success-400',
  HOLIDAY: 'text-warning-800 dark:text-warning-400',
  ACHIEVEMENT: 'text-accent-900 dark:text-accent-600',
  URGENT: 'text-danger-800 dark:text-danger-400',
  BENEFIT: 'text-accent-800 dark:text-accent-400',
  TRAINING: 'text-accent-800 dark:text-accent-400',
  SOCIAL: 'text-warning-800 dark:text-warning-400',
  IT_MAINTENANCE: 'text-[var(--text-secondary)]',
  HEALTH_SAFETY: 'text-success-800 dark:text-success-400',
  OTHER: 'text-[var(--text-secondary)]',
};

const logger = createLogger('Announcements');

// Zod schema for announcement form
const announcementFormSchema = z.object({
  title: z.string().min(1, 'Title is required').min(3, 'Title must be at least 3 characters'),
  content: z.string().min(1, 'Content is required').min(10, 'Content must be at least 10 characters'),
  category: z.enum([
    'GENERAL',
    'POLICY_UPDATE',
    'EVENT',
    'HOLIDAY',
    'ACHIEVEMENT',
    'URGENT',
    'BENEFIT',
    'TRAINING',
    'SOCIAL',
    'IT_MAINTENANCE',
    'HEALTH_SAFETY',
    'OTHER',
  ] as const),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const),
  targetAudience: z.enum(['ALL_EMPLOYEES', 'SPECIFIC_DEPARTMENTS', 'SPECIFIC_EMPLOYEES', 'MANAGERS_ONLY', 'NEW_JOINERS'] as const),
  isPinned: z.boolean().default(false),
  sendEmail: z.boolean().default(false),
});

type AnnouncementFormData = z.infer<typeof announcementFormSchema>;

const categoryIcons: Record<AnnouncementCategory, React.ElementType> = {
  GENERAL: Bell,
  POLICY_UPDATE: BookOpen,
  EVENT: PartyPopper,
  HOLIDAY: Calendar,
  ACHIEVEMENT: Gift,
  URGENT: AlertTriangle,
  BENEFIT: Heart,
  TRAINING: BookOpen,
  SOCIAL: Users,
  IT_MAINTENANCE: Wrench,
  HEALTH_SAFETY: Heart,
  OTHER: Bell,
};

const priorityLabels: Record<AnnouncementPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export default function AnnouncementsPage() {
  const {user} = useAuth();
  useEffect(() => {
    document.title = 'Announcements | NU-AURA';
  }, []);
  const toast = useToast();
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [page, setPage] = useState(0);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Debounce search term to prevent excessive API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // React Query hooks
  const {data: activeData, isLoading: activeLoading} = useActiveAnnouncements(user?.employeeId || '', page, 10);
  const {data: pinnedData} = usePinnedAnnouncements();
  const deleteAnnouncementMutation = useDeleteAnnouncement();
  const markReadMutation = useMarkAnnouncementRead();

  const announcements = activeData?.content || [];
  const totalPages = activeData?.totalPages || 0;
  const pinnedAnnouncements = pinnedData || [];
  const loading = activeLoading;

  // Check if user can edit/delete an announcement (creator or admin)
  const canEditAnnouncement = (announcement: Announcement) => {
    if (!user) return false;
    // Admin can edit any announcement
    if (isAdmin(user.roles)) return true;
    // Creator can edit their own announcement
    return announcement.publishedBy === user.id;
  };

  // Handle edit announcement
  const handleEditAnnouncement = (announcement: Announcement, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAnnouncement(announcement);
    setShowCreateModal(true);
  };

  // Handle delete announcement with confirmation
  const handleDeleteAnnouncement = async () => {
    if (!showDeleteConfirm) return;

    try {
      await deleteAnnouncementMutation.mutateAsync(showDeleteConfirm);
      setShowDeleteConfirm(null);
      setSelectedAnnouncement(null);
      toast.success('Announcement Deleted', 'The announcement has been permanently removed.');
    } catch (error) {
      logger.error('Failed to delete announcement:', error);
      toast.error('Delete Failed', 'Unable to delete the announcement. Please try again.');
    }
  };


  const handleAnnouncementClick = async (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);

    // Mark as read if not already
    if (!announcement.isRead && user?.employeeId) {
      try {
        await markReadMutation.mutateAsync({
          announcementId: announcement.id,
          employeeId: user.employeeId,
        });
      } catch (error) {
        logger.error('Error marking as read:', error);
      }
    }
  };

  const filteredAnnouncements = announcements.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      a.content.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || a.category === categoryFilter;
    const matchesPriority = !priorityFilter || a.priority === priorityFilter;
    return matchesSearch && matchesCategory && matchesPriority;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return formatDateCanonical(date);
  };

  const getCategoryIcon = (category: AnnouncementCategory) => {
    const Icon = categoryIcons[category] || Bell;
    return Icon;
  };

  return (
    <AppLayout activeMenuItem="announcements">
      <PageTransition className="p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <Reveal className="mb-8" delay={0.01}>
            <div className="row-between">
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Megaphone className="w-8 h-8 text-accent-700" aria-hidden="true"/>
                  Announcements
                </h1>
                <p className="text-[var(--text-secondary)] mt-2">
                  Stay updated with company news and important updates
                </p>
              </div>
              <PermissionGate permission={Permissions.ANNOUNCEMENT_MANAGE}>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-accent-700 text-white rounded-xl hover:bg-accent-800 transition-colors font-medium shadow-[var(--shadow-card)]"
                >
                  <Plus className="w-5 h-5"/>
                  New Announcement
                </button>
              </PermissionGate>
            </div>
          </Reveal>

          {/* Pinned Announcements */}
          {pinnedAnnouncements.length > 0 && (
            <Reveal inView className="mb-8" delay={0.02}>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <Pin className="w-5 h-5 text-warning-500" aria-hidden="true"/>
                Pinned
              </h2>
              <Stagger className="grid grid-cols-1 md:grid-cols-2 gap-4" delayChildren={0.06} stagger={0.04} role="list" aria-label="Pinned announcements">
                {pinnedAnnouncements.map((announcement) => {
                  const Icon = getCategoryIcon(announcement.category);
                  return (
                    <StaggerItem
                      key={announcement.id}
                      role="listitem"
                      className="bg-gradient-to-r from-warning-50 to-warning-50 dark:from-warning-950/20 dark:to-warning-950/20 border border-warning-200 dark:border-warning-800 rounded-xl p-6 cursor-pointer hover:shadow-[var(--sh-md)] transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
                      onClick={() => handleAnnouncementClick(announcement)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleAnnouncementClick(announcement);
                        }
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-4 bg-warning-100 dark:bg-warning-900/30 rounded-lg">
                          <Icon className="w-6 h-6 text-warning-600"/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${getCategoryColor(announcement.category)}`}>
                            {getCategoryLabel(announcement.category)}
                          </span>
                            {announcement.priority === 'HIGH' || announcement.priority === 'CRITICAL' ? (
                              <span
                                className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityColor(announcement.priority)}`}>
                              {priorityLabels[announcement.priority]}
                            </span>
                            ) : null}
                          </div>
                          <h3
                            className="font-semibold text-[var(--text-primary)] text-lg group-hover:text-warning-600 transition-colors">
                            {announcement.title}
                          </h3>
                          <p className="text-body-secondary mt-1 line-clamp-2">
                            {announcement.content.replace(/<[^>]*>/g, '')}
                          </p>
                          <div className="flex items-center gap-4 mt-4 text-caption">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5"/>
                            {formatDate(announcement.publishedAt)}
                          </span>
                            <span className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5"/>
                              {announcement.readCount} views
                          </span>
                          </div>
                        </div>
                        <ChevronRight
                          className="w-5 h-5 text-[var(--text-muted)] group-hover:text-warning-600 transition-colors" aria-hidden="true"/>
                      </div>
                    </StaggerItem>
                  );
                })}
              </Stagger>
            </Reveal>
          )}

          {/* Search and Filters */}
          <Reveal inView className="card-aura p-4 mb-6" delay={0.04}>
            <div className="space-y-4">
              {/* Line 1: Search */}
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" aria-hidden="true"/>
                <input
                  type="text"
                  placeholder="Search announcements..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-aura pl-10 w-full"
                />
              </div>
              {/* Line 2: Filters */}
              <div className="flex gap-4">
                <select
                  aria-label="Filter by category"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="input-aura flex-1 cursor-pointer"
                >
                  <option value="">All Categories</option>
                  {Object.keys(categoryIcons).map((cat) => (
                    <option key={cat} value={cat}>
                      {getCategoryLabel(cat as AnnouncementCategory)}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Filter by priority"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="input-aura flex-1 cursor-pointer"
                >
                  <option value="">All Priorities</option>
                  {Object.entries(priorityLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Reveal>

          {/* Announcements List */}
          <Reveal inView delay={0.08}>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-accent-700" aria-hidden="true"/>
              All Announcements
            </h2>

            {loading ? (
              <Stagger className="space-y-4" delayChildren={0.04} stagger={0.03}>
                {Array.from({length: 4}).map((_, i) => (
                  <StaggerItem key={i}>
                    <SkeletonCard/>
                  </StaggerItem>
                ))}
              </Stagger>
            ) : filteredAnnouncements.length === 0 ? (
              <Reveal inView delay={0.1}>
                <EmptyState
                  icon={<Megaphone className="h-12 w-12"/>}
                  title="No Announcements"
                  description="No announcements to display"
                />
              </Reveal>
            ) : (
              <Stagger className="space-y-4" delayChildren={0.06} stagger={0.03} role="list" aria-label="Announcements">
                {filteredAnnouncements.map((announcement) => {
                  const Icon = getCategoryIcon(announcement.category);
                  return (
                    <StaggerItem
                      key={announcement.id}
                      role="listitem"
                      className={`card-interactive p-6 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 ${
                        announcement.isRead
                          ? ''
                          : 'border-accent-200 bg-accent-50/30 dark:border-accent-700/40 dark:bg-accent-950/15'
                      }`}
                      onClick={() => handleAnnouncementClick(announcement)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleAnnouncementClick(announcement);
                        }
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`p-4 rounded-lg ${categoryIconBgColors[announcement.category] || categoryIconBgColors.OTHER}`}>
                          <Icon
                            className={`w-6 h-6 ${categoryIconTextColors[announcement.category] || categoryIconTextColors.OTHER}`}/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${getCategoryColor(announcement.category)}`}>
                            {getCategoryLabel(announcement.category)}
                          </span>
                            <span
                              className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityColor(announcement.priority)}`}>
                            {priorityLabels[announcement.priority]}
                          </span>
                            {!announcement.isRead && (
                              <span
                                className="px-2 py-0.5 text-xs font-medium rounded-full bg-accent-100 text-accent-800 dark:bg-accent-900/30 dark:text-accent-400">
                              New
                            </span>
                            )}
                          </div>
                          <h3
                            className="font-semibold text-[var(--text-primary)] text-lg group-hover:text-accent-700 transition-colors">
                            {announcement.title}
                          </h3>
                          <p className="text-body-secondary mt-1 line-clamp-2">
                            {announcement.content.replace(/<[^>]*>/g, '')}
                          </p>
                          <div className="flex items-center gap-4 mt-4 text-caption">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" aria-hidden="true"/>
                            {formatDate(announcement.publishedAt)}
                          </span>
                            <span className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" aria-hidden="true"/>
                              <span className="num">{announcement.readCount}</span> views
                          </span>
                            {announcement.expiresAt && (
                              <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" aria-hidden="true"/>
                              Expires {formatDate(announcement.expiresAt)}
                            </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {announcement.isPinned && (
                            <Pin className="w-4 h-4 text-warning-500" aria-hidden="true"/>
                          )}
                          {canEditAnnouncement(announcement) && (
                            <div
                              className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <PermissionGate permission={Permissions.ANNOUNCEMENT_MANAGE}>
                                <button
                                  onClick={(e) => handleEditAnnouncement(announcement, e)}
                                  className="p-1.5 text-[var(--text-muted)] hover:text-accent-600 hover:bg-accent-50 dark:hover:bg-accent-900/30 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 className="w-4 h-4"/>
                                </button>
                              </PermissionGate>
                              <PermissionGate permission={Permissions.ANNOUNCEMENT_MANAGE}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowDeleteConfirm(announcement.id);
                                  }}
                                  className="p-1.5 text-[var(--text-muted)] hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/30 rounded-lg transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4"/>
                                </button>
                              </PermissionGate>
                            </div>
                          )}
                          <ChevronRight
                            className="w-5 h-5 text-[var(--text-muted)] group-hover:text-accent-700 transition-colors" aria-hidden="true"/>
                        </div>
                      </div>
                    </StaggerItem>
                  );
                })}
              </Stagger>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="px-4 py-2 border border-[var(--border-main)] rounded-lg hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--bg-surface)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-body-secondary">
                Page {page + 1} of {totalPages}
              </span>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-4 py-2 border border-[var(--border-main)] rounded-lg hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--bg-surface)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </Reveal>

          {/* Announcement Detail Modal */}
          {selectedAnnouncement && (
            <Modal
              isOpen={!!selectedAnnouncement}
              onClose={() => setSelectedAnnouncement(null)}
              size="lg"
            >
              <ModalHeader
                onClose={() => setSelectedAnnouncement(null)}
                className="bg-gradient-to-r from-accent-700 to-accent-800 !border-0"
              >
                <div className="flex items-center gap-4">
                  {(() => {
                    const Icon = getCategoryIcon(selectedAnnouncement.category);
                    return (
                      <div className="p-4 bg-white/20 rounded-lg">
                        <Icon className="w-6 h-6 text-white"/>
                      </div>
                    );
                  })()}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-white/20 text-white">
                        {getCategoryLabel(selectedAnnouncement.category)}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-white/20 text-white">
                        {priorityLabels[selectedAnnouncement.priority]}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-white">
                      {selectedAnnouncement.title}
                    </h2>
                  </div>
                </div>
              </ModalHeader>

              <ModalBody>
                <div className="flex items-center gap-4 mb-6 text-body-muted">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4"/>
                    Published {formatDate(selectedAnnouncement.publishedAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4"/>
                    {selectedAnnouncement.readCount} views
                  </span>
                  {selectedAnnouncement.isPinned && (
                    <span className="flex items-center gap-1 text-warning-600">
                      <Pin className="w-4 h-4"/>
                      Pinned
                    </span>
                  )}
                </div>

                <div
                  className="prose dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{__html: sanitizeAnnouncementHtml(selectedAnnouncement.content)}}
                />

                {selectedAnnouncement.attachmentUrl && (
                  <div className="mt-6 p-4 bg-[var(--bg-secondary)]/50 rounded-lg">
                    <a
                      href={safeUrl(selectedAnnouncement.attachmentUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-700 hover:text-accent-800 font-medium flex items-center gap-2"
                    >
                      <BookOpen className="w-4 h-4"/>
                      View Attachment
                    </a>
                  </div>
                )}
              </ModalBody>

              <ModalFooter className="justify-between">
                <div className="flex items-center gap-2 text-body-muted">
                  <CheckCircle className="w-4 h-4 text-success-500"/>
                  Marked as read
                </div>
                <div className="flex items-center gap-2">
                  {canEditAnnouncement(selectedAnnouncement) && (
                    <>
                      <PermissionGate permission={Permissions.ANNOUNCEMENT_MANAGE}>
                        <button
                          onClick={() => {
                            setEditingAnnouncement(selectedAnnouncement);
                            setSelectedAnnouncement(null);
                            setShowCreateModal(true);
                          }}
                          className="flex items-center gap-2 px-4 py-2 text-accent-600 bg-accent-50 dark:bg-accent-900/30 hover:bg-accent-100 dark:hover:bg-accent-900/50 rounded-lg transition-colors font-medium"
                        >
                          <Edit2 className="w-4 h-4"/>
                          Edit
                        </button>
                      </PermissionGate>
                      <PermissionGate permission={Permissions.ANNOUNCEMENT_MANAGE}>
                        <button
                          onClick={() => {
                            setShowDeleteConfirm(selectedAnnouncement.id);
                          }}
                          className="flex items-center gap-2 px-4 py-2 text-danger-600 bg-danger-50 dark:bg-danger-900/30 hover:bg-danger-100 dark:hover:bg-danger-900/50 rounded-lg transition-colors font-medium"
                        >
                          <Trash2 className="w-4 h-4"/>
                          Delete
                        </button>
                      </PermissionGate>
                    </>
                  )}
                  <button
                    onClick={() => setSelectedAnnouncement(null)}
                    className="px-4 py-2 bg-[var(--bg-surface)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-surface)] transition-colors font-medium"
                  >
                    Close
                  </button>
                </div>
              </ModalFooter>
            </Modal>
          )}

          {/* Create/Edit Announcement Modal - Only for admins */}
          <AnimatePresence>
            {showCreateModal && (
              <CreateAnnouncementModal
                announcement={editingAnnouncement}
                onClose={() => {
                  setShowCreateModal(false);
                  setEditingAnnouncement(null);
                }}
                onSuccess={() => {
                  setShowCreateModal(false);
                  setEditingAnnouncement(null);
                }}
              />
            )}
          </AnimatePresence>

          {/* Delete Confirmation Dialog */}
          <ConfirmDialog
            isOpen={!!showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(null)}
            onConfirm={handleDeleteAnnouncement}
            title="Delete Announcement?"
            message="This action cannot be undone. The announcement and all associated data will be permanently deleted."
            confirmText="Delete"
            cancelText="Cancel"
            type="danger"
            loading={deleteAnnouncementMutation.isPending}
          />
        </div>
      </PageTransition>
    </AppLayout>
  );
}

interface CreateAnnouncementModalProps {
  announcement?: Announcement | null;
  onClose: () => void;
  onSuccess: () => void;
}

function CreateAnnouncementModal({announcement, onClose, onSuccess}: CreateAnnouncementModalProps) {
  const toast = useToast();
  const isEditing = !!announcement;
  const [error, setError] = useState('');
  const [targetDepartmentIds, setTargetDepartmentIds] = useState<string[]>(announcement?.targetDepartmentIds || []);

  // React Query hooks
  const {data: departments = [], isLoading: loadingDepartments} = useActiveDepartments();
  const createMutation = useCreateAnnouncement();
  const updateMutation = useUpdateAnnouncement();

  // React Hook Form setup
  const {
    register,
    watch,
    reset,
    handleSubmit: formHandleSubmit,
    formState: {errors},
  } = useForm<AnnouncementFormData>({
    resolver: zodResolver(announcementFormSchema),
    defaultValues: {
      title: announcement?.title || '',
      content: announcement?.content || '',
      category: announcement?.category || 'GENERAL',
      priority: announcement?.priority || 'MEDIUM',
      targetAudience: announcement?.targetAudience || 'ALL_EMPLOYEES',
      isPinned: announcement?.isPinned || false,
      sendEmail: false,
    },
  });

  const watchTargetAudience = watch('targetAudience');

  const handleClose = () => {
    reset();
    onClose();
  };

  // Load departments when SPECIFIC_DEPARTMENTS is selected
  useEffect(() => {
    if (watchTargetAudience === 'SPECIFIC_DEPARTMENTS' && departments.length === 0) {
      // useActiveDepartments will automatically load on first use
    }
  }, [watchTargetAudience, departments.length]);

  const toggleDepartment = (deptId: string) => {
    if (targetDepartmentIds.includes(deptId)) {
      setTargetDepartmentIds(targetDepartmentIds.filter(id => id !== deptId));
    } else {
      setTargetDepartmentIds([...targetDepartmentIds, deptId]);
    }
  };

  const onSubmit = async (data: AnnouncementFormData) => {
    // Validate department selection when targeting specific departments
    if (data.targetAudience === 'SPECIFIC_DEPARTMENTS' && targetDepartmentIds.length === 0) {
      setError('Please select at least one department');
      return;
    }

    setError('');

    try {
      const payload: CreateAnnouncementRequest = {
        title: data.title,
        content: data.content,
        category: data.category,
        priority: data.priority,
        targetAudience: data.targetAudience,
        isPinned: data.isPinned,
        sendEmail: data.sendEmail,
        targetDepartmentIds: targetDepartmentIds.length > 0 ? targetDepartmentIds : undefined,
      };

      if (isEditing && announcement) {
        await updateMutation.mutateAsync({id: announcement.id, data: payload});
        toast.success('Announcement Updated', 'Your announcement has been updated successfully.');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Announcement Published', 'Your announcement has been published successfully.');
      }
      onSuccess();
    } catch (err: unknown) {
      logger.error(`Failed to ${isEditing ? 'update' : 'create'} announcement:`, err);
      const errorMessage = (err as {
        response?: { data?: { message?: string } }
      })?.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} announcement`;
      setError(errorMessage);
      toast.error(isEditing ? 'Update Failed' : 'Publish Failed', errorMessage);
    }
  };

  return (
    <Modal isOpen={true} onClose={handleClose} size="lg">
      <ModalHeader onClose={handleClose}>
        {isEditing ? 'Edit Announcement' : 'Create Announcement'}
      </ModalHeader>

      <form onSubmit={formHandleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
        <ModalBody className="space-y-4">
            {/* Title */}
            <div>
              <label htmlFor="announcement-title" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Title <span aria-hidden="true" className="text-danger-500">*</span>
              </label>
              <input
                id="announcement-title"
                type="text"
                {...register('title')}
                aria-required="true"
                className={`input-aura ${
                  errors.title ? '!border-danger-500' : ''
                }`}
                placeholder="Enter announcement title"
              />
              {errors.title && <p className="text-xs text-danger-500 mt-1">{errors.title.message}</p>}
            </div>

            {/* Content */}
            <div>
              <label htmlFor="announcement-content" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Content <span aria-hidden="true" className="text-danger-500">*</span>
              </label>
              <textarea
                id="announcement-content"
                {...register('content')}
                aria-required="true"
                rows={5}
                className={`input-aura resize-none ${
                  errors.content ? '!border-danger-500' : ''
                }`}
                placeholder="Enter announcement content"
              />
              {errors.content && <p className="text-xs text-danger-500 mt-1">{errors.content.message}</p>}
            </div>

            {/* Category and Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="announcement-category" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Category
                </label>
                <select
                  id="announcement-category"
                  {...register('category')}
                  className="input-aura"
                >
                  {Object.keys(categoryIcons).map((cat) => (
                    <option key={cat} value={cat}>
                      {getCategoryLabel(cat as AnnouncementCategory)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="announcement-priority" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Priority
                </label>
                <select
                  id="announcement-priority"
                  {...register('priority')}
                  className="input-aura"
                >
                  {Object.entries(priorityLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Target Audience */}
            <div>
              <label htmlFor="announcement-target-audience" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Target Audience
              </label>
              <select
                id="announcement-target-audience"
                {...register('targetAudience')}
                className="w-full px-4 py-2.5 border border-[var(--border-main)] rounded-lg dark:bg-[var(--bg-secondary)] dark:text-white"
              >
                <option value="ALL_EMPLOYEES">All Employees</option>
                <option value="SPECIFIC_DEPARTMENTS">Specific Departments</option>
                <option value="MANAGERS_ONLY">Managers Only</option>
                <option value="NEW_JOINERS">New Joiners</option>
              </select>
            </div>

            {/* Department Selection - Only shown when SPECIFIC_DEPARTMENTS is selected */}
            {watchTargetAudience === 'SPECIFIC_DEPARTMENTS' && (
              <fieldset aria-required="true">
                <legend id="announcement-departments-label" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Select Departments <span aria-hidden="true" className="text-danger-500">*</span>
                </legend>
                {loadingDepartments ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-accent-700"/>
                    <span className="ml-2 text-body-muted">Loading departments...</span>
                  </div>
                ) : departments.length === 0 ? (
                  <p className="text-body-muted">No departments found</p>
                ) : (
                  <div
                    className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-4 border border-[var(--border-main)] rounded-lg bg-[var(--bg-secondary)]/50">
                    {departments.map((dept) => (
                      <label
                        key={dept.id}
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                          targetDepartmentIds.includes(dept.id)
                            ? 'bg-accent-100 dark:bg-accent-900/30 border border-accent-300 dark:border-accent-700'
                            : 'hover:bg-[var(--bg-surface)] border border-transparent'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={targetDepartmentIds.includes(dept.id)}
                          onChange={() => toggleDepartment(dept.id)}
                          className="w-4 h-4 text-accent-700 rounded focus:ring-accent-600"
                        />
                        <span className="text-body-secondary truncate">
                          {dept.name}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                {targetDepartmentIds.length > 0 && (
                  <p className="mt-2 text-xs text-accent-700 dark:text-accent-400">
                    {targetDepartmentIds.length} department{targetDepartmentIds.length > 1 ? 's' : ''} selected
                  </p>
                )}
              </fieldset>
            )}

            {/* Options */}
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('isPinned')}
                  className="w-4 h-4 text-accent-700 rounded focus:ring-accent-600"
                />
                <span className="text-body-secondary">Pin this announcement</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('sendEmail')}
                  className="w-4 h-4 text-accent-700 rounded focus:ring-accent-600"
                />
                <span className="text-body-secondary">Send email notification</span>
              </label>
            </div>

          {/* Error */}
          {error && (
            <div
              className="p-4 bg-danger-50 dark:bg-danger-950/20 border border-danger-200 dark:border-danger-800 rounded-lg text-sm text-danger-600 dark:text-danger-400">
              {error}
            </div>
          )}
        </ModalBody>

        <ModalFooter className="gap-4">
          <button type="button"
                  onClick={handleClose}
                  className="flex-1 btn-secondary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
          >
            Cancel
          </button>
          <button type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
          >
            {createMutation.isPending || updateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin"/>
                {isEditing ? 'Updating...' : 'Publishing...'}
              </>
            ) : (
              <>
                <Megaphone className="w-4 h-4"/>
                {isEditing ? 'Update' : 'Publish'}
              </>
            )}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
