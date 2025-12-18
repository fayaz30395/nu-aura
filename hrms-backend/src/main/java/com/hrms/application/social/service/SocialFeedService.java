package com.hrms.application.social.service;
import com.hrms.api.social.dto.*;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.social.*;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.social.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
@Slf4j @Service @RequiredArgsConstructor @Transactional
public class SocialFeedService {
    private final SocialPostRepository socialPostRepository;
    private final PostCommentRepository postCommentRepository;
    private final PostReactionRepository postReactionRepository;
    private final PostMentionRepository postMentionRepository;
    private final EmployeeRepository employeeRepository;
    public SocialPostResponse createPost(SocialPostRequest request, UUID authorId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        SocialPost post = new SocialPost();
        post.setId(UUID.randomUUID());
        post.setTenantId(tenantId);
        post.setAuthorId(authorId);
        post.setPostType(request.getPostType());
        post.setContent(request.getContent());
        post.setMediaUrls(request.getMediaUrls());
        post.setVisibility(request.getVisibility());
        post.setDepartmentId(request.getDepartmentId());
        post.setLikesCount(0);
        post.setCommentsCount(0);
        post.setSharesCount(0);
        post.setIsDeleted(false);
        SocialPost saved = socialPostRepository.save(post);
        return mapToResponse(saved);
    }
    public void addComment(PostCommentRequest request, UUID authorId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        PostComment comment = new PostComment();
        comment.setId(UUID.randomUUID());
        comment.setTenantId(tenantId);
        comment.setPostId(request.getPostId());
        comment.setAuthorId(authorId);
        comment.setContent(request.getContent());
        comment.setLikesCount(0);
        comment.setIsDeleted(false);
        postCommentRepository.save(comment);
    }
    public void toggleReaction(UUID postId, UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Optional<PostReaction> existing = postReactionRepository.findByTenantIdAndPostIdAndEmployeeId(tenantId, postId, employeeId);
        if (existing.isPresent()) {
            postReactionRepository.delete(existing.get());
        } else {
            PostReaction reaction = new PostReaction();
            reaction.setId(UUID.randomUUID());
            reaction.setTenantId(tenantId);
            reaction.setPostId(postId);
            reaction.setEmployeeId(employeeId);
            reaction.setReactionType(PostReaction.ReactionType.LIKE);
            postReactionRepository.save(reaction);
        }
    }
    @Transactional(readOnly = true)
    public List<SocialPostResponse> getFeed() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return socialPostRepository.findByTenantIdAndIsDeletedFalseOrderByCreatedAtDesc(tenantId).stream()
                .map(this::mapToResponse).collect(Collectors.toList());
    }
    private SocialPostResponse mapToResponse(SocialPost post) {
        String authorName = employeeRepository.findById(post.getAuthorId()).map(Employee::getFullName).orElse(null);
        return SocialPostResponse.builder()
                .id(post.getId()).authorId(post.getAuthorId()).authorName(authorName)
                .postType(post.getPostType()).content(post.getContent()).mediaUrls(post.getMediaUrls())
                .likesCount(post.getLikesCount()).commentsCount(post.getCommentsCount())
                .createdAt(post.getCreatedAt()).build();
    }
}
