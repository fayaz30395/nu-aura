package com.nulogic.hrms.iam.repo;

import com.nulogic.hrms.iam.model.Permission;
import com.nulogic.hrms.iam.model.PermissionScope;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PermissionRepository extends JpaRepository<Permission, UUID> {
    Optional<Permission> findByModuleAndActionAndScope(String module, String action, PermissionScope scope);
}
