package com.hrms.infrastructure.lms.repository;

import com.hrms.domain.lms.Certificate;
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
public interface CertificateRepository extends JpaRepository<Certificate, UUID> {

    Optional<Certificate> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<Certificate> findByCertificateNumber(String certificateNumber);

    Optional<Certificate> findByEnrollmentIdAndTenantId(UUID enrollmentId, UUID tenantId);

    @Query("SELECT c FROM Certificate c WHERE c.tenantId = :tenantId AND c.employeeId = :employeeId AND c.isActive = true")
    List<Certificate> findActiveByEmployee(@Param("tenantId") UUID tenantId, @Param("employeeId") UUID employeeId);

    Page<Certificate> findAllByCourseIdAndTenantId(UUID courseId, UUID tenantId, Pageable pageable);

    @Query("SELECT COUNT(c) FROM Certificate c WHERE c.tenantId = :tenantId AND c.employeeId = :employeeId AND c.isActive = true")
    Long countActiveByEmployee(@Param("tenantId") UUID tenantId, @Param("employeeId") UUID employeeId);
}
