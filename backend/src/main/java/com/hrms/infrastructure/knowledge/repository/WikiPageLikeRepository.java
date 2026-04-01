package com.hrms.infrastructure.knowledge.repository;

import com.hrms.domain.knowledge.WikiPageLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface WikiPageLikeRepository extends JpaRepository<WikiPageLike, UUID> {

    Optional<WikiPageLike> findByTenantIdAndWikiPageIdAndLikedBy(UUID tenantId, UUID wikiPageId, UUID likedBy);

    boolean existsByTenantIdAndWikiPageIdAndLikedBy(UUID tenantId, UUID wikiPageId, UUID likedBy);

    @Query("SELECT COUNT(wl) FROM WikiPageLike wl WHERE wl.tenantId = :tenantId AND wl.wikiPage.id = :pageId")
    long countByTenantIdAndPageId(@Param("tenantId") UUID tenantId, @Param("pageId") UUID pageId);
}
