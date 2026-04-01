package com.hrms.infrastructure.knowledge.repository;

import com.hrms.domain.knowledge.FluenceFavorite;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface FluenceFavoriteRepository extends JpaRepository<FluenceFavorite, UUID> {

    Optional<FluenceFavorite> findByTenantIdAndUserIdAndContentIdAndContentType(
            UUID tenantId, UUID userId, UUID contentId, String contentType);

    Page<FluenceFavorite> findByTenantIdAndUserId(UUID tenantId, UUID userId, Pageable pageable);

    Page<FluenceFavorite> findByTenantIdAndUserIdAndContentType(
            UUID tenantId, UUID userId, String contentType, Pageable pageable);

    boolean existsByTenantIdAndUserIdAndContentIdAndContentType(
            UUID tenantId, UUID userId, UUID contentId, String contentType);

    long countByTenantIdAndContentIdAndContentType(UUID tenantId, UUID contentId, String contentType);
}
