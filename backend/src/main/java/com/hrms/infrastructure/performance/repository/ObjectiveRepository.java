package com.hrms.infrastructure.performance.repository;

import com.hrms.domain.performance.Objective;
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
public interface ObjectiveRepository extends JpaRepository<Objective, UUID> {

    Page<Objective> findAllByTenantId(UUID tenantId, Pageable pageable);

    List<Objective> findAllByTenantId(UUID tenantId);

    Page<Objective> findAllByTenantIdAndOwnerId(UUID tenantId, UUID ownerId, Pageable pageable);

    Page<Objective> findAllByTenantIdAndCycleId(UUID tenantId, UUID cycleId, Pageable pageable);

    Optional<Objective> findByIdAndTenantId(UUID id, UUID tenantId);

    List<Objective> findAllByTenantIdAndOwnerIdAndStatus(
            UUID tenantId, UUID ownerId, Objective.ObjectiveStatus status);

    @Query("SELECT o FROM Objective o WHERE o.tenantId = :tenantId AND o.level = :level")
    List<Objective> findByLevel(@Param("tenantId") UUID tenantId, @Param("level") Objective.ObjectiveLevel level);

    @Query("SELECT o FROM Objective o WHERE o.tenantId = :tenantId AND o.status = :status")
    List<Objective> findByStatus(@Param("tenantId") UUID tenantId, @Param("status") Objective.ObjectiveStatus status);

    @Query("SELECT o FROM Objective o WHERE o.tenantId = :tenantId AND o.departmentId = :departmentId")
    List<Objective> findByDepartment(@Param("tenantId") UUID tenantId, @Param("departmentId") UUID departmentId);

    @Query("SELECT o FROM Objective o WHERE o.tenantId = :tenantId AND o.ownerId = :ownerId")
    List<Objective> findAllByTenantIdAndOwnerIdList(@Param("tenantId") UUID tenantId, @Param("ownerId") UUID ownerId);

    @Query("SELECT o FROM Objective o WHERE o.tenantId = :tenantId AND o.parentObjectiveId = :parentId")
    List<Objective> findByParentObjective(@Param("tenantId") UUID tenantId, @Param("parentId") UUID parentId);

    @Query("SELECT o FROM Objective o WHERE o.tenantId = :tenantId AND o.departmentId = :departmentId AND o.status = 'ACTIVE'")
    List<Objective> findActiveDepartmentObjectives(@Param("tenantId") UUID tenantId,
                                                   @Param("departmentId") UUID departmentId);

    @Query("SELECT o FROM Objective o WHERE o.tenantId = :tenantId AND o.teamId = :teamId AND o.status = 'ACTIVE'")
    List<Objective> findActiveTeamObjectives(@Param("tenantId") UUID tenantId, @Param("teamId") UUID teamId);

    @Query("SELECT COUNT(o) FROM Objective o WHERE o.tenantId = :tenantId AND o.ownerId = :ownerId AND o.status IN ('ACTIVE', 'ON_TRACK', 'AT_RISK', 'BEHIND')")
    Long countActiveByOwner(@Param("tenantId") UUID tenantId, @Param("ownerId") UUID ownerId);
}
