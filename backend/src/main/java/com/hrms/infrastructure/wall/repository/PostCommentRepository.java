package com.hrms.infrastructure.wall.repository;

import com.hrms.domain.wall.model.PostComment;
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
public interface PostCommentRepository extends JpaRepository<PostComment, UUID> {

    @Query("SELECT c FROM PostComment c WHERE c.post.id = :postId AND c.parentComment IS NULL AND c.deleted = false ORDER BY c.createdAt ASC")
    Page<PostComment> findTopLevelCommentsByPostId(@Param("postId") UUID postId, Pageable pageable);

    @Query("SELECT c FROM PostComment c WHERE c.parentComment.id = :parentId AND c.deleted = false ORDER BY c.createdAt ASC")
    Page<PostComment> findRepliesByParentCommentId(@Param("parentId") UUID parentId, Pageable pageable);

    @Query("SELECT COUNT(c) FROM PostComment c WHERE c.post.id = :postId AND c.deleted = false")
    long countByPostId(@Param("postId") UUID postId);

    @Query("SELECT c FROM PostComment c WHERE c.id = :id AND c.deleted = false")
    Optional<PostComment> findByIdAndActiveTrue(@Param("id") UUID id);

    @Query("SELECT COUNT(c) FROM PostComment c WHERE c.author.id = :authorId AND c.deleted = false")
    long countByAuthorId(@Param("authorId") UUID authorId);

    @Query("SELECT COUNT(c) FROM PostComment c WHERE c.parentComment.id = :parentCommentId AND c.deleted = false")
    int countByParentCommentIdAndActiveTrue(@Param("parentCommentId") UUID parentCommentId);

    // ==================== N+1 OPTIMIZED FETCH QUERIES ====================

    /**
     * Fetch comments with author eagerly loaded to avoid N+1 on author access.
     */
    @Query("SELECT DISTINCT c FROM PostComment c " +
            "LEFT JOIN FETCH c.author " +
            "WHERE c.post.id = :postId AND c.parentComment IS NULL AND c.deleted = false " +
            "ORDER BY c.createdAt ASC")
    Page<PostComment> findTopLevelCommentsWithAuthors(@Param("postId") UUID postId, Pageable pageable);

    /**
     * Fetch comment replies with authors eagerly loaded.
     */
    @Query("SELECT DISTINCT c FROM PostComment c " +
            "LEFT JOIN FETCH c.author " +
            "WHERE c.parentComment.id = :parentId AND c.deleted = false " +
            "ORDER BY c.createdAt ASC")
    Page<PostComment> findRepliesWithAuthors(@Param("parentId") UUID parentId, Pageable pageable);

    /**
     * Batch fetch comment counts for multiple posts in one query.
     * Returns: [postId, count]
     */
    @Query("SELECT c.post.id, COUNT(c) FROM PostComment c " +
            "WHERE c.post.id IN :postIds AND c.deleted = false " +
            "GROUP BY c.post.id")
    List<Object[]> countByPostIds(@Param("postIds") List<UUID> postIds);
}
