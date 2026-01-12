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
}
