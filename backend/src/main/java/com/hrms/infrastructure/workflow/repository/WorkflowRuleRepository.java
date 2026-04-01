package com.hrms.infrastructure.workflow.repository;

import com.hrms.domain.workflow.WorkflowDefinition;
import com.hrms.domain.workflow.WorkflowRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorkflowRuleRepository extends JpaRepository<WorkflowRule, UUID> {

    Optional<WorkflowRule> findByIdAndTenantId(UUID id, UUID tenantId);

    List<WorkflowRule> findByTenantIdAndIsActiveTrue(UUID tenantId);

    @Query("SELECT r FROM WorkflowRule r WHERE r.tenantId = :tenantId AND r.entityType = :entityType AND r.isActive = true " +
           "AND (r.effectiveFrom IS NULL OR r.effectiveFrom <= :now) AND (r.effectiveTo IS NULL OR r.effectiveTo >= :now) " +
           "ORDER BY r.priority DESC")
    List<WorkflowRule> findActiveRulesForEntityType(@Param("tenantId") UUID tenantId, @Param("entityType") WorkflowDefinition.EntityType entityType, @Param("now") LocalDateTime now);

    @Query("SELECT r FROM WorkflowRule r WHERE r.tenantId = :tenantId AND r.entityType = :entityType AND r.ruleType = :ruleType AND r.isActive = true " +
           "AND (r.effectiveFrom IS NULL OR r.effectiveFrom <= :now) AND (r.effectiveTo IS NULL OR r.effectiveTo >= :now) " +
           "ORDER BY r.priority DESC")
    List<WorkflowRule> findActiveRulesByType(@Param("tenantId") UUID tenantId, @Param("entityType") WorkflowDefinition.EntityType entityType, @Param("ruleType") WorkflowRule.RuleType ruleType, @Param("now") LocalDateTime now);

    @Query("SELECT r FROM WorkflowRule r WHERE r.tenantId = :tenantId AND r.ruleType = 'WORKFLOW_SELECTION' AND r.isActive = true ORDER BY r.priority DESC")
    List<WorkflowRule> findWorkflowSelectionRules(@Param("tenantId") UUID tenantId);

    @Query("SELECT r FROM WorkflowRule r WHERE r.tenantId = :tenantId AND r.targetWorkflowId = :workflowId")
    List<WorkflowRule> findRulesTargetingWorkflow(@Param("tenantId") UUID tenantId, @Param("workflowId") UUID workflowId);

    @Query("SELECT COUNT(r) FROM WorkflowRule r WHERE r.tenantId = :tenantId AND r.entityType = :entityType AND r.isActive = true")
    long countActiveRulesForEntityType(@Param("tenantId") UUID tenantId, @Param("entityType") WorkflowDefinition.EntityType entityType);

    boolean existsByTenantIdAndNameAndIsActiveTrue(UUID tenantId, String name);
}
