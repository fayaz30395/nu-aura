package com.hrms.infrastructure.contract.repository;

import com.hrms.domain.contract.Contract;
import com.hrms.domain.contract.ContractStatus;
import com.hrms.domain.contract.ContractType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for Contract entity
 */
@Repository
public interface ContractRepository extends JpaRepository<Contract, UUID> {

    // Basic queries
    Optional<Contract> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<Contract> findByTenantId(UUID tenantId, Pageable pageable);

    Page<Contract> findByTenantIdAndStatus(UUID tenantId, ContractStatus status, Pageable pageable);

    Page<Contract> findByTenantIdAndType(UUID tenantId, ContractType type, Pageable pageable);

    // Employee contracts
    List<Contract> findByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId);

    Page<Contract> findByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId, Pageable pageable);

    // Vendor contracts
    List<Contract> findByTenantIdAndVendorNameIgnoreCase(UUID tenantId, String vendorName);

    // Status and type specific queries
    List<Contract> findByTenantIdAndStatus(UUID tenantId, ContractStatus status);

    List<Contract> findByTenantIdAndType(UUID tenantId, ContractType type);

    // Expiry related queries
    @Query("SELECT c FROM Contract c WHERE c.tenantId = :tenantId AND c.status = :status " +
            "AND c.endDate IS NOT NULL AND c.endDate BETWEEN :startDate AND :endDate")
    List<Contract> findExpiringContracts(
            @Param("tenantId") UUID tenantId,
            @Param("status") ContractStatus status,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    @Query("SELECT c FROM Contract c WHERE c.tenantId = :tenantId AND c.status = :status " +
            "AND c.endDate IS NOT NULL AND c.endDate BETWEEN :startDate AND :endDate")
    Page<Contract> findExpiringContracts(
            @Param("tenantId") UUID tenantId,
            @Param("status") ContractStatus status,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            Pageable pageable
    );

    @Query("SELECT c FROM Contract c WHERE c.tenantId = :tenantId AND c.status = 'ACTIVE' " +
            "AND c.endDate IS NOT NULL AND c.endDate <= CURRENT_DATE")
    List<Contract> findExpiredContracts(@Param("tenantId") UUID tenantId);

    @Query("SELECT c FROM Contract c WHERE c.tenantId = :tenantId AND c.status = 'ACTIVE' " +
            "AND c.endDate IS NOT NULL AND c.endDate <= CURRENT_DATE")
    Page<Contract> findExpiredContracts(@Param("tenantId") UUID tenantId, Pageable pageable);

    // Active contracts
    @Query("SELECT c FROM Contract c WHERE c.tenantId = :tenantId AND c.status = 'ACTIVE' " +
            "AND c.startDate <= CURRENT_DATE AND (c.endDate IS NULL OR c.endDate >= CURRENT_DATE)")
    List<Contract> findActiveContracts(@Param("tenantId") UUID tenantId);

    @Query("SELECT c FROM Contract c WHERE c.tenantId = :tenantId AND c.status = 'ACTIVE' " +
            "AND c.startDate <= CURRENT_DATE AND (c.endDate IS NULL OR c.endDate >= CURRENT_DATE)")
    Page<Contract> findActiveContracts(@Param("tenantId") UUID tenantId, Pageable pageable);

    // Search
    @Query("SELECT c FROM Contract c WHERE c.tenantId = :tenantId AND " +
            "(LOWER(c.title) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(c.vendorName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(c.description) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Contract> searchContracts(@Param("tenantId") UUID tenantId, @Param("search") String search, Pageable pageable);

    // Auto-renewal eligible contracts
    @Query("SELECT c FROM Contract c WHERE c.tenantId = :tenantId AND c.autoRenew = true " +
            "AND c.status = 'ACTIVE' AND c.endDate IS NOT NULL AND c.endDate <= CURRENT_DATE")
    List<Contract> findAutoRenewalEligibleContracts(@Param("tenantId") UUID tenantId);

    // ===================== Scheduler Queries =====================

    /**
     * Find active contracts with an end date within the given window, scoped to a tenant.
     * Used by the contract lifecycle scheduler to detect approaching expiry.
     */
    @Query("SELECT c FROM Contract c WHERE c.tenantId = :tenantId AND c.status = 'ACTIVE' " +
            "AND c.endDate IS NOT NULL AND c.endDate BETWEEN CURRENT_DATE AND :windowEnd")
    List<Contract> findActiveContractsExpiringBefore(
            @Param("tenantId") UUID tenantId,
            @Param("windowEnd") LocalDate windowEnd
    );

    /**
     * Find active contracts past their end date that have NOT yet been marked expired.
     * Used by the scheduler to auto-expire stale contracts.
     */
    @Query("SELECT c FROM Contract c WHERE c.tenantId = :tenantId AND c.status = 'ACTIVE' " +
            "AND c.endDate IS NOT NULL AND c.endDate < CURRENT_DATE")
    List<Contract> findActiveContractsPastEndDate(@Param("tenantId") UUID tenantId);
}
