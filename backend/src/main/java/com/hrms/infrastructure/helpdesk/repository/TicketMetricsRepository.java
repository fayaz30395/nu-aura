package com.hrms.infrastructure.helpdesk.repository;

import com.hrms.domain.helpdesk.TicketMetrics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface TicketMetricsRepository extends JpaRepository<TicketMetrics, UUID> {

    Optional<TicketMetrics> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<TicketMetrics> findByTicketIdAndTenantId(UUID ticketId, UUID tenantId);

    @Query("SELECT AVG(m.csatRating) FROM TicketMetrics m WHERE m.tenantId = :tenantId AND m.csatRating IS NOT NULL")
    Double getAverageCSAT(@Param("tenantId") UUID tenantId);

    @Query("SELECT COUNT(m) FROM TicketMetrics m WHERE m.tenantId = :tenantId AND m.firstContactResolution = true")
    Long countFirstContactResolutions(@Param("tenantId") UUID tenantId);

    @Query("SELECT COUNT(m) FROM TicketMetrics m WHERE m.tenantId = :tenantId AND m.slaMet = true")
    Long countSLAMet(@Param("tenantId") UUID tenantId);

    @Query("SELECT COUNT(m) FROM TicketMetrics m WHERE m.tenantId = :tenantId AND m.slaMet = false")
    Long countSLABreached(@Param("tenantId") UUID tenantId);

    @Query("SELECT AVG(m.firstResponseMinutes) FROM TicketMetrics m WHERE m.tenantId = :tenantId AND m.firstResponseMinutes IS NOT NULL")
    Double getAverageFirstResponseTime(@Param("tenantId") UUID tenantId);

    @Query("SELECT AVG(m.resolutionMinutes) FROM TicketMetrics m WHERE m.tenantId = :tenantId AND m.resolutionMinutes IS NOT NULL")
    Double getAverageResolutionTime(@Param("tenantId") UUID tenantId);

    void deleteByTicketId(UUID ticketId);
}
