package com.nulogic.infrastructure.wall.repository;

import com.nulogic.domain.wall.model.WallPost;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for WallPost entity with mandatory tenant isolation.
 *
 * <p><strong>SECURITY:</strong> All queries MUST include tenantId to prevent cross-tenant data leaks.
 * The inherited JpaRepository methods (findAll, findById, deleteById) are intentionally
 * overridden to enforce tenant isolation at the repository level.</p>
 */
@Repository
public interface WallPostRepository extends JpaRepository<WallPost, UUID> {

    // ==================== TENANT-SAFE OVERRIDE METHODS ====================

    /**
     * Find wall post by ID with mandatory tenant isolation.
     * Use this instead of the inherited findById().
     */
    @Query("SELECT p FROM WallPost p WHERE p.id = :id AND p.tenantId = :tenantId")
    Optional<WallPost> findByIdAndTenantId(@Param("id") UUID id, @Param("tenantId") UUID tenantId);

    /**
     * Find all wall posts for a tenant with pagination.
     * Use this instead of the inherited findAll().
     */
    @Query("SELECT p FROM WallPost p WHERE p.tenantId = :tenantId ORDER BY p.createdAt DESC")
    Page<WallPost> findAllByTenantId(@Param("tenantId") UUID tenantId, Pageable pageable);

    /**
     * Delete wall post by ID with mandatory tenant isolation.
     * Use this instead of the inherited deleteById().
     */
    @Modifying
    @Transactional
    @Query("DELETE FROM WallPost p WHERE p.id = :id AND p.tenantId = :tenantId")
    void deleteByIdAndTenantId(@Param("id") UUID id, @Param("tenantId") UUID tenantId);

    /**
     * Check if wall post exists with mandatory tenant isolation.
     */
    @Query("SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END FROM WallPost p WHERE p.id = :id AND p.tenantId = :tenantId")
    boolean existsByIdAndTenantId(@Param("id") UUID id, @Param("tenantId") UUID tenantId);

    // ==================== ACTIVE POSTS QUERY METHODS ====================

    @Query("SELECT p FROM WallPost p WHERE p.tenantId = :tenantId AND p.isDeleted = false")
    Page<WallPost> findByTenantIdAndDeletedFalse(@Param("tenantId") UUID tenantId, Pageable pageable);

    /**
     * Active feed for a tenant with visibility predicate pushed into the query.
     *
     * <p>S3-E follow-up: previously visibility was filtered in-memory after the
     * page was returned, which made {@code Page.totalElements} over-report and
     * left filtered rows as empty "holes" in the page. Now the visibility rule
     * lives in JPQL so pagination counts are correct.</p>
     *
     * <p>Visibility rules:
     * <ul>
     *   <li>PUBLIC / ORGANIZATION → visible to anyone in the tenant.</li>
     *   <li>DEPARTMENT → viewer's departmentId must match author's.</li>
     *   <li>TEAM → viewer's teamId must match author's.</li>
     *   <li>PRIVATE → only the author sees it.</li>
     *   <li>Authors always see their own posts regardless of visibility.</li>
     * </ul>
     * </p>
     *
     * <p><strong>N+1 prevention:</strong> {@code @EntityGraph} on {@code author} and
     * {@code praiseRecipient} forces Hibernate to JOIN FETCH both LAZY associations
     * in the same query that already implicit-joins {@code p.author} for the
     * visibility predicate — so the returned page has authors and praise recipients
     * already hydrated, eliminating per-post lazy SELECTs when the service maps
     * each post to a DTO.</p>
     */
    @EntityGraph(attributePaths = {"author", "author.user", "praiseRecipient", "praiseRecipient.user"})
    @Query("SELECT p FROM WallPost p WHERE p.tenantId = :tenantId AND p.isDeleted = false " +
            "AND (p.visibility = com.nulogic.domain.wall.model.WallPost.PostVisibility.PUBLIC " +
            "  OR p.visibility = com.nulogic.domain.wall.model.WallPost.PostVisibility.ORGANIZATION " +
            "  OR (p.visibility = com.nulogic.domain.wall.model.WallPost.PostVisibility.DEPARTMENT " +
            "      AND p.author.departmentId = :viewerDepartmentId) " +
            "  OR (p.visibility = com.nulogic.domain.wall.model.WallPost.PostVisibility.TEAM " +
            "      AND p.author.teamId = :viewerTeamId) " +
            "  OR (p.visibility = com.nulogic.domain.wall.model.WallPost.PostVisibility.PRIVATE " +
            "      AND p.author.id = :viewerEmployeeId) " +
            "  OR p.author.id = :viewerEmployeeId) " +
            "ORDER BY p.pinned DESC, p.createdAt DESC")
    Page<WallPost> findAllActiveOrderByPinnedAndCreatedAt(@Param("tenantId") UUID tenantId,
                                                          @Param("viewerEmployeeId") UUID viewerEmployeeId,
                                                          @Param("viewerDepartmentId") UUID viewerDepartmentId,
                                                          @Param("viewerTeamId") UUID viewerTeamId,
                                                          Pageable pageable);

