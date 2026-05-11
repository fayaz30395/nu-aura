package com.hrms.infrastructure.knowledge.repository;

import com.hrms.application.knowledge.dto.WikiPageTreeProjection;
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

    List<WikiPage> findByTenantIdAndSpaceIdAndParentPageIsNull(UUID tenantId, UUID spaceId);

    @Query("SELECT COUNT(wp) FROM WikiPage wp WHERE wp.tenantId = :tenantId AND wp.parentPage.id = :parentPageId")
    long countByTenantIdAndParentPageId(@Param("tenantId") UUID tenantId, @Param("parentPageId") UUID parentPageId);

    List<WikiPage> findByTenantIdAndSpaceId(UUID tenantId, UUID spaceId);

    Page<WikiPage> findByTenantId(UUID tenantId, Pageable pageable);

    @Query("SELECT wp FROM WikiPage wp WHERE wp.tenantId = :tenantId AND wp.isPinned = true " +
            "ORDER BY wp.pinnedAt DESC")
    List<WikiPage> findPinnedPagesByTenant(@Param("tenantId") UUID tenantId);

    // Sprint-4 (S4-D): Migrated to V149 STORED `search_vector` (GIN-indexed) — eliminates
    // per-query to_tsvector() recomputation that forced a seq-scan. Added updated_at
    // tiebreaker for recency-stable ordering on ties.
    @Query(value = "SELECT wp.* FROM wiki_pages wp " +
            "WHERE wp.tenant_id = :tenantId " +
            "  AND wp.is_deleted = false " +
            "  AND wp.search_vector @@ websearch_to_tsquery('english', :query) " +
            "ORDER BY ts_rank(wp.search_vector, websearch_to_tsquery('english', :query)) DESC, " +
            "         wp.updated_at DESC",
            nativeQuery = true,
            countQuery = "SELECT COUNT(*) FROM wiki_pages wp " +
                    "WHERE wp.tenant_id = :tenantId " +
                    "  AND wp.is_deleted = false " +
                    "  AND wp.search_vector @@ websearch_to_tsquery('english', :query)")
    Page<WikiPage> searchByTenant(@Param("tenantId") UUID tenantId, @Param("query") String query, Pageable pageable);

    /**
     * Broad ILIKE-based search for RAG retrieval — high recall, LLM handles precision.
     * Searches title, excerpt, AND content body (JSONB cast to TEXT) for any keyword match.
     *
     * <p>Sprint-4 (S4-D) note: V149's GIN index on {@code search_vector} covers the
     * title/excerpt portions of this query, but the {@code CAST(content AS TEXT)} branch
     * still forces a sequential scan of the JSONB column. The OR-with-cast pattern means
     * the planner cannot use the GIN index even for the title/excerpt clauses.
     *
     * <p>TODO (separate sprint): extract a {@code body_text TEXT} generated/maintained column
     * from {@code content} JSONB and include it in {@code search_vector} (or build a parallel
     * GIN index on a tsvector over {@code body_text}). Until then the RAG retriever path
     * remains a seq-scan — acceptable while corpus is small, but will not scale.
     */
    @Query(value = "SELECT wp.* FROM wiki_pages wp " +
            "WHERE wp.tenant_id = :tenantId AND (" +
            "LOWER(wp.title) LIKE LOWER(CONCAT('%', :query, '%')) " +
            "OR LOWER(COALESCE(wp.excerpt, '')) LIKE LOWER(CONCAT('%', :query, '%')) " +
            "OR LOWER(CAST(wp.content AS TEXT)) LIKE LOWER(CONCAT('%', :query, '%'))" +
            ") ORDER BY CASE WHEN LOWER(wp.title) LIKE LOWER(CONCAT('%', :query, '%')) THEN 0 ELSE 1 END, " +
            "wp.updated_at DESC",
            nativeQuery = true,
            countQuery = "SELECT COUNT(*) FROM wiki_pages wp " +
                    "WHERE wp.tenant_id = :tenantId AND (" +
                    "LOWER(wp.title) LIKE LOWER(CONCAT('%', :query, '%')) " +
                    "OR LOWER(COALESCE(wp.excerpt, '')) LIKE LOWER(CONCAT('%', :query, '%')) " +
                    "OR LOWER(CAST(wp.content AS TEXT)) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<WikiPage> searchByTenantBroad(@Param("tenantId") UUID tenantId, @Param("query") String query, Pageable pageable);

    long countByTenantIdAndSpaceId(UUID tenantId, UUID spaceId);

    boolean existsByTenantIdAndSlug(UUID tenantId, String slug);

    /**
     * Lightweight tree-projection query for {@code getPageTree} — does NOT load the
     * heavy {@code content} JSONB column. (Audit Q-P06.) Tenant-scoped.
     */
    @Query("SELECT new com.hrms.application.knowledge.dto.WikiPageTreeProjection(" +
            "p.id, p.title, p.slug, p.status, p.isPinned, p.viewCount, " +
            "CASE WHEN p.parentPage IS NULL THEN NULL ELSE p.parentPage.id END) " +
            "FROM WikiPage p WHERE p.tenantId = :tenantId AND p.space.id = :spaceId " +
            "ORDER BY p.title")
    List<WikiPageTreeProjection> findTreeNodesByTenantAndSpace(@Param("tenantId") UUID tenantId,
                                                               @Param("spaceId") UUID spaceId);
}
