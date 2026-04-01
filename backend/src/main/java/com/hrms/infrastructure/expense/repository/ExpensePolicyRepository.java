package com.hrms.infrastructure.expense.repository;

import com.hrms.domain.expense.ExpensePolicy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ExpensePolicyRepository extends JpaRepository<ExpensePolicy, UUID>,
        JpaSpecificationExecutor<ExpensePolicy> {

    Optional<ExpensePolicy> findByIdAndTenantId(UUID id, UUID tenantId);

    List<ExpensePolicy> findAllByTenantIdAndIsActiveTrue(UUID tenantId);

    Page<ExpensePolicy> findAllByTenantId(UUID tenantId, Pageable pageable);

    boolean existsByNameAndTenantId(String name, UUID tenantId);
}
