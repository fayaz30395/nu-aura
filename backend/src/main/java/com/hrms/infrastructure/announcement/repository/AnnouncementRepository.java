package com.hrms.infrastructure.announcement.repository;

import com.hrms.domain.announcement.Announcement;
import com.hrms.domain.announcement.Announcement.AnnouncementStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AnnouncementRepository extends JpaRepository<Announcement, UUID> {

    Optional<Announcement> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<Announcement> findByTenantIdAndStatus(UUID tenantId, AnnouncementStatus status, Pageable pageable);

    Page<Announcement> findByTenantIdOrderByPublishedAtDesc(UUID tenantId, Pageable pageable);

    @Query("SELECT a FROM Announcement a WHERE a.tenantId = :tenantId AND a.status = 'PUBLISHED' " +
            "AND (a.expiresAt IS NULL OR a.expiresAt > :now) ORDER BY a.publishedAt DESC")
    Page<Announcement> findActiveAnnouncements(@Param("tenantId") UUID tenantId,
                                               @Param("now") LocalDateTime now,
                                               Pageable pageable);

    @Query("SELECT a FROM Announcement a WHERE a.tenantId = :tenantId AND a.isPinned = true " +
            "AND a.status = 'PUBLISHED' AND (a.expiresAt IS NULL OR a.expiresAt > :now) " +
            "ORDER BY a.publishedAt DESC")
    List<Announcement> findPinnedAnnouncements(@Param("tenantId") UUID tenantId,
                                               @Param("now") LocalDateTime now);

    @Query("SELECT a FROM Announcement a WHERE a.tenantId = :tenantId AND a.status = 'PUBLISHED' " +
            "AND a.targetAudience = 'ALL_EMPLOYEES' AND (a.expiresAt IS NULL OR a.expiresAt > :now) " +
            "ORDER BY a.publishedAt DESC")
    Page<Announcement> findAnnouncementsForAllEmployees(@Param("tenantId") UUID tenantId,
                                                        @Param("now") LocalDateTime now,
                                                        Pageable pageable);

    @Query("SELECT COUNT(a) FROM Announcement a WHERE a.tenantId = :tenantId AND a.status = 'PUBLISHED' " +
            "AND (a.expiresAt IS NULL OR a.expiresAt > :now)")
    long countActiveAnnouncements(@Param("tenantId") UUID tenantId, @Param("now") LocalDateTime now);
}
