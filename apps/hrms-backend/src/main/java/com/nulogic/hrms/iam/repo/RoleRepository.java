package com.nulogic.hrms.iam.repo;

import com.nulogic.hrms.iam.model.Role;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoleRepository extends JpaRepository<Role, UUID> {
    Optional<Role> findByOrg_IdAndName(UUID orgId, String name);

    @EntityGraph(attributePaths = {"permissions"})
    List<Role> findByOrg_Id(UUID orgId);

    @EntityGraph(attributePaths = {"permissions"})
    Optional<Role> findWithPermissionsByOrg_IdAndId(UUID orgId, UUID id);

    @EntityGraph(attributePaths = {"permissions"})
    List<Role> findByOrg_IdAndIdIn(UUID orgId, List<UUID> ids);
}
