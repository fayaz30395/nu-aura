package com.hrms.infrastructure.ai.repository;

import com.hrms.domain.ai.ResumeParsingResult;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ResumeParsingResultRepository extends JpaRepository<ResumeParsingResult, UUID> {

    Optional<ResumeParsingResult> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<ResumeParsingResult> findByTenantId(UUID tenantId, Pageable pageable);

    List<ResumeParsingResult> findByCandidateIdAndTenantId(UUID candidateId, UUID tenantId);

    List<ResumeParsingResult> findByJobApplicationIdAndTenantId(UUID jobApplicationId, UUID tenantId);

    Page<ResumeParsingResult> findByTenantIdAndFullNameContainingIgnoreCase(
            UUID tenantId, String fullName, Pageable pageable);

    void deleteByCandidateIdAndTenantId(UUID candidateId, UUID tenantId);
}
