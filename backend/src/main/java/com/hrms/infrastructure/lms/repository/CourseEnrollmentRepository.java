package com.hrms.infrastructure.lms.repository;

import com.hrms.domain.lms.CourseEnrollment;
import com.hrms.domain.lms.CourseEnrollment.EnrollmentStatus;
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
public interface CourseEnrollmentRepository extends JpaRepository<CourseEnrollment, UUID> {

    Optional<CourseEnrollment> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<CourseEnrollment> findByCourseIdAndEmployeeIdAndTenantId(UUID courseId, UUID employeeId, UUID tenantId);

    @Query("SELECT e FROM CourseEnrollment e WHERE e.tenantId = :tenantId AND e.employeeId = :employeeId")
    List<CourseEnrollment> findByEmployee(@Param("tenantId") UUID tenantId, @Param("employeeId") UUID employeeId);

    @Query("SELECT e FROM CourseEnrollment e WHERE e.tenantId = :tenantId AND e.employeeId = :employeeId AND e.status = :status")
    List<CourseEnrollment> findByEmployeeAndStatus(@Param("tenantId") UUID tenantId, @Param("employeeId") UUID employeeId, @Param("status") EnrollmentStatus status);

    Page<CourseEnrollment> findAllByCourseIdAndTenantId(UUID courseId, UUID tenantId, Pageable pageable);

    @Query("SELECT COUNT(e) FROM CourseEnrollment e WHERE e.courseId = :courseId AND e.tenantId = :tenantId")
    Long countByCourse(@Param("courseId") UUID courseId, @Param("tenantId") UUID tenantId);

    @Query("SELECT COUNT(e) FROM CourseEnrollment e WHERE e.courseId = :courseId AND e.tenantId = :tenantId AND e.status = 'COMPLETED'")
    Long countCompletedByCourse(@Param("courseId") UUID courseId, @Param("tenantId") UUID tenantId);

    @Query("SELECT AVG(e.progressPercentage) FROM CourseEnrollment e WHERE e.tenantId = :tenantId AND e.employeeId = :employeeId")
    Double getAverageProgressForEmployee(@Param("tenantId") UUID tenantId, @Param("employeeId") UUID employeeId);
}
