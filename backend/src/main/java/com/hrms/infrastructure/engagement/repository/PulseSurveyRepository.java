package com.hrms.infrastructure.engagement.repository;

import com.hrms.domain.engagement.PulseSurvey;
import com.hrms.domain.engagement.PulseSurvey.SurveyStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PulseSurveyRepository extends JpaRepository<PulseSurvey, UUID> {

    Optional<PulseSurvey> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<PulseSurvey> findAllByTenantId(UUID tenantId, Pageable pageable);

    Page<PulseSurvey> findAllByTenantIdAndStatus(UUID tenantId, SurveyStatus status, Pageable pageable);

    List<PulseSurvey> findAllByTenantIdAndStatus(UUID tenantId, SurveyStatus status);

    @Query("SELECT s FROM PulseSurvey s WHERE s.tenantId = :tenantId " +
            "AND s.status = 'ACTIVE' AND :today BETWEEN s.startDate AND s.endDate")
    List<PulseSurvey> findActiveSurveys(@Param("tenantId") UUID tenantId, @Param("today") LocalDate today);

    @Query("SELECT s FROM PulseSurvey s WHERE s.tenantId = :tenantId " +
            "AND s.status = 'SCHEDULED' AND s.startDate <= :today")
    List<PulseSurvey> findScheduledSurveysToActivate(@Param("tenantId") UUID tenantId, @Param("today") LocalDate today);

    @Query("SELECT s FROM PulseSurvey s WHERE s.tenantId = :tenantId " +
            "AND s.status = 'ACTIVE' AND s.endDate < :today")
    List<PulseSurvey> findActiveSurveysToClose(@Param("tenantId") UUID tenantId, @Param("today") LocalDate today);

    @Query("SELECT s FROM PulseSurvey s WHERE s.tenantId = :tenantId " +
            "AND s.status = 'ACTIVE' AND s.reminderEnabled = true " +
            "AND s.endDate > :today")
    List<PulseSurvey> findSurveysForReminder(@Param("tenantId") UUID tenantId, @Param("today") LocalDate today);

    @Query("SELECT AVG(s.averageScore) FROM PulseSurvey s WHERE s.tenantId = :tenantId " +
            "AND s.status = 'COMPLETED' AND s.surveyType = :type")
    Double getAverageScoreByType(@Param("tenantId") UUID tenantId, @Param("type") PulseSurvey.SurveyType type);

    @Query("SELECT COUNT(s) FROM PulseSurvey s WHERE s.tenantId = :tenantId AND s.status = :status")
    Long countByStatus(@Param("tenantId") UUID tenantId, @Param("status") SurveyStatus status);

    boolean existsByTitleAndTenantId(String title, UUID tenantId);

    @Query("SELECT s FROM PulseSurvey s WHERE s.tenantId = :tenantId " +
            "AND s.isTemplate = true AND s.isDeleted = false ORDER BY s.templateCategory, s.templateName")
    List<PulseSurvey> findAllTemplates(@Param("tenantId") UUID tenantId);

    @Query("SELECT s FROM PulseSurvey s WHERE s.tenantId = :tenantId " +
            "AND s.isTemplate = true AND s.templateCategory = :category AND s.isDeleted = false")
    List<PulseSurvey> findTemplatesByCategory(@Param("tenantId") UUID tenantId, @Param("category") String category);
}
