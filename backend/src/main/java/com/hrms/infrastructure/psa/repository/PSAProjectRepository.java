package com.hrms.infrastructure.psa.repository;
import com.hrms.domain.psa.PSAProject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public interface PSAProjectRepository extends JpaRepository<PSAProject, UUID> {
    List<PSAProject> findByTenantIdAndStatus(UUID tenantId, PSAProject.ProjectStatus status);
    List<PSAProject> findByTenantIdAndProjectManagerId(UUID tenantId, UUID projectManagerId);
    Optional<PSAProject> findByProjectCode(String projectCode);
}
