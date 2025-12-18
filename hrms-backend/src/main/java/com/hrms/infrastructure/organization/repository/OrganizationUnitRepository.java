package com.hrms.infrastructure.organization.repository;

import com.hrms.domain.organization.OrganizationUnit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrganizationUnitRepository extends JpaRepository<OrganizationUnit, UUID> {

    Optional<OrganizationUnit> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<OrganizationUnit> findByCodeAndTenantId(String code, UUID tenantId);

    boolean existsByCodeAndTenantId(String code, UUID tenantId);

    List<OrganizationUnit> findByTenantIdAndIsActiveTrue(UUID tenantId);

    @Query("SELECT o FROM OrganizationUnit o WHERE o.tenantId = :tenantId AND o.parentId IS NULL ORDER BY o.sortOrder")
    List<OrganizationUnit> findRootUnits(@Param("tenantId") UUID tenantId);

    @Query("SELECT o FROM OrganizationUnit o WHERE o.tenantId = :tenantId AND o.parentId = :parentId ORDER BY o.sortOrder")
    List<OrganizationUnit> findByParent(@Param("tenantId") UUID tenantId, @Param("parentId") UUID parentId);

    @Query("SELECT o FROM OrganizationUnit o WHERE o.tenantId = :tenantId AND o.type = :type AND o.isActive = true")
    List<OrganizationUnit> findByType(@Param("tenantId") UUID tenantId, @Param("type") OrganizationUnit.UnitType type);

    @Query("SELECT o FROM OrganizationUnit o WHERE o.tenantId = :tenantId AND o.headId = :headId")
    List<OrganizationUnit> findByHead(@Param("tenantId") UUID tenantId, @Param("headId") UUID headId);
}
