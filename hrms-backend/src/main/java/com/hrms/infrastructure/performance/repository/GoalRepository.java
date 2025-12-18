package com.hrms.infrastructure.performance.repository;

import com.hrms.domain.performance.Goal;
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
public interface GoalRepository extends JpaRepository<Goal, UUID> {

    Optional<Goal> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<Goal> findAllByTenantId(UUID tenantId, Pageable pageable);

    List<Goal> findAllByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId);

    List<Goal> findAllByTenantIdAndParentGoalId(UUID tenantId, UUID parentGoalId);

    @Query("SELECT g FROM Goal g WHERE g.tenantId = :tenantId AND g.employeeId IN " +
           "(SELECT e.id FROM Employee e WHERE e.managerId = :managerId)")
    List<Goal> findTeamGoals(@Param("tenantId") UUID tenantId, @Param("managerId") UUID managerId);

    @Query("SELECT g FROM Goal g WHERE g.tenantId = :tenantId AND g.status = :status")
    List<Goal> findByStatus(@Param("tenantId") UUID tenantId, @Param("status") Goal.GoalStatus status);

    @Query("SELECT COUNT(g) FROM Goal g WHERE g.tenantId = :tenantId AND g.status = 'COMPLETED'")
    long countCompletedGoals(@Param("tenantId") UUID tenantId);

    @Query("SELECT AVG(g.progressPercentage) FROM Goal g WHERE g.tenantId = :tenantId AND g.status = 'ACTIVE'")
    Double getAverageProgress(@Param("tenantId") UUID tenantId);
}
