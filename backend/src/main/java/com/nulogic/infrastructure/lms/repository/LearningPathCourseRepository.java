package com.nulogic.infrastructure.lms.repository;

import com.nulogic.domain.lms.LearningPathCourse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

/**
 * Member courses of a learning path. Added for BUG-L1: the learning-paths list needs the
 * course membership of many paths at once, which the {@code LearningPath.courses} collection
 * can only supply one path at a time (open-in-view is disabled).
 */
@Repository
public interface LearningPathCourseRepository extends JpaRepository<LearningPathCourse, UUID> {

    @Query("SELECT lpc FROM LearningPathCourse lpc WHERE lpc.tenantId = :tenantId AND lpc.pathId IN :pathIds")
    List<LearningPathCourse> findByPathIds(@Param("tenantId") UUID tenantId,
                                           @Param("pathIds") Collection<UUID> pathIds);

    /** Distinct learners per path, counted across that path's member courses. */
    @Query("SELECT lpc.pathId, COUNT(DISTINCT e.employeeId) "
            + "FROM LearningPathCourse lpc "
            + "JOIN CourseEnrollment e ON e.courseId = lpc.courseId AND e.tenantId = lpc.tenantId "
            + "WHERE lpc.tenantId = :tenantId AND lpc.pathId IN :pathIds GROUP BY lpc.pathId")
    List<Object[]> countDistinctLearnersByPath(@Param("tenantId") UUID tenantId,
                                               @Param("pathIds") Collection<UUID> pathIds);
}
