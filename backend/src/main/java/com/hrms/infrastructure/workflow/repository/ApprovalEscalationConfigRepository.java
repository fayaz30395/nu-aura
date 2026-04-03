package com.hrms.infrastructure.workflow.repository;

import com.hrms.domain.workflow.ApprovalEscalationConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for ApprovalEscalationConfig entities.
 * Manages escalation policies for approval workflows.
 */
@Repository
public interface ApprovalEscalationConfigRepository extends JpaRepository<ApprovalEscalationConfig, UUID> {

    /**
     * Find escalation config for a specific workflow in a tenant.
     * Each workflow has exactly one escalation config (or none).
     */
    Optional<ApprovalEscalationConfig> findByWorkflowDefinitionIdAndTenantId(
            UUID workflowDefinitionId, UUID tenantId);

    /**
     * Find active escalation config for a specific workflow.
     */
    Optional<ApprovalEscalationConfig> findByWorkflowDefinitionIdAndTenantIdAndIsActiveTrue(
            UUID workflowDefinitionId, UUID tenantId);

    /**
     * Find all escalation configs for a tenant (for administration/audit).
     */
    List<ApprovalEscalationConfig> findByTenantId(UUID tenantId);

    /**
     * Find all active escalation configs for a tenant.
     */
    List<ApprovalEscalationConfig> findByTenantIdAndIsActiveTrue(UUID tenantId);

    /**
     * Delete/soft-delete escalation config for a workflow.
     * Called when a workflow is removed or reconfigured.
     */
    @Modifying
    @Transactional
    @Query("DELETE FROM ApprovalEscalationConfig aec " +
            "WHERE aec.workflowDefinitionId = :workflowDefinitionId AND aec.tenantId = :tenantId")
    int deleteByWorkflowDefinitionIdAndTenantId(
            @Param("workflowDefinitionId") UUID workflowDefinitionId,
            @Param("tenantId") UUID tenantId);

    /**
     * Check if a workflow has an escalation config.
     */
    boolean existsByWorkflowDefinitionIdAndTenantId(UUID workflowDefinitionId, UUID tenantId);

    /**
     * Find escalation configs using a specific role as fallback.
     * Used when a role is deleted to detect dependent configs.
     */
    List<ApprovalEscalationConfig> findByFallbackRoleIdAndTenantId(UUID fallbackRoleId, UUID tenantId);

    /**
     * Find escalation configs using a specific user as fallback.
     * Used when a user is deactivated to detect dependent configs.
     */
    List<ApprovalEscalationConfig> findByFallbackUserIdAndTenantId(UUID fallbackUserId, UUID tenantId);
}
