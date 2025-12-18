package com.hrms.infrastructure.organization.repository;

import com.hrms.domain.organization.Position;
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
public interface PositionRepository extends JpaRepository<Position, UUID> {

    Optional<Position> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<Position> findByCodeAndTenantId(String code, UUID tenantId);

    boolean existsByCodeAndTenantId(String code, UUID tenantId);

    Page<Position> findByTenantId(UUID tenantId, Pageable pageable);

    List<Position> findByTenantIdAndIsActiveTrue(UUID tenantId);

    @Query("SELECT p FROM Position p WHERE p.tenantId = :tenantId AND p.departmentId = :departmentId ORDER BY p.level")
    List<Position> findByDepartment(@Param("tenantId") UUID tenantId, @Param("departmentId") UUID departmentId);

    @Query("SELECT p FROM Position p WHERE p.tenantId = :tenantId AND p.isCritical = true AND p.isActive = true")
    List<Position> findCriticalPositions(@Param("tenantId") UUID tenantId);

    @Query("SELECT p FROM Position p WHERE p.tenantId = :tenantId AND p.headcount > p.filledCount AND p.isActive = true")
    List<Position> findWithVacancies(@Param("tenantId") UUID tenantId);

    @Query("SELECT p FROM Position p WHERE p.tenantId = :tenantId AND p.reportsToPositionId = :positionId")
    List<Position> findDirectReports(@Param("tenantId") UUID tenantId, @Param("positionId") UUID positionId);
}
