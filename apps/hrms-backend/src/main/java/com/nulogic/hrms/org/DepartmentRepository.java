package com.nulogic.hrms.org;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DepartmentRepository extends JpaRepository<Department, UUID> {
    java.util.List<Department> findByOrg_Id(UUID orgId);
}
