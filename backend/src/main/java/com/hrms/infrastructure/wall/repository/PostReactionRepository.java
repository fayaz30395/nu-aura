package com.hrms.infrastructure.wall.repository;

import com.hrms.domain.wall.model.PostReaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PostReactionRepository extends JpaRepository<PostReaction, UUID> {

    @Query("SELECT r FROM PostReaction r WHERE r.post.id = :postId AND r.employee.id = :employeeId")
    Optional<PostReaction> findByPostIdAndEmployeeId(@Param("postId") UUID postId, @Param("employeeId") UUID employeeId);

    @Query("SELECT r FROM PostReaction r WHERE r.post.id = :postId AND r.employee.id = :employeeId AND r.reactionType = :reactionType")
    Optional<PostReaction> findByPostIdAndEmployeeIdAndReactionType(
            @Param("postId") UUID postId,
            @Param("employeeId") UUID employeeId,
            @Param("reactionType") PostReaction.ReactionType reactionType);

    List<PostReaction> findByPostId(UUID postId);

    @Query("SELECT COUNT(r) FROM PostReaction r WHERE r.post.id = :postId")
    long countByPostId(@Param("postId") UUID postId);

    @Query("SELECT COUNT(r) FROM PostReaction r WHERE r.post.id = :postId AND r.reactionType = :reactionType")
    long countByPostIdAndReactionType(@Param("postId") UUID postId, @Param("reactionType") PostReaction.ReactionType reactionType);

    @Query("SELECT r.reactionType, COUNT(r) FROM PostReaction r WHERE r.post.id = :postId GROUP BY r.reactionType")
    List<Object[]> countReactionsByTypeForPost(@Param("postId") UUID postId);

    void deleteByPostIdAndEmployeeId(UUID postId, UUID employeeId);

    boolean existsByPostIdAndEmployeeId(UUID postId, UUID employeeId);

    // ==================== BATCH QUERIES FOR N+1 ELIMINATION ====================

    /**
     * Batch fetch reaction counts by type for multiple posts in one query.
     * Returns: [postId, reactionType, count]
     * Use this instead of calling countReactionsByTypeForPost() in a loop.
     */
    @Query("SELECT r.post.id, r.reactionType, COUNT(r) FROM PostReaction r " +
            "WHERE r.post.id IN :postIds " +
            "GROUP BY r.post.id, r.reactionType")
    List<Object[]> countReactionsByTypeForPosts(@Param("postIds") List<UUID> postIds);

    /**
     * Batch check if user has reacted to multiple posts.
     * Returns list of post IDs the user has reacted to.
     */
    @Query("SELECT DISTINCT r.post.id FROM PostReaction r " +
            "WHERE r.post.id IN :postIds AND r.employee.id = :employeeId")
    List<UUID> findPostIdsWithUserReaction(@Param("postIds") List<UUID> postIds, @Param("employeeId") UUID employeeId);

    /**
     * Get user's reactions for multiple posts in one query.
     * Returns: [postId, reactionType]
     */
    @Query("SELECT r.post.id, r.reactionType FROM PostReaction r " +
            "WHERE r.post.id IN :postIds AND r.employee.id = :employeeId")
    List<Object[]> findUserReactionsForPosts(@Param("postIds") List<UUID> postIds, @Param("employeeId") UUID employeeId);

    /**
     * Get recent reactions for a post, ordered by most recent first.
     * Eagerly fetches employee + user for avatar URL resolution.
     */
    @Query("SELECT r FROM PostReaction r " +
            "JOIN FETCH r.employee e " +
            "LEFT JOIN FETCH e.user u " +
            "WHERE r.post.id = :postId " +
            "ORDER BY r.createdAt DESC")
    List<PostReaction> findRecentByPostId(@Param("postId") UUID postId, Pageable pageable);

    /**
     * Get paginated reactions for a post (for the full list endpoint).
     * Uses separate countQuery to avoid Hibernate JOIN FETCH + count conflict.
     */
    @Query(value = "SELECT r FROM PostReaction r " +
            "JOIN FETCH r.employee e " +
            "LEFT JOIN FETCH e.user u " +
            "WHERE r.post.id = :postId " +
            "ORDER BY r.createdAt DESC",
            countQuery = "SELECT COUNT(r) FROM PostReaction r WHERE r.post.id = :postId")
    Page<PostReaction> findAllByPostIdWithDetails(@Param("postId") UUID postId, Pageable pageable);
}
