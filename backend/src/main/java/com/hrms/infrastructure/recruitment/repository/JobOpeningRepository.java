package com.hrms.infrastructure.recruitment.repository;

import com.hrms.domain.recruitment.JobOpening;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface JobOpeningRepository extends JpaRepository<JobOpening, UUID>, JpaSpecificationExecutor<JobOpening> {

    Optional<JobOpening> findByIdAndTenantId(UUID id, UUID tenantId);

    List<JobOpening> findByTenantIdAndStatus(UUID tenantId, JobOpening.JobStatus status);

    List<JobOpening> findByTenantIdAndIsActive(UUID tenantId, Boolean isActive);

    boolean existsByTenantIdAndJobCode(UUID tenantId, String jobCode);
}
