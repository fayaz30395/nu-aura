'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Plus,
  Search,
  Folder,
  Clock,
  Eye,
  Lock,
  Users,
  Globe,
  RefreshCw,
  Pencil,
  Trash2,
  Heart,
  MessageCircle,
  Shield,
} from 'lucide-react';
import { Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import {
  useWikiSpaces,
  useWikiPages,
  useCreateWikiSpace,
  useUpdateWikiSpace,
  useDeleteWikiSpace,
} from '@/lib/hooks/queries/useFluence';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { SpaceFormDrawer, type SpaceFormValues } from '@/components/fluence/SpaceFormDrawer';
import { DeleteSpaceModal } from '@/components/fluence/DeleteSpaceModal';
import { SpacePermissionsDrawer } from '@/components/fluence/SpacePermissionsDrawer';
import type { WikiSpace } from '@/lib/types/platform/fluence';
import {
  layout,
  typography,
  card,
  motion as dsMotion,
  iconSize,
} from '@/lib/design-system';

// ─── Roles that can manage spaces ────────────────────────────────

const SPACE_MANAGER_ROLES = [
  'SUPER_ADMIN',
  'TENANT_ADMIN',
  'HR_ADMIN',
  'HR_MANAGER',
  'MANAGER',
  'DEPARTMENT_HEAD',
  'TEAM_LEAD',
  'CEO',
  'VP',
  'OPERATIONS_HEAD',
  'DELIVERY_LEAD',
];

export default function WikiPage() {
  const router = useRouter();
  const { hasAnyRole, isAdmin } = usePermissions();
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');

  // Space CRUD state
  const [spaceDrawerOpen, setSpaceDrawerOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState<WikiSpace | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingSpace, setDeletingSpace] = useState<WikiSpace | null>(null);

  // Permissions drawer state
  const [permissionsDrawerOpen, setPermissionsDrawerOpen] = useState(false);
  const [permissionsSpace, setPermissionsSpace] = useState<WikiSpace | null>(null);

  // Queries
  const { data: spacesData, isLoading: spacesLoading } = useWikiSpaces(0, 100);
  const { data: pagesData, isLoading: pagesLoading } = useWikiPages(
    selectedSpaceId,
    0,
    20
  );

  // Mutations
  const createSpace = useCreateWikiSpace();
  const updateSpace = useUpdateWikiSpace();
  const deleteSpace = useDeleteWikiSpace();

  const spaces = spacesData?.content || [];
  const pages = pagesData?.content || [];

  // Can this user manage spaces?
  const canManageSpaces = isAdmin || hasAnyRole(...SPACE_MANAGER_ROLES);

  const visibilityIcon: Record<string, typeof Globe> = {
    PUBLIC: Globe,
    ORGANIZATION: Users,
    DEPARTMENT: Users,
    PRIVATE: Lock,
    RESTRICTED: Lock,
  };

  const getAuthorInitials = (authorName: string | undefined): string => {
    if (!authorName) return '?';
    return authorName
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredPages = pages.filter((page) =>
    page.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ─── Space CRUD Handlers ──────────────────────────────────────

  const handleOpenCreateSpace = useCallback(() => {
    setEditingSpace(null);
    setSpaceDrawerOpen(true);
  }, []);

  const handleOpenEditSpace = useCallback(
    (space: WikiSpace, e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingSpace(space);
      setSpaceDrawerOpen(true);
    },
    []
  );

  const handleOpenDeleteSpace = useCallback(
    (space: WikiSpace, e: React.MouseEvent) => {
      e.stopPropagation();
      setDeletingSpace(space);
      setDeleteModalOpen(true);
    },
    []
  );

  const handleOpenPermissionsSpace = useCallback(
    (space: WikiSpace, e: React.MouseEvent) => {
      e.stopPropagation();
      setPermissionsSpace(space);
      setPermissionsDrawerOpen(true);
    },
    []
  );

  const handleSpaceSubmit = useCallback(
    (data: SpaceFormValues) => {
      if (editingSpace) {
        updateSpace.mutate(
          {
            id: editingSpace.id,
            data: {
              name: data.name,
              description: data.description,
              icon: data.icon,
              color: data.color,
              visibility: data.visibility,
            },
          },
          {
            onSuccess: () => {
              setSpaceDrawerOpen(false);
              setEditingSpace(null);
              notifications.show({
                title: 'Space updated',
                message: `"${data.name}" has been updated.`,
                color: 'green',
              });
            },
            onError: () => {
              notifications.show({
                title: 'Error',
                message: 'Failed to update space. Please try again.',
                color: 'red',
              });
            },
          }
        );
      } else {
        createSpace.mutate(
          {
            name: data.name,
            description: data.description,
            icon: data.icon,
            color: data.color,
            visibility: data.visibility,
          },
          {
            onSuccess: () => {
              setSpaceDrawerOpen(false);
              notifications.show({
                title: 'Space created',
                message: `"${data.name}" is ready to use.`,
                color: 'green',
              });
            },
            onError: () => {
              notifications.show({
                title: 'Error',
                message: 'Failed to create space. Please try again.',
                color: 'red',
              });
            },
          }
        );
      }
    },
    [editingSpace, createSpace, updateSpace]
  );

  const handleConfirmDelete = useCallback(
    (spaceId: string, _migrateToSpaceId: string | null) => {
      // In a real app, this would first migrate docs then delete.
      // For now, we just trigger the delete mutation.
      deleteSpace.mutate(spaceId, {
        onSuccess: () => {
          setDeleteModalOpen(false);
          setDeletingSpace(null);
          if (selectedSpaceId === spaceId) {
            setSelectedSpaceId(undefined);
          }
          notifications.show({
            title: 'Delete request submitted',
            message: 'An approval request has been sent to the space owner.',
            color: 'blue',
          });
        },
        onError: () => {
          notifications.show({
            title: 'Error',
            message: 'Failed to delete space. Please try again.',
            color: 'red',
          });
        },
      });
    },
    [deleteSpace, selectedSpaceId]
  );

  // ─── Render ───────────────────────────────────────────────────

  return (
    <AppLayout>
      <motion.div {...dsMotion.pageEnter}>
        <div className={layout.sectionGap}>
          {/* Page Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                <div className="flex items-center justify-center rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 p-2">
                  <BookOpen className={`${iconSize.pageHeader} text-white`} />
                </div>
                <h1 className={typography.pageTitle}>Wiki Pages</h1>
              </div>
              <p className={typography.bodySecondary}>
                Create and manage knowledge base documentation
              </p>
            </div>
            <Button
              onClick={() => router.push('/fluence/wiki/new')}
              variant="primary"
              className="gap-2"
            >
              <Plus className={iconSize.button} />
              New Page
            </Button>
          </div>

          {/* Content Grid: Sidebar + Main */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* ═══════════════════════════════════════════════════
                SIDEBAR: Spaces
                ═══════════════════════════════════════════════════ */}
            <div className="lg:col-span-1">
              <div className={`${card.base} ${card.paddingLarge}`}>
                {/* Spaces header with manage button */}
                <div className="row-between mb-4">
                  <div className="flex items-center gap-2">
                    <Folder className={iconSize.cardInline} />
                    <h2 className={typography.sectionTitle}>Spaces</h2>
                  </div>
                  {canManageSpaces && (
                    <Tooltip label="Create new space" withArrow>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleOpenCreateSpace}
                        className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--accent-700)] hover:bg-[var(--accent-800)] text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                        aria-label="Create new space"
                      >
                        <Plus className="h-4 w-4" />
                      </motion.button>
                    </Tooltip>
                  )}
                </div>

                {spacesLoading ? (
                  <div className="h-40 flex items-center justify-center">
                    <RefreshCw
                      className={`${iconSize.cardInline} text-[var(--text-muted)] animate-spin`}
                    />
                  </div>
                ) : spaces.length === 0 ? (
                  <div className="py-8 text-center">
                    <Folder
                      className={`${iconSize.statCard} mx-auto mb-2 opacity-50 text-[var(--text-muted)]`}
                    />
                    <p className={`${typography.caption} mb-4`}>No spaces yet</p>
                    {canManageSpaces && (
                      <Button
                        variant="outline"
                        size="xs"
                        className="gap-1"
                        onClick={handleOpenCreateSpace}
                      >
                        <Plus className="h-3 w-3" />
                        Create Space
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {/* All Spaces button */}
                    <motion.button
                      onClick={() => setSelectedSpaceId(undefined)}
                      className={`w-full text-left px-4 py-2 rounded-lg transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                        selectedSpaceId === undefined
                          ? 'bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 font-medium'
                          : 'text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                      }`}
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <p className="text-sm font-medium">All Spaces</p>
                      <p className={`${typography.caption} mt-0.5`}>
                        {spaces.reduce((sum, s) => sum + (s.pageCount || 0), 0)} total pages
                      </p>
                    </motion.button>

                    {/* Individual spaces with edit/delete */}
                    {spaces.map((space) => (
                      <motion.div
                        key={space.id}
                        className="group relative"
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <button
                          onClick={() => setSelectedSpaceId(space.id)}
                          className={`w-full text-left px-4 py-2.5 rounded-lg transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                            selectedSpaceId === space.id
                              ? 'bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300'
                              : 'text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="flex items-center justify-center w-6 h-6 rounded text-sm text-white flex-shrink-0"
                              style={{ backgroundColor: space.color || '#3e63dd' }}
                            >
                              {space.icon || '📁'}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {space.name}
                              </p>
                              <p className={`${typography.caption} mt-0.5`}>
                                {space.pageCount || 0} pages
                              </p>
                            </div>
                          </div>
                        </button>

                        {/* Edit / Permissions / Delete actions — show on hover for authorized roles */}
                        {canManageSpaces && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Tooltip label="Edit space" withArrow>
                              <motion.button
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => handleOpenEditSpace(space, e)}
                                className="flex items-center justify-center w-6 h-6 rounded-md bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--accent-700)] hover:border-[var(--accent-700)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                                aria-label="Edit space"
                              >
                                <Pencil className="h-3 w-3" />
                              </motion.button>
                            </Tooltip>
                            <Tooltip label="Space permissions" withArrow>
                              <motion.button
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => handleOpenPermissionsSpace(space, e)}
                                className="flex items-center justify-center w-6 h-6 rounded-md bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--accent-700)] hover:border-[var(--accent-700)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                                aria-label="Space permissions"
                              >
                                <Shield className="h-3 w-3" />
                              </motion.button>
                            </Tooltip>
                            <Tooltip label="Delete space" withArrow>
                              <motion.button
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => handleOpenDeleteSpace(space, e)}
                                className="flex items-center justify-center w-6 h-6 rounded-md bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-danger-600 hover:border-danger-400 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                                aria-label="Delete space"
                              >
                                <Trash2 className="h-3 w-3" />
                              </motion.button>
                            </Tooltip>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════
                MAIN: Pages Grid
                ═══════════════════════════════════════════════════ */}
            <div className="lg:col-span-3 space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search
                  className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${iconSize.cardInline} text-[var(--text-muted)]`}
                />
                <input
                  type="text"
                  placeholder="Search pages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-aura w-full pl-10 pr-4 py-2.5"
                />
              </div>

              {/* Pages Grid or Loading/Empty States */}
              {pagesLoading ? (
                <motion.div
                  className={layout.grid2}
                  {...dsMotion.staggerContainer}
                >
                  {[1, 2, 3, 4].map((i) => (
                    <motion.div key={i} {...dsMotion.staggerItem}>
                      <div
                        className={`${card.base} ${card.paddingLarge} h-48 animate-pulse`}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              ) : filteredPages.length === 0 ? (
                <div
                  className={`${card.base} ${card.paddingLarge} border-dashed border-2 border-[var(--border-main)]`}
                >
                  <div className="py-16 text-center">
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-[var(--bg-secondary)] mx-auto mb-4">
                      <BookOpen
                        className={`${iconSize.statCard} text-[var(--text-muted)]`}
                      />
                    </div>
                    <h3 className={`${typography.sectionTitle} mb-1`}>
                      {searchQuery ? 'No pages found' : 'No pages yet'}
                    </h3>
                    <p className={`${typography.bodySecondary} mb-6`}>
                      {searchQuery
                        ? 'Try adjusting your search terms'
                        : 'Start by creating your first wiki page'}
                    </p>
                    {!searchQuery && (
                      <Button
                        onClick={() => router.push('/fluence/wiki/new')}
                        variant="primary"
                        className="gap-2"
                      >
                        <Plus className={iconSize.button} />
                        Create Page
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <motion.div
                  className={layout.grid2}
                  {...dsMotion.staggerContainer}
                >
                  {filteredPages.map((page) => {
                    const VisibilityIcon =
                      visibilityIcon[page.visibility] || Globe;
                    const authorInitials = getAuthorInitials(page.authorName);

                    return (
                      <motion.div key={page.id} {...dsMotion.staggerItem}>
                        <motion.div
                          {...dsMotion.cardHover}
                          onClick={() =>
                            router.push(`/fluence/wiki/${page.id}`)
                          }
                          className={`${card.base} ${card.paddingLarge} ${card.interactive} cursor-pointer h-full`}
                        >
                          {/* Card Header: Title + Visibility */}
                          <div className="mb-4">
                            <div className="flex items-start justify-between gap-4 mb-4">
                              <h3
                                className={`${typography.cardTitle} line-clamp-2 flex-1`}
                              >
                                {page.title}
                              </h3>
                              <VisibilityIcon
                                className={`${iconSize.cardInline} flex-shrink-0 text-[var(--text-muted)]`}
                              />
                            </div>
                          </div>

                          {/* Card Body: Metadata */}
                          <div className="space-y-2 mb-4 flex-1">
                            <div className="flex items-center gap-2">
                              <Clock
                                className={`${iconSize.meta} text-[var(--text-muted)]`}
                              />
                              <span className={typography.caption}>
                                {new Date(page.updatedAt).toLocaleDateString()}
                              </span>
                            </div>

                            {/* Engagement row */}
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1.5">
                                <Eye
                                  className={`${iconSize.meta} text-[var(--text-muted)]`}
                                />
                                <span className={typography.caption}>
                                  {page.viewCount || 0}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Heart
                                  className={`${iconSize.meta} text-[var(--text-muted)]`}
                                />
                                <span className={typography.caption}>
                                  {page.likeCount || 0}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <MessageCircle
                                  className={`${iconSize.meta} text-[var(--text-muted)]`}
                                />
                                <span className={typography.caption}>
                                  {page.commentCount || 0}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Card Footer: Author Badge */}
                          {page.authorName && (
                            <div className="flex items-center gap-2 pt-4 border-t border-[var(--border-main)]">
                              {page.authorAvatarUrl ? (
                                <Image
                                  src={page.authorAvatarUrl}
                                  alt={page.authorName}
                                  width={24}
                                  height={24}
                                  unoptimized
                                  className="w-6 h-6 rounded-full object-cover border border-[var(--border-subtle)]"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    target.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                              ) : null}
                              <div className={`flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-accent-500 to-accent-700 text-white text-xs font-medium ${page.authorAvatarUrl ? 'hidden' : ''}`}>
                                {authorInitials}
                              </div>
                              <span
                                className={`${typography.caption} truncate`}
                              >
                                {page.authorName}
                              </span>
                            </div>
                          )}
                        </motion.div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ═══ Space Form Drawer ═══ */}
      <SpaceFormDrawer
        opened={spaceDrawerOpen}
        onClose={() => {
          setSpaceDrawerOpen(false);
          setEditingSpace(null);
        }}
        onSubmit={handleSpaceSubmit}
        editingSpace={editingSpace}
        isSubmitting={createSpace.isPending || updateSpace.isPending}
      />

      {/* ═══ Delete Space Modal ═══ */}
      <DeleteSpaceModal
        opened={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeletingSpace(null);
        }}
        space={deletingSpace}
        allSpaces={spaces}
        onConfirmDelete={handleConfirmDelete}
        isDeleting={deleteSpace.isPending}
      />

      {/* ═══ Space Permissions Drawer ═══ */}
      <SpacePermissionsDrawer
        opened={permissionsDrawerOpen}
        onClose={() => {
          setPermissionsDrawerOpen(false);
          setPermissionsSpace(null);
        }}
        space={permissionsSpace}
      />
    </AppLayout>
  );
}
