package com.hrms.infrastructure.statutory.repository;

import com.hrms.domain.statutory.ProvidentFundConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProvidentFundConfigRepository extends JpaRepository<ProvidentFundConfig, UUID> {
    List<ProvidentFundConfig> findByTenantIdAndIsActiveTrue(UUID tenantId);

    Optional<ProvidentFundConfig> findByTenantIdAndIsActiveTrueAndEffectiveFromLessThanEqualAndEffectiveToGreaterThanEqual(
            UUID tenantId, LocalDate date1, LocalDate date2);
}
