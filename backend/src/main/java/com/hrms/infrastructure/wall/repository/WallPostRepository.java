package com.hrms.infrastructure.wall.repository;

import com.hrms.domain.wall.model.WallPost;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

    @Query("SELECT p FROM WallPost p WHERE p.tenantId = :tenantId AND p.deleted = false")
    Page<WallPost> findByTenantIdAndDeletedFalse(@Param("tenantId") UUID tenantId, Pageable pageable);

    @Query("SELECT p FROM WallPost p WHERE p.tenantId = :tenantId AND p.deleted = false ORDER BY p.pinned DESC, p.createdAt DESC")
    Page<WallPost> findAllActiveOrderByPinnedAndCreatedAt(@Param("tenantId") UUID tenantId, Pageable pageable);

    @Query("SELECT p FROM WallPost p WHERE p.tenantId = :tenantId AND p.type = :type AND p.deleted = false ORDER BY p.createdAt DESC")
    Page<WallPost> findByTypeAndActiveTrue(@Param("tenantId") UUID tenantId, @Param("type") WallPost.PostType type, Pageable pageable);

    @Query("SELECT p FROM WallPost p WHERE p.tenantId = :tenantId AND p.author.id = :authorId AND p.deleted = false ORDER BY p.createdAt DESC")
    Page<WallPost> findByAuthorIdAndActiveTrue(@Param("tenantId") UUID tenantId, @Param("authorId") UUID authorId, Pageable pageable);

    @Query("SELECT p FROM WallPost p WHERE p.tenantId = :tenantId AND p.praiseRecipient.id = :recipientId AND p.deleted = false ORDER BY p.createdAt DESC")
    Page<WallPost> findPraiseByRecipientId(@Param("tenantId") UUID tenantId, @Param("recipientId") UUID recipientId, Pageable pageable);

    @Query("SELECT p FROM WallPost p WHERE p.tenantId = :tenantId AND p.id = :id AND p.deleted = false")
    Optional<WallPost> findByIdAndActiveTrue(@Param("tenantId") UUID tenantId, @Param("id") UUID id);

    @Query("SELECT p FROM WallPost p WHERE p.tenantId = :tenantId AND p.pinned = true AND p.deleted = false ORDER BY p.createdAt DESC")
    List<WallPost> findPinnedPosts(@Param("tenantId") UUID tenantId);

    // ==================== N+1 OPTIMIZED FETCH QUERIES ====================

    /**
     * Fetch wall post with author eagerly loaded to avoid N+1 on author access.
     * Use this when you need to display author info (name, avatar) with posts.
     */
    @Query("SELECT DISTINCT p FROM WallPost p " +
           "LEFT JOIN FETCH p.author a " +
           "LEFT JOIN FETCH a.user " +
           "WHERE p.tenantId = :tenantId AND p.id = :id AND p.deleted = false")
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
           "WHERE p.tenantId = :tenantId AND p.id = :id AND p.deleted = false")
    Optional<WallPost> findByIdWithAuthorAndRecipient(@Param("tenantId") UUID tenantId, @Param("id") UUID id);

    /**
     * Batch fetch posts by IDs with authors eagerly loaded.
     * Use after paginated query to hydrate author data in single query.
     *
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

    @Query("SELECT COUNT(p) FROM WallPost p WHERE p.tenantId = :tenantId AND p.author.id = :authorId AND p.deleted = false")
    long countByAuthorId(@Param("tenantId") UUID tenantId, @Param("authorId") UUID authorId);

    @Query("SELECT COUNT(p) FROM WallPost p WHERE p.tenantId = :tenantId AND p.praiseRecipient.id = :recipientId AND p.deleted = false")
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
