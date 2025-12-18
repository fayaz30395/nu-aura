package com.hrms.infrastructure.exit.repository;

import com.hrms.domain.exit.ExitInterview;
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
public interface ExitInterviewRepository extends JpaRepository<ExitInterview, UUID> {

    Optional<ExitInterview> findByExitProcessIdAndTenantId(UUID exitProcessId, UUID tenantId);

    Optional<ExitInterview> findByEmployeeIdAndTenantId(UUID employeeId, UUID tenantId);

    Page<ExitInterview> findByTenantId(UUID tenantId, Pageable pageable);

    List<ExitInterview> findByTenantIdAndStatus(UUID tenantId, ExitInterview.InterviewStatus status);

    @Query("SELECT e FROM ExitInterview e WHERE e.tenantId = :tenantId AND e.interviewerId = :interviewerId")
    List<ExitInterview> findByInterviewer(@Param("tenantId") UUID tenantId, @Param("interviewerId") UUID interviewerId);

    @Query("SELECT e FROM ExitInterview e WHERE e.tenantId = :tenantId AND e.scheduledDate = :date AND e.status = 'SCHEDULED'")
    List<ExitInterview> findScheduledForDate(@Param("tenantId") UUID tenantId, @Param("date") LocalDate date);

    @Query("SELECT e FROM ExitInterview e WHERE e.tenantId = :tenantId AND e.scheduledDate < :date AND e.status = 'SCHEDULED'")
    List<ExitInterview> findOverdue(@Param("tenantId") UUID tenantId, @Param("date") LocalDate date);

    @Query("SELECT e FROM ExitInterview e WHERE e.tenantId = :tenantId AND e.status = 'COMPLETED' AND e.actualDate BETWEEN :startDate AND :endDate")
    List<ExitInterview> findCompletedBetweenDates(
            @Param("tenantId") UUID tenantId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("SELECT e.primaryReasonForLeaving, COUNT(e) FROM ExitInterview e WHERE e.tenantId = :tenantId AND e.status = 'COMPLETED' GROUP BY e.primaryReasonForLeaving ORDER BY COUNT(e) DESC")
    List<Object[]> getLeavingReasonStats(@Param("tenantId") UUID tenantId);

    @Query("SELECT AVG(e.overallExperienceRating) FROM ExitInterview e WHERE e.tenantId = :tenantId AND e.status = 'COMPLETED' AND e.overallExperienceRating IS NOT NULL")
    Double getAverageOverallRating(@Param("tenantId") UUID tenantId);

    @Query("SELECT AVG(e.managementRating) FROM ExitInterview e WHERE e.tenantId = :tenantId AND e.status = 'COMPLETED' AND e.managementRating IS NOT NULL")
    Double getAverageManagementRating(@Param("tenantId") UUID tenantId);

    @Query("SELECT COUNT(e) FROM ExitInterview e WHERE e.tenantId = :tenantId AND e.wouldRecommendCompany = true AND e.status = 'COMPLETED'")
    long countWouldRecommend(@Param("tenantId") UUID tenantId);

    @Query("SELECT COUNT(e) FROM ExitInterview e WHERE e.tenantId = :tenantId AND e.wouldConsiderReturning = true AND e.status = 'COMPLETED'")
    long countWouldReturn(@Param("tenantId") UUID tenantId);

    @Query("SELECT COUNT(e) FROM ExitInterview e WHERE e.tenantId = :tenantId AND e.status = 'COMPLETED'")
    long countCompleted(@Param("tenantId") UUID tenantId);

    Optional<ExitInterview> findByIdAndTenantId(UUID id, UUID tenantId);
}
