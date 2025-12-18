package com.hrms.infrastructure.lms.repository;

import com.hrms.domain.lms.ContentProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ContentProgressRepository extends JpaRepository<ContentProgress, UUID> {

    Optional<ContentProgress> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<ContentProgress> findByEnrollmentIdAndContentIdAndTenantId(UUID enrollmentId, UUID contentId, UUID tenantId);

    @Query("SELECT p FROM ContentProgress p WHERE p.tenantId = :tenantId AND p.enrollmentId = :enrollmentId")
    List<ContentProgress> findByEnrollment(@Param("tenantId") UUID tenantId, @Param("enrollmentId") UUID enrollmentId);

    @Query("SELECT p FROM ContentProgress p WHERE p.tenantId = :tenantId AND p.enrollmentId = :enrollmentId AND p.moduleId = :moduleId")
    List<ContentProgress> findByEnrollmentAndModule(@Param("tenantId") UUID tenantId, @Param("enrollmentId") UUID enrollmentId, @Param("moduleId") UUID moduleId);

    @Query("SELECT COUNT(p) FROM ContentProgress p WHERE p.enrollmentId = :enrollmentId AND p.status = 'COMPLETED'")
    Long countCompletedByEnrollment(@Param("enrollmentId") UUID enrollmentId);

    void deleteAllByEnrollmentId(UUID enrollmentId);
}
