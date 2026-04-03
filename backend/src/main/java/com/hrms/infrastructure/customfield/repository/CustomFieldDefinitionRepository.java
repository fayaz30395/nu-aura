package com.hrms.infrastructure.customfield.repository;

import com.hrms.domain.customfield.CustomFieldDefinition;
import com.hrms.domain.customfield.CustomFieldDefinition.EntityType;
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
public interface CustomFieldDefinitionRepository extends JpaRepository<CustomFieldDefinition, UUID> {

    /**
     * Find all field definitions for a tenant
     */
    List<CustomFieldDefinition> findByTenantIdOrderByDisplayOrderAsc(UUID tenantId);

    /**
     * Find all field definitions for a tenant with pagination
     */
    Page<CustomFieldDefinition> findByTenantId(UUID tenantId, Pageable pageable);

    /**
     * Find by field code and tenant
     */
    Optional<CustomFieldDefinition> findByFieldCodeAndTenantId(String fieldCode, UUID tenantId);

    /**
     * Check if field code exists for tenant
     */
    boolean existsByFieldCodeAndTenantId(String fieldCode, UUID tenantId);

    /**
     * Check if field code exists for tenant excluding a specific ID (for updates)
     */
    boolean existsByFieldCodeAndTenantIdAndIdNot(String fieldCode, UUID tenantId, UUID excludeId);

    /**
     * Find all field definitions for a specific entity type
     */
    List<CustomFieldDefinition> findByEntityTypeAndTenantIdOrderByDisplayOrderAsc(
            EntityType entityType, UUID tenantId);

    /**
     * Find active field definitions for an entity type
     */
    List<CustomFieldDefinition> findByEntityTypeAndTenantIdAndIsActiveTrueOrderByDisplayOrderAsc(
            EntityType entityType, UUID tenantId);

    /**
     * Find field definitions by group
     */
    List<CustomFieldDefinition> findByFieldGroupAndTenantIdOrderByDisplayOrderAsc(
            String fieldGroup, UUID tenantId);

    /**
     * Find required field definitions for an entity type
     */
    List<CustomFieldDefinition> findByEntityTypeAndTenantIdAndIsRequiredTrueAndIsActiveTrue(
            EntityType entityType, UUID tenantId);

    /**
     * Find searchable field definitions for an entity type
     */
    List<CustomFieldDefinition> findByEntityTypeAndTenantIdAndIsSearchableTrueAndIsActiveTrue(
            EntityType entityType, UUID tenantId);

    /**
     * Find fields that should show in list view
     */
    List<CustomFieldDefinition> findByEntityTypeAndTenantIdAndShowInListTrueAndIsActiveTrueOrderByDisplayOrderAsc(
            EntityType entityType, UUID tenantId);

    /**
     * Search field definitions by name or code
     */
    @Query("SELECT c FROM CustomFieldDefinition c WHERE c.tenantId = :tenantId AND " +
            "(LOWER(c.fieldName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(c.fieldCode) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<CustomFieldDefinition> searchByNameOrCode(
            @Param("tenantId") UUID tenantId,
            @Param("search") String search,
            Pageable pageable);

    /**
     * Get distinct field groups for a tenant
     */
    @Query("SELECT DISTINCT c.fieldGroup FROM CustomFieldDefinition c " +
            "WHERE c.tenantId = :tenantId AND c.fieldGroup IS NOT NULL ORDER BY c.fieldGroup")
    List<String> findDistinctFieldGroupsByTenantId(@Param("tenantId") UUID tenantId);

    /**
     * Get distinct field groups for an entity type
     */
    @Query("SELECT DISTINCT c.fieldGroup FROM CustomFieldDefinition c " +
            "WHERE c.tenantId = :tenantId AND c.entityType = :entityType AND c.fieldGroup IS NOT NULL " +
            "ORDER BY c.fieldGroup")
    List<String> findDistinctFieldGroupsByEntityType(
            @Param("tenantId") UUID tenantId,
            @Param("entityType") EntityType entityType);

    /**
     * Count field definitions by entity type
     */
    long countByEntityTypeAndTenantId(EntityType entityType, UUID tenantId);

    /**
     * Count active field definitions by entity type
     */
    long countByEntityTypeAndTenantIdAndIsActiveTrue(EntityType entityType, UUID tenantId);

    /**
     * Get max display order for a group
     */
    @Query("SELECT COALESCE(MAX(c.displayOrder), 0) FROM CustomFieldDefinition c " +
            "WHERE c.tenantId = :tenantId AND c.entityType = :entityType AND " +
            "(c.fieldGroup = :fieldGroup OR (:fieldGroup IS NULL AND c.fieldGroup IS NULL))")
    Integer findMaxDisplayOrderByGroup(
            @Param("tenantId") UUID tenantId,
            @Param("entityType") EntityType entityType,
            @Param("fieldGroup") String fieldGroup);

    Optional<CustomFieldDefinition> findByIdAndTenantId(UUID id, UUID tenantId);
}
