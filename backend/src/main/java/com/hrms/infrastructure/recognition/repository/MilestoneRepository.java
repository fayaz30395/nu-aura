package com.hrms.infrastructure.recognition.repository;

import com.hrms.domain.recognition.Milestone;
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
public interface MilestoneRepository extends JpaRepository<Milestone, UUID> {

    Optional<Milestone> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<Milestone> findByEmployeeIdAndTenantId(UUID employeeId, UUID tenantId, Pageable pageable);

    @Query("SELECT m FROM Milestone m WHERE m.tenantId = :tenantId AND m.milestoneDate = :date")
    List<Milestone> findByDate(@Param("tenantId") UUID tenantId, @Param("date") LocalDate date);

    @Query("SELECT m FROM Milestone m WHERE m.tenantId = :tenantId " +
            "AND m.milestoneDate BETWEEN :startDate AND :endDate ORDER BY m.milestoneDate")
    List<Milestone> findUpcoming(@Param("tenantId") UUID tenantId,
                                 @Param("startDate") LocalDate startDate,
                                 @Param("endDate") LocalDate endDate);

    @Query("SELECT m FROM Milestone m WHERE m.tenantId = :tenantId " +
            "AND m.type = :type AND m.milestoneDate BETWEEN :startDate AND :endDate")
    List<Milestone> findByTypeAndDateRange(@Param("tenantId") UUID tenantId,
                                           @Param("type") Milestone.MilestoneType type,
                                           @Param("startDate") LocalDate startDate,
                                           @Param("endDate") LocalDate endDate);

    @Query("SELECT m FROM Milestone m WHERE m.tenantId = :tenantId " +
            "AND m.notificationSent = false AND m.milestoneDate <= :date")
    List<Milestone> findPendingNotifications(@Param("tenantId") UUID tenantId, @Param("date") LocalDate date);
}
