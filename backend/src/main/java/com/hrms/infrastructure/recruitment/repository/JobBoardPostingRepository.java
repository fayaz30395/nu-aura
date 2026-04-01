package com.hrms.infrastructure.recruitment.repository;

import com.hrms.domain.recruitment.JobBoardPosting;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface JobBoardPostingRepository extends JpaRepository<JobBoardPosting, UUID> {

    Optional<JobBoardPosting> findByTenantIdAndJobOpeningIdAndBoardName(
            UUID tenantId, UUID jobOpeningId, JobBoardPosting.JobBoard boardName);

    List<JobBoardPosting> findAllByTenantIdAndJobOpeningId(UUID tenantId, UUID jobOpeningId);

    Page<JobBoardPosting> findAllByTenantId(UUID tenantId, Pageable pageable);

    Page<JobBoardPosting> findAllByTenantIdAndStatus(
            UUID tenantId, JobBoardPosting.PostingStatus status, Pageable pageable);

    List<JobBoardPosting> findAllByTenantIdAndBoardName(UUID tenantId, JobBoardPosting.JobBoard boardName);

    @Query("SELECT p FROM JobBoardPosting p WHERE p.tenantId = :tenantId " +
           "AND p.status = 'ACTIVE' AND p.expiresAt < :now")
    List<JobBoardPosting> findExpiredPostings(@Param("tenantId") UUID tenantId,
                                              @Param("now") LocalDateTime now);

    @Query("SELECT p FROM JobBoardPosting p WHERE p.status = 'ACTIVE' AND p.expiresAt < :now")
    List<JobBoardPosting> findAllExpiredPostings(@Param("now") LocalDateTime now);

    boolean existsByTenantIdAndJobOpeningIdAndBoardName(
            UUID tenantId, UUID jobOpeningId, JobBoardPosting.JobBoard boardName);
}
