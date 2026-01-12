package com.hrms.infrastructure.platform.repository;

import com.hrms.domain.platform.NuApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NuApplicationRepository extends JpaRepository<NuApplication, UUID> {

    /**
     * Find application by its unique code
     */
    Optional<NuApplication> findByCode(String code);

    /**
     * Check if application code exists
     */
    boolean existsByCode(String code);

    /**
     * Find all active applications
     */
    List<NuApplication> findByStatusOrderByDisplayOrderAsc(NuApplication.ApplicationStatus status);

    /**
     * Find all non-deprecated applications
     */
    @Query("SELECT a FROM NuApplication a WHERE a.status != 'DEPRECATED' ORDER BY a.displayOrder ASC")
    List<NuApplication> findAllAvailable();

    /**
     * Find applications available to a specific tenant
     */
    @Query("SELECT a FROM NuApplication a JOIN TenantApplication ta ON ta.application = a " +
           "WHERE ta.tenantId = :tenantId AND ta.status IN ('ACTIVE', 'TRIAL') " +
           "AND a.status = 'ACTIVE' ORDER BY a.displayOrder ASC")
    List<NuApplication> findAvailableForTenant(@Param("tenantId") UUID tenantId);

    /**
     * Find application with its permissions
     */
    @Query("SELECT DISTINCT a FROM NuApplication a LEFT JOIN FETCH a.permissions WHERE a.code = :code")
    Optional<NuApplication> findByCodeWithPermissions(@Param("code") String code);
}
