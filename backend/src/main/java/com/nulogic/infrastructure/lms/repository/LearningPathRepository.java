package com.nulogic.infrastructure.lms.repository;

import com.nulogic.domain.lms.LearningPath;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface LearningPathRepository extends JpaRepository<LearningPath, UUID> {

    // open-in-view is disabled: fetch courses eagerly here so the controller can
    // serialize them without a LazyInitializationException. LearningPath.courses
    // declares @OrderBy("orderIndex ASC"), which Hibernate applies when it
    // populates the collection regardless of this query's own ordering.
    @Query("SELECT lp FROM LearningPath lp LEFT JOIN FETCH lp.courses WHERE lp.id = :id AND lp.tenantId = :tenantId")
    Optional<LearningPath> findByIdAndTenantIdWithCourses(@Param("id") UUID id, @Param("tenantId") UUID tenantId);

    // BUG-L1: the list the /learning/paths page has always called. Explicit @Query to match
    // CourseRepository.findPublishedCourses; a derived name parses "Is" ambiguously.
    @Query("SELECT lp FROM LearningPath lp WHERE lp.tenantId = :tenantId AND lp.isPublished = true")
    Page<LearningPath> findPublishedPaths(@Param("tenantId") UUID tenantId, Pageable pageable);
}
