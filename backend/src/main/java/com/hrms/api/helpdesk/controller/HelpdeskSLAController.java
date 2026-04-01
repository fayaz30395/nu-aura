package com.hrms.api.helpdesk.controller;

import com.hrms.application.helpdesk.service.HelpdeskSLAService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.helpdesk.*;
import com.hrms.domain.helpdesk.TicketEscalation.EscalationLevel;
import com.hrms.domain.helpdesk.TicketEscalation.EscalationReason;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/helpdesk/sla")
@RequiredArgsConstructor
@Validated
public class HelpdeskSLAController {

    private final HelpdeskSLAService slaService;

    // ========== SLA Policies ==========

    @PostMapping
    @RequiresPermission(Permission.HELPDESK_SLA_MANAGE)
    public ResponseEntity<TicketSLA> createSLA(@Valid @RequestBody TicketSLA request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        request.setTenantId(tenantId);
        request.setCreatedAt(LocalDateTime.now());

        TicketSLA saved = slaService.createSLA(request);
        return ResponseEntity.ok(saved);
    }

    @GetMapping
    @RequiresPermission(Permission.HELPDESK_TICKET_VIEW)
    public ResponseEntity<Page<TicketSLA>> getSLAs(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Page<TicketSLA> slas = slaService.getAllSLAs(tenantId, pageable);
        return ResponseEntity.ok(slas);
    }

    @GetMapping("/active")
    @RequiresPermission(Permission.HELPDESK_TICKET_VIEW)
    public ResponseEntity<List<TicketSLA>> getActiveSLAs() {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<TicketSLA> slas = slaService.getActiveSLAs(tenantId);
        return ResponseEntity.ok(slas);
    }

    @GetMapping("/{id}")
    @RequiresPermission(Permission.HELPDESK_TICKET_VIEW)
    public ResponseEntity<TicketSLA> getSLA(@PathVariable UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return slaService.getSLAById(tenantId, id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    @RequiresPermission(Permission.HELPDESK_SLA_MANAGE)
    public ResponseEntity<TicketSLA> updateSLA(
            @PathVariable UUID id,
            @Valid @RequestBody TicketSLA request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        return slaService.getSLAById(tenantId, id)
                .map(existing -> {
                    existing.setName(request.getName());
                    existing.setDescription(request.getDescription());
                    existing.setCategoryId(request.getCategoryId());
                    existing.setPriority(request.getPriority());
                    existing.setFirstResponseMinutes(request.getFirstResponseMinutes());
                    existing.setResolutionMinutes(request.getResolutionMinutes());
                    existing.setEscalationAfterMinutes(request.getEscalationAfterMinutes());
                    existing.setEscalationTo(request.getEscalationTo());
                    existing.setSecondEscalationMinutes(request.getSecondEscalationMinutes());
                    existing.setSecondEscalationTo(request.getSecondEscalationTo());
                    existing.setIsBusinessHoursOnly(request.getIsBusinessHoursOnly());
                    existing.setBusinessStartHour(request.getBusinessStartHour());
                    existing.setBusinessEndHour(request.getBusinessEndHour());
                    existing.setWorkingDays(request.getWorkingDays());
                    existing.setIsActive(request.getIsActive());
                    existing.setApplyToAllCategories(request.getApplyToAllCategories());
                    existing.setUpdatedAt(LocalDateTime.now());

                    TicketSLA updated = slaService.updateSLA(existing);
                    return ResponseEntity.ok(updated);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(Permission.HELPDESK_SLA_MANAGE)
    public ResponseEntity<Void> deleteSLA(@PathVariable UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        slaService.deleteSLA(tenantId, id);
        return ResponseEntity.noContent().build();
    }

    // ========== Escalations ==========

    @PostMapping("/escalate/{ticketId}")
    @RequiresPermission(Permission.HELPDESK_TICKET_ASSIGN)
    public ResponseEntity<TicketEscalation> escalateTicket(
            @PathVariable UUID ticketId,
            @RequestParam UUID escalatedTo,
            @RequestParam EscalationLevel level,
            @RequestParam EscalationReason reason,
            @Size(max = 1000) @RequestParam(required = false) String notes) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID escalatedFrom = SecurityContext.getCurrentEmployeeId();

        TicketEscalation escalation = slaService.escalateTicket(
                tenantId, ticketId, escalatedFrom, escalatedTo, level, reason, false, notes);
        return ResponseEntity.ok(escalation);
    }

    @GetMapping("/escalations/ticket/{ticketId}")
    @RequiresPermission(Permission.HELPDESK_TICKET_VIEW)
    public ResponseEntity<List<TicketEscalation>> getTicketEscalations(@PathVariable UUID ticketId) {
        List<TicketEscalation> escalations = slaService.getEscalationsForTicket(ticketId);
        return ResponseEntity.ok(escalations);
    }

    @GetMapping("/escalations/pending")
    @RequiresPermission(Permission.HELPDESK_TICKET_VIEW)
    public ResponseEntity<List<TicketEscalation>> getMyPendingEscalations() {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID userId = SecurityContext.getCurrentEmployeeId();
        List<TicketEscalation> escalations = slaService.getUnacknowledgedEscalations(tenantId, userId);
        return ResponseEntity.ok(escalations);
    }

    @PostMapping("/escalations/{escalationId}/acknowledge")
    @RequiresPermission(Permission.HELPDESK_TICKET_VIEW)
    public ResponseEntity<Void> acknowledgeEscalation(@PathVariable UUID escalationId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID userId = SecurityContext.getCurrentEmployeeId();
        slaService.acknowledgeEscalation(tenantId, escalationId, userId);
        return ResponseEntity.ok().build();
    }

    // ========== Metrics ==========

    @GetMapping("/metrics/{ticketId}")
    @RequiresPermission(Permission.HELPDESK_TICKET_VIEW)
    public ResponseEntity<TicketMetrics> getTicketMetrics(@PathVariable UUID ticketId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return slaService.getMetrics(tenantId, ticketId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/metrics/{ticketId}/csat")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_SELF)
    public ResponseEntity<Void> submitCSAT(
            @PathVariable UUID ticketId,
            @RequestParam Integer rating,
            @RequestParam(required = false) String feedback) {
        UUID tenantId = TenantContext.getCurrentTenant();
        slaService.recordCSAT(tenantId, ticketId, rating, feedback);
        return ResponseEntity.ok().build();
    }

    // ========== Dashboard ==========

    @GetMapping("/dashboard")
    @RequiresPermission(Permission.HELPDESK_SLA_MANAGE)
    public ResponseEntity<Map<String, Object>> getSLADashboard() {
        UUID tenantId = TenantContext.getCurrentTenant();
        Map<String, Object> dashboard = slaService.getSLADashboard(tenantId);
        return ResponseEntity.ok(dashboard);
    }
}
