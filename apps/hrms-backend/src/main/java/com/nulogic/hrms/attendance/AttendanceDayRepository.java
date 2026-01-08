package com.nulogic.hrms.attendance;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AttendanceDayRepository extends JpaRepository<AttendanceDay, UUID> {
    Optional<AttendanceDay> findByOrg_IdAndEmployee_IdAndAttendanceDate(UUID orgId, UUID employeeId, LocalDate date);

    Page<AttendanceDay> findByOrg_IdAndEmployee_Id(UUID orgId, UUID employeeId, Pageable pageable);

    Page<AttendanceDay> findByOrg_IdAndEmployee_Manager_Id(UUID orgId, UUID managerId, Pageable pageable);

    Page<AttendanceDay> findByOrg_IdAndEmployee_DepartmentId(UUID orgId, UUID departmentId, Pageable pageable);

    Page<AttendanceDay> findByOrg_Id(UUID orgId, Pageable pageable);
}
