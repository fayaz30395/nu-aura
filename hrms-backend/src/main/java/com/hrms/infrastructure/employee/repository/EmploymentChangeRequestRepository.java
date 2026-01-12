package com.hrms.infrastructure.employee.repository;

import com.hrms.domain.employee.EmploymentChangeRequest;
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
public interface EmploymentChangeRequestRepository extends JpaRepository<EmploymentChangeRequest, UUID> {

    Optional<EmploymentChangeRequest> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<EmploymentChangeRequest> findAllByTenantId(UUID tenantId, Pageable pageable);

    Page<EmploymentChangeRequest> findAllByTenantIdAndStatus(
            UUID tenantId,
            EmploymentChangeRequest.ChangeRequestStatus status,
            Pageable pageable
    );

    Page<EmploymentChangeRequest> findAllByEmployeeIdAndTenantId(
            UUID employeeId,
            UUID tenantId,
            Pageable pageable
    );

    Page<EmploymentChangeRequest> findAllByRequesterIdAndTenantId(
            UUID requesterId,
            UUID tenantId,
            Pageable pageable
    );

    // Find pending requests for an employee (to prevent duplicate pending requests)
    List<EmploymentChangeRequest> findAllByEmployeeIdAndTenantIdAndStatus(
            UUID employeeId,
            UUID tenantId,
            EmploymentChangeRequest.ChangeRequestStatus status
    );

    // Count pending requests for dashboard
    @Query("SELECT COUNT(r) FROM EmploymentChangeRequest r WHERE r.tenantId = :tenantId AND r.status = 'PENDING'")
    Long countPendingRequests(@Param("tenantId") UUID tenantId);

    // Find all pending requests for HR approval
    @Query("SELECT r FROM EmploymentChangeRequest r WHERE r.tenantId = :tenantId AND r.status = 'PENDING' ORDER BY r.createdAt DESC")
    Page<EmploymentChangeRequest> findPendingRequests(@Param("tenantId") UUID tenantId, Pageable pageable);
}
