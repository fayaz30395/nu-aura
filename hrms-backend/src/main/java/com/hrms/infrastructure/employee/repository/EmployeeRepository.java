package com.hrms.infrastructure.employee.repository;

import com.hrms.domain.employee.Employee;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, UUID>, JpaSpecificationExecutor<Employee> {

    Optional<Employee> findByEmployeeCodeAndTenantId(String employeeCode, UUID tenantId);

    Optional<Employee> findByIdAndTenantId(UUID id, UUID tenantId);

    boolean existsByIdAndTenantId(UUID id, UUID tenantId);

    boolean existsByEmployeeCodeAndTenantId(String employeeCode, UUID tenantId);

    Page<Employee> findAllByTenantId(UUID tenantId, Pageable pageable);

    List<Employee> findByTenantId(UUID tenantId);

    Page<Employee> findAllByTenantIdAndDepartmentId(UUID tenantId, UUID departmentId, Pageable pageable);

    Page<Employee> findAllByTenantIdAndStatus(UUID tenantId, Employee.EmployeeStatus status, Pageable pageable);

    @Query("SELECT e FROM Employee e WHERE e.tenantId = :tenantId AND " +
           "(LOWER(e.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(e.lastName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(e.employeeCode) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Employee> searchEmployees(@Param("tenantId") UUID tenantId, @Param("search") String search, Pageable pageable);

    @Query("SELECT e FROM Employee e WHERE e.tenantId = :tenantId AND e.managerId = :managerId")
    Iterable<Employee> findAllByManagerId(@Param("tenantId") UUID tenantId, @Param("managerId") UUID managerId);

    // Get direct reports for a manager
    @Query("SELECT e FROM Employee e WHERE e.tenantId = :tenantId AND e.managerId = :managerId AND e.status = 'ACTIVE'")
    List<Employee> findDirectReportsByManagerId(@Param("tenantId") UUID tenantId, @Param("managerId") UUID managerId);

    // Count direct reports
    @Query("SELECT COUNT(e) FROM Employee e WHERE e.tenantId = :tenantId AND e.managerId = :managerId AND e.status = 'ACTIVE'")
    Long countDirectReportsByManagerId(@Param("tenantId") UUID tenantId, @Param("managerId") UUID managerId);

    // Get all employee IDs for a set of managers (for recursive hierarchy lookup)
    @Query("SELECT e.id FROM Employee e WHERE e.tenantId = :tenantId AND e.managerId IN :managerIds AND e.status = 'ACTIVE'")
    List<UUID> findEmployeeIdsByManagerIds(@Param("tenantId") UUID tenantId, @Param("managerIds") List<UUID> managerIds);

    // Count employees by a list of IDs
    @Query("SELECT COUNT(e) FROM Employee e WHERE e.tenantId = :tenantId AND e.id IN :employeeIds AND e.status = 'ACTIVE'")
    Long countByTenantIdAndIdIn(@Param("tenantId") UUID tenantId, @Param("employeeIds") List<UUID> employeeIds);

    // Count new joiners in a set of employees
    @Query("SELECT COUNT(e) FROM Employee e WHERE e.tenantId = :tenantId AND e.id IN :employeeIds AND e.joiningDate BETWEEN :startDate AND :endDate")
    Long countByTenantIdAndIdInAndJoiningDateBetween(@Param("tenantId") UUID tenantId, @Param("employeeIds") List<UUID> employeeIds, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    // Get department distribution for a set of employees
    @Query(value = "SELECT COALESCE(d.name, 'Unassigned') as dept_name, COUNT(e.id) FROM employees e LEFT JOIN departments d ON e.department_id = d.id WHERE e.tenant_id = :tenantId AND e.status = 'ACTIVE' AND e.id IN :employeeIds GROUP BY dept_name ORDER BY COUNT(e.id) DESC", nativeQuery = true)
    List<Object[]> findDepartmentDistributionForEmployees(@Param("tenantId") UUID tenantId, @Param("employeeIds") List<UUID> employeeIds);

    long countByDepartmentIdAndTenantId(UUID departmentId, UUID tenantId);

    Optional<Employee> findByUserIdAndTenantId(UUID userId, UUID tenantId);

    // Analytics methods
    Long countByTenantIdAndStatus(UUID tenantId, Employee.EmployeeStatus status);

    Long countByTenantIdAndJoiningDateBetween(UUID tenantId, LocalDate startDate, LocalDate endDate);

    Long countByTenantIdAndStatusAndExitDateBetween(UUID tenantId, Employee.EmployeeStatus status, LocalDate startDate, LocalDate endDate);

    Long countByTenantIdAndStatusAndJoiningDateBefore(UUID tenantId, Employee.EmployeeStatus status, LocalDate date);

    @Query(value = "SELECT COALESCE(d.name, 'Unassigned') as dept_name, COUNT(e.id) FROM employees e LEFT JOIN departments d ON e.department_id = d.id WHERE e.tenant_id = :tenantId AND e.status = 'ACTIVE' GROUP BY dept_name ORDER BY COUNT(e.id) DESC", nativeQuery = true)
    List<Object[]> findDepartmentDistribution(@Param("tenantId") UUID tenantId);

    @Query(value = "SELECT e.* FROM employees e " +
            "WHERE e.tenant_id = :tenantId AND e.date_of_birth IS NOT NULL " +
            "AND ( " +
            "  (EXTRACT(MONTH FROM CAST(:startDate AS DATE)) = EXTRACT(MONTH FROM CAST(:endDate AS DATE)) " +
            "   AND EXTRACT(MONTH FROM e.date_of_birth) = EXTRACT(MONTH FROM CAST(:startDate AS DATE)) " +
            "   AND EXTRACT(DAY FROM e.date_of_birth) BETWEEN EXTRACT(DAY FROM CAST(:startDate AS DATE)) AND EXTRACT(DAY FROM CAST(:endDate AS DATE))) " +
            "  OR " +
            "  (EXTRACT(MONTH FROM CAST(:startDate AS DATE)) != EXTRACT(MONTH FROM CAST(:endDate AS DATE)) " +
            "   AND ( " +
            "     (EXTRACT(MONTH FROM e.date_of_birth) = EXTRACT(MONTH FROM CAST(:startDate AS DATE)) " +
            "      AND EXTRACT(DAY FROM e.date_of_birth) >= EXTRACT(DAY FROM CAST(:startDate AS DATE))) " +
            "     OR " +
            "     (EXTRACT(MONTH FROM e.date_of_birth) = EXTRACT(MONTH FROM CAST(:endDate AS DATE)) " +
            "      AND EXTRACT(DAY FROM e.date_of_birth) <= EXTRACT(DAY FROM CAST(:endDate AS DATE))) " +
            "   )) " +
            ") " +
            "ORDER BY EXTRACT(MONTH FROM e.date_of_birth), EXTRACT(DAY FROM e.date_of_birth)", nativeQuery = true)
    List<Employee> findUpcomingBirthdays(@Param("tenantId") UUID tenantId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query(value = "SELECT e.* FROM employees e " +
            "WHERE e.tenant_id = :tenantId AND e.joining_date IS NOT NULL " +
            "AND ( " +
            "  (EXTRACT(MONTH FROM CAST(:startDate AS DATE)) = EXTRACT(MONTH FROM CAST(:endDate AS DATE)) " +
            "   AND EXTRACT(MONTH FROM e.joining_date) = EXTRACT(MONTH FROM CAST(:startDate AS DATE)) " +
            "   AND EXTRACT(DAY FROM e.joining_date) BETWEEN EXTRACT(DAY FROM CAST(:startDate AS DATE)) AND EXTRACT(DAY FROM CAST(:endDate AS DATE))) " +
            "  OR " +
            "  (EXTRACT(MONTH FROM CAST(:startDate AS DATE)) != EXTRACT(MONTH FROM CAST(:endDate AS DATE)) " +
            "   AND ( " +
            "     (EXTRACT(MONTH FROM e.joining_date) = EXTRACT(MONTH FROM CAST(:startDate AS DATE)) " +
            "      AND EXTRACT(DAY FROM e.joining_date) >= EXTRACT(DAY FROM CAST(:startDate AS DATE))) " +
            "     OR " +
            "     (EXTRACT(MONTH FROM e.joining_date) = EXTRACT(MONTH FROM CAST(:endDate AS DATE)) " +
            "      AND EXTRACT(DAY FROM e.joining_date) <= EXTRACT(DAY FROM CAST(:endDate AS DATE))) " +
            "   )) " +
            ") " +
            "ORDER BY EXTRACT(MONTH FROM e.joining_date), EXTRACT(DAY FROM e.joining_date)", nativeQuery = true)
    List<Employee> findUpcomingAnniversaries(@Param("tenantId") UUID tenantId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query(value = "SELECT e.id, e.first_name, e.middle_name, e.last_name, e.date_of_birth, " +
            "COALESCE(d.name, 'N/A') as department_name " +
            "FROM employees e " +
            "LEFT JOIN departments d ON e.department_id = d.id AND d.tenant_id = :tenantId " +
            "WHERE e.tenant_id = :tenantId AND e.date_of_birth IS NOT NULL " +
            "AND ( " +
            "  (EXTRACT(MONTH FROM CAST(:startDate AS DATE)) = EXTRACT(MONTH FROM CAST(:endDate AS DATE)) " +
            "   AND EXTRACT(MONTH FROM e.date_of_birth) = EXTRACT(MONTH FROM CAST(:startDate AS DATE)) " +
            "   AND EXTRACT(DAY FROM e.date_of_birth) BETWEEN EXTRACT(DAY FROM CAST(:startDate AS DATE)) AND EXTRACT(DAY FROM CAST(:endDate AS DATE))) " +
            "  OR " +
            "  (EXTRACT(MONTH FROM CAST(:startDate AS DATE)) != EXTRACT(MONTH FROM CAST(:endDate AS DATE)) " +
            "   AND ( " +
            "     (EXTRACT(MONTH FROM e.date_of_birth) = EXTRACT(MONTH FROM CAST(:startDate AS DATE)) " +
            "      AND EXTRACT(DAY FROM e.date_of_birth) >= EXTRACT(DAY FROM CAST(:startDate AS DATE))) " +
            "     OR " +
            "     (EXTRACT(MONTH FROM e.date_of_birth) = EXTRACT(MONTH FROM CAST(:endDate AS DATE)) " +
            "      AND EXTRACT(DAY FROM e.date_of_birth) <= EXTRACT(DAY FROM CAST(:endDate AS DATE))) " +
            "   )) " +
            ") " +
            "ORDER BY EXTRACT(MONTH FROM e.date_of_birth), EXTRACT(DAY FROM e.date_of_birth)", nativeQuery = true)
    List<Object[]> findUpcomingBirthdaysWithDepartment(@Param("tenantId") UUID tenantId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query(value = "SELECT e.id, e.first_name, e.middle_name, e.last_name, e.joining_date, " +
            "COALESCE(d.name, 'N/A') as department_name " +
            "FROM employees e " +
            "LEFT JOIN departments d ON e.department_id = d.id AND d.tenant_id = :tenantId " +
            "WHERE e.tenant_id = :tenantId AND e.joining_date IS NOT NULL " +
            "AND ( " +
            "  (EXTRACT(MONTH FROM CAST(:startDate AS DATE)) = EXTRACT(MONTH FROM CAST(:endDate AS DATE)) " +
            "   AND EXTRACT(MONTH FROM e.joining_date) = EXTRACT(MONTH FROM CAST(:startDate AS DATE)) " +
            "   AND EXTRACT(DAY FROM e.joining_date) BETWEEN EXTRACT(DAY FROM CAST(:startDate AS DATE)) AND EXTRACT(DAY FROM CAST(:endDate AS DATE))) " +
            "  OR " +
            "  (EXTRACT(MONTH FROM CAST(:startDate AS DATE)) != EXTRACT(MONTH FROM CAST(:endDate AS DATE)) " +
            "   AND ( " +
            "     (EXTRACT(MONTH FROM e.joining_date) = EXTRACT(MONTH FROM CAST(:startDate AS DATE)) " +
            "      AND EXTRACT(DAY FROM e.joining_date) >= EXTRACT(DAY FROM CAST(:startDate AS DATE))) " +
            "     OR " +
            "     (EXTRACT(MONTH FROM e.joining_date) = EXTRACT(MONTH FROM CAST(:endDate AS DATE)) " +
            "      AND EXTRACT(DAY FROM e.joining_date) <= EXTRACT(DAY FROM CAST(:endDate AS DATE))) " +
            "   )) " +
            ") " +
            "ORDER BY EXTRACT(MONTH FROM e.joining_date), EXTRACT(DAY FROM e.joining_date)", nativeQuery = true)
    List<Object[]> findUpcomingAnniversariesWithDepartment(@Param("tenantId") UUID tenantId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
}
