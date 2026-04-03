package com.hrms.infrastructure.shift.repository;

import com.hrms.domain.shift.ShiftSwapRequest;
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
public interface ShiftSwapRequestRepository extends JpaRepository<ShiftSwapRequest, UUID> {

    Optional<ShiftSwapRequest> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<ShiftSwapRequest> findAllByTenantId(UUID tenantId, Pageable pageable);

    Page<ShiftSwapRequest> findAllByTenantIdAndRequesterEmployeeId(UUID tenantId, UUID employeeId, Pageable pageable);

    Page<ShiftSwapRequest> findAllByTenantIdAndTargetEmployeeId(UUID tenantId, UUID employeeId, Pageable pageable);

    @Query("SELECT ssr FROM ShiftSwapRequest ssr WHERE ssr.tenantId = :tenantId " +
            "AND (ssr.requesterEmployeeId = :employeeId OR ssr.targetEmployeeId = :employeeId) " +
            "AND ssr.status = :status")
    Page<ShiftSwapRequest> findSwapRequestsForEmployeeByStatus(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId,
            @Param("status") ShiftSwapRequest.SwapStatus status,
            Pageable pageable);

    @Query("SELECT ssr FROM ShiftSwapRequest ssr WHERE ssr.tenantId = :tenantId " +
            "AND ssr.status IN ('PENDING', 'TARGET_ACCEPTED', 'PENDING_APPROVAL')")
    Page<ShiftSwapRequest> findPendingSwapRequests(@Param("tenantId") UUID tenantId, Pageable pageable);

    @Query("SELECT ssr FROM ShiftSwapRequest ssr WHERE ssr.tenantId = :tenantId " +
            "AND ssr.targetEmployeeId = :employeeId " +
            "AND ssr.status = 'PENDING'")
    List<ShiftSwapRequest> findPendingRequestsForTargetEmployee(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId);

    @Query("SELECT ssr FROM ShiftSwapRequest ssr WHERE ssr.tenantId = :tenantId " +
            "AND ssr.status = 'PENDING_APPROVAL'")
    List<ShiftSwapRequest> findRequestsPendingApproval(@Param("tenantId") UUID tenantId);

    @Query("SELECT COUNT(ssr) FROM ShiftSwapRequest ssr WHERE ssr.tenantId = :tenantId " +
            "AND ssr.requesterEmployeeId = :employeeId " +
            "AND ssr.status = 'PENDING'")
    long countPendingRequestsByEmployee(@Param("tenantId") UUID tenantId,
                                        @Param("employeeId") UUID employeeId);
}
