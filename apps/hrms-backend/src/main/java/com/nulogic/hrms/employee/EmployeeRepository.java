package com.nulogic.hrms.employee;

import java.util.Optional;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EmployeeRepository extends JpaRepository<Employee, UUID> {
    Optional<Employee> findByOrg_IdAndOfficialEmail(UUID orgId, String officialEmail);

    Optional<Employee> findByOrg_IdAndUser_Id(UUID orgId, UUID userId);

    Optional<Employee> findByOrg_IdAndEmployeeCode(UUID orgId, String employeeCode);

    Page<Employee> findByOrg_Id(UUID orgId, Pageable pageable);

    Page<Employee> findByOrg_IdAndDepartmentId(UUID orgId, UUID departmentId, Pageable pageable);

    Page<Employee> findByOrg_IdAndManager_Id(UUID orgId, UUID managerId, Pageable pageable);

    Page<Employee> findByOrg_IdAndUser_Id(UUID orgId, UUID userId, Pageable pageable);

    long countByOrg_Id(UUID orgId);

    long countByOrg_IdAndDepartmentId(UUID orgId, UUID departmentId);

    long countByOrg_IdAndManager_Id(UUID orgId, UUID managerId);

    long countByOrg_IdAndUser_Id(UUID orgId, UUID userId);

    long countByOrg_IdAndJoinDateBetween(UUID orgId, LocalDate startDate, LocalDate endDate);

    long countByOrg_IdAndJoinDateBefore(UUID orgId, LocalDate beforeDate);

    long countByOrg_IdAndDepartmentIdAndJoinDateBetween(UUID orgId, UUID departmentId, LocalDate startDate, LocalDate endDate);

    long countByOrg_IdAndDepartmentIdAndJoinDateBefore(UUID orgId, UUID departmentId, LocalDate beforeDate);

    long countByOrg_IdAndManager_IdAndJoinDateBetween(UUID orgId, UUID managerId, LocalDate startDate, LocalDate endDate);

    long countByOrg_IdAndManager_IdAndJoinDateBefore(UUID orgId, UUID managerId, LocalDate beforeDate);

    @Query("""
            select e from Employee e
            where e.org.id = :orgId
              and (
                :search is null
                or lower(e.employeeCode) like :search
                or lower(e.officialEmail) like :search
                or lower(e.firstName) like :search
                or lower(coalesce(e.lastName, '')) like :search
                or lower(concat(e.firstName, ' ', coalesce(e.lastName, ''))) like :search
              )
            """)
    Page<Employee> searchForOrgScope(@Param("orgId") UUID orgId,
                                     @Param("search") String search,
                                     Pageable pageable);

    @Query("""
            select e from Employee e
            where e.org.id = :orgId
              and e.departmentId = :departmentId
              and (
                :search is null
                or lower(e.employeeCode) like :search
                or lower(e.officialEmail) like :search
                or lower(e.firstName) like :search
                or lower(coalesce(e.lastName, '')) like :search
                or lower(concat(e.firstName, ' ', coalesce(e.lastName, ''))) like :search
              )
            """)
    Page<Employee> searchForDepartmentScope(@Param("orgId") UUID orgId,
                                            @Param("departmentId") UUID departmentId,
                                            @Param("search") String search,
                                            Pageable pageable);

    @Query("""
            select e from Employee e
            where e.org.id = :orgId
              and e.manager.id = :managerId
              and (
                :search is null
                or lower(e.employeeCode) like :search
                or lower(e.officialEmail) like :search
                or lower(e.firstName) like :search
                or lower(coalesce(e.lastName, '')) like :search
                or lower(concat(e.firstName, ' ', coalesce(e.lastName, ''))) like :search
              )
            """)
    Page<Employee> searchForTeamScope(@Param("orgId") UUID orgId,
                                      @Param("managerId") UUID managerId,
                                      @Param("search") String search,
                                      Pageable pageable);

    @Query("""
            select e from Employee e
            where e.org.id = :orgId
              and e.user.id = :userId
              and (
                :search is null
                or lower(e.employeeCode) like :search
                or lower(e.officialEmail) like :search
                or lower(e.firstName) like :search
                or lower(coalesce(e.lastName, '')) like :search
                or lower(concat(e.firstName, ' ', coalesce(e.lastName, ''))) like :search
              )
            """)
    Page<Employee> searchForSelfScope(@Param("orgId") UUID orgId,
                                      @Param("userId") UUID userId,
                                      @Param("search") String search,
                                      Pageable pageable);
}
