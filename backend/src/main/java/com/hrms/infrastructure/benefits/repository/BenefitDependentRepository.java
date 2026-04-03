package com.hrms.infrastructure.benefits.repository;

import com.hrms.domain.benefits.BenefitDependent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BenefitDependentRepository extends JpaRepository<BenefitDependent, UUID> {

    Optional<BenefitDependent> findByIdAndTenantId(UUID id, UUID tenantId);

    List<BenefitDependent> findByTenantIdAndEnrollmentId(UUID tenantId, UUID enrollmentId);

    @Query("SELECT bd FROM BenefitDependent bd WHERE bd.tenantId = :tenantId " +
            "AND bd.enrollment.employeeId = :employeeId")
    List<BenefitDependent> findByEmployeeId(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId);

    @Query("SELECT bd FROM BenefitDependent bd WHERE bd.tenantId = :tenantId " +
            "AND bd.enrollment.employeeId = :employeeId " +
            "AND bd.status = 'ACTIVE' AND bd.isCovered = true")
    List<BenefitDependent> findCoveredDependentsForEmployee(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId);

    @Query("SELECT bd FROM BenefitDependent bd WHERE bd.tenantId = :tenantId " +
            "AND bd.status = 'PENDING_VERIFICATION'")
    List<BenefitDependent> findPendingVerification(@Param("tenantId") UUID tenantId);

    @Query("SELECT bd FROM BenefitDependent bd WHERE bd.tenantId = :tenantId " +
            "AND bd.relationship = :relationship AND bd.enrollment.employeeId = :employeeId")
    List<BenefitDependent> findByRelationship(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId,
            @Param("relationship") BenefitDependent.Relationship relationship);

    @Query("SELECT COUNT(bd) FROM BenefitDependent bd " +
            "WHERE bd.enrollment.id = :enrollmentId AND bd.isCovered = true")
    long countCoveredDependentsForEnrollment(@Param("enrollmentId") UUID enrollmentId);

    @Query("SELECT bd.relationship, COUNT(bd) FROM BenefitDependent bd " +
            "WHERE bd.tenantId = :tenantId AND bd.status = 'ACTIVE' " +
            "GROUP BY bd.relationship")
    List<Object[]> countByRelationship(@Param("tenantId") UUID tenantId);
}
