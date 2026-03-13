package com.hrms.domain.document;

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
public interface DocumentAccessRepository extends JpaRepository<DocumentAccess, UUID> {

    List<DocumentAccess> findByTenantIdAndDocumentId(UUID tenantId, UUID documentId);

    Optional<DocumentAccess> findByTenantIdAndDocumentIdAndUserId(UUID tenantId, UUID documentId, UUID userId);

    Page<DocumentAccess> findByDocumentId(UUID documentId, Pageable pageable);

    Page<DocumentAccess> findByTenantIdAndDocumentId(UUID tenantId, UUID documentId, Pageable pageable);

    List<DocumentAccess> findByUserId(UUID userId);

    List<DocumentAccess> findByRoleId(UUID roleId);

    List<DocumentAccess> findByDepartmentId(UUID departmentId);

    @Query("SELECT da FROM DocumentAccess da WHERE da.documentId = :documentId AND " +
           "((da.userId = :userId) OR (da.roleId IN :roleIds) OR (da.departmentId = :departmentId)) AND " +
           "da.isActive = true AND (da.expiresAt IS NULL OR da.expiresAt > CURRENT_TIMESTAMP)")
    List<DocumentAccess> findAccessibleByUserOrRoleOrDepartment(
            @Param("documentId") UUID documentId,
            @Param("userId") UUID userId,
            @Param("roleIds") List<UUID> roleIds,
            @Param("departmentId") UUID departmentId);
}
