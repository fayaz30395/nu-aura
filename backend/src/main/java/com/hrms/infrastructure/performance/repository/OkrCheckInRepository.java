package com.hrms.infrastructure.performance.repository;

import com.hrms.domain.performance.OkrCheckIn;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface OkrCheckInRepository extends JpaRepository<OkrCheckIn, UUID> {

    Page<OkrCheckIn> findAllByObjectiveId(UUID objectiveId, Pageable pageable);

    Page<OkrCheckIn> findAllByKeyResultId(UUID keyResultId, Pageable pageable);

    List<OkrCheckIn> findAllByTenantIdAndEmployeeIdAndCheckInDateBetween(
            UUID tenantId, UUID employeeId, LocalDateTime start, LocalDateTime end);

    @Query("SELECT c FROM OkrCheckIn c WHERE c.objectiveId = :objectiveId ORDER BY c.checkInDate DESC")
    List<OkrCheckIn> findRecentByObjective(@Param("objectiveId") UUID objectiveId, Pageable pageable);

    @Query("SELECT COUNT(c) FROM OkrCheckIn c WHERE c.tenantId = :tenantId AND c.employeeId = :employeeId AND c.checkInDate >= :since")
    Long countCheckInsSince(@Param("tenantId") UUID tenantId, @Param("employeeId") UUID employeeId, @Param("since") LocalDateTime since);

    List<OkrCheckIn> findAllByTenantIdAndObjectiveIdOrderByCheckInDateDesc(UUID tenantId, UUID objectiveId);

    List<OkrCheckIn> findAllByTenantIdAndKeyResultIdOrderByCheckInDateDesc(UUID tenantId, UUID keyResultId);

    void deleteAllByObjectiveId(UUID objectiveId);

    void deleteAllByKeyResultId(UUID keyResultId);
}
