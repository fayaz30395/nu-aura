package com.hrms.infrastructure.benefits.repository;

import com.hrms.domain.benefits.FlexBenefitAllocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FlexBenefitAllocationRepository extends JpaRepository<FlexBenefitAllocation, UUID> {

    Optional<FlexBenefitAllocation> findByIdAndTenantId(UUID id, UUID tenantId);

    List<FlexBenefitAllocation> findByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId);

    Optional<FlexBenefitAllocation> findByTenantIdAndEmployeeIdAndFiscalYear(
            UUID tenantId, UUID employeeId, int fiscalYear);

    @Query("SELECT fa FROM FlexBenefitAllocation fa WHERE fa.tenantId = :tenantId " +
            "AND fa.employeeId = :employeeId AND fa.status = 'ACTIVE'")
    Optional<FlexBenefitAllocation> findActiveAllocation(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId);

    @Query("SELECT fa FROM FlexBenefitAllocation fa WHERE fa.tenantId = :tenantId " +
            "AND fa.fiscalYear = :fiscalYear")
    List<FlexBenefitAllocation> findAllByFiscalYear(
            @Param("tenantId") UUID tenantId,
            @Param("fiscalYear") int fiscalYear);

    @Query("SELECT fa FROM FlexBenefitAllocation fa WHERE fa.tenantId = :tenantId " +
            "AND fa.status = 'ACTIVE' AND fa.expiryDate <= :date")
    List<FlexBenefitAllocation> findExpiringAllocations(
            @Param("tenantId") UUID tenantId,
            @Param("date") LocalDate date);

    @Query("SELECT fa FROM FlexBenefitAllocation fa WHERE fa.tenantId = :tenantId " +
            "AND fa.status = 'ACTIVE' AND fa.remainingCredits > 0 " +
            "AND fa.expiryDate <= :date")
    List<FlexBenefitAllocation> findAllocationsToForfeit(
            @Param("tenantId") UUID tenantId,
            @Param("date") LocalDate date);

    @Query("SELECT SUM(fa.totalCredits) FROM FlexBenefitAllocation fa " +
            "WHERE fa.tenantId = :tenantId AND fa.fiscalYear = :fiscalYear")
    BigDecimal getTotalAllocatedCredits(
            @Param("tenantId") UUID tenantId,
            @Param("fiscalYear") int fiscalYear);

    @Query("SELECT SUM(fa.usedCredits) FROM FlexBenefitAllocation fa " +
            "WHERE fa.tenantId = :tenantId AND fa.fiscalYear = :fiscalYear")
    BigDecimal getTotalUsedCredits(
            @Param("tenantId") UUID tenantId,
            @Param("fiscalYear") int fiscalYear);

    @Query("SELECT SUM(fa.forfeitedCredits) FROM FlexBenefitAllocation fa " +
            "WHERE fa.tenantId = :tenantId AND fa.fiscalYear = :fiscalYear")
    BigDecimal getTotalForfeitedCredits(
            @Param("tenantId") UUID tenantId,
            @Param("fiscalYear") int fiscalYear);

    @Query("SELECT fa.status, COUNT(fa) FROM FlexBenefitAllocation fa " +
            "WHERE fa.tenantId = :tenantId AND fa.fiscalYear = :fiscalYear " +
            "GROUP BY fa.status")
    List<Object[]> countByStatus(
            @Param("tenantId") UUID tenantId,
            @Param("fiscalYear") int fiscalYear);
}
