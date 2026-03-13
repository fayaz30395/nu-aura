package com.hrms.infrastructure.knowledge.repository;

import com.hrms.domain.knowledge.KnowledgeSearch;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface KnowledgeSearchRepository extends JpaRepository<KnowledgeSearch, UUID> {

    Page<KnowledgeSearch> findByTenantId(UUID tenantId, Pageable pageable);

    Page<KnowledgeSearch> findByTenantIdAndQuery(UUID tenantId, String query, Pageable pageable);

    @Query("SELECT ks FROM KnowledgeSearch ks WHERE ks.tenantId = :tenantId " +
           "ORDER BY COUNT(ks.query) DESC")
    Page<KnowledgeSearch> findPopularSearchesByTenant(@Param("tenantId") UUID tenantId, Pageable pageable);

    long countByTenantId(UUID tenantId);
}
