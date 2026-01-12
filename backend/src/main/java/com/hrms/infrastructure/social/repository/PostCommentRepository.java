package com.hrms.infrastructure.social.repository;

import com.hrms.domain.social.PostComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PostCommentRepository extends JpaRepository<PostComment, UUID> {
    List<PostComment> findByTenantIdAndPostIdAndIsDeletedFalseOrderByCreatedAtAsc(UUID tenantId, UUID postId);
}
