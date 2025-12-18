package com.hrms.infrastructure.customfield.repository;

import com.hrms.domain.customfield.CustomFieldDefinition.EntityType;
import com.hrms.domain.customfield.CustomFieldValue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CustomFieldValueRepository extends JpaRepository<CustomFieldValue, UUID> {

    /**
     * Find all values for a specific entity
     */
    List<CustomFieldValue> findByEntityTypeAndEntityIdAndTenantId(
            EntityType entityType, UUID entityId, UUID tenantId);

    /**
     * Find value by field definition and entity
     */
    Optional<CustomFieldValue> findByFieldDefinitionIdAndEntityId(UUID fieldDefinitionId, UUID entityId);

    /**
     * Find value by field code and entity
     */
    @Query("SELECT v FROM CustomFieldValue v JOIN v.fieldDefinition d " +
           "WHERE d.fieldCode = :fieldCode AND v.entityId = :entityId AND v.tenantId = :tenantId")
    Optional<CustomFieldValue> findByFieldCodeAndEntityId(
            @Param("fieldCode") String fieldCode,
            @Param("entityId") UUID entityId,
            @Param("tenantId") UUID tenantId);

    /**
     * Find all values for a field definition
     */
    List<CustomFieldValue> findByFieldDefinitionIdAndTenantId(UUID fieldDefinitionId, UUID tenantId);

    /**
     * Check if value exists for field and entity
     */
    boolean existsByFieldDefinitionIdAndEntityId(UUID fieldDefinitionId, UUID entityId);

    /**
     * Delete all values for an entity
     */
    @Modifying
    @Query("DELETE FROM CustomFieldValue v WHERE v.entityType = :entityType AND v.entityId = :entityId AND v.tenantId = :tenantId")
    void deleteByEntityTypeAndEntityIdAndTenantId(
            @Param("entityType") EntityType entityType,
            @Param("entityId") UUID entityId,
            @Param("tenantId") UUID tenantId);

    /**
     * Delete all values for a field definition
     */
    @Modifying
    void deleteByFieldDefinitionId(UUID fieldDefinitionId);

    /**
     * Delete specific value
     */
    @Modifying
    void deleteByFieldDefinitionIdAndEntityId(UUID fieldDefinitionId, UUID entityId);

    /**
     * Search entities by text value (for searchable fields)
     */
    @Query("SELECT DISTINCT v.entityId FROM CustomFieldValue v " +
           "WHERE v.fieldDefinition.id = :fieldDefinitionId AND v.tenantId = :tenantId " +
           "AND LOWER(v.textValue) LIKE LOWER(CONCAT('%', :searchText, '%'))")
    List<UUID> findEntityIdsByTextValueContaining(
            @Param("fieldDefinitionId") UUID fieldDefinitionId,
            @Param("tenantId") UUID tenantId,
            @Param("searchText") String searchText);

    /**
     * Find entities with a specific dropdown value
     */
    @Query("SELECT DISTINCT v.entityId FROM CustomFieldValue v " +
           "WHERE v.fieldDefinition.id = :fieldDefinitionId AND v.tenantId = :tenantId " +
           "AND v.textValue = :value")
    List<UUID> findEntityIdsByExactTextValue(
            @Param("fieldDefinitionId") UUID fieldDefinitionId,
            @Param("tenantId") UUID tenantId,
            @Param("value") String value);

    /**
     * Count entities with values for a specific field
     */
    @Query("SELECT COUNT(DISTINCT v.entityId) FROM CustomFieldValue v " +
           "WHERE v.fieldDefinition.id = :fieldDefinitionId AND v.tenantId = :tenantId")
    long countEntitiesWithValue(
            @Param("fieldDefinitionId") UUID fieldDefinitionId,
            @Param("tenantId") UUID tenantId);

    /**
     * Get all values for multiple entities at once (for list views)
     */
    @Query("SELECT v FROM CustomFieldValue v " +
           "WHERE v.entityType = :entityType AND v.entityId IN :entityIds AND v.tenantId = :tenantId " +
           "AND v.fieldDefinition.isActive = true")
    List<CustomFieldValue> findByEntityTypeAndEntityIdInAndTenantId(
            @Param("entityType") EntityType entityType,
            @Param("entityIds") List<UUID> entityIds,
            @Param("tenantId") UUID tenantId);

    /**
     * Get values for specific fields for an entity
     */
    @Query("SELECT v FROM CustomFieldValue v " +
           "WHERE v.entityId = :entityId AND v.fieldDefinition.id IN :fieldDefinitionIds AND v.tenantId = :tenantId")
    List<CustomFieldValue> findByEntityIdAndFieldDefinitionIds(
            @Param("entityId") UUID entityId,
            @Param("fieldDefinitionIds") List<UUID> fieldDefinitionIds,
            @Param("tenantId") UUID tenantId);
}
