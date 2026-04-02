package com.hrms.infrastructure.user.repository;

import com.hrms.domain.user.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RoleRepository extends JpaRepository<Role, UUID> {

    Optional<Role> findByCodeAndTenantId(String code, UUID tenantId);

    List<Role> findByTenantId(UUID tenantId);

    @Query("SELECT r FROM Role r LEFT JOIN FETCH r.permissions WHERE r.id = :id AND r.tenantId = :tenantId")
    Optional<Role> findByIdAndTenantIdWithPermissions(@Param("id") UUID id, @Param("tenantId") UUID tenantId);

    @Query("SELECT r FROM Role r LEFT JOIN FETCH r.permissions WHERE r.tenantId = :tenantId")
    List<Role> findByTenantIdWithPermissions(@Param("tenantId") UUID tenantId);

    @Query("SELECT r FROM Role r LEFT JOIN FETCH r.permissions WHERE r.tenantId = :tenantId")
    Page<Role> findByTenantIdWithPermissions(@Param("tenantId") UUID tenantId, Pageable pageable);

    boolean existsByCodeAndTenantId(String code, UUID tenantId);

    List<Role> findByCodeInAndTenantId(java.util.Collection<String> codes, UUID tenantId);

    @Query("SELECT COUNT(u) > 0 FROM User u JOIN u.roles r WHERE r.id = :roleId")
    boolean isRoleAssignedToUsers(@Param("roleId") UUID roleId);

    List<Role> findByParentRoleIdAndTenantId(UUID parentRoleId, UUID tenantId);

    @Query("SELECT r FROM Role r WHERE r.parentRoleId = :roleId AND r.tenantId = :tenantId")
    List<Role> findDirectChildren(@Param("roleId") UUID roleId, @Param("tenantId") UUID tenantId);

    @Query(value = """
            WITH RECURSIVE children AS (
              SELECT id FROM roles WHERE parent_role_id = :roleId AND tenant_id = :tenantId
              UNION ALL
              SELECT r.id FROM roles r
              INNER JOIN children c ON r.parent_role_id = c.id
              WHERE r.tenant_id = :tenantId
            )
            SELECT id FROM children LIMIT 100
            """, nativeQuery = true)
    List<UUID> findAllDescendantIds(@Param("roleId") UUID roleId, @Param("tenantId") UUID tenantId);
}
