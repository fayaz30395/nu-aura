package com.hrms.infrastructure.lms.repository;

import com.hrms.domain.lms.CourseModule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CourseModuleRepository extends JpaRepository<CourseModule, UUID> {

    Optional<CourseModule> findByIdAndTenantId(UUID id, UUID tenantId);

    @Query("SELECT m FROM CourseModule m WHERE m.tenantId = :tenantId AND m.courseId = :courseId ORDER BY m.orderIndex")
    List<CourseModule> findByCourseOrdered(@Param("tenantId") UUID tenantId, @Param("courseId") UUID courseId);

    void deleteAllByCourseId(UUID courseId);

    @Query("SELECT COUNT(m) FROM CourseModule m WHERE m.courseId = :courseId")
    Long countByCourse(@Param("courseId") UUID courseId);
}
