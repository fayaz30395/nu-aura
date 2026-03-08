package com.hrms.infrastructure.lms.repository;

import com.hrms.domain.lms.LearningPath;
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
public interface LearningPathRepository extends JpaRepository<LearningPath, UUID> {

    Optional<LearningPath> findByIdAndTenantId(UUID id, UUID tenantId);

    @Query("SELECT lp FROM LearningPath lp WHERE lp.tenantId = :tenantId AND lp.isDeleted = false ORDER BY lp.createdAt DESC")
    Page<LearningPath> findAllByTenantId(@Param("tenantId") UUID tenantId, Pageable pageable);

    @Query("SELECT lp FROM LearningPath lp WHERE lp.tenantId = :tenantId AND lp.isPublished = true AND lp.isDeleted = false ORDER BY lp.createdAt DESC")
    Page<LearningPath> findPublishedByTenantId(@Param("tenantId") UUID tenantId, Pageable pageable);

    @Query("SELECT lp FROM LearningPath lp WHERE lp.tenantId = :tenantId AND lp.isMandatory = true AND lp.isPublished = true AND lp.isDeleted = false")
    List<LearningPath> findMandatoryByTenantId(@Param("tenantId") UUID tenantId);

    @Query("SELECT lp FROM LearningPath lp WHERE lp.tenantId = :tenantId AND lp.difficultyLevel = :level AND lp.isPublished = true AND lp.isDeleted = false")
    List<LearningPath> findByDifficultyLevelAndTenantId(
            @Param("level") LearningPath.DifficultyLevel level,
            @Param("tenantId") UUID tenantId);

    @Query("SELECT COUNT(lp) FROM LearningPath lp WHERE lp.tenantId = :tenantId AND lp.isDeleted = false")
    long countByTenantId(@Param("tenantId") UUID tenantId);
}
