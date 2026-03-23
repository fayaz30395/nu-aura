package com.hrms.infrastructure.leave.repository;

import com.hrms.domain.leave.LeaveType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LeaveTypeRepository extends JpaRepository<LeaveType, UUID> {

    Optional<LeaveType> findByLeaveCodeAndTenantId(String leaveCode, UUID tenantId);

    Optional<LeaveType> findByLeaveNameAndTenantId(String leaveName, UUID tenantId);

    boolean existsByLeaveCodeAndTenantId(String leaveCode, UUID tenantId);

    Page<LeaveType> findAllByTenantId(UUID tenantId, Pageable pageable);

    Page<LeaveType> findAllByTenantIdAndIsActive(UUID tenantId, Boolean isActive, Pageable pageable);

    List<LeaveType> findAllByTenantIdAndIsActive(UUID tenantId, Boolean isActive);

    Optional<LeaveType> findByIdAndTenantId(UUID id, UUID tenantId);
}
