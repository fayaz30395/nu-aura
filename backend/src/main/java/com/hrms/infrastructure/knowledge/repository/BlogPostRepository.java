package com.hrms.infrastructure.knowledge.repository;

import com.hrms.domain.knowledge.BlogPost;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BlogPostRepository extends JpaRepository<BlogPost, UUID>, JpaSpecificationExecutor<BlogPost> {

    Optional<BlogPost> findByTenantIdAndSlug(UUID tenantId, String slug);

    Page<BlogPost> findByTenantIdAndStatus(UUID tenantId, BlogPost.BlogPostStatus status, Pageable pageable);

    Page<BlogPost> findByTenantIdAndCategoryId(UUID tenantId, UUID categoryId, Pageable pageable);

    Page<BlogPost> findByTenantId(UUID tenantId, Pageable pageable);

    @Query("SELECT bp FROM BlogPost bp WHERE bp.tenantId = :tenantId AND bp.isFeatured = true " +
           "AND bp.featuredUntil > CURRENT_TIMESTAMP ORDER BY bp.publishedAt DESC")
    List<BlogPost> findFeaturedPostsByTenant(@Param("tenantId") UUID tenantId);

    @Query("SELECT bp FROM BlogPost bp WHERE bp.tenantId = :tenantId AND bp.status = 'PUBLISHED' " +
           "ORDER BY bp.publishedAt DESC")
    Page<BlogPost> findPublishedPostsByTenant(@Param("tenantId") UUID tenantId, Pageable pageable);

    @Query(value = "SELECT bp.* FROM blog_posts bp " +
           "WHERE bp.tenant_id = :tenantId AND " +
           "to_tsvector('english', bp.title || ' ' || COALESCE(bp.excerpt, '')) @@ " +
           "to_tsquery('english', :query) " +
           "ORDER BY ts_rank(to_tsvector('english', bp.title || ' ' || COALESCE(bp.excerpt, '')), " +
           "to_tsquery('english', :query)) DESC",
           nativeQuery = true,
           countQuery = "SELECT COUNT(*) FROM blog_posts bp " +
                   "WHERE bp.tenant_id = :tenantId AND " +
                   "to_tsvector('english', bp.title || ' ' || COALESCE(bp.excerpt, '')) @@ " +
                   "to_tsquery('english', :query)")
    Page<BlogPost> searchByTenant(@Param("tenantId") UUID tenantId, @Param("query") String query, Pageable pageable);

    /**
     * Broad ILIKE-based search for RAG retrieval — high recall, LLM handles precision.
     * Searches title, excerpt, AND content body (JSONB cast to TEXT) for any keyword match.
     */
    @Query(value = "SELECT bp.* FROM blog_posts bp " +
           "WHERE bp.tenant_id = :tenantId AND (" +
           "LOWER(bp.title) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(COALESCE(bp.excerpt, '')) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(CAST(bp.content AS TEXT)) LIKE LOWER(CONCAT('%', :query, '%'))" +
           ") ORDER BY CASE WHEN LOWER(bp.title) LIKE LOWER(CONCAT('%', :query, '%')) THEN 0 ELSE 1 END, " +
           "bp.updated_at DESC",
           nativeQuery = true,
           countQuery = "SELECT COUNT(*) FROM blog_posts bp " +
                   "WHERE bp.tenant_id = :tenantId AND (" +
                   "LOWER(bp.title) LIKE LOWER(CONCAT('%', :query, '%')) " +
                   "OR LOWER(COALESCE(bp.excerpt, '')) LIKE LOWER(CONCAT('%', :query, '%')) " +
                   "OR LOWER(CAST(bp.content AS TEXT)) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<BlogPost> searchByTenantBroad(@Param("tenantId") UUID tenantId, @Param("query") String query, Pageable pageable);

    long countByTenantIdAndCategoryId(UUID tenantId, UUID categoryId);

    boolean existsByTenantIdAndSlug(UUID tenantId, String slug);

    @Query("SELECT COUNT(bp) FROM BlogPost bp WHERE bp.tenantId = :tenantId AND bp.status = 'PUBLISHED'")
    long countPublishedByTenant(@Param("tenantId") UUID tenantId);
}
