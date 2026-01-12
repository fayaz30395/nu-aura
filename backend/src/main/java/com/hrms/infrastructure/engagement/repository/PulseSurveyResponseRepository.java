package com.hrms.infrastructure.engagement.repository;

import com.hrms.domain.engagement.PulseSurveyResponse;
import com.hrms.domain.engagement.PulseSurveyResponse.ResponseStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PulseSurveyResponseRepository extends JpaRepository<PulseSurveyResponse, UUID> {

    Optional<PulseSurveyResponse> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<PulseSurveyResponse> findBySurveyIdAndEmployeeId(UUID surveyId, UUID employeeId);

    Page<PulseSurveyResponse> findAllBySurveyId(UUID surveyId, Pageable pageable);

    List<PulseSurveyResponse> findAllBySurveyIdAndStatus(UUID surveyId, ResponseStatus status);

    @Query("SELECT COUNT(r) FROM PulseSurveyResponse r WHERE r.surveyId = :surveyId AND r.status = :status")
    Long countBySurveyIdAndStatus(@Param("surveyId") UUID surveyId, @Param("status") ResponseStatus status);

    @Query("SELECT AVG(r.overallScore) FROM PulseSurveyResponse r " +
            "WHERE r.surveyId = :surveyId AND r.status = 'SUBMITTED'")
    Double getAverageScoreBySurveyId(@Param("surveyId") UUID surveyId);

    @Query("SELECT AVG(r.timeSpentSeconds) FROM PulseSurveyResponse r " +
            "WHERE r.surveyId = :surveyId AND r.status = 'SUBMITTED'")
    Double getAverageTimeSpentBySurveyId(@Param("surveyId") UUID surveyId);

    @Query("SELECT r.deviceType, COUNT(r) FROM PulseSurveyResponse r " +
            "WHERE r.surveyId = :surveyId AND r.status = 'SUBMITTED' GROUP BY r.deviceType")
    List<Object[]> getDeviceDistribution(@Param("surveyId") UUID surveyId);

    boolean existsBySurveyIdAndEmployeeId(UUID surveyId, UUID employeeId);

    @Query("SELECT r FROM PulseSurveyResponse r WHERE r.surveyId = :surveyId " +
            "AND r.status = 'IN_PROGRESS' AND r.startedAt < :abandonedBefore")
    List<PulseSurveyResponse> findAbandonedResponses(@Param("surveyId") UUID surveyId, @Param("abandonedBefore") java.time.LocalDateTime abandonedBefore);

    // For anonymous aggregation - no employee info returned
    @Query("SELECT r.overallScore FROM PulseSurveyResponse r " +
            "WHERE r.surveyId = :surveyId AND r.status = 'SUBMITTED'")
    List<Double> getAllScoresBySurveyId(@Param("surveyId") UUID surveyId);
}
