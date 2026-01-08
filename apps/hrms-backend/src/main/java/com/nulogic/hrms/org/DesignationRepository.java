package com.nulogic.hrms.org;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DesignationRepository extends JpaRepository<Designation, UUID> {
    java.util.List<Designation> findByOrg_Id(UUID orgId);
}
