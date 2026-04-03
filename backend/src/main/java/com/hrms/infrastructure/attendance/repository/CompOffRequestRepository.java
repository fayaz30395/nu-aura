package com.hrms.infrastructure.attendance.repository;

import com.hrms.domain.attendance.CompOffRequest;
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
public interface CompOffRequestRepository extends JpaRepository<CompOffRequest, UUID> {

    Optional<CompOffRequest> findByTenantIdAndEmployeeIdAndAttendanceDate(
            UUID tenantId, UUID employeeId, LocalDate attendanceDate);

    Page<CompOffRequest> findAllByTenantId(UUID tenantId, Pageable pageable);

    Page<CompOffRequest> findAllByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId, Pageable pageable);

    Page<CompOffRequest> findAllByTenantIdAndStatus(
            UUID tenantId, CompOffRequest.CompOffStatus status, Pageable pageable);

    @Query("SELECT c FROM CompOffRequest c WHERE c.tenantId = :tenantId " +
            "AND c.employeeId = :employeeId AND c.status = 'PENDING'")
    List<CompOffRequest> findPendingByEmployee(@Param("tenantId") UUID tenantId,
                                               @Param("employeeId") UUID employeeId);

    @Query("SELECT c FROM CompOffRequest c WHERE c.tenantId = :tenantId " +
            "AND c.attendanceDate BETWEEN :start AND :end AND c.status = 'PENDING'")
    List<CompOffRequest> findPendingInDateRange(@Param("tenantId") UUID tenantId,
                                                @Param("start") LocalDate start,
                                                @Param("end") LocalDate end);

    boolean existsByTenantIdAndEmployeeIdAndAttendanceDate(UUID tenantId, UUID employeeId, LocalDate date);
}
