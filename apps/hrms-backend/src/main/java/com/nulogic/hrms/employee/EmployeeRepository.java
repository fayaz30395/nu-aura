package com.nulogic.hrms.employee;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EmployeeRepository extends JpaRepository<Employee, UUID> {
    Optional<Employee> findByOrg_IdAndOfficialEmail(UUID orgId, String officialEmail);

    Optional<Employee> findByOrg_IdAndUser_Id(UUID orgId, UUID userId);

    Optional<Employee> findByOrg_IdAndEmployeeCode(UUID orgId, String employeeCode);

    Page<Employee> findByOrg_Id(UUID orgId, Pageable pageable);

    Page<Employee> findByOrg_IdAndDepartmentId(UUID orgId, UUID departmentId, Pageable pageable);

    Page<Employee> findByOrg_IdAndManager_Id(UUID orgId, UUID managerId, Pageable pageable);

    Page<Employee> findByOrg_IdAndUser_Id(UUID orgId, UUID userId, Pageable pageable);
}
