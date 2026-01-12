package com.hrms.application.helpdesk.service;

import com.hrms.domain.helpdesk.*;
import com.hrms.domain.helpdesk.Ticket.TicketPriority;
import com.hrms.domain.helpdesk.TicketEscalation.EscalationLevel;
import com.hrms.domain.helpdesk.TicketEscalation.EscalationReason;
import com.hrms.infrastructure.helpdesk.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HelpdeskSLAServiceTest {

    @Mock
    private TicketSLARepository slaRepository;

    @Mock
    private TicketEscalationRepository escalationRepository;

    @Mock
    private TicketMetricsRepository metricsRepository;

    @InjectMocks
    private HelpdeskSLAService helpdeskSLAService;

    private UUID tenantId;
    private UUID slaId;
    private UUID ticketId;
    private UUID escalationId;
    private UUID userId;
    private TicketSLA testSLA;
    private TicketEscalation testEscalation;
    private TicketMetrics testMetrics;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        slaId = UUID.randomUUID();
        ticketId = UUID.randomUUID();
        escalationId = UUID.randomUUID();
        userId = UUID.randomUUID();

        testSLA = createTestSLA();
        testEscalation = createTestEscalation();
        testMetrics = createTestMetrics();
    }

    private TicketSLA createTestSLA() {
        TicketSLA sla = TicketSLA.builder()
                .name("Standard SLA")
                .description("Standard response and resolution times")
                .firstResponseMinutes(60)
                .resolutionMinutes(480)
                .priority(TicketPriority.HIGH)
                .isActive(true)
                .escalationAfterMinutes(120)
                .build();
        sla.setId(slaId);
        sla.setTenantId(tenantId);
        sla.setCreatedAt(LocalDateTime.now());
        return sla;
    }

    private TicketEscalation createTestEscalation() {
        TicketEscalation escalation = TicketEscalation.builder()
                .ticketId(ticketId)
                .escalationLevel(EscalationLevel.FIRST)
                .reason(EscalationReason.SLA_BREACH_RESPONSE)
                .escalatedFrom(userId)
                .escalatedTo(UUID.randomUUID())
                .escalatedAt(LocalDateTime.now())
                .isAutoEscalated(true)
                .notes("Auto-escalated due to SLA breach")
                .build();
        escalation.setId(escalationId);
        escalation.setTenantId(tenantId);
        escalation.setCreatedAt(LocalDateTime.now());
        return escalation;
    }

    private TicketMetrics createTestMetrics() {
        TicketMetrics metrics = new TicketMetrics();
        metrics.setId(UUID.randomUUID());
        metrics.setTenantId(tenantId);
        metrics.setTicketId(ticketId);
        metrics.setSlaId(slaId);
        metrics.setTotalHandleTimeMinutes(0);
        metrics.setTotalWaitTimeMinutes(0);
        metrics.setReopenCount(0);
        metrics.setReassignmentCount(0);
        metrics.setEscalationCount(0);
        metrics.setCommentCount(0);
        metrics.setSlaMet(true);
        return metrics;
    }

    // ================== SLA Tests ==================

    @Test
    void createSLA_Success() {
        TicketSLA newSLA = TicketSLA.builder()
                .name("Premium SLA")
                .firstResponseMinutes(30)
                .resolutionMinutes(240)
                .build();
        newSLA.setTenantId(tenantId);

        when(slaRepository.save(any(TicketSLA.class))).thenAnswer(invocation -> {
            TicketSLA saved = invocation.getArgument(0);
            if (saved.getId() == null) {
                saved.setId(UUID.randomUUID());
            }
            return saved;
        });

        TicketSLA result = helpdeskSLAService.createSLA(newSLA);

        assertNotNull(result.getId());
        assertNotNull(result.getCreatedAt());
        verify(slaRepository).save(any(TicketSLA.class));
    }

    @Test
    void updateSLA_Success() {
        testSLA.setName("Updated SLA");

        when(slaRepository.save(any(TicketSLA.class))).thenReturn(testSLA);

        TicketSLA result = helpdeskSLAService.updateSLA(testSLA);

        assertEquals("Updated SLA", result.getName());
        assertNotNull(result.getUpdatedAt());
    }

    @Test
    void getAllSLAs_Success() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<TicketSLA> expectedPage = new PageImpl<>(List.of(testSLA), pageable, 1);

        when(slaRepository.findAllByTenantId(tenantId, pageable)).thenReturn(expectedPage);

        Page<TicketSLA> result = helpdeskSLAService.getAllSLAs(tenantId, pageable);

        assertEquals(1, result.getTotalElements());
    }

    @Test
    void getSLAById_Success() {
        when(slaRepository.findByIdAndTenantId(slaId, tenantId))
                .thenReturn(Optional.of(testSLA));

        Optional<TicketSLA> result = helpdeskSLAService.getSLAById(tenantId, slaId);

        assertTrue(result.isPresent());
        assertEquals(testSLA.getName(), result.get().getName());
    }

    @Test
    void getSLAById_NotFound() {
        when(slaRepository.findByIdAndTenantId(slaId, tenantId))
                .thenReturn(Optional.empty());

        Optional<TicketSLA> result = helpdeskSLAService.getSLAById(tenantId, slaId);

        assertTrue(result.isEmpty());
    }

    @Test
    void getActiveSLAs_Success() {
        when(slaRepository.findAllByTenantIdAndIsActive(tenantId, true))
                .thenReturn(List.of(testSLA));

        List<TicketSLA> result = helpdeskSLAService.getActiveSLAs(tenantId);

        assertEquals(1, result.size());
        assertTrue(result.get(0).getIsActive());
    }

    @Test
    void deleteSLA_Success() {
        when(slaRepository.findByIdAndTenantId(slaId, tenantId))
                .thenReturn(Optional.of(testSLA));

        helpdeskSLAService.deleteSLA(tenantId, slaId);

        verify(slaRepository).delete(testSLA);
    }

    @Test
    void deleteSLA_NotFound_NoAction() {
        when(slaRepository.findByIdAndTenantId(slaId, tenantId))
                .thenReturn(Optional.empty());

        helpdeskSLAService.deleteSLA(tenantId, slaId);

        verify(slaRepository, never()).delete(any());
    }

    @Test
    void findApplicableSLA_ByCategory_Success() {
        UUID categoryId = UUID.randomUUID();

        when(slaRepository.findByCategoryId(tenantId, categoryId))
                .thenReturn(Optional.of(testSLA));

        Optional<TicketSLA> result = helpdeskSLAService.findApplicableSLA(tenantId, categoryId, "HIGH");

        assertTrue(result.isPresent());
        verify(slaRepository).findByCategoryId(tenantId, categoryId);
        verify(slaRepository, never()).findByPriority(any(), any());
    }

    @Test
    void findApplicableSLA_ByPriority_WhenCategoryNotFound() {
        UUID categoryId = UUID.randomUUID();

        when(slaRepository.findByCategoryId(tenantId, categoryId))
                .thenReturn(Optional.empty());
        when(slaRepository.findByPriority(tenantId, "HIGH"))
                .thenReturn(List.of(testSLA));

        Optional<TicketSLA> result = helpdeskSLAService.findApplicableSLA(tenantId, categoryId, "HIGH");

        assertTrue(result.isPresent());
        verify(slaRepository).findByPriority(tenantId, "HIGH");
    }

    @Test
    void findApplicableSLA_DefaultSLA_WhenNothingElseFound() {
        UUID categoryId = UUID.randomUUID();
        TicketSLA defaultSLA = TicketSLA.builder()
                .name("Default SLA")
                .applyToAllCategories(true)
                .build();
        defaultSLA.setId(UUID.randomUUID());

        when(slaRepository.findByCategoryId(tenantId, categoryId))
                .thenReturn(Optional.empty());
        when(slaRepository.findByPriority(tenantId, "HIGH"))
                .thenReturn(Collections.emptyList());
        when(slaRepository.findDefaultSLA(tenantId))
                .thenReturn(Optional.of(defaultSLA));

        Optional<TicketSLA> result = helpdeskSLAService.findApplicableSLA(tenantId, categoryId, "HIGH");

        assertTrue(result.isPresent());
        verify(slaRepository).findDefaultSLA(tenantId);
    }

    // ================== Escalation Tests ==================

    @Test
    void createEscalation_Success() {
        TicketEscalation newEscalation = TicketEscalation.builder()
                .ticketId(ticketId)
                .escalationLevel(EscalationLevel.FIRST)
                .reason(EscalationReason.CUSTOMER_REQUEST)
                .escalatedTo(UUID.randomUUID())
                .escalatedAt(LocalDateTime.now())
                .build();
        newEscalation.setTenantId(tenantId);

        when(escalationRepository.save(any(TicketEscalation.class))).thenAnswer(invocation -> {
            TicketEscalation saved = invocation.getArgument(0);
            if (saved.getId() == null) {
                saved.setId(UUID.randomUUID());
            }
            return saved;
        });

        TicketEscalation result = helpdeskSLAService.createEscalation(newEscalation);

        assertNotNull(result.getId());
        assertNotNull(result.getCreatedAt());
    }

    @Test
    void escalateTicket_Success() {
        UUID escalatedFrom = UUID.randomUUID();
        UUID escalatedTo = UUID.randomUUID();

        when(escalationRepository.save(any(TicketEscalation.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(metricsRepository.findByTicketIdAndTenantId(ticketId, tenantId))
                .thenReturn(Optional.of(testMetrics));
        when(metricsRepository.save(any(TicketMetrics.class))).thenReturn(testMetrics);

        TicketEscalation result = helpdeskSLAService.escalateTicket(
                tenantId, ticketId, escalatedFrom, escalatedTo,
                EscalationLevel.SECOND, EscalationReason.SLA_BREACH_RESPONSE,
                true, "Auto-escalated"
        );

        assertNotNull(result.getId());
        assertEquals(EscalationLevel.SECOND, result.getEscalationLevel());
        assertEquals(EscalationReason.SLA_BREACH_RESPONSE, result.getReason());
        assertTrue(result.getIsAutoEscalated());
        assertEquals(1, testMetrics.getEscalationCount());
        verify(metricsRepository).save(any(TicketMetrics.class));
    }

    @Test
    void escalateTicket_NoExistingMetrics_StillSucceeds() {
        UUID escalatedFrom = UUID.randomUUID();
        UUID escalatedTo = UUID.randomUUID();

        when(escalationRepository.save(any(TicketEscalation.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(metricsRepository.findByTicketIdAndTenantId(ticketId, tenantId))
                .thenReturn(Optional.empty());

        TicketEscalation result = helpdeskSLAService.escalateTicket(
                tenantId, ticketId, escalatedFrom, escalatedTo,
                EscalationLevel.FIRST, EscalationReason.COMPLEXITY,
                false, "Manual escalation"
        );

        assertNotNull(result);
        verify(metricsRepository, never()).save(any(TicketMetrics.class));
    }

    @Test
    void acknowledgeEscalation_Success() {
        UUID acknowledgedBy = UUID.randomUUID();

        when(escalationRepository.findByIdAndTenantId(escalationId, tenantId))
                .thenReturn(Optional.of(testEscalation));
        when(escalationRepository.save(any(TicketEscalation.class))).thenReturn(testEscalation);

        helpdeskSLAService.acknowledgeEscalation(tenantId, escalationId, acknowledgedBy);

        assertNotNull(testEscalation.getAcknowledgedAt());
        assertEquals(acknowledgedBy, testEscalation.getAcknowledgedBy());
        verify(escalationRepository).save(testEscalation);
    }

    @Test
    void getEscalationsForTicket_Success() {
        when(escalationRepository.findAllByTicketIdOrderByEscalatedAtDesc(ticketId))
                .thenReturn(List.of(testEscalation));

        List<TicketEscalation> result = helpdeskSLAService.getEscalationsForTicket(ticketId);

        assertEquals(1, result.size());
    }

    @Test
    void getUnacknowledgedEscalations_Success() {
        when(escalationRepository.findUnacknowledgedForUser(tenantId, userId))
                .thenReturn(List.of(testEscalation));

        List<TicketEscalation> result = helpdeskSLAService.getUnacknowledgedEscalations(tenantId, userId);

        assertEquals(1, result.size());
    }

    // ================== Metrics Tests ==================

    @Test
    void createOrUpdateMetrics_NewMetrics_Success() {
        when(metricsRepository.findByTicketIdAndTenantId(ticketId, tenantId))
                .thenReturn(Optional.empty());
        when(metricsRepository.save(any(TicketMetrics.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TicketMetrics result = helpdeskSLAService.createOrUpdateMetrics(tenantId, ticketId, slaId);

        assertNotNull(result.getId());
        assertEquals(ticketId, result.getTicketId());
        assertEquals(slaId, result.getSlaId());
        assertEquals(0, result.getEscalationCount());
        assertTrue(result.getSlaMet());
    }

    @Test
    void createOrUpdateMetrics_ExistingMetrics_Updates() {
        when(metricsRepository.findByTicketIdAndTenantId(ticketId, tenantId))
                .thenReturn(Optional.of(testMetrics));
        when(metricsRepository.save(any(TicketMetrics.class))).thenReturn(testMetrics);

        TicketMetrics result = helpdeskSLAService.createOrUpdateMetrics(tenantId, ticketId, slaId);

        assertNotNull(result.getUpdatedAt());
        assertEquals(testMetrics.getId(), result.getId());
    }

    @Test
    void recordFirstResponse_Success() {
        LocalDateTime createdAt = LocalDateTime.now().minusMinutes(30);

        when(metricsRepository.findByTicketIdAndTenantId(ticketId, tenantId))
                .thenReturn(Optional.of(testMetrics));
        when(slaRepository.findById(slaId)).thenReturn(Optional.of(testSLA));
        when(metricsRepository.save(any(TicketMetrics.class))).thenReturn(testMetrics);

        helpdeskSLAService.recordFirstResponse(tenantId, ticketId, createdAt);

        assertNotNull(testMetrics.getFirstResponseAt());
        assertNotNull(testMetrics.getFirstResponseMinutes());
        verify(metricsRepository).save(testMetrics);
    }

    @Test
    void recordFirstResponse_SLABreached() {
        LocalDateTime createdAt = LocalDateTime.now().minusMinutes(120); // 2 hours ago
        testSLA.setFirstResponseMinutes(60); // SLA is 1 hour

        when(metricsRepository.findByTicketIdAndTenantId(ticketId, tenantId))
                .thenReturn(Optional.of(testMetrics));
        when(slaRepository.findById(slaId)).thenReturn(Optional.of(testSLA));
        when(metricsRepository.save(any(TicketMetrics.class))).thenReturn(testMetrics);

        helpdeskSLAService.recordFirstResponse(tenantId, ticketId, createdAt);

        assertTrue(testMetrics.getFirstResponseSlaBreached());
        assertFalse(testMetrics.getSlaMet());
    }

    @Test
    void recordResolution_Success() {
        LocalDateTime createdAt = LocalDateTime.now().minusHours(4);
        testMetrics.setReassignmentCount(0);
        testMetrics.setEscalationCount(0);

        when(metricsRepository.findByTicketIdAndTenantId(ticketId, tenantId))
                .thenReturn(Optional.of(testMetrics));
        when(slaRepository.findById(slaId)).thenReturn(Optional.of(testSLA));
        when(metricsRepository.save(any(TicketMetrics.class))).thenReturn(testMetrics);

        helpdeskSLAService.recordResolution(tenantId, ticketId, createdAt);

        assertNotNull(testMetrics.getResolutionAt());
        assertNotNull(testMetrics.getResolutionMinutes());
        assertTrue(testMetrics.getFirstContactResolution()); // No reassignment or escalation
    }

    @Test
    void recordResolution_SLABreached() {
        LocalDateTime createdAt = LocalDateTime.now().minusHours(10); // 10 hours ago
        testSLA.setResolutionMinutes(480); // SLA is 8 hours

        when(metricsRepository.findByTicketIdAndTenantId(ticketId, tenantId))
                .thenReturn(Optional.of(testMetrics));
        when(slaRepository.findById(slaId)).thenReturn(Optional.of(testSLA));
        when(metricsRepository.save(any(TicketMetrics.class))).thenReturn(testMetrics);

        helpdeskSLAService.recordResolution(tenantId, ticketId, createdAt);

        assertTrue(testMetrics.getResolutionSlaBreached());
        assertFalse(testMetrics.getSlaMet());
    }

    @Test
    void recordResolution_NotFirstContactResolution() {
        LocalDateTime createdAt = LocalDateTime.now().minusHours(4);
        testMetrics.setReassignmentCount(2); // Has reassignments

        when(metricsRepository.findByTicketIdAndTenantId(ticketId, tenantId))
                .thenReturn(Optional.of(testMetrics));
        when(slaRepository.findById(slaId)).thenReturn(Optional.of(testSLA));
        when(metricsRepository.save(any(TicketMetrics.class))).thenReturn(testMetrics);

        helpdeskSLAService.recordResolution(tenantId, ticketId, createdAt);

        assertFalse(testMetrics.getFirstContactResolution());
    }

    @Test
    void recordCSAT_Success() {
        when(metricsRepository.findByTicketIdAndTenantId(ticketId, tenantId))
                .thenReturn(Optional.of(testMetrics));
        when(metricsRepository.save(any(TicketMetrics.class))).thenReturn(testMetrics);

        helpdeskSLAService.recordCSAT(tenantId, ticketId, 5, "Excellent service!");

        assertEquals(5, testMetrics.getCsatRating());
        assertEquals("Excellent service!", testMetrics.getCsatFeedback());
        assertNotNull(testMetrics.getCsatSubmittedAt());
    }

    @Test
    void incrementReassignment_Success() {
        testMetrics.setReassignmentCount(0);

        when(metricsRepository.findByTicketIdAndTenantId(ticketId, tenantId))
                .thenReturn(Optional.of(testMetrics));
        when(metricsRepository.save(any(TicketMetrics.class))).thenReturn(testMetrics);

        helpdeskSLAService.incrementReassignment(tenantId, ticketId);

        assertEquals(1, testMetrics.getReassignmentCount());
    }

    @Test
    void incrementReopen_Success() {
        testMetrics.setReopenCount(0);

        when(metricsRepository.findByTicketIdAndTenantId(ticketId, tenantId))
                .thenReturn(Optional.of(testMetrics));
        when(metricsRepository.save(any(TicketMetrics.class))).thenReturn(testMetrics);

        helpdeskSLAService.incrementReopen(tenantId, ticketId);

        assertEquals(1, testMetrics.getReopenCount());
    }

    @Test
    void getMetrics_Success() {
        when(metricsRepository.findByTicketIdAndTenantId(ticketId, tenantId))
                .thenReturn(Optional.of(testMetrics));

        Optional<TicketMetrics> result = helpdeskSLAService.getMetrics(tenantId, ticketId);

        assertTrue(result.isPresent());
    }

    // ================== Dashboard Tests ==================

    @Test
    void getSLADashboard_Success() {
        when(metricsRepository.getAverageCSAT(tenantId)).thenReturn(4.5);
        when(metricsRepository.countFirstContactResolutions(tenantId)).thenReturn(50L);
        when(metricsRepository.countSLAMet(tenantId)).thenReturn(80L);
        when(metricsRepository.countSLABreached(tenantId)).thenReturn(20L);
        when(metricsRepository.getAverageFirstResponseTime(tenantId)).thenReturn(45.0);
        when(metricsRepository.getAverageResolutionTime(tenantId)).thenReturn(240.0);

        Map<String, Object> dashboard = helpdeskSLAService.getSLADashboard(tenantId);

        assertEquals(4.5, dashboard.get("averageCSAT"));
        assertEquals(50L, dashboard.get("firstContactResolutions"));
        assertEquals(80L, dashboard.get("slaMetCount"));
        assertEquals(20L, dashboard.get("slaBreachedCount"));
        assertEquals(80.0, dashboard.get("slaComplianceRate")); // 80/(80+20)*100
        assertEquals(45.0, dashboard.get("averageFirstResponseMinutes"));
        assertEquals(240.0, dashboard.get("averageResolutionMinutes"));
    }

    @Test
    void getSLADashboard_NullValues_ReturnsDefaults() {
        when(metricsRepository.getAverageCSAT(tenantId)).thenReturn(null);
        when(metricsRepository.countFirstContactResolutions(tenantId)).thenReturn(0L);
        when(metricsRepository.countSLAMet(tenantId)).thenReturn(null);
        when(metricsRepository.countSLABreached(tenantId)).thenReturn(null);
        when(metricsRepository.getAverageFirstResponseTime(tenantId)).thenReturn(null);
        when(metricsRepository.getAverageResolutionTime(tenantId)).thenReturn(null);

        Map<String, Object> dashboard = helpdeskSLAService.getSLADashboard(tenantId);

        assertEquals(0.0, dashboard.get("averageCSAT"));
        assertEquals(0L, dashboard.get("firstContactResolutions"));
        assertEquals(0.0, dashboard.get("slaComplianceRate"));
        assertEquals(0.0, dashboard.get("averageFirstResponseMinutes"));
        assertEquals(0.0, dashboard.get("averageResolutionMinutes"));
    }
}
