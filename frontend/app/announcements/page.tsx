'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { AppLayout } from '@/components/layout';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';
import {
  Megaphone,
  Pin,
  Calendar,
  ChevronRight,
  X,
  Bell,
  AlertTriangle,
  PartyPopper,
  BookOpen,
  Heart,
  Wrench,
  Gift,
  Users,
  Search,
  Eye,
  CheckCircle,
  Clock,
  Plus,
  Loader2,
  Edit2,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { isAdmin } from '@/lib/utils';
import {
  Announcement,
  AnnouncementCategory,
  AnnouncementPriority,
  getCategoryColor,
  getPriorityColor,
  getCategoryLabel,
  CreateAnnouncementRequest,
} from '@/lib/services/announcement.service';

/** Maps each announcement category to a background class for the icon container. */
const categoryIconBgColors: Record<AnnouncementCategory, string> = {
  GENERAL: 'bg-blue-100 dark:bg-blue-900/30',
  POLICY_UPDATE: 'bg-purple-100 dark:bg-purple-900/30',
  EVENT: 'bg-green-100 dark:bg-green-900/30',
  HOLIDAY: 'bg-yellow-100 dark:bg-yellow-900/30',
  ACHIEVEMENT: 'bg-pink-100 dark:bg-pink-900/30',
  URGENT: 'bg-red-100 dark:bg-red-900/30',
  BENEFIT: 'bg-indigo-100 dark:bg-indigo-900/30',
  TRAINING: 'bg-cyan-100 dark:bg-cyan-900/30',
  SOCIAL: 'bg-orange-100 dark:bg-orange-900/30',
  IT_MAINTENANCE: 'bg-[var(--bg-surface)]',
  HEALTH_SAFETY: 'bg-emerald-100 dark:bg-emerald-900/30',
  OTHER: 'bg-[var(--bg-surface)]',
};

/** Maps each announcement category to a text color class for the icon. */
const categoryIconTextColors: Record<AnnouncementCategory, string> = {
  GENERAL: 'text-blue-800 dark:text-blue-400',
  POLICY_UPDATE: 'text-purple-800 dark:text-purple-400',
  EVENT: 'text-green-800 dark:text-green-400',
  HOLIDAY: 'text-yellow-800 dark:text-yellow-400',
  ACHIEVEMENT: 'text-pink-800 dark:text-pink-400',
  URGENT: 'text-red-800 dark:text-red-400',
  BENEFIT: 'text-indigo-800 dark:text-indigo-400',
  TRAINING: 'text-cyan-800 dark:text-cyan-400',
  SOCIAL: 'text-orange-800 dark:text-orange-400',
  IT_MAINTENANCE: 'text-[var(--text-secondary)]',
  HEALTH_SAFETY: 'text-emerald-800 dark:text-emerald-400',
  OTHER: 'text-[var(--text-secondary)]',
};
import { sanitizeAnnouncementHtml } from '@/lib/utils/sanitize';
import { useToast } from '@/components/notifications/ToastProvider';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { createLogger } from '@/lib/utils/logger';
import { useDebounce } from '@/lib/hooks/useDebounce';
import {
  useActiveAnnouncements,
  usePinnedAnnouncements,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
  useMarkAnnouncementRead,
} from '@/lib/hooks/queries/useAnnouncements';
import { useActiveDepartments } from '@/lib/hooks/queries/useDepartments';

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
  const { user } = useAuth();
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
  const { data: activeData, isLoading: activeLoading } = useActiveAnnouncements(user?.employeeId || '', page, 10);
  const { data: pinnedData } = usePinnedAnnouncements();
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
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getCategoryIcon = (category: AnnouncementCategory) => {
    const Icon = categoryIcons[category] || Bell;
    return Icon;
  };

  return (
    <AppLayout activeMenuItem="announcements">
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-4 skeuo-emboss">
                <Megaphone className="w-8 h-8 text-sky-700" />
                Announcements
              </h1>
              <p className="text-[var(--text-secondary)] mt-2 skeuo-deboss">
                Stay updated with company news and important updates
              </p>
            </div>
            <PermissionGate permission={Permissions.ANNOUNCEMENT_MANAGE}>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-sky-700 text-white rounded-xl hover:bg-sky-800 transition-colors font-medium shadow-sm"
              >
                <Plus className="w-5 h-5" />
                New Announcement
              </button>
            </PermissionGate>
          </div>
        </motion.div>

        {/* Pinned Announcements */}
        {pinnedAnnouncements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <Pin className="w-5 h-5 text-yellow-500" />
              Pinned
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pinnedAnnouncements.map((announcement, index) => {
                const Icon = getCategoryIcon(announcement.category);
                return (
                  <motion.div
                    key={announcement.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleAnnouncementClick(announcement)}
                    className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-5 cursor-pointer hover:shadow-lg transition-all group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                        <Icon className="w-6 h-6 text-yellow-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getCategoryColor(announcement.category)}`}>
                            {getCategoryLabel(announcement.category)}
                          </span>
                          {announcement.priority === 'HIGH' || announcement.priority === 'CRITICAL' ? (
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityColor(announcement.priority)}`}>
                              {priorityLabels[announcement.priority]}
                            </span>
                          ) : null}
                        </div>
                        <h3 className="font-semibold text-[var(--text-primary)] text-lg group-hover:text-yellow-600 transition-colors">
                          {announcement.title}
                        </h3>
                        <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">
                          {announcement.content.replace(/<[^>]*>/g, '')}
                        </p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-[var(--text-muted)]">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(announcement.publishedAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            {announcement.readCount} views
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[var(--text-muted)] group-hover:text-yellow-600 transition-colors" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="skeuo-card p-4 mb-6"
        >
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)] w-5 h-5" />
              <input
                type="text"
                placeholder="Search announcements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-aura pl-10"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input-aura"
            >
              <option value="">All Categories</option>
              {Object.keys(categoryIcons).map((cat) => (
                <option key={cat} value={cat}>
                  {getCategoryLabel(cat as AnnouncementCategory)}
                </option>
              ))}
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="input-aura"
            >
              <option value="">All Priorities</option>
              {Object.entries(priorityLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* Announcements List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-sky-700" />
            All Announcements
          </h2>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-sky-700" />
            </div>
          ) : filteredAnnouncements.length === 0 ? (
            <EmptyState
              icon={<Megaphone className="h-12 w-12" />}
              title="No Announcements"
              description="No announcements to display"
            />
          ) : (
            <div className="space-y-4">
              {filteredAnnouncements.map((announcement, index) => {
                const Icon = getCategoryIcon(announcement.category);
                return (
                  <motion.div
                    key={announcement.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleAnnouncementClick(announcement)}
                    className={`bg-[var(--bg-card)] rounded-xl shadow-sm p-5 cursor-pointer hover:shadow-lg transition-all group border-l-4 ${
                      announcement.isRead
                        ? 'border-l-[var(--border-main)]'
                        : 'border-l-sky-600'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-4 rounded-lg ${categoryIconBgColors[announcement.category] || categoryIconBgColors.OTHER}`}>
                        <Icon className={`w-6 h-6 ${categoryIconTextColors[announcement.category] || categoryIconTextColors.OTHER}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getCategoryColor(announcement.category)}`}>
                            {getCategoryLabel(announcement.category)}
                          </span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityColor(announcement.priority)}`}>
                            {priorityLabels[announcement.priority]}
                          </span>
                          {!announcement.isRead && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400">
                              New
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-[var(--text-primary)] text-lg group-hover:text-sky-700 transition-colors">
                          {announcement.title}
                        </h3>
                        <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">
                          {announcement.content.replace(/<[^>]*>/g, '')}
                        </p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-[var(--text-muted)]">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(announcement.publishedAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            {announcement.readCount} views
                          </span>
                          {announcement.expiresAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              Expires {formatDate(announcement.expiresAt)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {announcement.isPinned && (
                          <Pin className="w-4 h-4 text-yellow-500" />
                        )}
                        {canEditAnnouncement(announcement) && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <PermissionGate permission={Permissions.ANNOUNCEMENT_MANAGE}>
                              <button
                                onClick={(e) => handleEditAnnouncement(announcement, e)}
                                className="p-1.5 text-[var(--text-muted)] hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </PermissionGate>
                            <PermissionGate permission={Permissions.ANNOUNCEMENT_MANAGE}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowDeleteConfirm(announcement.id);
                                }}
                                className="p-1.5 text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </PermissionGate>
                          </div>
                        )}
                        <ChevronRight className="w-5 h-5 text-[var(--text-muted)] group-hover:text-sky-700 transition-colors" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
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
              <span className="px-4 py-2 text-sm text-[var(--text-secondary)]">
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
        </motion.div>

        {/* Announcement Detail Modal */}
        <AnimatePresence>
          {selectedAnnouncement && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center glass-aura !rounded-none p-4"
              onClick={() => setSelectedAnnouncement(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="skeuo-card rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-sky-700 to-sky-800 px-6 py-4 relative">
                  <button
                    onClick={() => setSelectedAnnouncement(null)}
                    className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                  <div className="flex items-center gap-4">
                    {(() => {
                      const Icon = getCategoryIcon(selectedAnnouncement.category);
                      return (
                        <div className="p-4 bg-white/20 rounded-lg">
                          <Icon className="w-6 h-6 text-white" />
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
                </div>

                {/* Modal Content */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                  <div className="flex items-center gap-4 mb-6 text-sm text-[var(--text-muted)]">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Published {formatDate(selectedAnnouncement.publishedAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {selectedAnnouncement.readCount} views
                    </span>
                    {selectedAnnouncement.isPinned && (
                      <span className="flex items-center gap-1 text-yellow-600">
                        <Pin className="w-4 h-4" />
                        Pinned
                      </span>
                    )}
                  </div>

                  <div
                    className="prose dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: sanitizeAnnouncementHtml(selectedAnnouncement.content) }}
                  />

                  {selectedAnnouncement.attachmentUrl && (
                    <div className="mt-6 p-4 bg-[var(--bg-secondary)]/50 rounded-lg">
                      <a
                        href={selectedAnnouncement.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-700 hover:text-sky-800 font-medium flex items-center gap-2"
                      >
                        <BookOpen className="w-4 h-4" />
                        View Attachment
                      </a>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 border-t border-[var(--border-main)] flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                    <CheckCircle className="w-4 h-4 text-green-500" />
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
                            className="flex items-center gap-2 px-4 py-2 text-blue-600 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors font-medium"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </button>
                        </PermissionGate>
                        <PermissionGate permission={Permissions.ANNOUNCEMENT_MANAGE}>
                          <button
                            onClick={() => {
                              setShowDeleteConfirm(selectedAnnouncement.id);
                            }}
                            className="flex items-center gap-2 px-4 py-2 text-red-600 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors font-medium"
                          >
                            <Trash2 className="w-4 h-4" />
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
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
          title="Delete Announcement"
          message="Are you sure you want to delete this announcement? All associated data will be permanently removed. This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
          loading={deleteAnnouncementMutation.isPending}
        />
        </div>
      </div>
    </AppLayout>
  );
}

interface CreateAnnouncementModalProps {
  announcement?: Announcement | null;
  onClose: () => void;
  onSuccess: () => void;
}

function CreateAnnouncementModal({ announcement, onClose, onSuccess }: CreateAnnouncementModalProps) {
  const toast = useToast();
  const isEditing = !!announcement;
  const [error, setError] = useState('');
  const [targetDepartmentIds, setTargetDepartmentIds] = useState<string[]>(announcement?.targetDepartmentIds || []);

  // React Query hooks
  const { data: departments = [], isLoading: loadingDepartments } = useActiveDepartments();
  const createMutation = useCreateAnnouncement();
  const updateMutation = useUpdateAnnouncement();

  // React Hook Form setup
  const {
    register,
    watch,
    handleSubmit: formHandleSubmit,
    formState: { errors },
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
        await updateMutation.mutateAsync({ id: announcement.id, data: payload });
        toast.success('Announcement Updated', 'Your announcement has been updated successfully.');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Announcement Published', 'Your announcement has been published successfully.');
      }
      onSuccess();
    } catch (err: unknown) {
      logger.error(`Failed to ${isEditing ? 'update' : 'create'} announcement:`, err);
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} announcement`;
      setError(errorMessage);
      toast.error(isEditing ? 'Update Failed' : 'Publish Failed', errorMessage);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center glass-aura !rounded-none p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="skeuo-card rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-main)] flex items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            {isEditing ? 'Edit Announcement' : 'Create Announcement'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--bg-surface)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[var(--text-muted)]" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={formHandleSubmit(onSubmit)} className="flex flex-col h-full">
          <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('title')}
                className={`input-aura ${
                  errors.title ? '!border-red-500' : ''
                }`}
                placeholder="Enter announcement title"
              />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Content <span className="text-red-500">*</span>
              </label>
              <textarea
                {...register('content')}
                rows={5}
                className={`input-aura resize-none ${
                  errors.content ? '!border-red-500' : ''
                }`}
                placeholder="Enter announcement content"
              />
              {errors.content && <p className="text-xs text-red-500 mt-1">{errors.content.message}</p>}
            </div>

            {/* Category and Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Category
                </label>
                <select
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
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Priority
                </label>
                <select
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
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Target Audience
              </label>
              <select
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
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Select Departments <span className="text-red-500">*</span>
                </label>
                {loadingDepartments ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-sky-700" />
                    <span className="ml-2 text-sm text-[var(--text-muted)]">Loading departments...</span>
                  </div>
                ) : departments.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">No departments found</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-4 border border-[var(--border-main)] rounded-lg bg-[var(--bg-secondary)]/50">
                    {departments.map((dept) => (
                      <label
                        key={dept.id}
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                          targetDepartmentIds.includes(dept.id)
                            ? 'bg-sky-100 dark:bg-sky-900/30 border border-sky-300 dark:border-sky-700'
                            : 'hover:bg-[var(--bg-surface)] border border-transparent'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={targetDepartmentIds.includes(dept.id)}
                          onChange={() => toggleDepartment(dept.id)}
                          className="w-4 h-4 text-sky-700 rounded focus:ring-sky-600"
                        />
                        <span className="text-sm text-[var(--text-secondary)] truncate">
                          {dept.name}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                {targetDepartmentIds.length > 0 && (
                  <p className="mt-2 text-xs text-sky-700 dark:text-sky-400">
                    {targetDepartmentIds.length} department{targetDepartmentIds.length > 1 ? 's' : ''} selected
                  </p>
                )}
              </div>
            )}

            {/* Options */}
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('isPinned')}
                  className="w-4 h-4 text-sky-700 rounded focus:ring-sky-600"
                />
                <span className="text-sm text-[var(--text-secondary)]">Pin this announcement</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('sendEmail')}
                  className="w-4 h-4 text-sky-700 rounded focus:ring-sky-600"
                />
                <span className="text-sm text-[var(--text-secondary)]">Send email notification</span>
              </label>
            </div>

            {/* Error */}
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[var(--border-main)] flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isEditing ? 'Updating...' : 'Publishing...'}
                </>
              ) : (
                <>
                  <Megaphone className="w-4 h-4" />
                  {isEditing ? 'Update' : 'Publish'}
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
