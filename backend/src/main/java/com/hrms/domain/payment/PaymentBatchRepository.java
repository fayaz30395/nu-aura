package com.hrms.domain.payment;

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
public interface PaymentBatchRepository extends JpaRepository<PaymentBatch, UUID> {

    Optional<PaymentBatch> findByTenantIdAndBatchRef(UUID tenantId, String batchRef);

    Page<PaymentBatch> findByTenantId(UUID tenantId, Pageable pageable);

    Page<PaymentBatch> findByTenantIdAndType(UUID tenantId, PaymentBatch.PaymentType type, Pageable pageable);

    Page<PaymentBatch> findByTenantIdAndStatus(UUID tenantId, PaymentBatch.BatchStatus status, Pageable pageable);

    List<PaymentBatch> findByPayrollRunId(UUID payrollRunId);

    @Query("SELECT pb FROM PaymentBatch pb WHERE pb.tenantId = :tenantId AND pb.status IN :statuses")
    Page<PaymentBatch> findByStatusIn(@Param("tenantId") UUID tenantId, @Param("statuses") List<PaymentBatch.BatchStatus> statuses, Pageable pageable);
}
