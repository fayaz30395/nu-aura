package com.hrms.infrastructure.lms.repository;

import com.hrms.domain.lms.Quiz;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface QuizRepository extends JpaRepository<Quiz, UUID> {

    Optional<Quiz> findByIdAndTenantId(UUID id, UUID tenantId);

    @Query("SELECT q FROM Quiz q WHERE q.courseId = :courseId AND q.tenantId = :tenantId ORDER BY q.createdAt DESC")
    List<Quiz> findByCourseIdAndTenantId(
            @Param("courseId") UUID courseId,
            @Param("tenantId") UUID tenantId);

    @Query("SELECT q FROM Quiz q WHERE q.moduleId = :moduleId AND q.tenantId = :tenantId")
    Optional<Quiz> findByModuleIdAndTenantId(
            @Param("moduleId") UUID moduleId,
            @Param("tenantId") UUID tenantId);

    @Query("SELECT q FROM Quiz q WHERE q.tenantId = :tenantId AND q.isActive = true")
    List<Quiz> findActiveQuizzesByTenantId(@Param("tenantId") UUID tenantId);
}
