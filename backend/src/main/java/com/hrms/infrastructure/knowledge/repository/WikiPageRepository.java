package com.hrms.infrastructure.knowledge.repository;

import com.hrms.domain.knowledge.WikiPage;
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
public interface WikiPageRepository extends JpaRepository<WikiPage, UUID>, JpaSpecificationExecutor<WikiPage> {

    Optional<WikiPage> findByTenantIdAndSlug(UUID tenantId, String slug);

    Optional<WikiPage> findByTenantIdAndSpaceIdAndSlug(UUID tenantId, UUID spaceId, String slug);

    Page<WikiPage> findByTenantIdAndSpaceId(UUID tenantId, UUID spaceId, Pageable pageable);

    Page<WikiPage> findByTenantIdAndStatus(UUID tenantId, WikiPage.PageStatus status, Pageable pageable);

    List<WikiPage> findByTenantIdAndParentPageId(UUID tenantId, UUID parentPageId);

    Page<WikiPage> findByTenantId(UUID tenantId, Pageable pageable);

    @Query("SELECT wp FROM WikiPage wp WHERE wp.tenantId = :tenantId AND wp.isPinned = true " +
           "ORDER BY wp.pinnedAt DESC")
    List<WikiPage> findPinnedPagesByTenant(@Param("tenantId") UUID tenantId);

    @Query(value = "SELECT wp.* FROM wiki_pages wp " +
           "WHERE wp.tenant_id = :tenantId AND " +
           "to_tsvector('english', wp.title || ' ' || COALESCE(wp.excerpt, '')) @@ " +
           "to_tsquery('english', :query) " +
           "ORDER BY ts_rank(to_tsvector('english', wp.title || ' ' || COALESCE(wp.excerpt, '')), " +
           "to_tsquery('english', :query)) DESC",
           nativeQuery = true,
           countQuery = "SELECT COUNT(*) FROM wiki_pages wp " +
                   "WHERE wp.tenant_id = :tenantId AND " +
                   "to_tsvector('english', wp.title || ' ' || COALESCE(wp.excerpt, '')) @@ " +
                   "to_tsquery('english', :query)")
    Page<WikiPage> searchByTenant(@Param("tenantId") UUID tenantId, @Param("query") String query, Pageable pageable);

    long countByTenantIdAndSpaceId(UUID tenantId, UUID spaceId);

    boolean existsByTenantIdAndSlug(UUID tenantId, String slug);
}
