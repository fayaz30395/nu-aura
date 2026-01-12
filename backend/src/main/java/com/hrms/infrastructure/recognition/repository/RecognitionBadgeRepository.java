package com.hrms.infrastructure.recognition.repository;

import com.hrms.domain.recognition.RecognitionBadge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RecognitionBadgeRepository extends JpaRepository<RecognitionBadge, UUID> {

    Optional<RecognitionBadge> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<RecognitionBadge> findByCodeAndTenantId(String code, UUID tenantId);

    boolean existsByCodeAndTenantId(String code, UUID tenantId);

    @Query("SELECT b FROM RecognitionBadge b WHERE b.tenantId = :tenantId AND b.isActive = true ORDER BY b.sortOrder")
    List<RecognitionBadge> findActiveBadges(@Param("tenantId") UUID tenantId);

    List<RecognitionBadge> findByTenantId(UUID tenantId);
}
