package com.nulogic.infrastructure.payroll.repository;

import com.nulogic.domain.payroll.StatutoryFilingRun;
import com.nulogic.domain.payroll.StatutoryFilingTemplate.FilingType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StatutoryFilingRunRepository extends JpaRepository<StatutoryFilingRun, UUID> {

    Optional<StatutoryFilingRun> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<StatutoryFilingRun> findByTenantIdOrderByCreatedAtDesc(UUID tenantId, Pageable pageable);

    Page<StatutoryFilingRun> findByTenantIdAndFilingTypeOrderByCreatedAtDesc(
            UUID tenantId, FilingType filingType, Pageable pageable);

    List<StatutoryFilingRun> findByTenantIdAndFilingTypeAndPeriodYear(
            UUID tenantId, FilingType filingType, Integer periodYear);

    List<StatutoryFilingRun> findByTenantIdAndFilingTypeAndPeriodMonthAndPeriodYear(
            UUID tenantId, FilingType filingType, Integer periodMonth, Integer periodYear);
}
