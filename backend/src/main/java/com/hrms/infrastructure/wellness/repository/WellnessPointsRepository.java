package com.hrms.infrastructure.wellness.repository;

import com.hrms.domain.wellness.WellnessPoints;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WellnessPointsRepository extends JpaRepository<WellnessPoints, UUID> {

    Optional<WellnessPoints> findByEmployeeIdAndTenantId(UUID employeeId, UUID tenantId);

    @Query("SELECT w FROM WellnessPoints w WHERE w.tenantId = :tenantId ORDER BY w.totalPoints DESC")
    List<WellnessPoints> findTopByPoints(@Param("tenantId") UUID tenantId, Pageable pageable);

    @Query("SELECT w FROM WellnessPoints w WHERE w.tenantId = :tenantId ORDER BY w.challengesCompleted DESC")
    List<WellnessPoints> findTopByChallenges(@Param("tenantId") UUID tenantId, Pageable pageable);

    @Query("SELECT w FROM WellnessPoints w WHERE w.tenantId = :tenantId ORDER BY w.currentStreak DESC")
    List<WellnessPoints> findTopByStreak(@Param("tenantId") UUID tenantId, Pageable pageable);

    @Query("SELECT AVG(w.totalPoints) FROM WellnessPoints w WHERE w.tenantId = :tenantId")
    Double getAveragePoints(@Param("tenantId") UUID tenantId);

    @Query("SELECT SUM(w.totalPoints) FROM WellnessPoints w WHERE w.tenantId = :tenantId")
    Long getTotalPointsAwarded(@Param("tenantId") UUID tenantId);

    @Query("SELECT COUNT(w) FROM WellnessPoints w WHERE w.tenantId = :tenantId AND w.currentLevel >= :level")
    long countByMinLevel(@Param("tenantId") UUID tenantId, @Param("level") Integer level);
}
