package com.nulogic.hrms.leave;

import java.time.LocalDate;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, UUID> {
    boolean existsByOrg_IdAndEmployee_IdAndStatusNotAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            UUID orgId, UUID employeeId, LeaveRequestStatus status, LocalDate endDate, LocalDate startDate);

    Page<LeaveRequest> findByOrg_IdAndEmployee_Id(UUID orgId, UUID employeeId, Pageable pageable);

    Page<LeaveRequest> findByOrg_IdAndEmployee_Manager_Id(UUID orgId, UUID managerId, Pageable pageable);

    Page<LeaveRequest> findByOrg_IdAndEmployee_DepartmentId(UUID orgId, UUID departmentId, Pageable pageable);

    Page<LeaveRequest> findByOrg_Id(UUID orgId, Pageable pageable);

    long countByOrg_IdAndStatus(UUID orgId, LeaveRequestStatus status);

    long countByOrg_IdAndEmployee_DepartmentIdAndStatus(UUID orgId, UUID departmentId, LeaveRequestStatus status);

    long countByOrg_IdAndEmployee_Manager_IdAndStatus(UUID orgId, UUID managerId, LeaveRequestStatus status);

    long countByOrg_IdAndEmployee_IdAndStatus(UUID orgId, UUID employeeId, LeaveRequestStatus status);

    @Query("""
            select count(lr) from LeaveRequest lr
            where lr.org.id = :orgId
              and lr.status = :status
              and lr.startDate <= :date
              and lr.endDate >= :date
            """)
    long countByOrgAndStatusOverlappingDate(@Param("orgId") UUID orgId,
                                            @Param("status") LeaveRequestStatus status,
                                            @Param("date") LocalDate date);

    @Query("""
            select count(lr) from LeaveRequest lr
            where lr.org.id = :orgId
              and lr.status = :status
              and lr.employee.departmentId = :departmentId
              and lr.startDate <= :date
              and lr.endDate >= :date
            """)
    long countByOrgAndDepartmentAndStatusOverlappingDate(@Param("orgId") UUID orgId,
                                                         @Param("departmentId") UUID departmentId,
                                                         @Param("status") LeaveRequestStatus status,
                                                         @Param("date") LocalDate date);

    @Query("""
            select count(lr) from LeaveRequest lr
            where lr.org.id = :orgId
              and lr.status = :status
              and lr.employee.manager.id = :managerId
              and lr.startDate <= :date
              and lr.endDate >= :date
            """)
    long countByOrgAndManagerAndStatusOverlappingDate(@Param("orgId") UUID orgId,
                                                      @Param("managerId") UUID managerId,
                                                      @Param("status") LeaveRequestStatus status,
                                                      @Param("date") LocalDate date);

    @Query("""
            select count(lr) from LeaveRequest lr
            where lr.org.id = :orgId
              and lr.status = :status
              and lr.employee.id = :employeeId
              and lr.startDate <= :date
              and lr.endDate >= :date
            """)
    long countByOrgAndEmployeeAndStatusOverlappingDate(@Param("orgId") UUID orgId,
                                                       @Param("employeeId") UUID employeeId,
                                                       @Param("status") LeaveRequestStatus status,
                                                       @Param("date") LocalDate date);
}
