package com.hrms.infrastructure.knowledge.repository;

import com.hrms.domain.knowledge.BlogComment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface BlogCommentRepository extends JpaRepository<BlogComment, UUID> {

    Page<BlogComment> findByTenantIdAndPostId(UUID tenantId, UUID postId, Pageable pageable);

    Page<BlogComment> findByTenantIdAndPostIdAndIsApprovedTrue(UUID tenantId, UUID postId, Pageable pageable);

    Page<BlogComment> findByTenantIdAndPostIdAndParentCommentIsNull(UUID tenantId, UUID postId, Pageable pageable);

    List<BlogComment> findByTenantIdAndParentCommentId(UUID tenantId, UUID parentCommentId);

    @Query("SELECT bc FROM BlogComment bc WHERE bc.tenantId = :tenantId AND bc.post.id = :postId " +
            "AND bc.isApproved = false ORDER BY bc.createdAt DESC")
    Page<BlogComment> findUnapprovedCommentsByPost(@Param("tenantId") UUID tenantId, @Param("postId") UUID postId, Pageable pageable);

    long countByTenantIdAndPostId(UUID tenantId, UUID postId);

    long countByTenantIdAndPostIdAndIsApprovedTrue(UUID tenantId, UUID postId);
}
