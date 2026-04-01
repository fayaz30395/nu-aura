package com.hrms.infrastructure.knowledge.repository;

import com.hrms.domain.knowledge.BlogCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BlogCategoryRepository extends JpaRepository<BlogCategory, UUID>, JpaSpecificationExecutor<BlogCategory> {

    Optional<BlogCategory> findByTenantIdAndSlug(UUID tenantId, String slug);

    Page<BlogCategory> findByTenantId(UUID tenantId, Pageable pageable);

    @Query("SELECT bc FROM BlogCategory bc WHERE bc.tenantId = :tenantId ORDER BY bc.orderIndex ASC")
    List<BlogCategory> findCategoriesByTenantOrderByIndex(@Param("tenantId") UUID tenantId);

    boolean existsByTenantIdAndSlug(UUID tenantId, String slug);
}
