package com.hrms.infrastructure.knowledge.repository;

import com.hrms.domain.knowledge.WikiPageApprovalTask;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface WikiPageApprovalTaskRepository extends JpaRepository<WikiPageApprovalTask, UUID> {

    Optional<WikiPageApprovalTask> findByTenantIdAndPageId(UUID tenantId, UUID pageId);

    Page<WikiPageApprovalTask> findByTenantIdAndStatus(UUID tenantId, WikiPageApprovalTask.ApprovalStatus status, Pageable pageable);

    Page<WikiPageApprovalTask> findByTenantId(UUID tenantId, Pageable pageable);

    @Query("SELECT wpa FROM WikiPageApprovalTask wpa WHERE wpa.tenantId = :tenantId " +
           "AND wpa.status = 'PENDING' ORDER BY wpa.createdAt ASC")
    Page<WikiPageApprovalTask> findPendingTasksByTenant(@Param("tenantId") UUID tenantId, Pageable pageable);

    long countByTenantIdAndStatus(UUID tenantId, WikiPageApprovalTask.ApprovalStatus status);
}
