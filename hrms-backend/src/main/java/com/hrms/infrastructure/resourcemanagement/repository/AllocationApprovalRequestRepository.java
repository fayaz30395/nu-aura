package com.hrms.infrastructure.resourcemanagement.repository;

import com.hrms.domain.resourcemanagement.AllocationApprovalRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface AllocationApprovalRequestRepository extends JpaRepository<AllocationApprovalRequest, UUID> {

        Page<AllocationApprovalRequest> findAllByTenantId(UUID tenantId, Pageable pageable);

        Page<AllocationApprovalRequest> findAllByTenantIdAndStatus(UUID tenantId,
                        AllocationApprovalRequest.ApprovalStatus status, Pageable pageable);

        Page<AllocationApprovalRequest> findAllByTenantIdAndApproverIdAndStatus(UUID tenantId, UUID approverId,
                        AllocationApprovalRequest.ApprovalStatus status, Pageable pageable);

        Page<AllocationApprovalRequest> findAllByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId,
                        Pageable pageable);

        long countByTenantIdAndStatus(UUID tenantId, AllocationApprovalRequest.ApprovalStatus status);
}
