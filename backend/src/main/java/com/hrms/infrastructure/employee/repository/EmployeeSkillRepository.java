package com.hrms.infrastructure.employee.repository;

import com.hrms.domain.employee.EmployeeSkill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EmployeeSkillRepository extends JpaRepository<EmployeeSkill, UUID> {

    List<EmployeeSkill> findByEmployeeIdAndTenantId(UUID employeeId, UUID tenantId);

    Optional<EmployeeSkill> findByEmployeeIdAndSkillNameAndTenantId(UUID employeeId, String skillName, UUID tenantId);

    @Query("SELECT s FROM EmployeeSkill s WHERE s.tenantId = :tenantId AND s.skillName LIKE %:name%")
    List<EmployeeSkill> searchBySkillName(@Param("tenantId") UUID tenantId, @Param("name") String name);

    void deleteByEmployeeIdAndTenantId(UUID employeeId, UUID tenantId);
}
