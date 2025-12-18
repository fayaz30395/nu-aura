package com.hrms.infrastructure.compensation.repository;

import com.hrms.domain.compensation.CompensationReviewCycle;
import com.hrms.domain.compensation.CompensationReviewCycle.CycleStatus;
import com.hrms.domain.compensation.CompensationReviewCycle.CycleType;
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
public interface CompensationReviewCycleRepository extends JpaRepository<CompensationReviewCycle, UUID> {

    // Basic tenant-aware queries
    Optional<CompensationReviewCycle> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<CompensationReviewCycle> findByTenantIdOrderByCreatedAtDesc(UUID tenantId, Pageable pageable);

    // Find by status
    Page<CompensationReviewCycle> findByTenantIdAndStatusOrderByCreatedAtDesc(
            UUID tenantId, CycleStatus status, Pageable pageable);

    List<CompensationReviewCycle> findByTenantIdAndStatusIn(UUID tenantId, List<CycleStatus> statuses);

    // Find active cycles
    @Query("SELECT c FROM CompensationReviewCycle c WHERE c.tenantId = :tenantId " +
            "AND c.status IN ('PLANNING', 'IN_PROGRESS', 'REVIEW', 'APPROVAL') " +
            "ORDER BY c.startDate DESC")
    List<CompensationReviewCycle> findActiveCycles(@Param("tenantId") UUID tenantId);

    // Find by fiscal year
    Page<CompensationReviewCycle> findByTenantIdAndFiscalYearOrderByStartDateDesc(
            UUID tenantId, Integer fiscalYear, Pageable pageable);

    List<CompensationReviewCycle> findByTenantIdAndFiscalYear(UUID tenantId, Integer fiscalYear);

    // Find by type
    Page<CompensationReviewCycle> findByTenantIdAndCycleTypeOrderByCreatedAtDesc(
            UUID tenantId, CycleType cycleType, Pageable pageable);

    // Search with filters
    @Query("SELECT c FROM CompensationReviewCycle c WHERE c.tenantId = :tenantId " +
            "AND (:status IS NULL OR c.status = :status) " +
            "AND (:cycleType IS NULL OR c.cycleType = :cycleType) " +
            "AND (:fiscalYear IS NULL OR c.fiscalYear = :fiscalYear) " +
            "ORDER BY c.startDate DESC")
    Page<CompensationReviewCycle> searchCycles(
            @Param("tenantId") UUID tenantId,
            @Param("status") CycleStatus status,
            @Param("cycleType") CycleType cycleType,
            @Param("fiscalYear") Integer fiscalYear,
            Pageable pageable);

    // Find latest by type
    Optional<CompensationReviewCycle> findFirstByTenantIdAndCycleTypeOrderByFiscalYearDescStartDateDesc(
            UUID tenantId, CycleType cycleType);

    // Statistics
    @Query("SELECT c.status, COUNT(c) FROM CompensationReviewCycle c " +
            "WHERE c.tenantId = :tenantId " +
            "GROUP BY c.status")
    List<Object[]> countByStatus(@Param("tenantId") UUID tenantId);

    long countByTenantIdAndFiscalYear(UUID tenantId, Integer fiscalYear);

    // Check for overlapping cycles
    @Query("SELECT COUNT(c) > 0 FROM CompensationReviewCycle c WHERE c.tenantId = :tenantId " +
            "AND c.id != :excludeId " +
            "AND c.cycleType = :cycleType " +
            "AND c.fiscalYear = :fiscalYear " +
            "AND c.status NOT IN ('CANCELLED', 'COMPLETED')")
    boolean existsOverlappingCycle(
            @Param("tenantId") UUID tenantId,
            @Param("excludeId") UUID excludeId,
            @Param("cycleType") CycleType cycleType,
            @Param("fiscalYear") Integer fiscalYear);
}
