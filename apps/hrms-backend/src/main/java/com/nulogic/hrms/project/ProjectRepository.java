package com.nulogic.hrms.project;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProjectRepository extends JpaRepository<Project, UUID> {
    @EntityGraph(attributePaths = {"owner"})
    @Query("""
            select p from Project p
            where p.org.id = :orgId
              and (:status is null or p.status = :status)
              and (:type is null or p.type = :type)
              and (:ownerId is null or p.owner.id = :ownerId)
              and (
                :search is null
                or lower(p.projectCode) like :search
                or lower(p.name) like :search
                or lower(coalesce(p.clientName, '')) like :search
                or lower(p.owner.firstName) like :search
                or lower(coalesce(p.owner.lastName, '')) like :search
                or lower(concat(p.owner.firstName, ' ', coalesce(p.owner.lastName, ''))) like :search
                or lower(p.owner.employeeCode) like :search
                or lower(p.owner.officialEmail) like :search
              )
            """)
    Page<Project> findForOrgScope(@Param("orgId") UUID orgId,
                                  @Param("status") ProjectStatus status,
                                  @Param("type") ProjectType type,
                                  @Param("ownerId") UUID ownerId,
                                  @Param("search") String search,
                                  Pageable pageable);

    @EntityGraph(attributePaths = {"owner"})
    @Query("""
            select p from Project p
            where p.org.id = :orgId
              and (p.owner.departmentId = :departmentId
                or exists (
                    select 1 from ProjectAllocation pa
                    where pa.project = p and pa.employee.departmentId = :departmentId
                ))
              and (:status is null or p.status = :status)
              and (:type is null or p.type = :type)
              and (:ownerId is null or p.owner.id = :ownerId)
              and (
                :search is null
                or lower(p.projectCode) like :search
                or lower(p.name) like :search
                or lower(coalesce(p.clientName, '')) like :search
                or lower(p.owner.firstName) like :search
                or lower(coalesce(p.owner.lastName, '')) like :search
                or lower(concat(p.owner.firstName, ' ', coalesce(p.owner.lastName, ''))) like :search
                or lower(p.owner.employeeCode) like :search
                or lower(p.owner.officialEmail) like :search
              )
            """)
    Page<Project> findForDepartmentScope(@Param("orgId") UUID orgId,
                                         @Param("departmentId") UUID departmentId,
                                         @Param("status") ProjectStatus status,
                                         @Param("type") ProjectType type,
                                         @Param("ownerId") UUID ownerId,
                                         @Param("search") String search,
                                         Pageable pageable);

    @EntityGraph(attributePaths = {"owner"})
    @Query("""
            select p from Project p
            where p.org.id = :orgId
              and (p.owner.id = :managerId
                or exists (
                    select 1 from ProjectAllocation pa
                    where pa.project = p and pa.employee.manager.id = :managerId
                ))
              and (:status is null or p.status = :status)
              and (:type is null or p.type = :type)
              and (:ownerId is null or p.owner.id = :ownerId)
              and (
                :search is null
                or lower(p.projectCode) like :search
                or lower(p.name) like :search
                or lower(coalesce(p.clientName, '')) like :search
                or lower(p.owner.firstName) like :search
                or lower(coalesce(p.owner.lastName, '')) like :search
                or lower(concat(p.owner.firstName, ' ', coalesce(p.owner.lastName, ''))) like :search
                or lower(p.owner.employeeCode) like :search
                or lower(p.owner.officialEmail) like :search
              )
            """)
    Page<Project> findForTeamScope(@Param("orgId") UUID orgId,
                                   @Param("managerId") UUID managerId,
                                   @Param("status") ProjectStatus status,
                                   @Param("type") ProjectType type,
                                   @Param("ownerId") UUID ownerId,
                                   @Param("search") String search,
                                   Pageable pageable);

    @EntityGraph(attributePaths = {"owner"})
    @Query("""
            select p from Project p
            where p.org.id = :orgId
              and (p.owner.id = :employeeId
                or exists (
                    select 1 from ProjectAllocation pa
                    where pa.project = p and pa.employee.id = :employeeId
                ))
              and (:status is null or p.status = :status)
              and (:type is null or p.type = :type)
              and (:ownerId is null or p.owner.id = :ownerId)
              and (
                :search is null
                or lower(p.projectCode) like :search
                or lower(p.name) like :search
                or lower(coalesce(p.clientName, '')) like :search
                or lower(p.owner.firstName) like :search
                or lower(coalesce(p.owner.lastName, '')) like :search
                or lower(concat(p.owner.firstName, ' ', coalesce(p.owner.lastName, ''))) like :search
                or lower(p.owner.employeeCode) like :search
                or lower(p.owner.officialEmail) like :search
              )
            """)
    Page<Project> findForSelfScope(@Param("orgId") UUID orgId,
                                   @Param("employeeId") UUID employeeId,
                                   @Param("status") ProjectStatus status,
                                   @Param("type") ProjectType type,
                                   @Param("ownerId") UUID ownerId,
                                   @Param("search") String search,
                                   Pageable pageable);

    Optional<Project> findByOrg_IdAndId(UUID orgId, UUID id);
}
