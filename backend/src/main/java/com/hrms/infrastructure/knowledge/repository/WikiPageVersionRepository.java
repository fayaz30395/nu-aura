package com.hrms.infrastructure.knowledge.repository;

import com.hrms.domain.knowledge.WikiPageVersion;
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
public interface WikiPageVersionRepository extends JpaRepository<WikiPageVersion, UUID> {

    Page<WikiPageVersion> findByTenantIdAndPageId(UUID tenantId, UUID pageId, Pageable pageable);

    Optional<WikiPageVersion> findByTenantIdAndPageIdAndVersionNumber(UUID tenantId, UUID pageId, Integer versionNumber);

    @Query("SELECT wv FROM WikiPageVersion wv WHERE wv.tenantId = :tenantId AND wv.page.id = :pageId " +
            "ORDER BY wv.versionNumber DESC")
    List<WikiPageVersion> findVersionHistoryByPage(@Param("tenantId") UUID tenantId, @Param("pageId") UUID pageId);

    long countByTenantIdAndPageId(UUID tenantId, UUID pageId);
}
