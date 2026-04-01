package com.hrms.domain.document;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DocumentApprovalTaskRepository extends JpaRepository<DocumentApprovalTask, UUID> {

    List<DocumentApprovalTask> findByWorkflowId(UUID workflowId);

    List<DocumentApprovalTask> findByWorkflowIdOrderByApprovalLevel(UUID workflowId);

    Page<DocumentApprovalTask> findByApproverId(UUID approverId, Pageable pageable);

    Page<DocumentApprovalTask> findByTenantIdAndApproverId(UUID tenantId, UUID approverId, Pageable pageable);

    Page<DocumentApprovalTask> findByTenantIdAndApproverIdAndStatus(UUID tenantId, UUID approverId, DocumentApprovalTask.TaskStatus status, Pageable pageable);

    Optional<DocumentApprovalTask> findByWorkflowIdAndApprovalLevel(UUID workflowId, Integer approvalLevel);
}
