package com.hrms.infrastructure.statutory.repository;
import com.hrms.domain.statutory.TDSSlab;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public interface TDSSlabRepository extends JpaRepository<TDSSlab, UUID> {
    List<TDSSlab> findByTenantIdAndAssessmentYearAndTaxRegimeAndIsActiveTrue(
        UUID tenantId, String assessmentYear, TDSSlab.TaxRegime taxRegime);
}
