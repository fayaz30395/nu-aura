package com.nulogic.infrastructure.attendance.repository;

import com.nulogic.domain.attendance.AttendanceWorkRequest;
import com.nulogic.domain.attendance.AttendanceWorkRequest.RequestType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AttendanceWorkRequestRepository
        extends JpaRepository<AttendanceWorkRequest, UUID>, JpaSpecificationExecutor<AttendanceWorkRequest> {

    Optional<AttendanceWorkRequest> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<AttendanceWorkRequest> findAllByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId, Pageable pageable);

    /** True when a PENDING or APPROVED request of the same type already covers any day in the range. */
    @Query("SELECT COUNT(r) > 0 FROM AttendanceWorkRequest r WHERE r.tenantId = :tenantId "
            + "AND r.employeeId = :employeeId AND r.requestType = :type "
            + "AND r.status IN ('PENDING', 'APPROVED') AND r.startDate <= :end AND r.endDate >= :start")
    boolean existsOverlapping(@Param("tenantId") UUID tenantId, @Param("employeeId") UUID employeeId,
                              @Param("type") RequestType type, @Param("start") LocalDate start,
                              @Param("end") LocalDate end);
}
