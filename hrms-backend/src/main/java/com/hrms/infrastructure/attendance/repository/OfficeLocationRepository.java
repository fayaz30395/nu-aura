package com.hrms.infrastructure.attendance.repository;

import com.hrms.domain.attendance.OfficeLocation;
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
public interface OfficeLocationRepository extends JpaRepository<OfficeLocation, UUID> {

    Page<OfficeLocation> findAllByTenantId(UUID tenantId, Pageable pageable);

    List<OfficeLocation> findAllByTenantIdAndIsActiveTrue(UUID tenantId);

    List<OfficeLocation> findAllByTenantIdAndIsGeofenceEnabledTrue(UUID tenantId);

    Optional<OfficeLocation> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<OfficeLocation> findByLocationCodeAndTenantId(String locationCode, UUID tenantId);

    boolean existsByLocationCodeAndTenantId(String locationCode, UUID tenantId);

    @Query("SELECT o FROM OfficeLocation o WHERE o.tenantId = :tenantId AND o.isHeadquarters = true AND o.isActive = true")
    Optional<OfficeLocation> findHeadquarters(@Param("tenantId") UUID tenantId);

    @Query("SELECT o FROM OfficeLocation o WHERE o.tenantId = :tenantId AND o.city = :city AND o.isActive = true")
    List<OfficeLocation> findByCity(@Param("tenantId") UUID tenantId, @Param("city") String city);

    @Query("SELECT COUNT(o) FROM OfficeLocation o WHERE o.tenantId = :tenantId AND o.isActive = true")
    Long countActiveLocations(@Param("tenantId") UUID tenantId);
}
