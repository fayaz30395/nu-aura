package com.hrms.infrastructure.wellness.repository;

import com.hrms.domain.wellness.WellnessChallenge;
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
public interface WellnessChallengeRepository extends JpaRepository<WellnessChallenge, UUID> {

    Optional<WellnessChallenge> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<WellnessChallenge> findByTenantId(UUID tenantId, Pageable pageable);

    List<WellnessChallenge> findByProgramId(UUID programId);

    @Query("SELECT c FROM WellnessChallenge c WHERE c.tenantId = :tenantId AND c.isActive = true " +
           "AND c.startDate <= :date AND c.endDate >= :date")
    List<WellnessChallenge> findActiveChallenges(@Param("tenantId") UUID tenantId, @Param("date") LocalDate date);

    @Query("SELECT c FROM WellnessChallenge c WHERE c.tenantId = :tenantId AND c.isActive = true " +
           "AND c.startDate > :date ORDER BY c.startDate")
    List<WellnessChallenge> findUpcomingChallenges(@Param("tenantId") UUID tenantId, @Param("date") LocalDate date);

    @Query("SELECT c FROM WellnessChallenge c WHERE c.tenantId = :tenantId AND c.challengeType = :type AND c.isActive = true")
    List<WellnessChallenge> findByChallengeType(@Param("tenantId") UUID tenantId,
                                                 @Param("type") WellnessChallenge.ChallengeType type);

    @Query("SELECT c FROM WellnessChallenge c WHERE c.tenantId = :tenantId AND c.isTeamBased = true AND c.isActive = true")
    List<WellnessChallenge> findTeamChallenges(@Param("tenantId") UUID tenantId);

    @Query("SELECT COUNT(c) FROM WellnessChallenge c WHERE c.tenantId = :tenantId AND c.isActive = true")
    long countActiveChallenges(@Param("tenantId") UUID tenantId);
}
