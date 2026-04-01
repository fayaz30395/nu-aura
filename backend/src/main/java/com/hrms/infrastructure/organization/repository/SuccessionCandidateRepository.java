package com.hrms.infrastructure.organization.repository;

import com.hrms.domain.organization.SuccessionCandidate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SuccessionCandidateRepository extends JpaRepository<SuccessionCandidate, UUID> {

    Optional<SuccessionCandidate> findByIdAndTenantId(UUID id, UUID tenantId);

    @Query("SELECT c FROM SuccessionCandidate c WHERE c.tenantId = :tenantId AND c.successionPlanId = :planId ORDER BY c.priority")
    List<SuccessionCandidate> findByPlan(@Param("tenantId") UUID tenantId, @Param("planId") UUID planId);

    @Query("SELECT c FROM SuccessionCandidate c WHERE c.tenantId = :tenantId AND c.candidateId = :candidateId")
    List<SuccessionCandidate> findByCandidate(@Param("tenantId") UUID tenantId, @Param("candidateId") UUID candidateId);

    @Query("SELECT c FROM SuccessionCandidate c WHERE c.tenantId = :tenantId AND c.successionPlanId = :planId AND c.readiness = 'READY_NOW' ORDER BY c.priority")
    List<SuccessionCandidate> findReadyNowCandidates(@Param("tenantId") UUID tenantId, @Param("planId") UUID planId);

    boolean existsByTenantIdAndSuccessionPlanIdAndCandidateId(UUID tenantId, UUID planId, UUID candidateId);

    void deleteByTenantIdAndSuccessionPlanIdAndCandidateId(UUID tenantId, UUID planId, UUID candidateId);

    @Query("SELECT c.readiness, COUNT(c) FROM SuccessionCandidate c WHERE c.tenantId = :tenantId GROUP BY c.readiness")
    List<Object[]> countByReadiness(@Param("tenantId") UUID tenantId);
}