    /**
     * Type-scoped feed (POLL, PRAISE, ANNOUNCEMENT, …) with the same
     * visibility predicate as {@link #findAllActiveOrderByPinnedAndCreatedAt}.
     *
     * <p>N+1 prevention: same {@code @EntityGraph} fetch strategy as the main
     * feed — author and praise recipient are JOIN-FETCHed with the page rows.</p>
     */
    @EntityGraph(attributePaths = {"author", "author.user", "praiseRecipient", "praiseRecipient.user"})
    @Query("SELECT p FROM WallPost p WHERE p.tenantId = :tenantId AND p.type = :type AND p.isDeleted = false " +
            "AND (p.visibility = com.nulogic.domain.wall.model.WallPost.PostVisibility.PUBLIC " +
            "  OR p.visibility = com.nulogic.domain.wall.model.WallPost.PostVisibility.ORGANIZATION " +
            "  OR (p.visibility = com.nulogic.domain.wall.model.WallPost.PostVisibility.DEPARTMENT " +
            "      AND p.author.departmentId = :viewerDepartmentId) " +
            "  OR (p.visibility = com.nulogic.domain.wall.model.WallPost.PostVisibility.TEAM " +
            "      AND p.author.teamId = :viewerTeamId) " +
            "  OR (p.visibility = com.nulogic.domain.wall.model.WallPost.PostVisibility.PRIVATE " +
            "      AND p.author.id = :viewerEmployeeId) " +
            "  OR p.author.id = :viewerEmployeeId) " +
            "ORDER BY p.createdAt DESC")
    Page<WallPost> findByTypeAndActiveTrue(@Param("tenantId") UUID tenantId,
                                           @Param("type") WallPost.PostType type,
                                           @Param("viewerEmployeeId") UUID viewerEmployeeId,
                                           @Param("viewerDepartmentId") UUID viewerDepartmentId,
                                           @Param("viewerTeamId") UUID viewerTeamId,
                                           Pageable pageable);

    /**
     * Author-scoped posts list (employee profile feed). N+1 prevention: JOIN FETCH
     * the LAZY author + praiseRecipient so per-post DTO mapping
     * ({@code post.getAuthor()}, {@code post.getPraiseRecipient()}) runs against
     * hydrated proxies rather than firing one SELECT per row.
     */
    @EntityGraph(attributePaths = {"author", "author.user", "praiseRecipient", "praiseRecipient.user"})
    @Query("SELECT p FROM WallPost p WHERE p.tenantId = :tenantId AND p.author.id = :authorId AND p.isDeleted = false ORDER BY p.createdAt DESC")
    Page<WallPost> findByAuthorIdAndActiveTrue(@Param("tenantId") UUID tenantId, @Param("authorId") UUID authorId, Pageable pageable);

    /**
     * Praise feed for a single recipient — used by the employee-profile praise tab.
     * N+1 prevention: both LAZY associations are JOIN-FETCHed because the praise
     * card DTO renders giver + receiver side-by-side; without the entity graph
     * the per-post mapping (line 440 of WallService) would issue 2N extra
     * SELECTs.
     */
    @EntityGraph(attributePaths = {"author", "author.user", "praiseRecipient", "praiseRecipient.user"})
    @Query("SELECT p FROM WallPost p WHERE p.tenantId = :tenantId AND p.praiseRecipient.id = :recipientId AND p.isDeleted = false ORDER BY p.createdAt DESC")
    Page<WallPost> findPraiseByRecipientId(@Param("tenantId") UUID tenantId, @Param("recipientId") UUID recipientId, Pageable pageable);

    @Query("SELECT p FROM WallPost p WHERE p.tenantId = :tenantId AND p.id = :id AND p.isDeleted = false")
    Optional<WallPost> findByIdAndActiveTrue(@Param("tenantId") UUID tenantId, @Param("id") UUID id);

