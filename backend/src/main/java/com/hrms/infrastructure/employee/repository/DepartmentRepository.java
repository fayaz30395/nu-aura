package com.hrms.infrastructure.employee.repository;

import com.hrms.domain.employee.Department;
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
public interface DepartmentRepository extends JpaRepository<Department, UUID> {

    Optional<Department> findByCodeAndTenantId(String code, UUID tenantId);

    Optional<Department> findByNameAndTenantId(String name, UUID tenantId);

    Optional<Department> findByIdAndTenantId(UUID id, UUID tenantId);

    boolean existsByCodeAndTenantId(String code, UUID tenantId);

    Page<Department> findAllByTenantId(UUID tenantId, Pageable pageable);

    List<Department> findByTenantId(UUID tenantId);

    List<Department> findAllByTenantIdAndIsActive(UUID tenantId, Boolean isActive);

    List<Department> findAllByTenantIdAndParentDepartmentId(UUID tenantId, UUID parentDepartmentId);

    @Query("SELECT d FROM Department d WHERE d.tenantId = :tenantId AND d.parentDepartmentId IS NULL")
    List<Department> findRootDepartments(@Param("tenantId") UUID tenantId);

    @Query("SELECT d FROM Department d WHERE d.tenantId = :tenantId AND " +
            "(LOWER(d.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(d.code) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Department> searchDepartments(@Param("tenantId") UUID tenantId,
                                       @Param("search") String search,
                                       Pageable pageable);

    long countByTenantIdAndParentDepartmentId(UUID tenantId, UUID parentDepartmentId);
}
