package com.hrms.infrastructure.workflow.repository;

import com.hrms.domain.workflow.WorkflowDefinition;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorkflowDefinitionRepository extends JpaRepository<WorkflowDefinition, UUID> {

    Optional<WorkflowDefinition> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<WorkflowDefinition> findByTenantId(UUID tenantId, Pageable pageable);

    List<WorkflowDefinition> findByTenantIdAndIsActiveTrue(UUID tenantId);

    @Query("SELECT w FROM WorkflowDefinition w WHERE w.tenantId = :tenantId AND w.entityType = :entityType AND w.isActive = true AND w.isDefault = true")
    Optional<WorkflowDefinition> findDefaultWorkflow(@Param("tenantId") UUID tenantId, @Param("entityType") WorkflowDefinition.EntityType entityType);

    @Query("SELECT w FROM WorkflowDefinition w WHERE w.tenantId = :tenantId AND w.entityType = :entityType AND w.isActive = true")
    List<WorkflowDefinition> findByEntityType(@Param("tenantId") UUID tenantId, @Param("entityType") WorkflowDefinition.EntityType entityType);

    @Query("SELECT w FROM WorkflowDefinition w WHERE w.tenantId = :tenantId AND w.entityType = :entityType AND w.isActive = true AND w.departmentId = :departmentId")
    Optional<WorkflowDefinition> findByEntityTypeAndDepartment(@Param("tenantId") UUID tenantId, @Param("entityType") WorkflowDefinition.EntityType entityType, @Param("departmentId") UUID departmentId);

    @Query("SELECT w FROM WorkflowDefinition w WHERE w.tenantId = :tenantId AND w.entityType = :entityType AND w.isActive = true " +
           "AND (w.minAmount IS NULL OR w.minAmount <= :amount) AND (w.maxAmount IS NULL OR w.maxAmount >= :amount)")
    List<WorkflowDefinition> findByEntityTypeAndAmountRange(@Param("tenantId") UUID tenantId, @Param("entityType") WorkflowDefinition.EntityType entityType, @Param("amount") BigDecimal amount);

    @Query("SELECT w FROM WorkflowDefinition w WHERE w.tenantId = :tenantId AND w.name LIKE %:name% AND w.isActive = true")
    List<WorkflowDefinition> searchByName(@Param("tenantId") UUID tenantId, @Param("name") String name);

    @Query("SELECT COUNT(w) FROM WorkflowDefinition w WHERE w.tenantId = :tenantId AND w.entityType = :entityType AND w.isActive = true")
    long countActiveByEntityType(@Param("tenantId") UUID tenantId, @Param("entityType") WorkflowDefinition.EntityType entityType);

    boolean existsByTenantIdAndNameAndIsActiveTrue(UUID tenantId, String name);

    // ==================== EXPLICIT FETCH QUERIES (REQUIRED FOR LAZY ASSOCIATIONS) ====================

    /**
     * Find workflow definition by ID with ApprovalSteps eagerly fetched.
     * WorkflowDefinition.steps is a @OneToMany collection that is LAZY by default.
     * Direct access will cause N+1 queries when iterating over steps.
     * Use this when loading workflow definitions for execution/editing.
     */
    @Query("SELECT DISTINCT w FROM WorkflowDefinition w " +
           "LEFT JOIN FETCH w.steps " +
           "WHERE w.id = :workflowId AND w.tenantId = :tenantId " +
           "ORDER BY w.id, w.steps ASC")
    Optional<WorkflowDefinition> findByIdWithSteps(@Param("workflowId") UUID workflowId, @Param("tenantId") UUID tenantId);

    /**
     * Find default workflow for entity type with ApprovalSteps eagerly fetched.
     */
    @Query("SELECT DISTINCT w FROM WorkflowDefinition w " +
           "LEFT JOIN FETCH w.steps " +
           "WHERE w.tenantId = :tenantId AND w.entityType = :entityType AND w.isActive = true AND w.isDefault = true " +
           "ORDER BY w.id, w.steps ASC")
    Optional<WorkflowDefinition> findDefaultWorkflowWithSteps(@Param("tenantId") UUID tenantId, @Param("entityType") WorkflowDefinition.EntityType entityType);

    /**
     * Find workflows by entity type with ApprovalSteps eagerly fetched.
     * Prevents N+1 queries when retrieving all workflows for an entity type.
     */
    @Query("SELECT DISTINCT w FROM WorkflowDefinition w " +
           "LEFT JOIN FETCH w.steps " +
           "WHERE w.tenantId = :tenantId AND w.entityType = :entityType AND w.isActive = true " +
           "ORDER BY w.id, w.steps ASC")
    List<WorkflowDefinition> findByEntityTypeWithSteps(@Param("tenantId") UUID tenantId, @Param("entityType") WorkflowDefinition.EntityType entityType);

    /**
     * Find workflow by entity type and department with ApprovalSteps eagerly fetched.
     */
    @Query("SELECT DISTINCT w FROM WorkflowDefinition w " +
           "LEFT JOIN FETCH w.steps " +
           "WHERE w.tenantId = :tenantId AND w.entityType = :entityType AND w.isActive = true AND w.departmentId = :departmentId " +
           "ORDER BY w.id, w.steps ASC")
    Optional<WorkflowDefinition> findByEntityTypeAndDepartmentWithSteps(@Param("tenantId") UUID tenantId, @Param("entityType") WorkflowDefinition.EntityType entityType, @Param("departmentId") UUID departmentId);

    /**
     * Find workflows by entity type and amount range with ApprovalSteps eagerly fetched.
     * Used for financial workflows.
     */
    @Query("SELECT DISTINCT w FROM WorkflowDefinition w " +
           "LEFT JOIN FETCH w.steps " +
           "WHERE w.tenantId = :tenantId AND w.entityType = :entityType AND w.isActive = true " +
           "AND (w.minAmount IS NULL OR w.minAmount <= :amount) AND (w.maxAmount IS NULL OR w.maxAmount >= :amount) " +
           "ORDER BY w.id, w.steps ASC")
    List<WorkflowDefinition> findByEntityTypeAndAmountRangeWithSteps(@Param("tenantId") UUID tenantId, @Param("entityType") WorkflowDefinition.EntityType entityType, @Param("amount") BigDecimal amount);

    /**
     * Find active workflows by tenant with ApprovalSteps eagerly fetched.
     * Used when loading all workflows for configuration/display.
     */
    @Query("SELECT DISTINCT w FROM WorkflowDefinition w " +
           "LEFT JOIN FETCH w.steps " +
           "WHERE w.tenantId = :tenantId AND w.isActive = true " +
           "ORDER BY w.id, w.steps ASC")
    List<WorkflowDefinition> findByTenantIdAndIsActiveTrueWithSteps(@Param("tenantId") UUID tenantId);
}