    /**
     * Pinned posts banner — small list (typically 1-5) but each row renders the
     * author avatar + name in the UI, so JOIN FETCH the LAZY associations to
     * avoid one extra SELECT per pinned post.
     */
    @EntityGraph(attributePaths = {"author", "author.user", "praiseRecipient", "praiseRecipient.user"})
    @Query("SELECT p FROM WallPost p WHERE p.tenantId = :tenantId AND p.pinned = true AND p.isDeleted = false ORDER BY p.createdAt DESC")
    List<WallPost> findPinnedPosts(@Param("tenantId") UUID tenantId);

    // ==================== N+1 OPTIMIZED FETCH QUERIES ====================

    /**
     * Fetch wall post with author eagerly loaded to avoid N+1 on author access.
     * Use this when you need to display author info (name, avatar) with posts.
     */
    @Query("SELECT DISTINCT p FROM WallPost p " +
            "LEFT JOIN FETCH p.author a " +
            "LEFT JOIN FETCH a.user " +
            "WHERE p.tenantId = :tenantId AND p.id = :id AND p.isDeleted = false")
    Optional<WallPost> findByIdWithAuthor(@Param("tenantId") UUID tenantId, @Param("id") UUID id);

    /**
     * Fetch wall post with author and praise recipient for praise/celebration posts.
     * Eliminates N+1 when accessing both author and praiseRecipient.
     */
    @Query("SELECT DISTINCT p FROM WallPost p " +
            "LEFT JOIN FETCH p.author a " +
            "LEFT JOIN FETCH a.user " +
            "LEFT JOIN FETCH p.praiseRecipient pr " +
            "LEFT JOIN FETCH pr.user " +
            "WHERE p.tenantId = :tenantId AND p.id = :id AND p.isDeleted = false")
    Optional<WallPost> findByIdWithAuthorAndRecipient(@Param("tenantId") UUID tenantId, @Param("id") UUID id);

    /**
     * Batch fetch posts by IDs with authors eagerly loaded.
     * Use after paginated query to hydrate author data in single query.
     * <p>
     * Usage pattern:
     * 1. Call findAllActiveOrderByPinnedAndCreatedAt() to get paginated post IDs
     * 2. Extract IDs from page content
     * 3. Call this method to fetch posts with authors in one query
     */
    @Query("SELECT DISTINCT p FROM WallPost p " +
            "LEFT JOIN FETCH p.author a " +
            "LEFT JOIN FETCH a.user " +
            "LEFT JOIN FETCH p.praiseRecipient pr " +
            "LEFT JOIN FETCH pr.user " +
            "WHERE p.id IN :postIds AND p.tenantId = :tenantId")
    List<WallPost> findByIdsWithAuthors(@Param("postIds") List<UUID> postIds, @Param("tenantId") UUID tenantId);

    /**
     * Fetch posts with poll options for POLL type posts.
     * Eliminates N+1 when loading poll options for each post.
     */
    @Query("SELECT DISTINCT p FROM WallPost p " +
            "LEFT JOIN FETCH p.author " +
            "LEFT JOIN FETCH p.pollOptions po " +
            "WHERE p.id IN :postIds AND p.tenantId = :tenantId AND p.type = 'POLL'")
    List<WallPost> findPollPostsWithOptions(@Param("postIds") List<UUID> postIds, @Param("tenantId") UUID tenantId);

    // ==================== COUNT METHODS ====================

    @Query("SELECT COUNT(p) FROM WallPost p WHERE p.tenantId = :tenantId AND p.author.id = :authorId AND p.isDeleted = false")
    long countByAuthorId(@Param("tenantId") UUID tenantId, @Param("authorId") UUID authorId);

    @Query("SELECT COUNT(p) FROM WallPost p WHERE p.tenantId = :tenantId AND p.praiseRecipient.id = :recipientId AND p.isDeleted = false")
    long countPraiseReceivedByEmployee(@Param("tenantId") UUID tenantId, @Param("recipientId") UUID recipientId);

    // ==================== DEPRECATED - DO NOT USE ====================

    /**
     * @deprecated Use {@link #findByIdAndTenantId(UUID, UUID)} instead.
     * This method is unsafe for multi-tenant environments.
     */
    @Override
    @Deprecated
    Optional<WallPost> findById(UUID id);

    /**
     * @deprecated Use {@link #findAllByTenantId(UUID, Pageable)} instead.
     * This method is unsafe for multi-tenant environments.
     */
    @Override
    @Deprecated
    List<WallPost> findAll();

    /**
     * @deprecated Use {@link #deleteByIdAndTenantId(UUID, UUID)} instead.
     * This method is unsafe for multi-tenant environments.
     */
    @Override
    @Deprecated
    void deleteById(UUID id);
}
