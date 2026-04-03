package com.hrms.infrastructure.payroll.repository;

import com.hrms.domain.payroll.PayrollComponent;
import com.hrms.domain.payroll.PayrollComponent.ComponentType;
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
public interface PayrollComponentRepository extends JpaRepository<PayrollComponent, UUID> {

    Page<PayrollComponent> findAllByTenantId(UUID tenantId, Pageable pageable);

    List<PayrollComponent> findAllByTenantIdAndIsActiveTrueOrderByEvaluationOrderAsc(UUID tenantId);

    List<PayrollComponent> findAllByTenantIdOrderByEvaluationOrderAsc(UUID tenantId);

    Optional<PayrollComponent> findByTenantIdAndCode(UUID tenantId, String code);

    boolean existsByTenantIdAndCode(UUID tenantId, String code);

    List<PayrollComponent> findAllByTenantIdAndComponentType(UUID tenantId, ComponentType componentType);

    @Query("SELECT pc FROM PayrollComponent pc WHERE pc.tenantId = :tenantId " +
            "AND pc.isActive = true AND pc.componentType = :type " +
            "ORDER BY pc.evaluationOrder ASC")
    List<PayrollComponent> findActiveByTenantIdAndType(
            @Param("tenantId") UUID tenantId,
            @Param("type") ComponentType type
    );
}
