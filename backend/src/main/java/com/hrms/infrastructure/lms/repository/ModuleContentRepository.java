package com.hrms.infrastructure.lms.repository;

import com.hrms.domain.lms.ModuleContent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ModuleContentRepository extends JpaRepository<ModuleContent, UUID> {

    Optional<ModuleContent> findByIdAndTenantId(UUID id, UUID tenantId);

    @Query("SELECT c FROM ModuleContent c WHERE c.tenantId = :tenantId AND c.moduleId = :moduleId ORDER BY c.orderIndex")
    List<ModuleContent> findByModuleOrdered(@Param("tenantId") UUID tenantId, @Param("moduleId") UUID moduleId);

    void deleteAllByModuleId(UUID moduleId);

    @Query("SELECT COUNT(c) FROM ModuleContent c WHERE c.moduleId = :moduleId")
    Long countByModule(@Param("moduleId") UUID moduleId);
}
