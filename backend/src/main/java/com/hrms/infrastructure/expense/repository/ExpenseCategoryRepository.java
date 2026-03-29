package com.hrms.infrastructure.expense.repository;

import com.hrms.domain.expense.ExpenseCategoryEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ExpenseCategoryRepository extends JpaRepository<ExpenseCategoryEntity, UUID>,
        JpaSpecificationExecutor<ExpenseCategoryEntity> {

    Optional<ExpenseCategoryEntity> findByIdAndTenantId(UUID id, UUID tenantId);

    List<ExpenseCategoryEntity> findAllByTenantIdAndIsActiveTrue(UUID tenantId);

    List<ExpenseCategoryEntity> findAllByTenantId(UUID tenantId);

    Page<ExpenseCategoryEntity> findAllByTenantId(UUID tenantId, Pageable pageable);

    List<ExpenseCategoryEntity> findAllByTenantIdAndParentCategoryId(UUID tenantId, UUID parentCategoryId);

    boolean existsByNameAndTenantId(String name, UUID tenantId);

    Optional<ExpenseCategoryEntity> findByNameAndTenantId(String name, UUID tenantId);
}
