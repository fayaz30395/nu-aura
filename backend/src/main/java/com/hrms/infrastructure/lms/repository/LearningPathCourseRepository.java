package com.hrms.infrastructure.lms.repository;

import com.hrms.domain.lms.LearningPathCourse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LearningPathCourseRepository extends JpaRepository<LearningPathCourse, UUID> {

    @Query("SELECT lpc FROM LearningPathCourse lpc WHERE lpc.pathId = :pathId AND lpc.tenantId = :tenantId ORDER BY lpc.orderIndex ASC")
    List<LearningPathCourse> findByPathIdAndTenantId(
            @Param("pathId") UUID pathId,
            @Param("tenantId") UUID tenantId);

    @Query("SELECT lpc FROM LearningPathCourse lpc WHERE lpc.courseId = :courseId AND lpc.tenantId = :tenantId")
    List<LearningPathCourse> findByCourseIdAndTenantId(
            @Param("courseId") UUID courseId,
            @Param("tenantId") UUID tenantId);

    @Query("SELECT COUNT(lpc) FROM LearningPathCourse lpc WHERE lpc.pathId = :pathId AND lpc.tenantId = :tenantId")
    long countByPathIdAndTenantId(
            @Param("pathId") UUID pathId,
            @Param("tenantId") UUID tenantId);
}
