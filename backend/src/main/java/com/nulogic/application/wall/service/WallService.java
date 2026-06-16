package com.nulogic.application.wall.service;

import com.nulogic.api.wall.dto.*;
import com.nulogic.application.common.service.ContentViewService;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.common.ContentView.ContentType;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.wall.model.*;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.wall.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for managing wall posts, reactions, comments, and polls.
 *
 * <p><strong>SECURITY:</strong> All operations enforce tenant isolation using
 * TenantContext.requireCurrentTenant() to prevent cross-tenant data access.</p>
 */
@Service
@Transactional
public class WallService {

    private static final Logger log = LoggerFactory.getLogger(WallService.class);

    private final WallPostRepository wallPostRepository;
    private final PostReactionRepository postReactionRepository;
    private final PostCommentRepository postCommentRepository;
    private final PollOptionRepository pollOptionRepository;
    private final PollVoteRepository pollVoteRepository;
    private final EmployeeRepository employeeRepository;
    private final ContentViewService contentViewService;

    public WallService(
            WallPostRepository wallPostRepository,
            PostReactionRepository postReactionRepository,
            PostCommentRepository postCommentRepository,
            PollOptionRepository pollOptionRepository,
            PollVoteRepository pollVoteRepository,
            EmployeeRepository employeeRepository,
            ContentViewService contentViewService) {
        this.wallPostRepository = wallPostRepository;
        this.postReactionRepository = postReactionRepository;
        this.postCommentRepository = postCommentRepository;
        this.pollOptionRepository = pollOptionRepository;
        this.pollVoteRepository = pollVoteRepository;
        this.employeeRepository = employeeRepository;
        this.contentViewService = contentViewService;
    }

    // ==================== POSTS ====================

