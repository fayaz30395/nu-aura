package com.hrms.domain.wall.repository;

import com.hrms.domain.wall.model.PostComment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

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
}
