package com.hrms.infrastructure.recruitment.repository;

import com.hrms.domain.recruitment.Applicant;
import com.hrms.domain.recruitment.ApplicationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ApplicantRepository extends JpaRepository<Applicant, UUID>, JpaSpecificationExecutor<Applicant> {

    List<Applicant> findByTenantId(UUID tenantId);

    List<Applicant> findByJobOpeningIdAndTenantId(UUID jobOpeningId, UUID tenantId);

    List<Applicant> findByCandidateIdAndTenantId(UUID candidateId, UUID tenantId);

    List<Applicant> findByStatusAndTenantId(ApplicationStatus status, UUID tenantId);

    long countByJobOpeningIdAndTenantId(UUID jobOpeningId, UUID tenantId);

    boolean existsByCandidateIdAndJobOpeningIdAndTenantId(UUID candidateId, UUID jobOpeningId, UUID tenantId);
}
