package com.nulogic.infrastructure.recruitment.repository;

import com.nulogic.domain.recruitment.Interview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InterviewRepository extends JpaRepository<Interview, UUID>, JpaSpecificationExecutor<Interview> {

    Page<Interview> findAllByTenantId(UUID tenantId, Pageable pageable);

    Optional<Interview> findByIdAndTenantId(UUID id, UUID tenantId);

    List<Interview> findByTenantIdAndCandidateId(UUID tenantId, UUID candidateId);

    List<Interview> findByTenantIdAndJobOpeningId(UUID tenantId, UUID jobOpeningId);

    List<Interview> findByTenantIdAndInterviewerId(UUID tenantId, UUID interviewerId);

    List<Interview> findByTenantIdAndStatus(UUID tenantId, Interview.InterviewStatus status);

    @Query("SELECT i FROM Interview i WHERE i.tenantId = :tenantId AND i.scheduledAt BETWEEN :from AND :to " +
            "AND i.status IN ('SCHEDULED', 'RESCHEDULED')")
    List<Interview> findUpcomingBetween(@Param("tenantId") UUID tenantId,
                                         @Param("from") LocalDateTime from,
                                         @Param("to") LocalDateTime to);
}
