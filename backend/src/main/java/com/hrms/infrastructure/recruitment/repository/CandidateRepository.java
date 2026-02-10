package com.hrms.infrastructure.recruitment.repository;

import com.hrms.domain.recruitment.Candidate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CandidateRepository extends JpaRepository<Candidate, UUID>, JpaSpecificationExecutor<Candidate> {

    Optional<Candidate> findByIdAndTenantId(UUID id, UUID tenantId);

    List<Candidate> findByTenantIdAndJobOpeningId(UUID tenantId, UUID jobOpeningId);

    List<Candidate> findByTenantIdAndStatus(UUID tenantId, Candidate.CandidateStatus status);

    List<Candidate> findByTenantIdAndCurrentStage(UUID tenantId, Candidate.RecruitmentStage stage);

    boolean existsByTenantIdAndEmail(UUID tenantId, String email);

    boolean existsByTenantIdAndCandidateCode(UUID tenantId, String candidateCode);

    Optional<Candidate> findByEmailAndTenantId(String email, UUID tenantId);

    // Paginated versions for large datasets
    Page<Candidate> findByTenantId(UUID tenantId, Pageable pageable);

    Page<Candidate> findByTenantIdAndJobOpeningId(UUID tenantId, UUID jobOpeningId, Pageable pageable);

    Page<Candidate> findByTenantIdAndStatus(UUID tenantId, Candidate.CandidateStatus status, Pageable pageable);

    Page<Candidate> findByTenantIdAndCurrentStage(UUID tenantId, Candidate.RecruitmentStage stage, Pageable pageable);

    Page<Candidate> findByTenantIdAndAssignedRecruiterId(UUID tenantId, UUID recruiterId, Pageable pageable);
}
