package com.hrms.infrastructure.travel.repository;

import com.hrms.domain.travel.TravelRequest;
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
public interface TravelRequestRepository extends JpaRepository<TravelRequest, UUID> {

    List<TravelRequest> findByEmployeeIdAndTenantId(UUID employeeId, UUID tenantId);

    Page<TravelRequest> findByEmployeeIdAndTenantId(UUID employeeId, UUID tenantId, Pageable pageable);

    Optional<TravelRequest> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<TravelRequest> findByRequestNumberAndTenantId(String requestNumber, UUID tenantId);

    Page<TravelRequest> findByTenantId(UUID tenantId, Pageable pageable);

    List<TravelRequest> findByTenantIdAndStatus(UUID tenantId, TravelRequest.TravelStatus status);

    Page<TravelRequest> findByTenantIdAndStatus(UUID tenantId, TravelRequest.TravelStatus status, Pageable pageable);

    Page<TravelRequest> findByTenantIdAndStatusIn(UUID tenantId, List<TravelRequest.TravelStatus> statuses, Pageable pageable);

    List<TravelRequest> findByTenantIdAndDepartureDateBetweenAndStatus(UUID tenantId, LocalDate startDate, LocalDate endDate, TravelRequest.TravelStatus status);

    @Query("SELECT t FROM TravelRequest t WHERE t.tenantId = :tenantId AND t.status = 'PENDING_APPROVAL'")
    List<TravelRequest> findPendingApprovals(@Param("tenantId") UUID tenantId);

    @Query("SELECT t FROM TravelRequest t WHERE t.tenantId = :tenantId AND t.departureDate BETWEEN :startDate AND :endDate")
    List<TravelRequest> findByDateRange(@Param("tenantId") UUID tenantId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query("SELECT t FROM TravelRequest t WHERE t.tenantId = :tenantId AND t.status = 'APPROVED' AND t.departureDate >= :date")
    List<TravelRequest> findUpcomingApproved(@Param("tenantId") UUID tenantId, @Param("date") LocalDate date);

    @Query("SELECT t FROM TravelRequest t WHERE t.tenantId = :tenantId AND t.employeeId = :employeeId AND t.status IN ('APPROVED', 'BOOKED', 'IN_PROGRESS')")
    List<TravelRequest> findActiveByEmployee(@Param("tenantId") UUID tenantId, @Param("employeeId") UUID employeeId);

    @Query("SELECT COUNT(t) FROM TravelRequest t WHERE t.tenantId = :tenantId AND t.status = :status")
    long countByStatus(@Param("tenantId") UUID tenantId, @Param("status") TravelRequest.TravelStatus status);
}
