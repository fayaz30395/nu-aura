package com.hrms.infrastructure.recruitment.repository;

import com.hrms.domain.recruitment.AgencySubmission;
import com.hrms.domain.recruitment.AgencySubmission.SubmissionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AgencySubmissionRepository extends JpaRepository<AgencySubmission, UUID>, JpaSpecificationExecutor<AgencySubmission> {

    Page<AgencySubmission> findByTenantIdAndAgencyId(UUID tenantId, UUID agencyId, Pageable pageable);

    Page<AgencySubmission> findByTenantIdAndJobOpeningId(UUID tenantId, UUID jobOpeningId, Pageable pageable);

    Page<AgencySubmission> findByTenantIdAndCandidateId(UUID tenantId, UUID candidateId, Pageable pageable);

    long countByTenantIdAndAgencyIdAndStatus(UUID tenantId, UUID agencyId, SubmissionStatus status);

    Optional<AgencySubmission> findByIdAndTenantId(UUID id, UUID tenantId);

    @Query("SELECT COUNT(s) FROM AgencySubmission s WHERE s.tenantId = :tenantId AND s.agencyId = :agencyId")
    long countByTenantIdAndAgencyId(@Param("tenantId") UUID tenantId, @Param("agencyId") UUID agencyId);
}
