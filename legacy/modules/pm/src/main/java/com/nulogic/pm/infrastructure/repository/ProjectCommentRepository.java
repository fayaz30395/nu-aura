package com.nulogic.pm.infrastructure.repository;

import com.nulogic.pm.domain.project.ProjectComment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProjectCommentRepository extends JpaRepository<ProjectComment, UUID> {

    Page<ProjectComment> findByTenantIdAndProjectIdAndIsDeletedFalseOrderByCreatedAtDesc(
            UUID tenantId, UUID projectId, Pageable pageable);

    Page<ProjectComment> findByTenantIdAndTaskIdAndIsDeletedFalseOrderByCreatedAtDesc(
            UUID tenantId, UUID taskId, Pageable pageable);

    Page<ProjectComment> findByTenantIdAndMilestoneIdAndIsDeletedFalseOrderByCreatedAtDesc(
            UUID tenantId, UUID milestoneId, Pageable pageable);

    Optional<ProjectComment> findByTenantIdAndId(UUID tenantId, UUID id);

    List<ProjectComment> findByTenantIdAndParentCommentIdAndIsDeletedFalseOrderByCreatedAtAsc(
            UUID tenantId, UUID parentCommentId);

    @Query("SELECT c FROM PmProjectComment c WHERE c.tenantId = :tenantId AND c.taskId = :taskId " +
           "AND c.parentCommentId IS NULL AND c.isDeleted = false ORDER BY c.createdAt DESC")
    Page<ProjectComment> findTopLevelCommentsByTask(
            @Param("tenantId") UUID tenantId,
            @Param("taskId") UUID taskId,
            Pageable pageable);

    @Query("SELECT COUNT(c) FROM PmProjectComment c WHERE c.tenantId = :tenantId AND c.taskId = :taskId AND c.isDeleted = false")
    long countByTask(@Param("tenantId") UUID tenantId, @Param("taskId") UUID taskId);

    @Query("SELECT COUNT(c) FROM PmProjectComment c WHERE c.tenantId = :tenantId AND c.projectId = :projectId AND c.isDeleted = false")
    long countByProject(@Param("tenantId") UUID tenantId, @Param("projectId") UUID projectId);

    List<ProjectComment> findByTenantIdAndAuthorIdAndIsDeletedFalseOrderByCreatedAtDesc(UUID tenantId, UUID authorId);
}
