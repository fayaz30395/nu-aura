package com.hrms.infrastructure.knowledge.repository;

import com.hrms.domain.knowledge.BlogLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface BlogLikeRepository extends JpaRepository<BlogLike, UUID> {

    Optional<BlogLike> findByPostIdAndUserId(UUID postId, UUID userId);

    @Query("SELECT COUNT(bl) FROM BlogLike bl WHERE bl.tenantId = :tenantId AND bl.post.id = :postId")
    long countByTenantIdAndPostId(@Param("tenantId") UUID tenantId, @Param("postId") UUID postId);

    boolean existsByPostIdAndUserId(UUID postId, UUID userId);
}
