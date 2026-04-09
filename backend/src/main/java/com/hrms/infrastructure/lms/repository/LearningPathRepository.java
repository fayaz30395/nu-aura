package com.hrms.infrastructure.lms.repository;

import com.hrms.domain.lms.LearningPath;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LearningPathRepository extends JpaRepository<LearningPath, UUID> {

    Page<LearningPath> findByTenantIdAndIsDeletedFalse(UUID tenantId, Pageable pageable);

    List<LearningPath> findByTenantIdAndIsPublishedTrueAndIsDeletedFalse(UUID tenantId);

    Optional<LearningPath> findByIdAndTenantIdAndIsDeletedFalse(UUID id, UUID tenantId);

    Page<LearningPath> findByTenantIdAndDifficultyLevelAndIsDeletedFalse(
            UUID tenantId, LearningPath.DifficultyLevel difficultyLevel, Pageable pageable);
}
