'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppLayout } from '@/components/layout';
import {
  Megaphone,
  Pin,
  Calendar,
  User,
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
  Filter,
  Search,
  Eye,
  CheckCircle,
  Clock,
  Plus,
  Loader2,
  Edit2,
  Trash2,
  MoreVertical,
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { isAdmin } from '@/lib/utils';
import {
  announcementService,
  Announcement,
  AnnouncementCategory,
  AnnouncementPriority,
  getCategoryColor,
  getPriorityColor,
  getCategoryLabel,
  CreateAnnouncementRequest,
} from '@/lib/services/announcement.service';
import { departmentService } from '@/lib/services/department.service';
import { Department } from '@/lib/types/employee';

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
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [pinnedAnnouncements, setPinnedAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Handle delete announcement
  const handleDeleteAnnouncement = async (announcementId: string) => {
    try {
      setIsDeleting(true);
      await announcementService.deleteAnnouncement(announcementId);
      setShowDeleteConfirm(null);
      setSelectedAnnouncement(null);
      // Reload announcements
      loadAnnouncements();
      loadPinnedAnnouncements();
    } catch (error) {
      console.error('Failed to delete announcement:', error);
      alert('Failed to delete announcement');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (user?.employeeId) {
      loadAnnouncements();
      loadPinnedAnnouncements();
    }
  }, [page, categoryFilter, priorityFilter, user?.employeeId]);

  const loadAnnouncements = async () => {
    if (!user?.employeeId) return;
    setLoading(true);
    try {
      // Use getActiveAnnouncements with employeeId for targeted filtering
      // This will filter announcements based on department, role (manager), and join date
      const response = await announcementService.getActiveAnnouncements(user.employeeId, page, 10);
      setAnnouncements(response.content || []);
      setTotalPages(response.totalPages || 0);
    } catch (error) {
      console.error('Error loading announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPinnedAnnouncements = async () => {
    try {
      const pinned = await announcementService.getPinnedAnnouncements();
      setPinnedAnnouncements(pinned || []);
    } catch (error) {
      console.error('Error loading pinned announcements:', error);
    }
  };

  const handleAnnouncementClick = async (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);

    // Mark as read if not already
    if (!announcement.isRead && user?.employeeId) {
      try {
        await announcementService.markAsRead(announcement.id, user.employeeId);
        // Update the announcement in the list
        setAnnouncements(prev =>
          prev.map(a => a.id === announcement.id ? { ...a, isRead: true } : a)
        );
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    }
  };

  const filteredAnnouncements = announcements.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          a.content.toLowerCase().includes(searchTerm.toLowerCase());
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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <Megaphone className="w-8 h-8 text-purple-600" />
                Announcements
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Stay updated with company news and important updates
              </p>
            </div>
            {isAdmin(user?.roles) && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium shadow-sm"
              >
                <Plus className="w-5 h-5" />
                New Announcement
              </button>
            )}
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
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
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
                      <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
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
                        <h3 className="font-semibold text-gray-900 dark:text-white text-lg group-hover:text-yellow-600 transition-colors">
                          {announcement.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                          {announcement.content.replace(/<[^>]*>/g, '')}
                        </p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
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
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-yellow-600 transition-colors" />
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
          className="bg-white dark:bg-slate-900 rounded-xl shadow-sm p-4 mb-6"
        >
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search announcements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-surface-200 dark:border-surface-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-surface-50 dark:bg-surface-800/50 dark:text-white"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2.5 border border-surface-200 dark:border-surface-700 rounded-lg bg-white dark:bg-slate-800 dark:text-white"
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
              className="px-4 py-2.5 border border-surface-200 dark:border-surface-700 rounded-lg bg-white dark:bg-slate-800 dark:text-white"
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-purple-600" />
            All Announcements
          </h2>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
          ) : filteredAnnouncements.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl">
              <Megaphone className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No announcements found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm || categoryFilter || priorityFilter
                  ? 'Try adjusting your filters'
                  : 'Check back later for updates'}
              </p>
            </div>
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
                    className={`bg-white dark:bg-slate-900 rounded-xl shadow-sm p-5 cursor-pointer hover:shadow-lg transition-all group border-l-4 ${
                      announcement.isRead
                        ? 'border-l-gray-200 dark:border-l-slate-700'
                        : 'border-l-purple-500'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg ${getCategoryColor(announcement.category).replace('text-', 'bg-').replace('-800', '-100').replace('-100', '-100')}`}>
                        <Icon className={`w-6 h-6 ${getCategoryColor(announcement.category).split(' ')[1]}`} />
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
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                              New
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-white text-lg group-hover:text-purple-600 transition-colors">
                          {announcement.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                          {announcement.content.replace(/<[^>]*>/g, '')}
                        </p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
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
                            <button
                              onClick={(e) => handleEditAnnouncement(announcement, e)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowDeleteConfirm(announcement.id);
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
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
                className="px-4 py-2 border border-surface-200 dark:border-surface-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="px-4 py-2 border border-surface-200 dark:border-surface-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
              onClick={() => setSelectedAnnouncement(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 relative">
                  <button
                    onClick={() => setSelectedAnnouncement(null)}
                    className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                  <div className="flex items-center gap-3">
                    {(() => {
                      const Icon = getCategoryIcon(selectedAnnouncement.category);
                      return (
                        <div className="p-3 bg-white/20 rounded-lg">
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
                  <div className="flex items-center gap-4 mb-6 text-sm text-gray-500 dark:text-gray-400">
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
                    dangerouslySetInnerHTML={{ __html: selectedAnnouncement.content }}
                  />

                  {selectedAnnouncement.attachmentUrl && (
                    <div className="mt-6 p-4 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
                      <a
                        href={selectedAnnouncement.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-2"
                      >
                        <BookOpen className="w-4 h-4" />
                        View Attachment
                      </a>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 border-t border-surface-200 dark:border-surface-700 dark:border-slate-700 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Marked as read
                  </div>
                  <div className="flex items-center gap-2">
                    {canEditAnnouncement(selectedAnnouncement) && (
                      <>
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
                        <button
                          onClick={() => {
                            setShowDeleteConfirm(selectedAnnouncement.id);
                          }}
                          className="flex items-center gap-2 px-4 py-2 text-red-600 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors font-medium"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setSelectedAnnouncement(null)}
                      className="px-4 py-2 bg-gray-100 dark:bg-slate-800 text-surface-700 dark:text-surface-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors font-medium"
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
                loadAnnouncements();
                loadPinnedAnnouncements();
              }}
            />
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
              onClick={() => setShowDeleteConfirm(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Delete Announcement
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        This action cannot be undone
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Are you sure you want to delete this announcement? All associated data will be permanently removed.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDeleteConfirm(null)}
                      disabled={isDeleting}
                      className="flex-1 px-4 py-2.5 border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDeleteAnnouncement(showDeleteConfirm)}
                      disabled={isDeleting}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
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
  const isEditing = !!announcement;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [formData, setFormData] = useState<CreateAnnouncementRequest>({
    title: announcement?.title || '',
    content: announcement?.content || '',
    category: announcement?.category || 'GENERAL',
    priority: announcement?.priority || 'MEDIUM',
    targetAudience: announcement?.targetAudience || 'ALL_EMPLOYEES',
    targetDepartmentIds: (announcement as any)?.targetDepartmentIds || [],
    isPinned: announcement?.isPinned || false,
    sendEmail: false,
  });

  // Load departments when SPECIFIC_DEPARTMENTS is selected
  useEffect(() => {
    if (formData.targetAudience === 'SPECIFIC_DEPARTMENTS' && departments.length === 0) {
      loadDepartments();
    }
  }, [formData.targetAudience]);

  const loadDepartments = async () => {
    try {
      setLoadingDepartments(true);
      const depts = await departmentService.getActiveDepartments();
      setDepartments(depts);
    } catch (err) {
      console.error('Failed to load departments:', err);
    } finally {
      setLoadingDepartments(false);
    }
  };

  const toggleDepartment = (deptId: string) => {
    setFormData(prev => {
      const currentIds = prev.targetDepartmentIds || [];
      if (currentIds.includes(deptId)) {
        return { ...prev, targetDepartmentIds: currentIds.filter(id => id !== deptId) };
      } else {
        return { ...prev, targetDepartmentIds: [...currentIds, deptId] };
      }
    });
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.content) {
      setError('Title and content are required');
      return;
    }

    // Validate department selection when targeting specific departments
    if (formData.targetAudience === 'SPECIFIC_DEPARTMENTS' &&
        (!formData.targetDepartmentIds || formData.targetDepartmentIds.length === 0)) {
      setError('Please select at least one department');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isEditing && announcement) {
        await announcementService.updateAnnouncement(announcement.id, formData);
      } else {
        await announcementService.createAnnouncement(formData);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} announcement`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-700 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {isEditing ? 'Edit Announcement' : 'Create Announcement'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2.5 border border-surface-200 dark:border-surface-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-slate-800 dark:text-white"
              placeholder="Enter announcement title"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
              Content <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={5}
              className="w-full px-4 py-2.5 border border-surface-200 dark:border-surface-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-slate-800 dark:text-white resize-none"
              placeholder="Enter announcement content"
            />
          </div>

          {/* Category and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as AnnouncementCategory })}
                className="w-full px-4 py-2.5 border border-surface-200 dark:border-surface-700 rounded-lg dark:bg-slate-800 dark:text-white"
              >
                {Object.keys(categoryIcons).map((cat) => (
                  <option key={cat} value={cat}>
                    {getCategoryLabel(cat as AnnouncementCategory)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as AnnouncementPriority })}
                className="w-full px-4 py-2.5 border border-surface-200 dark:border-surface-700 rounded-lg dark:bg-slate-800 dark:text-white"
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
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
              Target Audience
            </label>
            <select
              value={formData.targetAudience}
              onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value as any, targetDepartmentIds: [] })}
              className="w-full px-4 py-2.5 border border-surface-200 dark:border-surface-700 rounded-lg dark:bg-slate-800 dark:text-white"
            >
              <option value="ALL_EMPLOYEES">All Employees</option>
              <option value="SPECIFIC_DEPARTMENTS">Specific Departments</option>
              <option value="MANAGERS_ONLY">Managers Only</option>
              <option value="NEW_JOINERS">New Joiners</option>
            </select>
          </div>

          {/* Department Selection - Only shown when SPECIFIC_DEPARTMENTS is selected */}
          {formData.targetAudience === 'SPECIFIC_DEPARTMENTS' && (
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                Select Departments <span className="text-red-500">*</span>
              </label>
              {loadingDepartments ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                  <span className="ml-2 text-sm text-gray-500">Loading departments...</span>
                </div>
              ) : departments.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No departments found</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 border border-surface-200 dark:border-surface-700 rounded-lg bg-surface-50 dark:bg-surface-800/50">
                  {departments.map((dept) => (
                    <label
                      key={dept.id}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                        formData.targetDepartmentIds?.includes(dept.id)
                          ? 'bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700'
                          : 'hover:bg-gray-100 dark:hover:bg-slate-700 border border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.targetDepartmentIds?.includes(dept.id) || false}
                        onChange={() => toggleDepartment(dept.id)}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm text-surface-700 dark:text-surface-300 truncate">
                        {dept.name}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              {formData.targetDepartmentIds && formData.targetDepartmentIds.length > 0 && (
                <p className="mt-2 text-xs text-purple-600 dark:text-purple-400">
                  {formData.targetDepartmentIds.length} department{formData.targetDepartmentIds.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          )}

          {/* Options */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isPinned}
                onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
              <span className="text-sm text-surface-700 dark:text-surface-300">Pin this announcement</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.sendEmail}
                onChange={(e) => setFormData({ ...formData, sendEmail: e.target.checked })}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
              <span className="text-sm text-surface-700 dark:text-surface-300">Send email notification</span>
            </label>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-surface-200 dark:border-surface-700 dark:border-slate-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
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
      </motion.div>
    </motion.div>
  );
}
