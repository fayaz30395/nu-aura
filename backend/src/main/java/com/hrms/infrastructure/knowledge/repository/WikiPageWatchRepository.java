package com.hrms.infrastructure.knowledge.repository;

import com.hrms.domain.knowledge.WikiPageWatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WikiPageWatchRepository extends JpaRepository<WikiPageWatch, UUID> {

    Optional<WikiPageWatch> findByPageIdAndUserId(UUID pageId, UUID userId);

    @Query("SELECT w FROM WikiPageWatch w WHERE w.tenantId = :tenantId AND w.page.id = :pageId")
    List<WikiPageWatch> findWatchersByPage(@Param("tenantId") UUID tenantId, @Param("pageId") UUID pageId);

    @Query("SELECT w FROM WikiPageWatch w WHERE w.tenantId = :tenantId AND w.userId = :userId")
    List<WikiPageWatch> findWatchesByUser(@Param("tenantId") UUID tenantId, @Param("userId") UUID userId);

    boolean existsByPageIdAndUserId(UUID pageId, UUID userId);
}
