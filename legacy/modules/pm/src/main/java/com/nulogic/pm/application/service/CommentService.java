package com.nulogic.pm.application.service;

import com.nulogic.pm.api.dto.CommentDTO;
import com.nulogic.common.security.TenantContext;
import com.nulogic.pm.domain.project.ProjectComment;
import com.nulogic.pm.domain.project.ProjectComment.CommentType;
import com.nulogic.pm.infrastructure.repository.ProjectCommentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service("pmCommentService")
@RequiredArgsConstructor
@Transactional
public class CommentService {

    private final ProjectCommentRepository commentRepository;

    public CommentDTO.Response create(CommentDTO.CreateRequest request, UUID authorId, String authorName) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ProjectComment comment = ProjectComment.builder()
                .projectId(request.getProjectId())
                .taskId(request.getTaskId())
                .milestoneId(request.getMilestoneId())
                .authorId(authorId)
                .authorName(authorName)
                .content(request.getContent())
                .parentCommentId(request.getParentCommentId())
                .type(request.getType() != null ? request.getType() : CommentType.COMMENT)
                .mentions(request.getMentions())
                .attachments(request.getAttachments())
                .build();

        comment.setTenantId(tenantId);
        comment = commentRepository.save(comment);

        return CommentDTO.Response.fromEntity(comment);
    }

    public CommentDTO.Response update(UUID id, CommentDTO.UpdateRequest request, UUID userId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ProjectComment comment = commentRepository.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new IllegalArgumentException("Comment not found: " + id));

        if (!comment.getAuthorId().equals(userId)) {
            throw new IllegalArgumentException("Only the author can edit this comment");
        }

        comment.edit(request.getContent());
        comment = commentRepository.save(comment);

        return CommentDTO.Response.fromEntity(comment);
    }

    @Transactional(readOnly = true)
    public CommentDTO.Response getById(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ProjectComment comment = commentRepository.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new IllegalArgumentException("Comment not found: " + id));

        return enrichWithReplies(CommentDTO.Response.fromEntity(comment));
    }

    @Transactional(readOnly = true)
    public Page<CommentDTO.Response> listByTask(UUID taskId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Page<ProjectComment> comments = commentRepository.findTopLevelCommentsByTask(tenantId, taskId, pageable);

        return comments.map(comment -> enrichWithReplies(CommentDTO.Response.fromEntity(comment)));
    }

    @Transactional(readOnly = true)
    public Page<CommentDTO.Response> listByProject(UUID projectId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Page<ProjectComment> comments = commentRepository.findByTenantIdAndProjectIdAndIsDeletedFalseOrderByCreatedAtDesc(
                tenantId, projectId, pageable);

        return comments.map(comment -> CommentDTO.Response.fromEntity(comment));
    }

    @Transactional(readOnly = true)
    public Page<CommentDTO.Response> listByMilestone(UUID milestoneId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Page<ProjectComment> comments = commentRepository.findByTenantIdAndMilestoneIdAndIsDeletedFalseOrderByCreatedAtDesc(
                tenantId, milestoneId, pageable);

        return comments.map(comment -> CommentDTO.Response.fromEntity(comment));
    }

    public void delete(UUID id, UUID userId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ProjectComment comment = commentRepository.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new IllegalArgumentException("Comment not found: " + id));

        if (!comment.getAuthorId().equals(userId)) {
            throw new IllegalArgumentException("Only the author can delete this comment");
        }

        comment.softDelete();
        commentRepository.save(comment);
    }

    public CommentDTO.Response createSystemComment(UUID projectId, UUID taskId, String content, CommentType type) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ProjectComment comment = ProjectComment.builder()
                .projectId(projectId)
                .taskId(taskId)
                .authorId(null)
                .authorName("System")
                .content(content)
                .type(type)
                .build();

        comment.setTenantId(tenantId);
        comment = commentRepository.save(comment);

        return CommentDTO.Response.fromEntity(comment);
    }

    private CommentDTO.Response enrichWithReplies(CommentDTO.Response response) {
        UUID tenantId = TenantContext.getCurrentTenant();

        List<ProjectComment> replies = commentRepository.findByTenantIdAndParentCommentIdAndIsDeletedFalseOrderByCreatedAtAsc(
                tenantId, response.getId());

        response.setReplies(replies.stream()
                .map(CommentDTO.Response::fromEntity)
                .collect(Collectors.toList()));

        return response;
    }
}
