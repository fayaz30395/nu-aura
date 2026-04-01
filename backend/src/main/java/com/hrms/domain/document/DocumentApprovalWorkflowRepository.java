package com.hrms.domain.document;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DocumentApprovalWorkflowRepository extends JpaRepository<DocumentApprovalWorkflow, UUID> {

    Optional<DocumentApprovalWorkflow> findByTenantIdAndDocumentId(UUID tenantId, UUID documentId);

    List<DocumentApprovalWorkflow> findByDocumentId(UUID documentId);

    Page<DocumentApprovalWorkflow> findByTenantId(UUID tenantId, Pageable pageable);

    Page<DocumentApprovalWorkflow> findByTenantIdAndStatus(UUID tenantId, DocumentApprovalWorkflow.WorkflowStatus status, Pageable pageable);

    Page<DocumentApprovalWorkflow> findByCurrentApproverId(UUID approverId, Pageable pageable);

    Page<DocumentApprovalWorkflow> findByTenantIdAndCurrentApproverIdAndStatus(UUID tenantId, UUID approverId, DocumentApprovalWorkflow.WorkflowStatus status, Pageable pageable);
}
