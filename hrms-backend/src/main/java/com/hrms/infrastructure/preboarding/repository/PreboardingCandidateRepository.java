package com.hrms.infrastructure.preboarding.repository;

import com.hrms.domain.preboarding.PreboardingCandidate;
import com.hrms.domain.preboarding.PreboardingCandidate.PreboardingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PreboardingCandidateRepository extends JpaRepository<PreboardingCandidate, UUID> {

    Optional<PreboardingCandidate> findByAccessToken(String accessToken);

    Optional<PreboardingCandidate> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<PreboardingCandidate> findByEmailAndTenantId(String email, UUID tenantId);

    Page<PreboardingCandidate> findByTenantId(UUID tenantId, Pageable pageable);

    Page<PreboardingCandidate> findByTenantIdAndStatus(UUID tenantId, PreboardingStatus status, Pageable pageable);

    List<PreboardingCandidate> findByTenantIdAndExpectedJoiningDateBetween(
            UUID tenantId, LocalDate startDate, LocalDate endDate);

    Long countByTenantIdAndStatus(UUID tenantId, PreboardingStatus status);

    boolean existsByEmailAndTenantId(String email, UUID tenantId);
}
