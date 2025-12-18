package com.hrms.infrastructure.performance.repository;

import com.hrms.domain.performance.KeyResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface KeyResultRepository extends JpaRepository<KeyResult, UUID> {

    List<KeyResult> findAllByObjectiveId(UUID objectiveId);

    List<KeyResult> findAllByTenantIdAndOwnerId(UUID tenantId, UUID ownerId);

    Optional<KeyResult> findByIdAndTenantId(UUID id, UUID tenantId);

    @Query("SELECT kr FROM KeyResult kr WHERE kr.tenantId = :tenantId AND kr.objectiveId = :objectiveId ORDER BY kr.weight DESC")
    List<KeyResult> findByObjectiveOrderByWeight(@Param("tenantId") UUID tenantId, @Param("objectiveId") UUID objectiveId);

    @Query("SELECT AVG(kr.progressPercentage) FROM KeyResult kr WHERE kr.objectiveId = :objectiveId")
    Double getAverageProgressByObjective(@Param("objectiveId") UUID objectiveId);

    @Query("SELECT COUNT(kr) FROM KeyResult kr WHERE kr.tenantId = :tenantId AND kr.ownerId = :ownerId AND kr.status = 'COMPLETED'")
    Long countCompletedByOwner(@Param("tenantId") UUID tenantId, @Param("ownerId") UUID ownerId);

    void deleteAllByObjectiveId(UUID objectiveId);
}
