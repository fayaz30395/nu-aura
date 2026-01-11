package com.nulogic.hrms.project;

import com.nulogic.hrms.project.dto.AllocationSummaryEmployeeRow;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProjectAllocationRepository extends JpaRepository<ProjectAllocation, UUID> {
    boolean existsByOrg_IdAndProject_IdAndEmployee_Id(UUID orgId, UUID projectId, UUID employeeId);

    boolean existsByOrg_IdAndProject_IdAndEmployee_Manager_Id(UUID orgId, UUID projectId, UUID managerId);

    boolean existsByOrg_IdAndProject_IdAndEmployee_DepartmentId(UUID orgId, UUID projectId, UUID departmentId);

    Optional<ProjectAllocation> findByOrg_IdAndId(UUID orgId, UUID id);

    @EntityGraph(attributePaths = {"employee", "project"})
    @Query("""
            select pa from ProjectAllocation pa
            join pa.project p
            where pa.org.id = :orgId
              and (:employeeId is null or pa.employee.id = :employeeId)
              and (:projectId is null or p.id = :projectId)
            """)
    Page<ProjectAllocation> findForOrgScope(@Param("orgId") UUID orgId,
                                            @Param("employeeId") UUID employeeId,
                                            @Param("projectId") UUID projectId,
                                            Pageable pageable);

    @EntityGraph(attributePaths = {"employee", "project"})
    @Query("""
            select pa from ProjectAllocation pa
            join pa.project p
            where pa.org.id = :orgId
              and pa.employee.departmentId = :departmentId
              and (:employeeId is null or pa.employee.id = :employeeId)
              and (:projectId is null or p.id = :projectId)
            """)
    Page<ProjectAllocation> findForDepartmentScope(@Param("orgId") UUID orgId,
                                                    @Param("departmentId") UUID departmentId,
                                                    @Param("employeeId") UUID employeeId,
                                                    @Param("projectId") UUID projectId,
                                                    Pageable pageable);

    @EntityGraph(attributePaths = {"employee", "project"})
    @Query("""
            select pa from ProjectAllocation pa
            join pa.project p
            where pa.org.id = :orgId
              and pa.employee.manager.id = :managerId
              and (:employeeId is null or pa.employee.id = :employeeId)
              and (:projectId is null or p.id = :projectId)
            """)
    Page<ProjectAllocation> findForTeamScope(@Param("orgId") UUID orgId,
                                              @Param("managerId") UUID managerId,
                                              @Param("employeeId") UUID employeeId,
                                              @Param("projectId") UUID projectId,
                                              Pageable pageable);

    @EntityGraph(attributePaths = {"employee", "project"})
    @Query("""
            select pa from ProjectAllocation pa
            join pa.project p
            where pa.org.id = :orgId
              and pa.employee.id = :employeeId
              and (:projectId is null or p.id = :projectId)
            """)
    Page<ProjectAllocation> findForSelfScope(@Param("orgId") UUID orgId,
                                              @Param("employeeId") UUID employeeId,
                                              @Param("projectId") UUID projectId,
                                              Pageable pageable);

    @Query("""
            select distinct new com.nulogic.hrms.project.dto.AllocationSummaryEmployeeRow(
                e.id, e.employeeCode, e.firstName, e.lastName, e.officialEmail
            )
              from ProjectAllocation pa
              join pa.employee e
             where pa.org.id = :orgId
               and pa.startDate <= :endDate
               and pa.endDate >= :startDate
               and (:employeeId is null or e.id = :employeeId)
               and (:search is null
                    or lower(coalesce(e.employeeCode, '')) like :search
                    or lower(coalesce(e.firstName, '')) like :search
                    or lower(coalesce(e.lastName, '')) like :search
                    or lower(coalesce(e.officialEmail, '')) like :search)
            """)
    List<AllocationSummaryEmployeeRow> findSummaryEmployeesForOrgScope(@Param("orgId") UUID orgId,
                                                                       @Param("startDate") LocalDate startDate,
                                                                       @Param("endDate") LocalDate endDate,
                                                                       @Param("employeeId") UUID employeeId,
                                                                       @Param("search") String search,
                                                                       Pageable pageable);

    @Query("""
            select count(distinct e.id)
              from ProjectAllocation pa
              join pa.employee e
             where pa.org.id = :orgId
               and pa.startDate <= :endDate
               and pa.endDate >= :startDate
               and (:employeeId is null or e.id = :employeeId)
               and (:search is null
                    or lower(coalesce(e.employeeCode, '')) like :search
                    or lower(coalesce(e.firstName, '')) like :search
                    or lower(coalesce(e.lastName, '')) like :search
                    or lower(coalesce(e.officialEmail, '')) like :search)
            """)
    long countSummaryEmployeesForOrgScope(@Param("orgId") UUID orgId,
                                          @Param("startDate") LocalDate startDate,
                                          @Param("endDate") LocalDate endDate,
                                          @Param("employeeId") UUID employeeId,
                                          @Param("search") String search);

    @Query("""
            select distinct new com.nulogic.hrms.project.dto.AllocationSummaryEmployeeRow(
                e.id, e.employeeCode, e.firstName, e.lastName, e.officialEmail
            )
              from ProjectAllocation pa
              join pa.employee e
             where pa.org.id = :orgId
               and e.departmentId = :departmentId
               and pa.startDate <= :endDate
               and pa.endDate >= :startDate
               and (:employeeId is null or e.id = :employeeId)
               and (:search is null
                    or lower(coalesce(e.employeeCode, '')) like :search
                    or lower(coalesce(e.firstName, '')) like :search
                    or lower(coalesce(e.lastName, '')) like :search
                    or lower(coalesce(e.officialEmail, '')) like :search)
            """)
    List<AllocationSummaryEmployeeRow> findSummaryEmployeesForDepartmentScope(@Param("orgId") UUID orgId,
                                                                              @Param("departmentId") UUID departmentId,
                                                                              @Param("startDate") LocalDate startDate,
                                                                              @Param("endDate") LocalDate endDate,
                                                                              @Param("employeeId") UUID employeeId,
                                                                              @Param("search") String search,
                                                                              Pageable pageable);

    @Query("""
            select count(distinct e.id)
              from ProjectAllocation pa
              join pa.employee e
             where pa.org.id = :orgId
               and e.departmentId = :departmentId
               and pa.startDate <= :endDate
               and pa.endDate >= :startDate
               and (:employeeId is null or e.id = :employeeId)
               and (:search is null
                    or lower(coalesce(e.employeeCode, '')) like :search
                    or lower(coalesce(e.firstName, '')) like :search
                    or lower(coalesce(e.lastName, '')) like :search
                    or lower(coalesce(e.officialEmail, '')) like :search)
            """)
    long countSummaryEmployeesForDepartmentScope(@Param("orgId") UUID orgId,
                                                 @Param("departmentId") UUID departmentId,
                                                 @Param("startDate") LocalDate startDate,
                                                 @Param("endDate") LocalDate endDate,
                                                 @Param("employeeId") UUID employeeId,
                                                 @Param("search") String search);

    @Query("""
            select distinct new com.nulogic.hrms.project.dto.AllocationSummaryEmployeeRow(
                e.id, e.employeeCode, e.firstName, e.lastName, e.officialEmail
            )
              from ProjectAllocation pa
              join pa.employee e
             where pa.org.id = :orgId
               and e.manager.id = :managerId
               and pa.startDate <= :endDate
               and pa.endDate >= :startDate
               and (:employeeId is null or e.id = :employeeId)
               and (:search is null
                    or lower(coalesce(e.employeeCode, '')) like :search
                    or lower(coalesce(e.firstName, '')) like :search
                    or lower(coalesce(e.lastName, '')) like :search
                    or lower(coalesce(e.officialEmail, '')) like :search)
            """)
    List<AllocationSummaryEmployeeRow> findSummaryEmployeesForTeamScope(@Param("orgId") UUID orgId,
                                                                         @Param("managerId") UUID managerId,
                                                                         @Param("startDate") LocalDate startDate,
                                                                         @Param("endDate") LocalDate endDate,
                                                                         @Param("employeeId") UUID employeeId,
                                                                         @Param("search") String search,
                                                                         Pageable pageable);

    @Query("""
            select count(distinct e.id)
              from ProjectAllocation pa
              join pa.employee e
             where pa.org.id = :orgId
               and e.manager.id = :managerId
               and pa.startDate <= :endDate
               and pa.endDate >= :startDate
               and (:employeeId is null or e.id = :employeeId)
               and (:search is null
                    or lower(coalesce(e.employeeCode, '')) like :search
                    or lower(coalesce(e.firstName, '')) like :search
                    or lower(coalesce(e.lastName, '')) like :search
                    or lower(coalesce(e.officialEmail, '')) like :search)
            """)
    long countSummaryEmployeesForTeamScope(@Param("orgId") UUID orgId,
                                           @Param("managerId") UUID managerId,
                                           @Param("startDate") LocalDate startDate,
                                           @Param("endDate") LocalDate endDate,
                                           @Param("employeeId") UUID employeeId,
                                           @Param("search") String search);

    @Query("""
            select distinct new com.nulogic.hrms.project.dto.AllocationSummaryEmployeeRow(
                e.id, e.employeeCode, e.firstName, e.lastName, e.officialEmail
            )
              from ProjectAllocation pa
              join pa.employee e
             where pa.org.id = :orgId
               and e.id = :employeeId
               and pa.startDate <= :endDate
               and pa.endDate >= :startDate
               and (:filterEmployeeId is null or e.id = :filterEmployeeId)
               and (:search is null
                    or lower(coalesce(e.employeeCode, '')) like :search
                    or lower(coalesce(e.firstName, '')) like :search
                    or lower(coalesce(e.lastName, '')) like :search
                    or lower(coalesce(e.officialEmail, '')) like :search)
            """)
    List<AllocationSummaryEmployeeRow> findSummaryEmployeesForSelfScope(@Param("orgId") UUID orgId,
                                                                        @Param("employeeId") UUID employeeId,
                                                                        @Param("startDate") LocalDate startDate,
                                                                        @Param("endDate") LocalDate endDate,
                                                                        @Param("filterEmployeeId") UUID filterEmployeeId,
                                                                        @Param("search") String search,
                                                                        Pageable pageable);

    @Query("""
            select count(distinct e.id)
              from ProjectAllocation pa
              join pa.employee e
             where pa.org.id = :orgId
               and e.id = :employeeId
               and pa.startDate <= :endDate
               and pa.endDate >= :startDate
               and (:filterEmployeeId is null or e.id = :filterEmployeeId)
               and (:search is null
                    or lower(coalesce(e.employeeCode, '')) like :search
                    or lower(coalesce(e.firstName, '')) like :search
                    or lower(coalesce(e.lastName, '')) like :search
                    or lower(coalesce(e.officialEmail, '')) like :search)
            """)
    long countSummaryEmployeesForSelfScope(@Param("orgId") UUID orgId,
                                           @Param("employeeId") UUID employeeId,
                                           @Param("startDate") LocalDate startDate,
                                           @Param("endDate") LocalDate endDate,
                                           @Param("filterEmployeeId") UUID filterEmployeeId,
                                           @Param("search") String search);

    @EntityGraph(attributePaths = {"project", "employee"})
    @Query("""
            select pa from ProjectAllocation pa
             where pa.org.id = :orgId
               and pa.employee.id in :employeeIds
               and pa.startDate <= :endDate
               and pa.endDate >= :startDate
            """)
    List<ProjectAllocation> findForEmployeesWithinRange(@Param("orgId") UUID orgId,
                                                        @Param("employeeIds") List<UUID> employeeIds,
                                                        @Param("startDate") LocalDate startDate,
                                                        @Param("endDate") LocalDate endDate);

    @Query("""
            select pa from ProjectAllocation pa
            join pa.project p
            where pa.org.id = :orgId
              and pa.employee.id = :employeeId
              and p.status = 'ACTIVE'
              and pa.startDate <= :endDate
              and pa.endDate >= :startDate
              and (:excludeId is null or pa.id <> :excludeId)
            """)
    List<ProjectAllocation> findOverlappingActiveAllocations(@Param("orgId") UUID orgId,
                                                             @Param("employeeId") UUID employeeId,
                                                             @Param("startDate") LocalDate startDate,
                                                             @Param("endDate") LocalDate endDate,
                                                             @Param("excludeId") UUID excludeId);

    @Modifying
    @Query("""
            update ProjectAllocation pa
               set pa.endDate = :closeDate
             where pa.project.id = :projectId
               and pa.endDate > :closeDate
            """)
    int endAllocationsAt(@Param("projectId") UUID projectId,
                         @Param("closeDate") LocalDate closeDate);
}
