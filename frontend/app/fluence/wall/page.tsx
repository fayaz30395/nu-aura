'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Filter, Loader2, MessageSquare } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PostComposer, WallCard } from '@/components/wall';
import {
  useInfiniteWallPosts,
  useWallComments,
  useCreatePost,
  useDeletePost,
  usePinPost,
  useAddWallReaction,
  useRemoveWallReaction,
  useAddComment,
  useDeleteWallComment,
  useVote,
  useRemoveVote,
} from '@/lib/hooks/queries/useWall';
import { useAuth } from '@/lib/hooks/useAuth';
import type {
  PostType,
  CreatePostRequest,
  ReactionType,
  WallPostResponse,
} from '@/lib/services/wall.service';

// ==================== WallCardWrapper Component ====================

interface WallCardWrapperProps {
  post: WallPostResponse;
  showComments: boolean;
  onToggleComments: (postId: string) => void;
  onDelete: (postId: string) => void;
  onPin: (postId: string, pinned: boolean) => void;
  onReact: (postId: string, reactionType: ReactionType) => void;
  onRemoveReact: (postId: string) => void;
  onAddComment: (postId: string, content: string, parentCommentId?: string) => void;
  onDeleteComment: (commentId: string, postId: string) => void;
  onVote: (postId: string, optionId: string) => void;
  currentUserId?: string;
}

function WallCardWrapper({
  post,
  showComments,
  onToggleComments,
  onDelete,
  onPin,
  onReact,
  onRemoveReact,
  onAddComment,
  onDeleteComment,
  onVote,
  currentUserId,
}: WallCardWrapperProps) {
  const [commentPage, setCommentPage] = useState(0);
  const { data: commentsData, isLoading: commentsLoading } = useWallComments(
    post.id,
    commentPage,
    20,
    showComments
  );

  const comments = commentsData?.content || [];
  const commentsHasMore = !commentsData?.last;

  const handleLoadMoreComments = useCallback(() => {
    setCommentPage((p) => p + 1);
  }, []);

  return (
    <WallCard
      post={post}
      currentUserId={currentUserId}
      comments={comments}
      commentsLoading={commentsLoading}
      commentsHasMore={commentsHasMore}
      showComments={showComments}
      commentSubmitting={false}
      onReact={onReact}
      onRemoveReact={onRemoveReact}
      onToggleComments={onToggleComments}
      onAddComment={onAddComment}
      onDeleteComment={onDeleteComment}
      onLoadMoreComments={handleLoadMoreComments}
      onDelete={onDelete}
      onPin={onPin}
      onVote={onVote}
    />
  );
}

// ==================== Component ====================

export default function WallPage(): React.ReactElement {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<PostType | undefined>();
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  // Fetch infinite wall posts
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteWallPosts(activeFilter, 10);

  // Mutations
  const createPost = useCreatePost();
  const deletePost = useDeletePost();
  const pinPost = usePinPost();
  const addReaction = useAddWallReaction();
  const removeReaction = useRemoveWallReaction();
  const addComment = useAddComment();
  const deleteComment = useDeleteWallComment();
  const vote = useVote();
  const removeVote = useRemoveVote();

  // Flatten posts from infinite pages
  const posts = useMemo(() => data?.pages.flatMap((p) => p.content) ?? [], [data]);

  // Handle post creation
  const handleCreatePost = useCallback(
    (formData: CreatePostRequest) => {
      createPost.mutate(formData, {
        onSuccess: () => {
          // Reset composer after successful creation
        },
      });
    },
    [createPost]
  );

  // Handle toggle comments
  const handleToggleComments = useCallback((postId: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  }, []);

  // Handle post delete
  const handleDeletePost = useCallback(
    (postId: string) => {
      deletePost.mutate(postId);
    },
    [deletePost]
  );

  // Handle pin post
  const handlePinPost = useCallback(
    (postId: string, pinned: boolean) => {
      pinPost.mutate({ postId, pinned });
    },
    [pinPost]
  );

  // Handle reaction
  const handleReaction = useCallback(
    (postId: string, reactionType: ReactionType) => {
      addReaction.mutate({ postId, reactionType });
    },
    [addReaction]
  );

  // Handle remove reaction - signature matches WallCard interface
  const handleRemoveReaction = useCallback(
    (postId: string) => {
      removeReaction.mutate(postId);
    },
    [removeReaction]
  );

  // Handle add comment - signature matches WallCard interface
  const handleAddComment = useCallback(
    (postId: string, content: string, parentCommentId?: string) => {
      addComment.mutate({ postId, content, parentCommentId });
    },
    [addComment]
  );

  // Handle delete comment - signature matches WallCard interface
  const handleDeleteComment = useCallback(
    (commentId: string, postId: string) => {
      deleteComment.mutate({ commentId, postId });
    },
    [deleteComment]
  );

  // Handle vote - signature matches WallCard interface
  const handleVote = useCallback(
    (postId: string, optionId: string) => {
      vote.mutate({ postId, optionId });
    },
    [vote]
  );

  const filterTabs: Array<{ label: string; value: PostType | undefined }> = [
    { label: 'All', value: undefined },
    { label: 'Posts', value: 'POST' },
    { label: 'Polls', value: 'POLL' },
    { label: 'Praise', value: 'PRAISE' },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              Social Wall
            </h1>
            <p className="text-surface-600 dark:text-surface-400 mt-1">
              Connect, celebrate, and engage with your team
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {filterTabs.map((tab) => (
            <motion.button
              key={tab.label}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveFilter(tab.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeFilter === tab.value
                  ? 'bg-violet-600 text-white'
                  : 'bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-300 dark:hover:bg-surface-600'
              }`}
            >
              {tab.label}
            </motion.button>
          ))}
        </div>

        {/* Post Composer */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <PostComposer
            onSubmit={handleCreatePost}
            isSubmitting={createPost.isPending}
          />
        </motion.div>

        {/* Posts Feed */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="h-48" />
              </Card>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-16 text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-surface-300 dark:text-surface-700" />
              <h3 className="text-lg font-medium text-surface-700 dark:text-surface-300 mb-1">
                {activeFilter ? `No ${activeFilter.toLowerCase()}s yet` : 'No posts yet'}
              </h3>
              <p className="text-surface-500 dark:text-surface-400 mb-4">
                Be the first to share something with your team
              </p>
              <Button className="gap-2 bg-violet-600 hover:bg-violet-700">
                <MessageCircle className="w-4 h-4" />
                Start a Post
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <WallCardWrapper
                  post={post}
                  showComments={expandedComments.has(post.id)}
                  onToggleComments={handleToggleComments}
                  onDelete={handleDeletePost}
                  onPin={handlePinPost}
                  onReact={handleReaction}
                  onRemoveReact={handleRemoveReaction}
                  onAddComment={handleAddComment}
                  onDeleteComment={handleDeleteComment}
                  onVote={handleVote}
                  currentUserId={user?.id}
                />
              </motion.div>
            ))}

            {/* Load More Button */}
            {hasNextPage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-center pt-4"
              >
                <Button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  variant="secondary"
                  className="gap-2"
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </Button>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
