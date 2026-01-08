package com.nulogic.hrms.iam.repo;

import com.nulogic.hrms.iam.model.PermissionGroup;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PermissionGroupRepository extends JpaRepository<PermissionGroup, UUID> {
    Optional<PermissionGroup> findByOrg_IdAndName(UUID orgId, String name);

    @EntityGraph(attributePaths = {"permissions"})
    List<PermissionGroup> findByOrg_Id(UUID orgId);

    @EntityGraph(attributePaths = {"permissions"})
    Optional<PermissionGroup> findWithPermissionsByOrg_IdAndId(UUID orgId, UUID id);
}
