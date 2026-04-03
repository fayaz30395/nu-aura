package com.hrms.infrastructure.leave.repository;

import com.hrms.domain.leave.LeaveRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface LeaveRequestRepository
        extends JpaRepository<LeaveRequest, UUID>, JpaSpecificationExecutor<LeaveRequest> {

    Page<LeaveRequest> findAllByTenantId(UUID tenantId, Pageable pageable);

    Page<LeaveRequest> findAllByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId, Pageable pageable);

    Page<LeaveRequest> findAllByTenantIdAndStatus(UUID tenantId, LeaveRequest.LeaveRequestStatus status,
                                                  Pageable pageable);

    List<LeaveRequest> findByTenantIdAndStartDateBetween(UUID tenantId, LocalDate startDate, LocalDate endDate);

    @Query("SELECT lr FROM LeaveRequest lr WHERE lr.tenantId = :tenantId AND lr.employeeId = :employeeId " +
            "AND lr.status = 'APPROVED' AND " +
            "((lr.startDate <= :endDate AND lr.endDate >= :startDate))")
    Iterable<LeaveRequest> findOverlappingLeaves(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("SELECT COUNT(lr) FROM LeaveRequest lr WHERE lr.tenantId = :tenantId " +
            "AND lr.employeeId = :employeeId AND lr.status = 'PENDING'")
    long countPendingRequests(@Param("tenantId") UUID tenantId, @Param("employeeId") UUID employeeId);

    // Analytics methods
    Long countByTenantIdAndStatus(UUID tenantId, LeaveRequest.LeaveRequestStatus status);

    @Query("SELECT COUNT(lr) FROM LeaveRequest lr WHERE lr.tenantId = :tenantId " +
            "AND :date BETWEEN lr.startDate AND lr.endDate AND lr.status = :status")
    Long countByTenantIdAndDateAndStatus(
            @Param("tenantId") UUID tenantId,
            @Param("date") LocalDate date,
            @Param("status") LeaveRequest.LeaveRequestStatus status);

    @Query("SELECT COUNT(lr) FROM LeaveRequest lr WHERE lr.tenantId = :tenantId " +
            "AND lr.startDate BETWEEN :startDate AND :endDate")
    Long countByTenantIdAndDateRange(
            @Param("tenantId") UUID tenantId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query(value = "SELECT lt.leave_name, COUNT(lr.id) FROM leave_requests lr JOIN leave_types lt ON lr.leave_type_id = lt.id WHERE lr.tenant_id = :tenantId GROUP BY lt.leave_name", nativeQuery = true)
    List<Object[]> findLeaveTypeDistribution(@Param("tenantId") UUID tenantId);

    // Team-based analytics methods
    @Query("SELECT COUNT(lr) FROM LeaveRequest lr WHERE lr.tenantId = :tenantId AND lr.status = :status AND lr.employeeId IN :employeeIds")
    Long countByTenantIdAndStatusAndEmployeeIdIn(@Param("tenantId") UUID tenantId,
                                                 @Param("status") LeaveRequest.LeaveRequestStatus status,
                                                 @Param("employeeIds") List<UUID> employeeIds);

    @Query("SELECT COUNT(lr) FROM LeaveRequest lr WHERE lr.tenantId = :tenantId " +
            "AND :date BETWEEN lr.startDate AND lr.endDate AND lr.status = :status AND lr.employeeId IN :employeeIds")
    Long countByTenantIdAndDateAndStatusAndEmployeeIdIn(
            @Param("tenantId") UUID tenantId,
            @Param("date") LocalDate date,
            @Param("status") LeaveRequest.LeaveRequestStatus status,
            @Param("employeeIds") List<UUID> employeeIds);

    // Single employee leave count for a date
    @Query("SELECT COUNT(lr) FROM LeaveRequest lr WHERE lr.tenantId = :tenantId " +
            "AND :date BETWEEN lr.startDate AND lr.endDate AND lr.status = :status AND lr.employeeId = :employeeId")
    Long countByTenantIdAndDateAndStatusAndEmployeeId(
            @Param("tenantId") UUID tenantId,
            @Param("date") LocalDate date,
            @Param("status") LeaveRequest.LeaveRequestStatus status,
            @Param("employeeId") UUID employeeId);

    // Single employee pending leave count
    Long countByTenantIdAndStatusAndEmployeeId(UUID tenantId, LeaveRequest.LeaveRequestStatus status,
                                               UUID employeeId);

    // Date range with status and employee list
    @Query("SELECT COUNT(lr) FROM LeaveRequest lr WHERE lr.tenantId = :tenantId " +
            "AND lr.startDate BETWEEN :startDate AND :endDate AND lr.status = :status AND lr.employeeId IN :employeeIds")
    Long countByTenantIdAndDateRangeAndStatusAndEmployeeIdIn(
            @Param("tenantId") UUID tenantId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("status") LeaveRequest.LeaveRequestStatus status,
            @Param("employeeIds") List<UUID> employeeIds);

    // Count approved leave days for employee in date range (PostgreSQL date
    // subtraction)
    @Query(value = "SELECT COALESCE(SUM((end_date - start_date) + 1), 0) FROM leave_requests " +
            "WHERE tenant_id = :tenantId AND employee_id = :employeeId " +
            "AND status = 'APPROVED' AND start_date <= :endDate AND end_date >= :startDate", nativeQuery = true)
    Long countApprovedLeaveDaysByEmployeeIdAndDateBetween(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    /**
     * Checks if an employee has an active approved leave covering a given date.
     * Used by auto-delegation in WorkflowService.
     */
    @Query("SELECT COUNT(lr) > 0 FROM LeaveRequest lr WHERE lr.tenantId = :tenantId " +
            "AND lr.employeeId = :employeeId AND lr.status = 'APPROVED' " +
            "AND :date BETWEEN lr.startDate AND lr.endDate")
    boolean isEmployeeOnLeave(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId,
            @Param("date") LocalDate date);

    // Count with status after a certain date
    @Query("SELECT COUNT(lr) FROM LeaveRequest lr WHERE lr.tenantId = :tenantId " +
            "AND lr.status = :status AND lr.employeeId = :employeeId AND lr.startDate >= :startDate")
    Long countByTenantIdAndStatusAndEmployeeIdAndDateAfter(
            @Param("tenantId") UUID tenantId,
            @Param("status") LeaveRequest.LeaveRequestStatus status,
            @Param("employeeId") UUID employeeId,
            @Param("startDate") LocalDate startDate);

    // ==================== N+1 PREVENTION: NATIVE JOIN QUERIES ====================

    /**
     * Fetch leave requests for an employee with leave type and employee name data
     * resolved in a single SQL JOIN — prevents N+1 when displaying leave history
     * lists where each row needs leave type label and employee display name.
     *
     * <p>LeaveRequest stores leaveTypeId and employeeId as plain UUID scalar columns
     * (no @ManyToOne ORM association), so JPQL JOIN FETCH is not applicable here.
     * This native query joins leave_types and employees in one round-trip.</p>
     *
     * <p>Returns Object[] per row: {lr.*, lt.leave_name, e.first_name, e.last_name}</p>
     * Use this instead of findAllByTenantIdAndEmployeeId when the caller also needs
     * leave type name or employee display name rendered in the response DTO.</p>
     */
    @Query(value = "SELECT lr.*, lt.leave_name, e.first_name, e.last_name " +
            "FROM leave_requests lr " +
            "LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id AND lt.tenant_id = :tenantId " +
            "LEFT JOIN employees e ON e.id = lr.employee_id AND e.tenant_id = :tenantId " +
            "WHERE lr.tenant_id = :tenantId AND lr.employee_id = :employeeId " +
            "ORDER BY lr.start_date DESC",
            nativeQuery = true)
    List<Object[]> findByEmployeeWithTypeAndName(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId);

    /**
     * Fetch all leave requests for a tenant in a date window with leave type and
     * employee data joined in one query — used by manager/HR list views that display
     * leave type name and employee name per row without N+1 secondary lookups.
     */
    @Query(value = "SELECT lr.*, lt.leave_name, e.first_name, e.last_name " +
            "FROM leave_requests lr " +
            "LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id AND lt.tenant_id = :tenantId " +
            "LEFT JOIN employees e ON e.id = lr.employee_id AND e.tenant_id = :tenantId " +
            "WHERE lr.tenant_id = :tenantId " +
            "AND lr.start_date BETWEEN :startDate AND :endDate " +
            "ORDER BY lr.start_date DESC",
            nativeQuery = true)
    List<Object[]> findByDateRangeWithTypeAndName(
            @Param("tenantId") UUID tenantId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);
}
