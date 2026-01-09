package com.nulogic.hrms.attendance;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AttendanceDayRepository extends JpaRepository<AttendanceDay, UUID> {
    Optional<AttendanceDay> findByOrg_IdAndEmployee_IdAndAttendanceDate(UUID orgId, UUID employeeId, LocalDate date);

    Page<AttendanceDay> findByOrg_IdAndEmployee_Id(UUID orgId, UUID employeeId, Pageable pageable);

    Page<AttendanceDay> findByOrg_IdAndEmployee_Manager_Id(UUID orgId, UUID managerId, Pageable pageable);

    Page<AttendanceDay> findByOrg_IdAndEmployee_DepartmentId(UUID orgId, UUID departmentId, Pageable pageable);

    Page<AttendanceDay> findByOrg_Id(UUID orgId, Pageable pageable);

    Page<AttendanceDay> findByOrg_IdAndAttendanceDate(UUID orgId, LocalDate date, Pageable pageable);

    Page<AttendanceDay> findByOrg_IdAndEmployee_DepartmentIdAndAttendanceDate(UUID orgId, UUID departmentId,
                                                                             LocalDate date, Pageable pageable);

    Page<AttendanceDay> findByOrg_IdAndEmployee_Manager_IdAndAttendanceDate(UUID orgId, UUID managerId,
                                                                           LocalDate date, Pageable pageable);

    Page<AttendanceDay> findByOrg_IdAndEmployee_IdAndAttendanceDate(UUID orgId, UUID employeeId,
                                                                    LocalDate date, Pageable pageable);

    List<AttendanceDay> findByOrg_IdAndAttendanceDateBetween(UUID orgId, LocalDate startDate, LocalDate endDate);

    List<AttendanceDay> findByOrg_IdAndEmployee_DepartmentIdAndAttendanceDateBetween(UUID orgId, UUID departmentId,
                                                                                     LocalDate startDate, LocalDate endDate);

    List<AttendanceDay> findByOrg_IdAndEmployee_Manager_IdAndAttendanceDateBetween(UUID orgId, UUID managerId,
                                                                                    LocalDate startDate, LocalDate endDate);

    List<AttendanceDay> findByOrg_IdAndEmployee_IdAndAttendanceDateBetween(UUID orgId, UUID employeeId,
                                                                           LocalDate startDate, LocalDate endDate);

    @Query("""
            select count(ad) from AttendanceDay ad
            where ad.org.id = :orgId
              and ad.attendanceDate = :date
              and ad.status in :statuses
            """)
    long countByOrgAndDateAndStatusIn(@Param("orgId") UUID orgId,
                                      @Param("date") LocalDate date,
                                      @Param("statuses") Collection<AttendanceStatus> statuses);

    @Query("""
            select count(ad) from AttendanceDay ad
            where ad.org.id = :orgId
              and ad.attendanceDate = :date
              and ad.employee.departmentId = :departmentId
              and ad.status in :statuses
            """)
    long countByOrgAndDateAndDepartmentAndStatusIn(@Param("orgId") UUID orgId,
                                                   @Param("departmentId") UUID departmentId,
                                                   @Param("date") LocalDate date,
                                                   @Param("statuses") Collection<AttendanceStatus> statuses);

    @Query("""
            select count(ad) from AttendanceDay ad
            where ad.org.id = :orgId
              and ad.attendanceDate = :date
              and ad.employee.manager.id = :managerId
              and ad.status in :statuses
            """)
    long countByOrgAndDateAndManagerAndStatusIn(@Param("orgId") UUID orgId,
                                                @Param("managerId") UUID managerId,
                                                @Param("date") LocalDate date,
                                                @Param("statuses") Collection<AttendanceStatus> statuses);

    @Query("""
            select count(ad) from AttendanceDay ad
            where ad.org.id = :orgId
              and ad.attendanceDate = :date
              and ad.employee.id = :employeeId
              and ad.status in :statuses
            """)
    long countByOrgAndDateAndEmployeeAndStatusIn(@Param("orgId") UUID orgId,
                                                 @Param("employeeId") UUID employeeId,
                                                 @Param("date") LocalDate date,
                                                 @Param("statuses") Collection<AttendanceStatus> statuses);
}
