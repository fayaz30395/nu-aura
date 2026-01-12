package com.hrms.infrastructure.lms.repository;

import com.hrms.domain.lms.Course;
import com.hrms.domain.lms.Course.CourseStatus;
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
public interface CourseRepository extends JpaRepository<Course, UUID> {

    Page<Course> findAllByTenantId(UUID tenantId, Pageable pageable);

    Optional<Course> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<Course> findAllByTenantIdAndStatus(UUID tenantId, CourseStatus status, Pageable pageable);

    @Query("SELECT c FROM Course c WHERE c.tenantId = :tenantId AND c.status = 'PUBLISHED'")
    Page<Course> findPublishedCourses(@Param("tenantId") UUID tenantId, Pageable pageable);

    @Query("SELECT c FROM Course c WHERE c.tenantId = :tenantId AND c.isMandatory = true AND c.status = 'PUBLISHED'")
    List<Course> findMandatoryCourses(@Param("tenantId") UUID tenantId);

    @Query("SELECT c FROM Course c WHERE c.tenantId = :tenantId AND c.categoryId = :categoryId AND c.status = 'PUBLISHED'")
    List<Course> findByCategory(@Param("tenantId") UUID tenantId, @Param("categoryId") UUID categoryId);

    @Query("SELECT c FROM Course c WHERE c.tenantId = :tenantId AND (LOWER(c.title) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(c.description) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Course> searchCourses(@Param("tenantId") UUID tenantId, @Param("search") String search, Pageable pageable);

    @Query("SELECT c FROM Course c WHERE c.tenantId = :tenantId AND c.instructorId = :instructorId")
    List<Course> findByInstructor(@Param("tenantId") UUID tenantId, @Param("instructorId") UUID instructorId);
}
