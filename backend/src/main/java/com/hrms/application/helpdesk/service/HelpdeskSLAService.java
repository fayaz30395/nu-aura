package com.hrms.application.helpdesk.service;

import com.hrms.domain.helpdesk.*;
import com.hrms.domain.helpdesk.TicketEscalation.EscalationLevel;
import com.hrms.domain.helpdesk.TicketEscalation.EscalationReason;
import com.hrms.infrastructure.helpdesk.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class HelpdeskSLAService {

    private final TicketSLARepository slaRepository;
    private final TicketEscalationRepository escalationRepository;
    private final TicketMetricsRepository metricsRepository;

    // ================== SLA Management ==================

    @Transactional
    public TicketSLA createSLA(TicketSLA sla) {
        if (sla.getId() == null) {
            sla.setId(UUID.randomUUID());
        }
        if (sla.getCreatedAt() == null) {
            sla.setCreatedAt(LocalDateTime.now());
        }

        log.info("Creating SLA: {}", sla.getName());
        return slaRepository.save(sla);
    }

    @Transactional
    public TicketSLA updateSLA(TicketSLA sla) {
        sla.setUpdatedAt(LocalDateTime.now());
        return slaRepository.save(sla);
    }

    @Transactional(readOnly = true)
    public Page<TicketSLA> getAllSLAs(UUID tenantId, Pageable pageable) {
        return slaRepository.findAllByTenantId(tenantId, pageable);
    }

    @Transactional(readOnly = true)
    public Optional<TicketSLA> getSLAById(UUID tenantId, UUID id) {
        return slaRepository.findByIdAndTenantId(id, tenantId);
    }

    @Transactional(readOnly = true)
    public List<TicketSLA> getActiveSLAs(UUID tenantId) {
        return slaRepository.findAllByTenantIdAndIsActive(tenantId, true);
    }

    @Transactional
    public void deleteSLA(UUID tenantId, UUID id) {
        slaRepository.findByIdAndTenantId(id, tenantId)
                .ifPresent(sla -> {
                    slaRepository.delete(sla);
                    log.info("Deleted SLA: {}", id);
                });
    }

    @Transactional(readOnly = true)
    public Optional<TicketSLA> findApplicableSLA(UUID tenantId, UUID categoryId, String priority) {
        // First try to find SLA by category
        Optional<TicketSLA> categorySLA = slaRepository.findByCategoryId(tenantId, categoryId);
        if (categorySLA.isPresent()) {
            return categorySLA;
        }

        // Then try by priority
        List<TicketSLA> prioritySLAs = slaRepository.findByPriority(tenantId, priority);
        if (!prioritySLAs.isEmpty()) {
            return Optional.of(prioritySLAs.get(0));
        }

        // Fall back to default SLA
        return slaRepository.findDefaultSLA(tenantId);
    }

    // ================== Escalations ==================

    @Transactional
    public TicketEscalation createEscalation(TicketEscalation escalation) {
        if (escalation.getId() == null) {
            escalation.setId(UUID.randomUUID());
        }
        if (escalation.getCreatedAt() == null) {
            escalation.setCreatedAt(LocalDateTime.now());
        }

        log.info("Creating escalation for ticket: {} to user: {}",
                escalation.getTicketId(), escalation.getEscalatedTo());
        return escalationRepository.save(escalation);
    }

    @Transactional
    public TicketEscalation escalateTicket(UUID tenantId, UUID ticketId, UUID escalatedFrom,
                                            UUID escalatedTo, EscalationLevel level,
                                            EscalationReason reason, boolean isAutoEscalated, String notes) {
        TicketEscalation escalation = TicketEscalation.builder()
                .id(UUID.randomUUID())
                .tenantId(tenantId)
                .ticketId(ticketId)
                .escalationLevel(level)
                .reason(reason)
                .escalatedFrom(escalatedFrom)
                .escalatedTo(escalatedTo)
                .escalatedAt(LocalDateTime.now())
                .isAutoEscalated(isAutoEscalated)
                .notes(notes)
                .build();

        // Update metrics
        metricsRepository.findByTicketIdAndTenantId(ticketId, tenantId)
                .ifPresent(metrics -> {
                    metrics.setEscalationCount(metrics.getEscalationCount() + 1);
                    metrics.setUpdatedAt(LocalDateTime.now());
                    metricsRepository.save(metrics);
                });

        log.info("Escalated ticket: {} to level: {}", ticketId, level);
        return escalationRepository.save(escalation);
    }

    @Transactional
    public void acknowledgeEscalation(UUID tenantId, UUID escalationId, UUID acknowledgedBy) {
        escalationRepository.findByIdAndTenantId(escalationId, tenantId)
                .ifPresent(escalation -> {
                    escalation.setAcknowledgedAt(LocalDateTime.now());
                    escalation.setAcknowledgedBy(acknowledgedBy);
                    escalationRepository.save(escalation);
                    log.info("Acknowledged escalation: {}", escalationId);
                });
    }

    @Transactional(readOnly = true)
    public List<TicketEscalation> getEscalationsForTicket(UUID ticketId) {
        return escalationRepository.findAllByTicketIdOrderByEscalatedAtDesc(ticketId);
    }

    @Transactional(readOnly = true)
    public List<TicketEscalation> getUnacknowledgedEscalations(UUID tenantId, UUID userId) {
        return escalationRepository.findUnacknowledgedForUser(tenantId, userId);
    }

    // ================== Metrics ==================

    @Transactional
    public TicketMetrics createOrUpdateMetrics(UUID tenantId, UUID ticketId, UUID slaId) {
        TicketMetrics metrics = metricsRepository.findByTicketIdAndTenantId(ticketId, tenantId)
                .orElseGet(() -> {
                    TicketMetrics newMetrics = new TicketMetrics();
                    newMetrics.setId(UUID.randomUUID());
                    newMetrics.setTenantId(tenantId);
                    newMetrics.setTicketId(ticketId);
                    newMetrics.setSlaId(slaId);
                    newMetrics.setTotalHandleTimeMinutes(0);
                    newMetrics.setTotalWaitTimeMinutes(0);
                    newMetrics.setReopenCount(0);
                    newMetrics.setReassignmentCount(0);
                    newMetrics.setEscalationCount(0);
                    newMetrics.setCommentCount(0);
                    newMetrics.setSlaMet(true);
                    return newMetrics;
                });

        metrics.setUpdatedAt(LocalDateTime.now());
        return metricsRepository.save(metrics);
    }

    @Transactional
    public void recordFirstResponse(UUID tenantId, UUID ticketId, LocalDateTime createdAt) {
        metricsRepository.findByTicketIdAndTenantId(ticketId, tenantId)
                .ifPresent(metrics -> {
                    LocalDateTime now = LocalDateTime.now();
                    metrics.setFirstResponseAt(now);
                    long minutes = ChronoUnit.MINUTES.between(createdAt, now);
                    metrics.setFirstResponseMinutes((int) minutes);

                    // Check SLA breach
                    if (metrics.getSlaId() != null) {
                        slaRepository.findById(metrics.getSlaId())
                                .ifPresent(sla -> {
                                    if (minutes > sla.getFirstResponseMinutes()) {
                                        metrics.setFirstResponseSlaBreached(true);
                                        metrics.setSlaMet(false);
                                    }
                                });
                    }

                    metrics.setUpdatedAt(LocalDateTime.now());
                    metricsRepository.save(metrics);
                });
    }

    @Transactional
    public void recordResolution(UUID tenantId, UUID ticketId, LocalDateTime createdAt) {
        metricsRepository.findByTicketIdAndTenantId(ticketId, tenantId)
                .ifPresent(metrics -> {
                    LocalDateTime now = LocalDateTime.now();
                    metrics.setResolutionAt(now);
                    long minutes = ChronoUnit.MINUTES.between(createdAt, now);
                    metrics.setResolutionMinutes((int) minutes);

                    // Check SLA breach
                    if (metrics.getSlaId() != null) {
                        slaRepository.findById(metrics.getSlaId())
                                .ifPresent(sla -> {
                                    if (minutes > sla.getResolutionMinutes()) {
                                        metrics.setResolutionSlaBreached(true);
                                        metrics.setSlaMet(false);
                                    }
                                });
                    }

                    // Check first contact resolution
                    if (metrics.getReassignmentCount() == 0 && metrics.getEscalationCount() == 0) {
                        metrics.setFirstContactResolution(true);
                    }

                    metrics.setUpdatedAt(LocalDateTime.now());
                    metricsRepository.save(metrics);
                });
    }

    @Transactional
    public void recordCSAT(UUID tenantId, UUID ticketId, Integer rating, String feedback) {
        metricsRepository.findByTicketIdAndTenantId(ticketId, tenantId)
                .ifPresent(metrics -> {
                    metrics.setCsatRating(rating);
                    metrics.setCsatFeedback(feedback);
                    metrics.setCsatSubmittedAt(LocalDateTime.now());
                    metrics.setUpdatedAt(LocalDateTime.now());
                    metricsRepository.save(metrics);
                });
    }

    @Transactional
    public void incrementReassignment(UUID tenantId, UUID ticketId) {
        metricsRepository.findByTicketIdAndTenantId(ticketId, tenantId)
                .ifPresent(metrics -> {
                    metrics.setReassignmentCount(metrics.getReassignmentCount() + 1);
                    metrics.setUpdatedAt(LocalDateTime.now());
                    metricsRepository.save(metrics);
                });
    }

    @Transactional
    public void incrementReopen(UUID tenantId, UUID ticketId) {
        metricsRepository.findByTicketIdAndTenantId(ticketId, tenantId)
                .ifPresent(metrics -> {
                    metrics.setReopenCount(metrics.getReopenCount() + 1);
                    metrics.setUpdatedAt(LocalDateTime.now());
                    metricsRepository.save(metrics);
                });
    }

    @Transactional(readOnly = true)
    public Optional<TicketMetrics> getMetrics(UUID tenantId, UUID ticketId) {
        return metricsRepository.findByTicketIdAndTenantId(ticketId, tenantId);
    }

    // ================== Dashboard Analytics ==================

    @Transactional(readOnly = true)
    public Map<String, Object> getSLADashboard(UUID tenantId) {
        Map<String, Object> dashboard = new HashMap<>();

        Double avgCSAT = metricsRepository.getAverageCSAT(tenantId);
        Long fcrCount = metricsRepository.countFirstContactResolutions(tenantId);
        Long slaMet = metricsRepository.countSLAMet(tenantId);
        Long slaBreached = metricsRepository.countSLABreached(tenantId);
        Double avgFirstResponse = metricsRepository.getAverageFirstResponseTime(tenantId);
        Double avgResolution = metricsRepository.getAverageResolutionTime(tenantId);

        dashboard.put("averageCSAT", avgCSAT != null ? avgCSAT : 0);
        dashboard.put("firstContactResolutions", fcrCount);
        dashboard.put("slaMetCount", slaMet);
        dashboard.put("slaBreachedCount", slaBreached);
        dashboard.put("slaComplianceRate", slaMet != null && slaBreached != null && (slaMet + slaBreached) > 0 ?
                (slaMet * 100.0 / (slaMet + slaBreached)) : 0);
        dashboard.put("averageFirstResponseMinutes", avgFirstResponse != null ? avgFirstResponse : 0);
        dashboard.put("averageResolutionMinutes", avgResolution != null ? avgResolution : 0);

        return dashboard;
    }
}
