package com.hrms.infrastructure.recruitment.repository;

import com.hrms.domain.recruitment.InterviewScorecard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InterviewScorecardRepository extends JpaRepository<InterviewScorecard, UUID> {

    Optional<InterviewScorecard> findByIdAndTenantId(UUID id, UUID tenantId);

    List<InterviewScorecard> findByTenantIdAndInterviewId(UUID tenantId, UUID interviewId);

    List<InterviewScorecard> findByTenantIdAndApplicantId(UUID tenantId, UUID applicantId);

    List<InterviewScorecard> findByTenantIdAndInterviewerIdAndStatus(UUID tenantId, UUID interviewerId,
                                                                     InterviewScorecard.ScorecardStatus status);
}
