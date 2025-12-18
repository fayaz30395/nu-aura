package com.hrms.infrastructure.onboarding.repository;

import com.hrms.domain.onboarding.OnboardingDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OnboardingDocumentRepository extends JpaRepository<OnboardingDocument, UUID> {

    List<OnboardingDocument> findByProcessIdAndTenantId(UUID processId, UUID tenantId);

    List<OnboardingDocument> findByEmployeeIdAndTenantId(UUID employeeId, UUID tenantId);

    Optional<OnboardingDocument> findByIdAndTenantId(UUID id, UUID tenantId);

    List<OnboardingDocument> findByTenantIdAndStatus(UUID tenantId, OnboardingDocument.DocumentStatus status);

    @Query("SELECT d FROM OnboardingDocument d WHERE d.tenantId = :tenantId AND d.processId = :processId AND d.isMandatory = true AND d.status != 'VERIFIED'")
    List<OnboardingDocument> findPendingMandatoryDocuments(@Param("tenantId") UUID tenantId, @Param("processId") UUID processId);

    @Query("SELECT COUNT(d) FROM OnboardingDocument d WHERE d.processId = :processId AND d.status = 'VERIFIED'")
    long countVerifiedByProcess(@Param("processId") UUID processId);

    @Query("SELECT COUNT(d) FROM OnboardingDocument d WHERE d.processId = :processId AND d.isMandatory = true")
    long countMandatoryByProcess(@Param("processId") UUID processId);
}
