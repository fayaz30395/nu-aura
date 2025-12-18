package com.hrms.infrastructure.wellness.repository;

import com.hrms.domain.wellness.ChallengeParticipant;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChallengeParticipantRepository extends JpaRepository<ChallengeParticipant, UUID> {

    Optional<ChallengeParticipant> findByIdAndTenantId(UUID id, UUID tenantId);

    @Query("SELECT p FROM ChallengeParticipant p WHERE p.challenge.id = :challengeId AND p.employeeId = :employeeId")
    Optional<ChallengeParticipant> findByChallengeIdAndEmployeeId(@Param("challengeId") UUID challengeId,
                                                                   @Param("employeeId") UUID employeeId);

    @Query("SELECT p FROM ChallengeParticipant p WHERE p.challenge.id = :challengeId")
    List<ChallengeParticipant> findByChallengeId(@Param("challengeId") UUID challengeId);

    List<ChallengeParticipant> findByEmployeeId(UUID employeeId);

    @Query("SELECT p FROM ChallengeParticipant p WHERE p.challenge.id = :challengeId " +
           "AND p.status = 'ACTIVE' ORDER BY p.totalProgress DESC")
    List<ChallengeParticipant> findLeaderboard(@Param("challengeId") UUID challengeId, Pageable pageable);

    @Query("SELECT p FROM ChallengeParticipant p WHERE p.challenge.id = :challengeId " +
           "AND p.teamId = :teamId AND p.status = 'ACTIVE'")
    List<ChallengeParticipant> findTeamMembers(@Param("challengeId") UUID challengeId, @Param("teamId") UUID teamId);

    @Query("SELECT p.teamId, p.teamName, SUM(p.totalProgress) as teamProgress FROM ChallengeParticipant p " +
           "WHERE p.challenge.id = :challengeId AND p.teamId IS NOT NULL AND p.status = 'ACTIVE' " +
           "GROUP BY p.teamId, p.teamName ORDER BY teamProgress DESC")
    List<Object[]> getTeamLeaderboard(@Param("challengeId") UUID challengeId);

    @Query("SELECT COUNT(p) FROM ChallengeParticipant p WHERE p.challenge.id = :challengeId AND p.status = 'ACTIVE'")
    long countActiveParticipants(@Param("challengeId") UUID challengeId);

    @Query("SELECT COUNT(p) FROM ChallengeParticipant p WHERE p.challenge.id = :challengeId AND p.goalAchieved = true")
    long countGoalAchievers(@Param("challengeId") UUID challengeId);

    @Query("SELECT AVG(p.completionPercentage) FROM ChallengeParticipant p WHERE p.challenge.id = :challengeId AND p.status = 'ACTIVE'")
    Double getAverageCompletion(@Param("challengeId") UUID challengeId);

    @Query("SELECT p FROM ChallengeParticipant p WHERE p.employeeId = :employeeId AND p.status = 'ACTIVE'")
    List<ChallengeParticipant> findActiveParticipations(@Param("employeeId") UUID employeeId);
}
