package com.hrms.infrastructure.wall.repository;

import com.hrms.domain.wall.model.WallPost;
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
public interface WallPostRepository extends JpaRepository<WallPost, UUID> {

    Page<WallPost> findByDeletedFalse(Pageable pageable);

    @Query("SELECT p FROM WallPost p WHERE p.deleted = false ORDER BY p.pinned DESC, p.createdAt DESC")
    Page<WallPost> findAllActiveOrderByPinnedAndCreatedAt(Pageable pageable);

    @Query("SELECT p FROM WallPost p WHERE p.type = :type AND p.deleted = false ORDER BY p.createdAt DESC")
    Page<WallPost> findByTypeAndActiveTrue(@Param("type") WallPost.PostType type, Pageable pageable);

    @Query("SELECT p FROM WallPost p WHERE p.author.id = :authorId AND p.deleted = false ORDER BY p.createdAt DESC")
    Page<WallPost> findByAuthorIdAndActiveTrue(@Param("authorId") UUID authorId, Pageable pageable);

    @Query("SELECT p FROM WallPost p WHERE p.praiseRecipient.id = :recipientId AND p.deleted = false ORDER BY p.createdAt DESC")
    Page<WallPost> findPraiseByRecipientId(@Param("recipientId") UUID recipientId, Pageable pageable);

    @Query("SELECT p FROM WallPost p WHERE p.id = :id AND p.deleted = false")
    Optional<WallPost> findByIdAndActiveTrue(@Param("id") UUID id);

    @Query("SELECT p FROM WallPost p WHERE p.pinned = true AND p.deleted = false ORDER BY p.createdAt DESC")
    List<WallPost> findPinnedPosts();

    @Query("SELECT COUNT(p) FROM WallPost p WHERE p.author.id = :authorId AND p.deleted = false")
    long countByAuthorId(@Param("authorId") UUID authorId);

    @Query("SELECT COUNT(p) FROM WallPost p WHERE p.praiseRecipient.id = :recipientId AND p.deleted = false")
    long countPraiseReceivedByEmployee(@Param("recipientId") UUID recipientId);
}
