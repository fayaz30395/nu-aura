package com.hrms.infrastructure.performance.repository;

import com.hrms.domain.performance.Feedback360Cycle;
import com.hrms.domain.performance.Feedback360Cycle.CycleStatus;
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
public interface Feedback360CycleRepository extends JpaRepository<Feedback360Cycle, UUID> {

    Page<Feedback360Cycle> findAllByTenantId(UUID tenantId, Pageable pageable);

    Optional<Feedback360Cycle> findByIdAndTenantId(UUID id, UUID tenantId);

    List<Feedback360Cycle> findAllByTenantIdAndStatus(UUID tenantId, CycleStatus status);

    @Query("SELECT c FROM Feedback360Cycle c WHERE c.tenantId = :tenantId AND c.status IN (com.hrms.domain.performance.Feedback360Cycle.CycleStatus.NOMINATION_OPEN, com.hrms.domain.performance.Feedback360Cycle.CycleStatus.IN_PROGRESS)")
    List<Feedback360Cycle> findActiveCycles(@Param("tenantId") UUID tenantId);

    @Query("SELECT c FROM Feedback360Cycle c WHERE c.tenantId = :tenantId ORDER BY c.startDate DESC")
    List<Feedback360Cycle> findAllOrderByStartDateDesc(@Param("tenantId") UUID tenantId);
}
