package com.nulogic.hrms.attendance;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RegularizationRequestRepository extends JpaRepository<RegularizationRequest, UUID> {
    boolean existsByAttendanceDay_IdAndStatus(UUID attendanceDayId, RegularizationStatus status);
    Page<RegularizationRequest> findByOrg_IdAndEmployee_Id(UUID orgId, UUID employeeId, Pageable pageable);

    Page<RegularizationRequest> findByOrg_IdAndEmployee_Manager_Id(UUID orgId, UUID managerId, Pageable pageable);

    Page<RegularizationRequest> findByOrg_IdAndEmployee_DepartmentId(UUID orgId, UUID departmentId, Pageable pageable);

    Page<RegularizationRequest> findByOrg_Id(UUID orgId, Pageable pageable);
}
