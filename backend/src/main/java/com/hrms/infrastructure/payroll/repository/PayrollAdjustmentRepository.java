package com.hrms.infrastructure.payroll.repository;

import com.hrms.domain.payroll.PayrollAdjustment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PayrollAdjustmentRepository extends JpaRepository<PayrollAdjustment, UUID> {

    List<PayrollAdjustment> findByTenantIdAndEmployeeIdAndStatus(
            UUID tenantId, UUID employeeId, PayrollAdjustment.AdjustmentStatus status);

    List<PayrollAdjustment> findByTenantIdAndStatus(
            UUID tenantId, PayrollAdjustment.AdjustmentStatus status);

    Page<PayrollAdjustment> findByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId, Pageable pageable);
}
