package com.hrms.application.wall.service;

import com.hrms.api.wall.dto.*;
import com.hrms.application.common.service.ContentViewService;
import com.hrms.domain.common.ContentView.ContentType;
import com.hrms.domain.employee.Employee;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.domain.wall.model.*;
import com.hrms.infrastructure.wall.repository.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class WallService {

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

    public WallPostResponse createPost(CreatePostRequest request, UUID authorId) {
        Employee author = employeeRepository.findById(authorId)
                .orElseThrow(() -> new IllegalArgumentException("Author not found"));

        WallPost post = new WallPost(request.getType(), request.getContent(), author);
        post.setImageUrl(request.getImageUrl());
        post.setVisibility(request.getVisibility());

        // Handle praise recipient
        if (request.getType() == WallPost.PostType.PRAISE && request.getPraiseRecipientId() != null) {
            Employee recipient = employeeRepository.findById(request.getPraiseRecipientId())
                    .orElseThrow(() -> new IllegalArgumentException("Praise recipient not found"));
            post.setPraiseRecipient(recipient);
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

    @Transactional(readOnly = true)
    public Page<WallPostResponse> getPosts(Pageable pageable, UUID currentUserId) {
        Page<WallPost> posts = wallPostRepository.findAllActiveOrderByPinnedAndCreatedAt(pageable);
        return posts.map(post -> mapToResponse(post, currentUserId));
    }

    @Transactional(readOnly = true)
    public Page<WallPostResponse> getPostsByType(WallPost.PostType type, Pageable pageable, UUID currentUserId) {
        Page<WallPost> posts = wallPostRepository.findByTypeAndActiveTrue(type, pageable);
        return posts.map(post -> mapToResponse(post, currentUserId));
    }

    public WallPostResponse getPostById(UUID postId, UUID currentUserId) {
        WallPost post = wallPostRepository.findByIdAndActiveTrue(postId)
                .orElseThrow(() -> new IllegalArgumentException("Post not found"));

        // Track view in generic content view system
        if (currentUserId != null) {
            contentViewService.recordView(ContentType.WALL_POST, postId, currentUserId, "direct");
        }

        return mapToResponse(post, currentUserId);
    }

    public void deletePost(UUID postId, UUID userId) {
        WallPost post = wallPostRepository.findByIdAndActiveTrue(postId)
                .orElseThrow(() -> new IllegalArgumentException("Post not found"));

        if (!post.getAuthor().getId().equals(userId)) {
            throw new IllegalArgumentException("You can only delete your own posts");
        }

        post.setActive(false);
        wallPostRepository.save(post);
    }

    public WallPostResponse pinPost(UUID postId, boolean pinned) {
        WallPost post = wallPostRepository.findByIdAndActiveTrue(postId)
                .orElseThrow(() -> new IllegalArgumentException("Post not found"));

        post.setPinned(pinned);
        WallPost savedPost = wallPostRepository.save(post);
        return mapToResponse(savedPost, null);
    }

    // ==================== REACTIONS ====================

    public void addReaction(UUID postId, UUID employeeId, PostReaction.ReactionType reactionType) {
        WallPost post = wallPostRepository.findByIdAndActiveTrue(postId)
                .orElseThrow(() -> new IllegalArgumentException("Post not found"));

        Employee employee = employeeRepository.findById(employeeId)
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
            // Create new reaction
            PostReaction reaction = new PostReaction(post, employee, reactionType);
            postReactionRepository.save(reaction);

            // Update like count on the post
            post.setLikesCount(post.getLikesCount() + 1);
            wallPostRepository.save(post);
        }
    }

    public void removeReaction(UUID postId, UUID employeeId) {
        Optional<PostReaction> existingReaction = postReactionRepository
                .findByPostIdAndEmployeeId(postId, employeeId);

        if (existingReaction.isPresent()) {
            postReactionRepository.delete(existingReaction.get());

            // Update like count on the post
            WallPost post = wallPostRepository.findByIdAndActiveTrue(postId).orElse(null);
            if (post != null && post.getLikesCount() > 0) {
                post.setLikesCount(post.getLikesCount() - 1);
                wallPostRepository.save(post);
            }
        }
    }

    // ==================== COMMENTS ====================

    public CommentResponse addComment(UUID postId, CreateCommentRequest request, UUID authorId) {
        WallPost post = wallPostRepository.findByIdAndActiveTrue(postId)
                .orElseThrow(() -> new IllegalArgumentException("Post not found"));

        Employee author = employeeRepository.findById(authorId)
                .orElseThrow(() -> new IllegalArgumentException("Author not found"));

        PostComment comment = new PostComment(post, author, request.getContent());

        if (request.getParentCommentId() != null) {
            PostComment parentComment = postCommentRepository.findByIdAndActiveTrue(request.getParentCommentId())
                    .orElseThrow(() -> new IllegalArgumentException("Parent comment not found"));
            comment.setParentComment(parentComment);
        }

        PostComment savedComment = postCommentRepository.save(comment);

        // Update comment count on the post
        post.setCommentsCount(post.getCommentsCount() + 1);
        wallPostRepository.save(post);

        return mapCommentToResponse(savedComment);
    }

    @Transactional(readOnly = true)
    public Page<CommentResponse> getComments(UUID postId, Pageable pageable) {
        Page<PostComment> comments = postCommentRepository.findTopLevelCommentsByPostId(postId, pageable);
        return comments.map(this::mapCommentToResponse);
    }

    public void deleteComment(UUID commentId, UUID userId) {
        PostComment comment = postCommentRepository.findByIdAndActiveTrue(commentId)
                .orElseThrow(() -> new IllegalArgumentException("Comment not found"));

        if (!comment.getAuthor().getId().equals(userId)) {
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

    // ==================== POLLS ====================

    public WallPostResponse vote(UUID postId, UUID optionId, UUID employeeId) {
        WallPost post = wallPostRepository.findByIdAndActiveTrue(postId)
                .orElseThrow(() -> new IllegalArgumentException("Post not found"));

        if (post.getType() != WallPost.PostType.POLL) {
            throw new IllegalArgumentException("This post is not a poll");
        }

        PollOption option = pollOptionRepository.findById(optionId)
                .orElseThrow(() -> new IllegalArgumentException("Poll option not found"));

        if (!option.getPost().getId().equals(postId)) {
            throw new IllegalArgumentException("Option does not belong to this poll");
        }

        Employee employee = employeeRepository.findById(employeeId)
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

    public void removeVote(UUID postId, UUID employeeId) {
        pollVoteRepository.deleteByPollOptionPostIdAndEmployeeId(postId, employeeId);
    }

    // ==================== PRAISE ====================

    @Transactional(readOnly = true)
    public Page<WallPostResponse> getPraiseForEmployee(UUID employeeId, Pageable pageable, UUID currentUserId) {
        Page<WallPost> posts = wallPostRepository.findPraiseByRecipientId(employeeId, pageable);
        return posts.map(post -> mapToResponse(post, currentUserId));
    }

    // ==================== MAPPING HELPERS ====================

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

        // Praise recipient
        if (post.getPraiseRecipient() != null) {
            response.setPraiseRecipient(mapToAuthorInfo(post.getPraiseRecipient()));
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

    private WallPostResponse.AuthorInfo mapToAuthorInfo(Employee employee) {
        WallPostResponse.AuthorInfo authorInfo = new WallPostResponse.AuthorInfo();
        authorInfo.setId(employee.getId());
        authorInfo.setEmployeeId(employee.getEmployeeCode());
        authorInfo.setFullName(employee.getFullName());
        authorInfo.setDesignation(employee.getDesignation());
        // Department would need to be fetched from department service if needed
        authorInfo.setDepartment(null);
        // Avatar URL would come from employee profile picture if available
        return authorInfo;
    }

    private CommentResponse mapCommentToResponse(PostComment comment) {
        CommentResponse response = new CommentResponse();
        response.setId(comment.getId());
        response.setPostId(comment.getPost().getId());
        response.setAuthor(mapToAuthorInfo(comment.getAuthor()));
        response.setContent(comment.getContent());
        response.setParentCommentId(comment.getParentComment() != null ? comment.getParentComment().getId() : null);

        // Count replies from database instead of using lazy-loaded collection
        int replyCount = postCommentRepository.countByParentCommentIdAndActiveTrue(comment.getId());
        response.setReplyCount(replyCount);

        response.setCreatedAt(comment.getCreatedAt());
        response.setUpdatedAt(comment.getUpdatedAt());
        return response;
    }
}
