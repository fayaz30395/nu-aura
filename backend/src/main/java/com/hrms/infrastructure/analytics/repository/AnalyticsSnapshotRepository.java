package com.hrms.infrastructure.analytics.repository;

import com.hrms.domain.analytics.AnalyticsSnapshot;
import com.hrms.domain.analytics.AnalyticsSnapshot.SnapshotPeriod;
import com.hrms.domain.analytics.AnalyticsSnapshot.SnapshotType;
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

@Repository
public interface AnalyticsSnapshotRepository extends JpaRepository<AnalyticsSnapshot, UUID> {

    Optional<AnalyticsSnapshot> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<AnalyticsSnapshot> findByTenantId(UUID tenantId, Pageable pageable);

    @Query("SELECT a FROM AnalyticsSnapshot a WHERE a.tenantId = :tenantId AND a.snapshotType = :type " +
           "ORDER BY a.snapshotDate DESC")
    List<AnalyticsSnapshot> findByType(@Param("tenantId") UUID tenantId, @Param("type") SnapshotType type);

    @Query("SELECT a FROM AnalyticsSnapshot a WHERE a.tenantId = :tenantId AND a.snapshotType = :type " +
           "ORDER BY a.snapshotDate DESC")
    Page<AnalyticsSnapshot> findByType(@Param("tenantId") UUID tenantId, @Param("type") SnapshotType type, Pageable pageable);

    @Query("SELECT a FROM AnalyticsSnapshot a WHERE a.tenantId = :tenantId AND a.period = :period " +
           "ORDER BY a.snapshotDate DESC")
    List<AnalyticsSnapshot> findByPeriod(@Param("tenantId") UUID tenantId, @Param("period") SnapshotPeriod period);

    @Query("SELECT a FROM AnalyticsSnapshot a WHERE a.tenantId = :tenantId AND a.snapshotType = :type " +
           "AND a.period = :period ORDER BY a.snapshotDate DESC")
    List<AnalyticsSnapshot> findByTypeAndPeriod(@Param("tenantId") UUID tenantId,
                                                 @Param("type") SnapshotType type,
                                                 @Param("period") SnapshotPeriod period);

    @Query("SELECT a FROM AnalyticsSnapshot a WHERE a.tenantId = :tenantId " +
           "AND a.snapshotDate >= :startDate AND a.snapshotDate <= :endDate ORDER BY a.snapshotDate")
    List<AnalyticsSnapshot> findByDateRange(@Param("tenantId") UUID tenantId,
                                            @Param("startDate") LocalDate startDate,
                                            @Param("endDate") LocalDate endDate);

    @Query("SELECT a FROM AnalyticsSnapshot a WHERE a.tenantId = :tenantId AND a.snapshotType = :type " +
           "AND a.snapshotDate >= :startDate AND a.snapshotDate <= :endDate ORDER BY a.snapshotDate")
    List<AnalyticsSnapshot> findByTypeAndDateRange(@Param("tenantId") UUID tenantId,
                                                    @Param("type") SnapshotType type,
                                                    @Param("startDate") LocalDate startDate,
                                                    @Param("endDate") LocalDate endDate);

    @Query("SELECT a FROM AnalyticsSnapshot a WHERE a.tenantId = :tenantId AND a.year = :year " +
           "AND a.snapshotType = :type ORDER BY a.month")
    List<AnalyticsSnapshot> findByYearAndType(@Param("tenantId") UUID tenantId,
                                               @Param("year") Integer year,
                                               @Param("type") SnapshotType type);

    @Query("SELECT a FROM AnalyticsSnapshot a WHERE a.tenantId = :tenantId AND a.year = :year " +
           "AND a.quarter = :quarter AND a.snapshotType = :type")
    Optional<AnalyticsSnapshot> findByYearQuarterAndType(@Param("tenantId") UUID tenantId,
                                                          @Param("year") Integer year,
                                                          @Param("quarter") Integer quarter,
                                                          @Param("type") SnapshotType type);

    @Query("SELECT a FROM AnalyticsSnapshot a WHERE a.tenantId = :tenantId AND a.snapshotType = :type " +
           "ORDER BY a.snapshotDate DESC LIMIT 1")
    Optional<AnalyticsSnapshot> findLatestByType(@Param("tenantId") UUID tenantId, @Param("type") SnapshotType type);

    @Query("SELECT a FROM AnalyticsSnapshot a WHERE a.tenantId = :tenantId AND a.snapshotDate = :date " +
           "AND a.snapshotType = :type")
    Optional<AnalyticsSnapshot> findByDateAndType(@Param("tenantId") UUID tenantId,
                                                   @Param("date") LocalDate date,
                                                   @Param("type") SnapshotType type);

    @Query("SELECT a FROM AnalyticsSnapshot a WHERE a.tenantId = :tenantId AND a.period = 'MONTHLY' " +
           "AND a.snapshotType = 'COMPREHENSIVE' ORDER BY a.snapshotDate DESC LIMIT 12")
    List<AnalyticsSnapshot> findLast12MonthsComprehensive(@Param("tenantId") UUID tenantId);

    void deleteByTenantIdAndSnapshotDateBefore(UUID tenantId, LocalDate date);
}