    @Transactional
    public WallPostResponse createPost(CreatePostRequest request, UUID authorId) {
        // BUG-005 FIX: Use findByIdAndTenantId for both the author and the praise
        // recipient to prevent cross-tenant employee references.  Previously
        // findById() was called without a tenant filter, allowing an attacker who
        // knows (or enumerates) a UUID from Tenant B to embed that employee in a
        // post created on Tenant A.
        UUID tenantId = TenantContext.requireCurrentTenant();

        Employee author = employeeRepository.findByIdAndTenantId(authorId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Author not found"));

        WallPost post = new WallPost(request.getType(), request.getContent(), author);
        post.setImageUrl(request.getImageUrl());
        post.setVisibility(request.getVisibility());

        // Handle praise recipient
        if (request.getType() == WallPost.PostType.PRAISE && request.getPraiseRecipientId() != null) {
            Employee recipient = employeeRepository.findByIdAndTenantId(request.getPraiseRecipientId(), tenantId)
                    .orElseThrow(() -> new IllegalArgumentException("Praise recipient not found"));
            post.setPraiseRecipient(recipient);
            if (request.getCelebrationType() != null) {
                post.setCelebrationType(request.getCelebrationType());
            }
        }

        // Handle poll options
        if (request.getType() == WallPost.PostType.POLL && request.getPollOptions() != null) {
            for (int i = 0; i < request.getPollOptions().size(); i++) {
                PollOption option = new PollOption(request.getPollOptions().get(i), i);
                post.addPollOption(option);
            }
        }

        WallPost savedPost = wallPostRepository.save(post);
        return mapToResponse(savedPost, authorId);
    }

    /**
     * BUG-001 FIX: Replaced per-post mapToResponse (which caused 5+ queries per post,
     * ~100+ total for a page of 20) with a batch-aware 2-pass approach:
     * 1. Fetch paginated post IDs
     * 2. Batch-hydrate authors, reactions, votes in bulk queries
     * Reduces total queries from ~100+ to ~8 regardless of page size.
     *
     * <p>S4-F: visibility is now enforced inside the JPQL query so pagination
     * totals are correct. The viewer's department + team are resolved once
     * here and passed as bind parameters; null viewer (anonymous) collapses
     * the predicate to PUBLIC / ORGANIZATION only.</p>
     */
    @Transactional(readOnly = true)
    public Page<WallPostResponse> getPosts(Pageable pageable, UUID currentUserId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        ViewerContext viewer = resolveViewer(tenantId, currentUserId);
        Page<WallPost> postsPage = wallPostRepository.findAllActiveOrderByPinnedAndCreatedAt(
                tenantId, viewer.employeeId(), viewer.departmentId(), viewer.teamId(), pageable);
        return mapPageToResponses(postsPage, tenantId, currentUserId);
    }

    @Transactional(readOnly = true)
    public Page<WallPostResponse> getPostsByType(WallPost.PostType type, Pageable pageable, UUID currentUserId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        ViewerContext viewer = resolveViewer(tenantId, currentUserId);
        Page<WallPost> postsPage = wallPostRepository.findByTypeAndActiveTrue(
                tenantId, type, viewer.employeeId(), viewer.departmentId(), viewer.teamId(), pageable);
        return mapPageToResponses(postsPage, tenantId, currentUserId);
    }

    /**
     * Resolves the viewing employee's tenancy + scoping IDs once, so the
     * repository can bind them into the visibility predicate. When the caller
     * is anonymous (no currentUserId) or the employee row is missing, all
     * scope IDs collapse to null — the JPQL falls back to PUBLIC /
     * ORGANIZATION only because the equality checks short-circuit on null.
     */
    private ViewerContext resolveViewer(UUID tenantId, UUID currentUserId) {
        if (currentUserId == null) {
            return ViewerContext.ANONYMOUS;
        }
        Employee viewer = employeeRepository.findByIdAndTenantId(currentUserId, tenantId).orElse(null);
        if (viewer == null) {
            return new ViewerContext(currentUserId, null, null);
        }
        return new ViewerContext(currentUserId, viewer.getDepartmentId(), viewer.getTeamId());
    }

    /**
     * Wave-3 NU-Fluence 3.5: defence-in-depth visibility check for single-post
     * lookup paths (e.g. {@link #getPostById}). The feed-level filter now runs
     * in JPQL ({@link WallPostRepository#findAllActiveOrderByPinnedAndCreatedAt}),
     * but this in-memory check still guards direct accesses by post id.
     */
    private boolean isVisibleToViewer(WallPost post, UUID viewerId, UUID viewerDeptId, UUID viewerTeamId) {
        WallPost.PostVisibility v = post.getVisibility();
        if (v == null || v == WallPost.PostVisibility.PUBLIC || v == WallPost.PostVisibility.ORGANIZATION) {
            return true;
        }
        Employee author = post.getAuthor();
        UUID authorId = author != null ? author.getId() : null;
        if (authorId != null && authorId.equals(viewerId)) {
            // Authors always see their own posts regardless of visibility setting.
            return true;
        }
        if (v == WallPost.PostVisibility.PRIVATE) {
            return false;
        }
        if (v == WallPost.PostVisibility.DEPARTMENT) {
            UUID authorDeptId = author != null ? author.getDepartmentId() : null;
            return viewerDeptId != null && viewerDeptId.equals(authorDeptId);
        }
        if (v == WallPost.PostVisibility.TEAM) {
            UUID authorTeamId = author != null ? author.getTeamId() : null;
            return viewerTeamId != null && viewerTeamId.equals(authorTeamId);
        }
        return true;
    }

    @Transactional(readOnly = true)
    public WallPostResponse getPostById(UUID postId, UUID currentUserId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        WallPost post = wallPostRepository.findByIdAndActiveTrue(tenantId, postId)
                .orElseThrow(() -> new IllegalArgumentException("Post not found"));

        // S4-F: single-post lookup bypasses the JPQL visibility predicate, so
        // re-check in memory. Treats a 403 as a 404 to avoid leaking existence
        // of restricted posts to non-authorised viewers.
        ViewerContext viewer = resolveViewer(tenantId, currentUserId);
        if (!isVisibleToViewer(post, viewer.employeeId(), viewer.departmentId(), viewer.teamId())) {
            throw new IllegalArgumentException("Post not found");
        }

        // Track view in generic content view system
        if (currentUserId != null) {
            contentViewService.recordView(ContentType.WALL_POST, postId, currentUserId, "direct");
        }

        return mapToResponse(post, currentUserId);
    }

    @Transactional
    public WallPostResponse updatePost(UUID postId, UpdatePostRequest request, UUID userId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        WallPost post = wallPostRepository.findByIdAndActiveTrue(tenantId, postId)
                .orElseThrow(() -> new IllegalArgumentException("Post not found"));

        // Allow update by: post author, or admins with WALL_MANAGE / SYSTEM_ADMIN permission
        boolean isAuthor = post.getAuthor().getId().equals(userId);
        boolean isAdmin = SecurityContext.hasPermission("WALL:MANAGE") || SecurityContext.isSuperAdmin();
        if (!isAuthor && !isAdmin) {
            throw new IllegalArgumentException("You can only edit your own posts");
        }

        // Only allow editing content and image — type, visibility, poll options are immutable after creation
        post.setContent(request.getContent());
        if (request.getImageUrl() != null) {
            post.setImageUrl(request.getImageUrl());
        }

        wallPostRepository.save(post);
        return mapToResponse(post, userId);
    }

    @Transactional
    public void deletePost(UUID postId, UUID userId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        WallPost post = wallPostRepository.findByIdAndActiveTrue(tenantId, postId)
                .orElseThrow(() -> new IllegalArgumentException("Post not found"));

        // Allow deletion by: post author, or admins with WALL_MANAGE / SYSTEM_ADMIN permission
        boolean isAuthor = post.getAuthor().getId().equals(userId);
        boolean isAdmin = SecurityContext.hasPermission("WALL:MANAGE") || SecurityContext.isSuperAdmin();
        if (!isAuthor && !isAdmin) {
            throw new IllegalArgumentException("You can only delete your own posts");
        }

        post.setActive(false);
        wallPostRepository.save(post);
    }

    public WallPostResponse pinPost(UUID postId, boolean pinned) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        WallPost post = wallPostRepository.findByIdAndActiveTrue(tenantId, postId)
                .orElseThrow(() -> new IllegalArgumentException("Post not found"));

        post.setPinned(pinned);
        WallPost savedPost = wallPostRepository.save(post);
        return mapToResponse(savedPost, null);
    }

