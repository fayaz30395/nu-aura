package com.hrms.infrastructure.workflow.repository;

import com.hrms.domain.workflow.ApprovalStep;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ApprovalStepRepository extends JpaRepository<ApprovalStep, UUID> {

    Optional<ApprovalStep> findByIdAndTenantId(UUID id, UUID tenantId);

    List<ApprovalStep> findByWorkflowDefinitionIdOrderByStepOrderAsc(UUID workflowDefinitionId);

    @Query("SELECT s FROM ApprovalStep s WHERE s.workflowDefinition.id = :workflowId AND s.stepOrder = :stepOrder")
    Optional<ApprovalStep> findByWorkflowAndStepOrder(@Param("workflowId") UUID workflowId, @Param("stepOrder") int stepOrder);

    @Query("SELECT s FROM ApprovalStep s WHERE s.workflowDefinition.id = :workflowId AND s.approverType = :approverType")
    List<ApprovalStep> findByWorkflowAndApproverType(@Param("workflowId") UUID workflowId, @Param("approverType") ApprovalStep.ApproverType approverType);

    @Query("SELECT s FROM ApprovalStep s WHERE s.workflowDefinition.id = :workflowId AND s.specificUserId = :userId")
    List<ApprovalStep> findByWorkflowAndSpecificUser(@Param("workflowId") UUID workflowId, @Param("userId") UUID userId);

    @Query("SELECT s FROM ApprovalStep s WHERE s.workflowDefinition.id = :workflowId AND s.roleId = :roleId")
    List<ApprovalStep> findByWorkflowAndRole(@Param("workflowId") UUID workflowId, @Param("roleId") UUID roleId);

    @Query("SELECT MAX(s.stepOrder) FROM ApprovalStep s WHERE s.workflowDefinition.id = :workflowId")
    Integer findMaxStepOrder(@Param("workflowId") UUID workflowId);

    @Query("SELECT COUNT(s) FROM ApprovalStep s WHERE s.workflowDefinition.id = :workflowId")
    long countByWorkflowDefinition(@Param("workflowId") UUID workflowId);

    void deleteByWorkflowDefinitionId(UUID workflowDefinitionId);

    // ==================== EXPLICIT FETCH QUERIES (REQUIRED FOR LAZY ASSOCIATIONS) ====================

    /**
     * Find approval step by ID with WorkflowDefinition eagerly fetched.
     * ApprovalStep.workflowDefinition is @ManyToOne(fetch = FetchType.LAZY), causing N+1 queries
     * when steps are loaded with their workflow definitions.
     */
    @Query("SELECT DISTINCT s FROM ApprovalStep s " +
           "LEFT JOIN FETCH s.workflowDefinition " +
           "WHERE s.id = :stepId AND s.tenantId = :tenantId")
    Optional<ApprovalStep> findByIdWithWorkflow(@Param("stepId") UUID stepId, @Param("tenantId") UUID tenantId);

    /**
     * Find approval steps by workflow with WorkflowDefinition eagerly fetched.
     * Prevents N+1 queries when loading all steps for a workflow definition.
     */
    @Query("SELECT DISTINCT s FROM ApprovalStep s " +
           "LEFT JOIN FETCH s.workflowDefinition " +
           "WHERE s.workflowDefinition.id = :workflowId " +
           "ORDER BY s.stepOrder ASC")
    List<ApprovalStep> findByWorkflowDefinitionIdWithWorkflowOrderByStepOrderAsc(@Param("workflowId") UUID workflowId);

    /**
     * Find approval step by workflow and step order with WorkflowDefinition eagerly fetched.
     */
    @Query("SELECT DISTINCT s FROM ApprovalStep s " +
           "LEFT JOIN FETCH s.workflowDefinition w " +
           "WHERE w.id = :workflowId AND s.stepOrder = :stepOrder")
    Optional<ApprovalStep> findByWorkflowAndStepOrderWithWorkflow(@Param("workflowId") UUID workflowId, @Param("stepOrder") int stepOrder);

    /**
     * Find approval steps by workflow and approver type with WorkflowDefinition eagerly fetched.
     */
    @Query("SELECT DISTINCT s FROM ApprovalStep s " +
           "LEFT JOIN FETCH s.workflowDefinition " +
           "WHERE s.workflowDefinition.id = :workflowId AND s.approverType = :approverType")
    List<ApprovalStep> findByWorkflowAndApproverTypeWithWorkflow(@Param("workflowId") UUID workflowId, @Param("approverType") ApprovalStep.ApproverType approverType);
}
