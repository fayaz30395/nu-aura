package com.hrms.infrastructure.attendance.repository;

import com.hrms.domain.attendance.RestrictedHolidayPolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface RestrictedHolidayPolicyRepository extends JpaRepository<RestrictedHolidayPolicy, UUID> {

    Optional<RestrictedHolidayPolicy> findByTenantIdAndYearAndIsActiveTrue(UUID tenantId, Integer year);

    Optional<RestrictedHolidayPolicy> findByTenantIdAndYear(UUID tenantId, Integer year);

    boolean existsByTenantIdAndYear(UUID tenantId, Integer year);
}