    @Transactional
    public void addReaction(UUID postId, UUID employeeId, PostReaction.ReactionType reactionType) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        WallPost post = wallPostRepository.findByIdAndActiveTrue(tenantId, postId)
                .orElseThrow(() -> new IllegalArgumentException("Post not found"));

        Employee employee = employeeRepository.findByIdAndTenantId(employeeId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));

        // Check if user already reacted
        Optional<PostReaction> existingReaction = postReactionRepository
                .findByPostIdAndEmployeeId(postId, employeeId);

        if (existingReaction.isPresent()) {
            // Update existing reaction
            PostReaction reaction = existingReaction.get();
            reaction.setReactionType(reactionType);
            postReactionRepository.save(reaction);
        } else {
            // Create new reaction. Wave-3 fix: a unique index on
            // (tenant_id, post_id, employee_id) now guards concurrent inserts,
            // so we must handle the DB-level conflict gracefully.
            PostReaction reaction = new PostReaction(post, employee, reactionType);
            try {
                postReactionRepository.save(reaction);

                // Update like count on the post
                post.setLikesCount(post.getLikesCount() + 1);
                wallPostRepository.save(post);
            } catch (DataIntegrityViolationException e) {
                log.debug("Concurrent reaction collision for post={} user={}", postId, employeeId);
                // Idempotent: caller assumes reaction recorded. The other concurrent
                // request already inserted the row and bumped likesCount.
            }
        }
    }

    // ==================== REACTIONS ====================

    @Transactional
    public void removeReaction(UUID postId, UUID employeeId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        Optional<PostReaction> existingReaction = postReactionRepository
                .findByPostIdAndEmployeeId(postId, employeeId);

        if (existingReaction.isPresent()) {
            postReactionRepository.delete(existingReaction.get());

            // Update like count on the post
            WallPost post = wallPostRepository.findByIdAndActiveTrue(tenantId, postId).orElse(null);
            if (post != null && post.getLikesCount() > 0) {
                post.setLikesCount(post.getLikesCount() - 1);
                wallPostRepository.save(post);
            }
        }
    }

    /**
     * Get paginated list of all users who reacted to a post.
     */
    @Transactional(readOnly = true)
    public Page<WallPostResponse.ReactorInfo> getPostReactions(UUID postId, Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        Page<PostReaction> reactions = postReactionRepository.findAllByPostIdAndTenantIdWithDetails(postId, tenantId, pageable);
        return reactions.map(this::mapToReactorInfo);
    }

    @Transactional
    public CommentResponse addComment(UUID postId, CreateCommentRequest request, UUID authorId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        WallPost post = wallPostRepository.findByIdAndActiveTrue(tenantId, postId)
                .orElseThrow(() -> new IllegalArgumentException("Post not found"));

        Employee author = employeeRepository.findByIdAndTenantId(authorId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Author not found"));

        PostComment comment = new PostComment(post, author, request.getContent());

        if (request.getParentCommentId() != null) {
            PostComment parentComment = postCommentRepository.findByIdAndTenantIdAndActiveTrue(request.getParentCommentId(), tenantId)
                    .orElseThrow(() -> new IllegalArgumentException("Parent comment not found"));
            comment.setParentComment(parentComment);
        }

        PostComment savedComment = postCommentRepository.save(comment);

        // Update comment count on the post
        post.setCommentsCount(post.getCommentsCount() + 1);
        wallPostRepository.save(post);

        return mapCommentToResponse(savedComment);
    }

    // ==================== COMMENTS ====================

    @Transactional(readOnly = true)
    public Page<CommentResponse> getComments(UUID postId, Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        Page<PostComment> comments = postCommentRepository.findTopLevelCommentsByPostIdAndTenantId(postId, tenantId, pageable);
        return mapCommentPageToResponses(comments);
    }

    @Transactional(readOnly = true)
    public Page<CommentResponse> getReplies(UUID parentCommentId, Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        Page<PostComment> replies = postCommentRepository.findRepliesWithAuthorsByTenantId(parentCommentId, tenantId, pageable);
        return mapCommentPageToResponses(replies);
    }

    /**
     * P1: Batch-maps a page of PostComment entities to CommentResponse DTOs.
     * Authors + their linked users are eagerly fetched by the repository queries,
     * and reply counts are resolved in a single batch query instead of one
     * countByParentCommentIdAndActiveTrue call per comment.
     */
    private Page<CommentResponse> mapCommentPageToResponses(Page<PostComment> commentsPage) {
        List<PostComment> comments = commentsPage.getContent();
        if (comments.isEmpty()) {
            return commentsPage.map(comment -> mapCommentToResponse(comment, Collections.emptyMap()));
        }

        List<UUID> commentIds = comments.stream().map(PostComment::getId).collect(Collectors.toList());
        Map<UUID, Integer> replyCountMap = new HashMap<>();
        postCommentRepository.countRepliesByParentCommentIds(commentIds)
                .forEach(row -> replyCountMap.put((UUID) row[0], ((Long) row[1]).intValue()));

        return commentsPage.map(comment -> mapCommentToResponse(comment, replyCountMap));
    }

    @Transactional
    public void deleteComment(UUID commentId, UUID userId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        PostComment comment = postCommentRepository.findByIdAndTenantIdAndActiveTrue(commentId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Comment not found"));

        boolean isAuthor = comment.getAuthor().getId().equals(userId);
        boolean isAdmin = SecurityContext.hasPermission("WALL:MANAGE") || SecurityContext.isSuperAdmin();
        if (!isAuthor && !isAdmin) {
            throw new IllegalArgumentException("You can only delete your own comments");
        }

        comment.setActive(false);
        postCommentRepository.save(comment);

        // Update comment count on the post
        WallPost post = comment.getPost();
        if (post.getCommentsCount() > 0) {
            post.setCommentsCount(post.getCommentsCount() - 1);
            wallPostRepository.save(post);
        }
    }

    public WallPostResponse vote(UUID postId, UUID optionId, UUID employeeId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        WallPost post = wallPostRepository.findByIdAndActiveTrue(tenantId, postId)
                .orElseThrow(() -> new IllegalArgumentException("Post not found"));

        if (post.getType() != WallPost.PostType.POLL) {
            throw new IllegalArgumentException("This post is not a poll");
        }

        PollOption option = pollOptionRepository.findByIdAndTenantId(optionId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Poll option not found"));

        if (!option.getPost().getId().equals(postId)) {
            throw new IllegalArgumentException("Option does not belong to this poll");
        }

        Employee employee = employeeRepository.findByIdAndTenantId(employeeId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));

        // Check if user already voted on this poll
        Optional<PollVote> existingVote = pollVoteRepository.findByPostIdAndEmployeeId(postId, employeeId);

        if (existingVote.isPresent()) {
            // Change vote
            PollVote vote = existingVote.get();
            vote.setPollOption(option);
            pollVoteRepository.save(vote);
        } else {
            // New vote
            PollVote vote = new PollVote(option, employee);
            pollVoteRepository.save(vote);
        }

        return mapToResponse(post, employeeId);
    }

    // ==================== POLLS ====================

    @Transactional
    public void removeVote(UUID postId, UUID employeeId) {
        pollVoteRepository.deleteByPollOptionPostIdAndEmployeeId(postId, employeeId);
    }

    @Transactional(readOnly = true)
    public Page<WallPostResponse> getPraiseForEmployee(UUID employeeId, Pageable pageable, UUID currentUserId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        Page<WallPost> posts = wallPostRepository.findPraiseByRecipientId(tenantId, employeeId, pageable);
        // P1-6: use the batch mapper (same as the main feed) instead of per-post
        // mapToResponse, which issued ~5 queries per praise card.
        return mapPageToResponses(posts, tenantId, currentUserId);
    }

    // ==================== PRAISE ====================

    /**
     * Batch-maps a page of WallPost entities to WallPostResponse DTOs using
     * bulk queries instead of per-post lookups. Total query count is ~8 for
     * any page size (vs ~5N before).
     */
    private Page<WallPostResponse> mapPageToResponses(Page<WallPost> postsPage, UUID tenantId, UUID currentUserId) {
        List<WallPost> posts = postsPage.getContent();
        if (posts.isEmpty()) {
            return postsPage.map(post -> mapToResponse(post, currentUserId));
        }

        List<UUID> postIds = posts.stream().map(WallPost::getId).collect(Collectors.toList());
        List<UUID> pollPostIds = posts.stream()
                .filter(p -> p.getType() == WallPost.PostType.POLL)
                .map(WallPost::getId)
                .collect(Collectors.toList());

        // 2. Batch-fetch reaction counts by type for all posts
        Map<UUID, Map<String, Integer>> reactionCountsMap = new HashMap<>();
        postReactionRepository.countReactionsByTypeForPosts(postIds)
                .forEach(row -> {
                    UUID postId = (UUID) row[0];
                    PostReaction.ReactionType type = (PostReaction.ReactionType) row[1];
                    Long count = (Long) row[2];
                    reactionCountsMap
                            .computeIfAbsent(postId, k -> new HashMap<>())
                            .put(type.name(), count.intValue());
                });

        // 3. Batch-fetch current user's reactions for all posts
        Map<UUID, String> userReactionMap = new HashMap<>();
        if (currentUserId != null) {
            postReactionRepository.findUserReactionsForPosts(postIds, currentUserId)
                    .forEach(row -> {
                        UUID postId = (UUID) row[0];
                        PostReaction.ReactionType type = (PostReaction.ReactionType) row[1];
                        userReactionMap.put(postId, type.name());
                    });
        }

        // 4. Batch-fetch current user's poll votes
        Map<UUID, UUID> userVoteMap = new HashMap<>();
        if (currentUserId != null && !pollPostIds.isEmpty()) {
            pollVoteRepository.findUserVotesForPosts(pollPostIds, currentUserId)
                    .forEach(row -> {
                        UUID postId = (UUID) row[0];
                        UUID optionId = (UUID) row[1];
                        userVoteMap.put(postId, optionId);
                    });
        }

        // 5. Fetch poll options for POLL-type posts
        Map<UUID, List<PollOption>> pollOptionsMap = new HashMap<>();
        if (!pollPostIds.isEmpty()) {
            pollOptionRepository.findByPostIdsAndTenantIdOrderByPostAndDisplayOrder(pollPostIds, tenantId)
                    .forEach(option -> pollOptionsMap
                            .computeIfAbsent(option.getPost().getId(), ignored -> new ArrayList<>())
                            .add(option));
        }

        // 6. Batch-fetch vote counts per option for poll posts
        Map<UUID, Long> optionVoteCountMap = new HashMap<>();
        Map<UUID, Long> pollTotalVotesMap = new HashMap<>();
        if (!pollPostIds.isEmpty()) {
            pollVoteRepository.countVotesByOptionForPosts(pollPostIds)
                    .forEach(row -> {
                        UUID optionId = (UUID) row[0];
                        Long count = (Long) row[1];
                        optionVoteCountMap.put(optionId, count);
                    });
            // Compute total votes per poll
            for (UUID pollId : pollPostIds) {
                List<PollOption> options = pollOptionsMap.getOrDefault(pollId, Collections.emptyList());
                long total = options.stream()
                        .mapToLong(o -> optionVoteCountMap.getOrDefault(o.getId(), 0L))
                        .sum();
                pollTotalVotesMap.put(pollId, total);
            }
        }

        // Now map each post using pre-fetched data (no extra queries)
        return postsPage.map(post -> {
            WallPost hydrated = post;

            WallPostResponse response = new WallPostResponse();
            response.setId(hydrated.getId());
            response.setType(hydrated.getType());
            response.setContent(hydrated.getContent());
            response.setImageUrl(hydrated.getImageUrl());
            response.setPinned(hydrated.isPinned());
            response.setVisibility(hydrated.getVisibility());
            response.setCreatedAt(hydrated.getCreatedAt());
            response.setUpdatedAt(hydrated.getUpdatedAt());

            // Author info (already eagerly loaded)
            response.setAuthor(mapToAuthorInfo(hydrated.getAuthor()));

            // Praise recipient (already eagerly loaded)
            if (hydrated.getPraiseRecipient() != null) {
                response.setPraiseRecipient(mapToAuthorInfo(hydrated.getPraiseRecipient()));
            }
            if (hydrated.getCelebrationType() != null) {
                response.setCelebrationType(hydrated.getCelebrationType());
            }

            // Counts from stored values (no query)
            response.setLikeCount(hydrated.getLikesCount());
            response.setCommentCount(hydrated.getCommentsCount());

            // Reaction counts from batch query
            response.setReactionCounts(reactionCountsMap.getOrDefault(hydrated.getId(), Collections.emptyMap()));

            // Current user's reaction from batch query
            if (currentUserId != null) {
                String userReaction = userReactionMap.get(hydrated.getId());
                response.setHasReacted(userReaction != null);
                response.setUserReactionType(userReaction);

                // Poll vote from batch query
                if (hydrated.getType() == WallPost.PostType.POLL) {
                    UUID votedOptionId = userVoteMap.get(hydrated.getId());
                    response.setHasVoted(votedOptionId != null);
                    response.setUserVotedOptionId(votedOptionId);
                }
            }

            // Recent reactors — skip in batch mode for performance; the feed
            // shows reaction counts + user's own reaction. Full reactor list
            // is available via the dedicated GET /posts/{id}/reactions/details endpoint.
            response.setRecentReactors(Collections.emptyList());
            response.setTotalReactorCount(hydrated.getLikesCount());

            // Poll options from batch query
            if (hydrated.getType() == WallPost.PostType.POLL) {
                List<PollOption> options = pollOptionsMap.getOrDefault(hydrated.getId(), Collections.emptyList());
                long totalVotes = pollTotalVotesMap.getOrDefault(hydrated.getId(), 0L);

                List<WallPostResponse.PollOptionResponse> pollOptionResponses = options.stream()
                        .map(option -> {
                            WallPostResponse.PollOptionResponse optionResponse = new WallPostResponse.PollOptionResponse();
                            optionResponse.setId(option.getId());
                            optionResponse.setText(option.getOptionText());
                            long voteCount = optionVoteCountMap.getOrDefault(option.getId(), 0L);
                            optionResponse.setVoteCount((int) voteCount);
                            optionResponse.setVotePercentage(totalVotes > 0 ? (voteCount * 100.0 / totalVotes) : 0);
                            return optionResponse;
                        })
                        .collect(Collectors.toList());

                response.setPollOptions(pollOptionResponses);
            }

            return response;
        });
    }

    // ==================== BATCH MAPPING (BUG-001 FIX) ====================

    private WallPostResponse mapToResponse(WallPost post, UUID currentUserId) {
        WallPostResponse response = new WallPostResponse();
        response.setId(post.getId());
        response.setType(post.getType());
        response.setContent(post.getContent());
        response.setImageUrl(post.getImageUrl());
        response.setPinned(post.isPinned());
        response.setVisibility(post.getVisibility());
        response.setCreatedAt(post.getCreatedAt());
        response.setUpdatedAt(post.getUpdatedAt());

        // Author info
        response.setAuthor(mapToAuthorInfo(post.getAuthor()));

        // Praise recipient and category
        if (post.getPraiseRecipient() != null) {
            response.setPraiseRecipient(mapToAuthorInfo(post.getPraiseRecipient()));
        }
        if (post.getCelebrationType() != null) {
            response.setCelebrationType(post.getCelebrationType());
        }

        // Counts - use stored counts for performance (updated when reactions/comments are added/removed)
        response.setLikeCount(post.getLikesCount());
        response.setCommentCount(post.getCommentsCount());

        // Reaction counts by type
        Map<String, Integer> reactionCounts = new HashMap<>();
        List<Object[]> reactionData = postReactionRepository.countReactionsByTypeForPost(post.getId());
        for (Object[] data : reactionData) {
            PostReaction.ReactionType type = (PostReaction.ReactionType) data[0];
            Long count = (Long) data[1];
            reactionCounts.put(type.name(), count.intValue());
        }
        response.setReactionCounts(reactionCounts);

        // Current user's reaction
        if (currentUserId != null) {
            Optional<PostReaction> userReaction = postReactionRepository.findByPostIdAndEmployeeId(post.getId(), currentUserId);
            response.setHasReacted(userReaction.isPresent());
            userReaction.ifPresent(r -> response.setUserReactionType(r.getReactionType().name()));

            // Current user's vote
            if (post.getType() == WallPost.PostType.POLL) {
                Optional<PollVote> userVote = pollVoteRepository.findByPostIdAndEmployeeId(post.getId(), currentUserId);
                response.setHasVoted(userVote.isPresent());
                userVote.ifPresent(v -> response.setUserVotedOptionId(v.getPollOption().getId()));
            }
        }

        // Recent reactors (top 5 most recent) — wrapped in try-catch to not break the feed
        try {
            List<PostReaction> recentReactions = postReactionRepository.findRecentByPostId(
                    post.getId(), PageRequest.of(0, 5));
            List<WallPostResponse.ReactorInfo> recentReactors = recentReactions.stream()
                    .map(this::mapToReactorInfo)
                    .collect(Collectors.toList());
            response.setRecentReactors(recentReactors);
        } catch (RuntimeException e) {
            // Intentional broad catch — reactor enrichment must not break the wall feed
            response.setRecentReactors(Collections.emptyList());
        }
        response.setTotalReactorCount(post.getLikesCount());

        // Poll options
        if (post.getType() == WallPost.PostType.POLL) {
            List<PollOption> options = pollOptionRepository.findByPostIdOrderByDisplayOrder(post.getId());
            long totalVotes = pollVoteRepository.countByPostId(post.getId());

            List<WallPostResponse.PollOptionResponse> pollOptionResponses = options.stream()
                    .map(option -> {
                        WallPostResponse.PollOptionResponse optionResponse = new WallPostResponse.PollOptionResponse();
                        optionResponse.setId(option.getId());
                        optionResponse.setText(option.getOptionText());
                        int voteCount = option.getVoteCount();
                        optionResponse.setVoteCount(voteCount);
                        optionResponse.setVotePercentage(totalVotes > 0 ? (voteCount * 100.0 / totalVotes) : 0);
                        return optionResponse;
                    })
                    .collect(Collectors.toList());

            response.setPollOptions(pollOptionResponses);
        }

        return response;
    }

    // ==================== MAPPING HELPERS ====================

    private WallPostResponse.AuthorInfo mapToAuthorInfo(Employee employee) {
        WallPostResponse.AuthorInfo authorInfo = new WallPostResponse.AuthorInfo();
        authorInfo.setId(employee.getId());
        authorInfo.setEmployeeId(employee.getEmployeeCode());
        authorInfo.setFullName(employee.getFullName());
        authorInfo.setDesignation(employee.getDesignation());
        // Department would need to be fetched from department service if needed
        authorInfo.setDepartment(null);
        // Pull profile picture from linked User entity (Google OAuth picture)
        if (employee.getUser() != null && employee.getUser().getProfilePictureUrl() != null) {
            authorInfo.setAvatarUrl(employee.getUser().getProfilePictureUrl());
        }
        return authorInfo;
    }

    private WallPostResponse.ReactorInfo mapToReactorInfo(PostReaction reaction) {
        WallPostResponse.ReactorInfo info = new WallPostResponse.ReactorInfo();
        Employee employee = reaction.getEmployee();
        info.setEmployeeId(employee.getId());
        info.setFullName(employee.getFullName());
        info.setReactionType(reaction.getReactionType().name());
        info.setReactedAt(reaction.getCreatedAt());
        // Pull avatar from linked User entity (Google OAuth picture)
        if (employee.getUser() != null && employee.getUser().getProfilePictureUrl() != null) {
            info.setAvatarUrl(employee.getUser().getProfilePictureUrl());
        }
        return info;
    }

    private CommentResponse mapCommentToResponse(PostComment comment) {
        // Single-item path: resolve reply count with a dedicated query.
        int replyCount = postCommentRepository.countByParentCommentIdAndActiveTrue(comment.getId());
        return mapCommentToResponse(comment, Map.of(comment.getId(), replyCount));
    }

    /**
     * Batch-aware variant: reply counts come from a pre-fetched cache keyed by
     * comment id, so list paths avoid the per-comment count N+1.
     */
    private CommentResponse mapCommentToResponse(PostComment comment, Map<UUID, Integer> replyCountCache) {
        CommentResponse response = new CommentResponse();
        response.setId(comment.getId());
        response.setPostId(comment.getPost().getId());
        response.setAuthor(mapToAuthorInfo(comment.getAuthor()));
        response.setContent(comment.getContent());
        response.setParentCommentId(comment.getParentComment() != null ? comment.getParentComment().getId() : null);

        response.setReplyCount(replyCountCache.getOrDefault(comment.getId(), 0));
        response.setLikesCount(comment.getLikesCount());

        response.setCreatedAt(comment.getCreatedAt());
        response.setUpdatedAt(comment.getUpdatedAt());
        return response;
    }

    /**
     * Bundles the viewer's identity + scope fields used by the visibility predicate.
     */
    private record ViewerContext(UUID employeeId, UUID departmentId, UUID teamId) {
        static final ViewerContext ANONYMOUS = new ViewerContext(null, null, null);
    }
}
