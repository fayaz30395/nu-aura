package com.hrms.infrastructure.performance.repository;

import com.hrms.domain.performance.ReviewCycle;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReviewCycleRepository extends JpaRepository<ReviewCycle, UUID> {

    Optional<ReviewCycle> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<ReviewCycle> findAllByTenantId(UUID tenantId, Pageable pageable);

    List<ReviewCycle> findAllByTenantIdAndStatus(UUID tenantId, ReviewCycle.CycleStatus status);

    @Query("SELECT rc FROM ReviewCycle rc WHERE rc.tenantId = :tenantId " +
           "AND rc.startDate <= :date AND rc.endDate >= :date")
    List<ReviewCycle> findActiveCycles(@Param("tenantId") UUID tenantId,
                                       @Param("date") LocalDate date);
}
