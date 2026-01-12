package com.hrms.infrastructure.exit.repository;

import com.hrms.domain.exit.AssetRecovery;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AssetRecoveryRepository extends JpaRepository<AssetRecovery, UUID> {

    List<AssetRecovery> findByExitProcessIdAndTenantId(UUID exitProcessId, UUID tenantId);

    List<AssetRecovery> findByEmployeeIdAndTenantId(UUID employeeId, UUID tenantId);

    Page<AssetRecovery> findByTenantId(UUID tenantId, Pageable pageable);

    List<AssetRecovery> findByTenantIdAndStatus(UUID tenantId, AssetRecovery.RecoveryStatus status);

    @Query("SELECT a FROM AssetRecovery a WHERE a.tenantId = :tenantId AND a.exitProcessId = :exitProcessId AND a.status = 'PENDING'")
    List<AssetRecovery> findPendingByExitProcess(@Param("tenantId") UUID tenantId, @Param("exitProcessId") UUID exitProcessId);

    @Query("SELECT a FROM AssetRecovery a WHERE a.tenantId = :tenantId AND a.status = 'PENDING'")
    List<AssetRecovery> findAllPending(@Param("tenantId") UUID tenantId);

    @Query("SELECT a FROM AssetRecovery a WHERE a.tenantId = :tenantId AND a.status IN ('DAMAGED', 'LOST')")
    List<AssetRecovery> findDamagedOrLost(@Param("tenantId") UUID tenantId);

    @Query("SELECT a FROM AssetRecovery a WHERE a.tenantId = :tenantId AND a.assetType = :assetType")
    List<AssetRecovery> findByAssetType(@Param("tenantId") UUID tenantId, @Param("assetType") AssetRecovery.AssetType assetType);

    @Query("SELECT SUM(a.deductionAmount) FROM AssetRecovery a WHERE a.tenantId = :tenantId AND a.exitProcessId = :exitProcessId")
    BigDecimal getTotalDeductionsByExitProcess(@Param("tenantId") UUID tenantId, @Param("exitProcessId") UUID exitProcessId);

    @Query("SELECT COUNT(a) FROM AssetRecovery a WHERE a.exitProcessId = :exitProcessId AND a.status = 'PENDING'")
    long countPendingByExitProcess(@Param("exitProcessId") UUID exitProcessId);

    @Query("SELECT CASE WHEN COUNT(a) = 0 THEN true ELSE false END FROM AssetRecovery a WHERE a.exitProcessId = :exitProcessId AND a.status = 'PENDING'")
    boolean areAllAssetsRecovered(@Param("exitProcessId") UUID exitProcessId);

    Optional<AssetRecovery> findByIdAndTenantId(UUID id, UUID tenantId);
}
