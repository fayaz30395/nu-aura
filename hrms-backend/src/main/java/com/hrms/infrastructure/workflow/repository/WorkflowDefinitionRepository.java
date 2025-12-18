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
}
