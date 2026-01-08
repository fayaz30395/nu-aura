package com.nulogic.hrms.leave;

import java.time.LocalDate;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, UUID> {
    boolean existsByOrg_IdAndEmployee_IdAndStatusNotAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            UUID orgId, UUID employeeId, LeaveRequestStatus status, LocalDate endDate, LocalDate startDate);

    Page<LeaveRequest> findByOrg_IdAndEmployee_Id(UUID orgId, UUID employeeId, Pageable pageable);

    Page<LeaveRequest> findByOrg_IdAndEmployee_Manager_Id(UUID orgId, UUID managerId, Pageable pageable);

    Page<LeaveRequest> findByOrg_IdAndEmployee_DepartmentId(UUID orgId, UUID departmentId, Pageable pageable);

    Page<LeaveRequest> findByOrg_Id(UUID orgId, Pageable pageable);
}
